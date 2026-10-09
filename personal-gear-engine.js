(function (root, factory) {
  const preferences = root.GameFitPreferences || (
    typeof module === "object" && module.exports ? require("./preference-engine.js") : null
  );
  const gameDna = root.GameFitGameDNA || (
    typeof module === "object" && module.exports ? require("./data/game-dna.js") : null
  );
  const normalization = root.GameFitNormalization || (
    typeof module === "object" && module.exports ? require("./normalization-engine.js") : null
  );
  const api = factory(preferences, gameDna, normalization);
  root.GameFitPersonalGear = api;
  if (typeof module === "object" && module.exports) module.exports = api;
})(typeof window !== "undefined" ? window : globalThis, function (preferences, gameDna, normalization) {
  "use strict";

  if (!preferences || !gameDna || !normalization) throw new Error("GameFitPreferences, GameFitGameDNA and GameFitNormalization are required");

  const UPGRADE_MATCHES = Object.freeze([
    "SAFE / FAMILIAR", "BETTER_FIT", "VALUE_ALTERNATIVE", "EXPLORE", "AVOID", "DONT_UPGRADE"
  ]);
  const CONFIDENCE_LEVELS = Object.freeze(["Low", "Medium", "High"]);
  const DNA_LEVELS = Object.freeze({ low:0.25, medium:0.6, high:1 });
  const CATEGORY_INPUT_METHODS = Object.freeze({
    mouse:Object.freeze(["mnk"]),
    keyboard:Object.freeze(["mnk"]),
    mousepad:Object.freeze(["mnk"]),
    mouse_skates:Object.freeze(["mnk"]),
    controller:Object.freeze(["controller"])
  });

  function clamp01(value) {
    const number = Number(value);
    if (!Number.isFinite(number)) return 0;
    return Math.max(0, Math.min(1, number));
  }

  function confidenceFromGrade(grade) {
    if (grade === "A" || grade === "B") return "High";
    if (grade === "C") return "Medium";
    return "Low";
  }

  function compareValue(actual, operator, expected) {
    if (actual === undefined || actual === null) return { known:false, match:false };
    actual = normalization.comparableValue(actual);
    expected = normalization.comparableValue(expected);
    let match = false;
    if (operator === "includes") match = Array.isArray(actual) ? actual.includes(expected) : String(actual).includes(String(expected));
    else if (operator === "gt") match = Number(actual) > Number(expected);
    else if (operator === "gte") match = Number(actual) >= Number(expected);
    else if (operator === "lt") match = Number(actual) < Number(expected);
    else if (operator === "lte") match = Number(actual) <= Number(expected);
    else match = actual === expected;
    return { known:true, match };
  }

  function normalizedComparable(category, attribute, value) {
    if (value && typeof value === "object" && Object.prototype.hasOwnProperty.call(value, "normalized_value")) {
      try {
        return normalization.normalizeAttribute(category, attribute, value.normalized_value, value.normalized_unit).normalized_value;
      } catch (_) {
        return undefined;
      }
    }
    try { return normalization.normalizeAttribute(category, attribute, value).normalized_value; }
    catch (_) { return undefined; }
  }

  function compareAttributeValue(category, attribute, actual, operator, expected) {
    if (actual === undefined || actual === null) return { known:false, match:false };
    const normalizedActual = normalizedComparable(category, attribute, actual);
    const normalizedExpected = normalizedComparable(category, attribute, expected);
    if (normalizedActual === undefined || normalizedExpected === undefined) return { known:false, match:false };
    return compareValue(normalizedActual, operator, normalizedExpected);
  }

  function attributeConfidence(candidate, attribute) {
    const item = candidate?.attribute_evidence?.[attribute];
    if (item?.confidence && CONFIDENCE_LEVELS.includes(item.confidence)) return item.confidence;
    if (item?.grade) return confidenceFromGrade(item.grade);
    // Backward compatibility for the pre-attribute-evidence schema.  Once a
    // candidate supplies an attribute_evidence map, a missing attribute must
    // remain Low rather than inheriting the product-level grade.
    if (!candidate?.attribute_evidence) return confidenceFromGrade(candidate?.evidence_grade);
    return "Low";
  }

  function lowestConfidence(levels) {
    if (!levels.length || levels.includes("Low")) return "Low";
    if (levels.includes("Medium")) return "Medium";
    return "High";
  }

  function isContextApplicable(item, context) {
    return (!item.game_id || item.game_id === context.game_id) &&
      (!item.input_method || item.input_method === context.input_method);
  }

  function evaluateRegretShield(candidate, profile, context={}) {
    const attributes = candidate?.attributes || {};
    const hardRules = preferences.hardAvoidsFor(profile, candidate?.category, context);
    const dislikedRules = [];
    for (const feedback of profile?.product_feedback || []) {
      if (feedback.category !== candidate?.category || !["dislike", "avoid"].includes(feedback.sentiment)) continue;
      if (!isContextApplicable(feedback, context)) continue;
      for (const reason of feedback.reasons || []) {
        if (!reason.attribute || reason.value === null || reason.value === undefined) continue;
        dislikedRules.push({
          attribute:reason.attribute,
          operator:"equals",
          value:reason.value,
          reason_code:reason.reason_code || "past_dislike_match",
          source_product_id:feedback.product_id
        });
      }
    }

    const matches = [];
    const missingHardAvoidAttributes = [];
    const comparisonConfidences = [];
    let knownComparisons = 0;
    for (const rule of hardRules) {
      const comparison = compareAttributeValue(candidate?.category, rule.attribute, attributes[rule.attribute], rule.operator, rule.value);
      if (comparison.known) {
        knownComparisons += 1;
        comparisonConfidences.push(attributeConfidence(candidate, rule.attribute));
      } else missingHardAvoidAttributes.push(rule.attribute);
      if (comparison.match) matches.push({ ...rule, match_type:"hard_avoid", attribute_confidence:attributeConfidence(candidate, rule.attribute) });
    }
    for (const rule of dislikedRules) {
      const comparison = compareAttributeValue(candidate?.category, rule.attribute, attributes[rule.attribute], rule.operator, rule.value);
      if (comparison.known) {
        knownComparisons += 1;
        comparisonConfidences.push(attributeConfidence(candidate, rule.attribute));
      }
      if (comparison.match) matches.push({ ...rule, match_type:"past_dislike", attribute_confidence:attributeConfidence(candidate, rule.attribute) });
    }

    const hardMatches = matches.filter(item => item.match_type === "hard_avoid");
    const dislikedMatches = matches.filter(item => item.match_type === "past_dislike");
    const rulesConsidered = hardRules.length + dislikedRules.length;
    const matchedConfidences = matches.map(item => item.attribute_confidence);
    let confidence = lowestConfidence(matchedConfidences.length ? matchedConfidences : comparisonConfidences);
    if (!matches.length && knownComparisons < 2) confidence = "Low";

    let riskLevel = "unknown";
    if (hardMatches.length || dislikedMatches.length >= 2) riskLevel = "high";
    else if (dislikedMatches.length === 1) riskLevel = "medium";
    else if (rulesConsidered > 0 && knownComparisons >= 2) riskLevel = "low";

    const insufficient = rulesConsidered === 0 || knownComparisons === 0 || missingHardAvoidAttributes.length > 0;
    const conclusion = insufficient ? "insufficient_data" :
      confidence === "Low" && riskLevel !== "low" ? "provisional_risk" : "supported_assessment";

    return {
      risk_level:riskLevel,
      confidence,
      conclusion,
      should_block:hardMatches.length > 0 || (riskLevel === "high" && confidence !== "Low"),
      requires_clarification:missingHardAvoidAttributes.length > 0,
      matches,
      coverage:{ known:knownComparisons, rules:rulesConsidered },
      data_gaps:insufficient ? [
        "candidate_or_history_attributes_missing",
        ...missingHardAvoidAttributes.map(attribute => "hard_avoid_attribute_missing:" + attribute)
      ] : []
    };
  }

  function calculatePreferenceFit(candidate, profile, context={}) {
    const items = preferences.attributePreferencesFor(profile, candidate?.category, context);
    const attributes = candidate?.attributes || {};
    const directionCodes = new Set(candidate?.direction_codes || []);
    let sum = 0;
    let known = 0;
    for (const item of items) {
      if ((item.value === null || item.value === undefined) && !item.direction_code) continue;
      const actual = attributes[item.attribute];
      const hasValue = actual !== undefined && actual !== null;
      const directionMatch = item.direction_code && directionCodes.has(item.direction_code);
      if (!hasValue && !directionMatch) continue;
      known += 1;
      const valueMatch = hasValue && item.value !== null && item.value !== undefined &&
        normalizedComparable(candidate?.category, item.attribute, actual) === normalizedComparable(candidate?.category, item.attribute, item.value);
      const positive = ["love", "like"].includes(item.sentiment);
      const negative = ["dislike", "avoid"].includes(item.sentiment);
      if (positive) sum += valueMatch || directionMatch ? 1 : 0.4;
      else if (negative) sum += directionMatch ? 1 : valueMatch ? 0 : 0.8;
      else sum += 0.5;
    }
    return {
      score:known ? clamp01(sum / known) : 0.5,
      confidence:known >= 4 ? "High" : known >= 2 ? "Medium" : "Low",
      coverage:{ known, preferences:items.length }
    };
  }

  function calculateGameFit(candidate, dnaProfile) {
    const categoryInputs = CATEGORY_INPUT_METHODS[candidate?.category];
    if (categoryInputs && !categoryInputs.includes(dnaProfile.input_method)) {
      return { score:0, confidence:"High", coverage:0, incompatible:true };
    }
    if (Array.isArray(candidate?.input_methods) && !candidate.input_methods.includes(dnaProfile.input_method)) {
      return { score:0, confidence:"High", coverage:0, incompatible:true };
    }
    const exactKey = dnaProfile.game_id + "_" + dnaProfile.input_method;
    const exact = candidate?.game_fitness?.[exactKey];
    const exactScore = exact && typeof exact === "object" ? exact.score : exact;
    if (Number.isFinite(Number(exactScore))) {
      const evidenceMeta = exact && typeof exact === "object" ? exact : candidate?.game_fitness_evidence?.[exactKey];
      const grade = evidenceMeta?.evidence_grade || evidenceMeta?.grade || "D";
      return {
        score:clamp01(exactScore), confidence:confidenceFromGrade(grade), coverage:1, incompatible:false,
        evidence_grade:grade, data_gaps:grade === "D" ? ["game_fitness_evidence_missing"] : []
      };
    }
    const traits = candidate?.performance_traits || {};
    let weighted = 0;
    let totalWeight = 0;
    let covered = 0;
    for (const [dimension, level] of Object.entries(dnaProfile.traits || {})) {
      if (!Number.isFinite(Number(traits[dimension]))) continue;
      const weight = DNA_LEVELS[level] || 0;
      weighted += clamp01(traits[dimension]) * weight;
      totalWeight += weight;
      covered += 1;
    }
    if (!covered) return { score:0.5, confidence:"Low", coverage:0, incompatible:false, data_gaps:["game_fitness_evidence_missing"] };
    return {
      score:clamp01(weighted / totalWeight),
      confidence:covered >= 5 ? "Medium" : "Low",
      coverage:covered,
      incompatible:false,
      data_gaps:["game_fitness_is_trait_derived"]
    };
  }

  function calculateCurrentGearDelta(candidate, currentGear) {
    if (hasFiniteValue(candidate?.current_gear_delta)) return clamp01(candidate.current_gear_delta);
    if (!hasFiniteValue(candidate?.performance_score) || !hasFiniteValue(currentGear?.performance_score)) return 0;
    const candidateScore = Number(candidate.performance_score) > 1 ? Number(candidate.performance_score) / 100 : Number(candidate.performance_score);
    const currentScore = Number(currentGear.performance_score) > 1 ? Number(currentGear.performance_score) / 100 : Number(currentGear.performance_score);
    return clamp01(candidateScore - currentScore);
  }

  function hasFiniteValue(value) {
    return value !== null && value !== undefined && value !== "" && Number.isFinite(Number(value));
  }

  function hasCurrentGearDelta(candidate, currentGear) {
    return hasFiniteValue(candidate?.current_gear_delta) ||
      (hasFiniteValue(candidate?.performance_score) && hasFiniteValue(currentGear?.performance_score));
  }

  function calculateValue(candidate, budget) {
    if (Number.isFinite(Number(candidate?.value_score))) return clamp01(candidate.value_score);
    if (!Number.isFinite(Number(candidate?.price)) || !Number.isFinite(Number(budget)) || Number(budget) <= 0) return 0.5;
    return clamp01(1 - Math.max(0, Number(candidate.price) - Number(budget)) / Number(budget));
  }

  function scoreCandidate(candidate, context) {
    const gameFit = calculateGameFit(candidate, context.dna_profile);
    const preferenceFit = calculatePreferenceFit(candidate, context.profile, context);
    const regret = evaluateRegretShield(candidate, context.profile, context);
    const currentDeltaKnown = hasCurrentGearDelta(candidate, context.current_gear);
    const currentDelta = calculateCurrentGearDelta(candidate, context.current_gear);
    const value = calculateValue(candidate, context.budget);
    const evidence = ({ A:1, B:0.8, C:0.55, D:0.25 })[candidate?.evidence_grade] || 0.15;
    const compatibilityUnknown = candidate?.compatibility_status === "unknown";
    const compatibility = candidate?.compatible === false || gameFit.incompatible ? 0 : compatibilityUnknown ? null : 1;
    const regretPenalty = regret.risk_level === "high" ? (regret.confidence === "Low" ? 0.18 : 0.35) :
      regret.risk_level === "medium" ? 0.12 : 0;
    const raw = gameFit.score * 0.25 + preferenceFit.score * 0.30 + currentDelta * 0.20 +
      value * 0.10 + evidence * 0.10 + (compatibility === 1 ? 0.05 : 0) - regretPenalty;
    const confidencePoints = [gameFit.confidence, preferenceFit.confidence, confidenceFromGrade(candidate?.evidence_grade)]
      .reduce((sum, level) => sum + ({ Low:0, Medium:1, High:2 })[level], 0);
    const candidateEvidenceConfidence = confidenceFromGrade(candidate?.evidence_grade);
    return {
      product_id:candidate.product_id,
      category:candidate.category,
      game_id:context.game_id,
      input_method:context.input_method,
      recommendation_score:Math.round(clamp01(raw) * 100),
      confidence:candidateEvidenceConfidence === "Low" || !currentDeltaKnown ? "Low" : confidencePoints >= 5 ? "High" : confidencePoints >= 2 ? "Medium" : "Low",
      evidence_grade:candidate?.evidence_grade || "D",
      components:{ game_fit:gameFit.score, preference_fit:preferenceFit.score, current_gear_delta:currentDelta, value, evidence, compatibility },
      coverage:{ game:gameFit.coverage, preference:preferenceFit.coverage },
      regret_shield:regret,
      familiar_score:clamp01(candidate.similarity_to_current),
      direction_codes:[...(candidate.direction_codes || [])],
      compatible:compatibility === 1,
      compatibility_status:compatibility === null ? "unknown" : compatibility === 1 ? "compatible" : "incompatible",
      data_gaps:[
        ...(candidateEvidenceConfidence === "Low" ? ["evidence_insufficient"] : []),
        ...(!currentDeltaKnown ? ["current_gear_delta_missing"] : []),
        ...(gameFit.data_gaps || []),
        ...(compatibilityUnknown ? ["compatibility_unknown"] : []),
        ...(regret.data_gaps || [])
      ]
    };
  }

  function classifyUpgradeMatch(scored) {
    if (scored.compatibility_status === "incompatible" || scored.regret_shield.should_block) return "AVOID";
    if (scored.compatibility_status === "unknown" || scored.regret_shield.requires_clarification) return "DONT_UPGRADE";
    if (scored.evidence_grade === "D" || scored.components.evidence < 0.55) return "DONT_UPGRADE";
    if (scored.components.current_gear_delta <= 0.05) return "DONT_UPGRADE";
    if (scored.components.preference_fit >= 0.72) return "BETTER_FIT";
    if (scored.familiar_score >= 0.72 && !["high", "medium"].includes(scored.regret_shield.risk_level)) return "SAFE / FAMILIAR";
    if (scored.components.value >= 0.75) return "VALUE_ALTERNATIVE";
    return "EXPLORE";
  }

  function recommendUpgrades(input) {
    const dnaProfile = gameDna.get(input?.game_id, input?.input_method);
    if (!dnaProfile) {
      return {
        status:"insufficient_context",
        decision:"DONT_UPGRADE",
        reason_codes:["unregistered_game_input_profile"],
        recommendations:[]
      };
    }
    const highPriorityFix = (input.fix_before_buy || []).some(item => Number(item.priority) >= 90);
    const scored = (input.candidates || []).map(candidate => {
      const currentGear = Array.isArray(input.current_gear) ?
        input.current_gear.find(item => item.category === candidate.category) : input.current_gear;
      const result = scoreCandidate(candidate, {
        game_id:input.game_id,
        input_method:input.input_method,
        dna_profile:dnaProfile,
        profile:input.profile || preferences.createProfile(),
        current_gear:currentGear || null,
        budget:input.budget
      });
      return { ...result, upgrade_match:classifyUpgradeMatch(result) };
    });
    const classOrder = { "BETTER_FIT":0, "SAFE / FAMILIAR":1, "VALUE_ALTERNATIVE":2, "EXPLORE":3, "DONT_UPGRADE":4, "AVOID":5 };
    scored.sort((a,b) => classOrder[a.upgrade_match] - classOrder[b.upgrade_match] || b.recommendation_score - a.recommendation_score);
    const purchasable = scored.filter(item => !["AVOID", "DONT_UPGRADE"].includes(item.upgrade_match));
    const decision = highPriorityFix || !purchasable.length || purchasable[0].recommendation_score < 45 ? "DONT_UPGRADE" : "CONSIDER_UPGRADE";
    return {
      status:"ok",
      decision,
      reason_codes:highPriorityFix ? ["fix_before_buy"] : [],
      game_context:{ game_id:dnaProfile.game_id, input_method:dnaProfile.input_method },
      recommendations:scored
    };
  }

  return {
    UPGRADE_MATCHES, CONFIDENCE_LEVELS, CATEGORY_INPUT_METHODS, evaluateRegretShield, calculatePreferenceFit,
    calculateGameFit, calculateCurrentGearDelta, hasCurrentGearDelta, scoreCandidate, classifyUpgradeMatch,
    recommendUpgrades
  };
});
