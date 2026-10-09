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
  const readiness = root.GameFitDecisionReadiness || (
    typeof module === "object" && module.exports ? require("./decision-readiness-engine.js") : null
  );
  const priceTiming = root.GameFitPriceTiming || (
    typeof module === "object" && module.exports ? require("./price-timing-engine.js") : null
  );
  const evidence = root.GameFitEvidence || (
    typeof module === "object" && module.exports ? require("./evidence-engine.js") : null
  );
  const api = factory(preferences, gameDna, normalization, readiness, priceTiming, evidence);
  root.GameFitPersonalGear = api;
  if (typeof module === "object" && module.exports) module.exports = api;
})(typeof window !== "undefined" ? window : globalThis, function (preferences, gameDna, normalization, readiness, priceTiming, evidence) {
  "use strict";

  if (!preferences || !gameDna || !normalization || !readiness || !priceTiming || !evidence) throw new Error("GameFit recommendation dependencies are required");

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
  const BUYABLE_LIFECYCLES = Object.freeze(["available", "mature", "discounting"]);
  const COMPATIBILITY_FIELDS = new Set(["platform","gpu_connector","monitor_connector","cable_connector","required_bandwidth_gbps","cable_certified_bandwidth_gbps","device_connector","host_connector","host_high_polling_support","verified_adapter","audio_connector","source_connector","requires_dac","dac_available","connection_type","packet_loss_pct","jitter_ms","bufferbloat_method","bufferbloat_result","client_bands","router_bands","wired_path_capacity"]);
  const SETUP_CHECK_CODES = new Set(["set_os_refresh_rate","test_mouse_direct_usb","verify_actual_usb_polling","verify_display_signal_chain","check_audio_output_settings","test_direct_audio_path","network_stability_check","test_bufferbloat_under_load","compare_temporary_wired_test","check_os_power_and_background_load","verify_controller_platform"]);
  const SETUP_CHECK_RESULTS = new Set(["pass","resolved","not_applicable"]);
  const CABLE_NEED_REASONS = new Set(["required_connector_missing","target_mode_capacity_shortfall","power_delivery_shortfall","verified_physical_fault","required_length_mismatch"]);
  const GAME_INPUT_RULES = Object.freeze({
    apex_mnk:Object.freeze({ rule_id:"mouse-apex-mnk-attribute-fit-v1", category:"mouse", allowed_attributes:Object.freeze(["weight","shape","click_latency","length","width","height"]) }),
    valorant_mnk:Object.freeze({ rule_id:"mouse-valorant-mnk-attribute-fit-v1", category:"mouse", allowed_attributes:Object.freeze(["weight","shape","click_latency","length","width","height"]) })
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

  function attributeEvidenceCanClearHardAvoid(candidate, attribute) {
    const item = candidate?.attribute_evidence?.[attribute];
    if (!item || item.conflict === true) return false;
    return ["A", "B", "C"].includes(item.grade) && attributeConfidence(candidate, attribute) !== "Low";
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
      const canClear = attributeEvidenceCanClearHardAvoid(candidate, rule.attribute);
      // A possible hard-avoid match is always conservative. A non-match may
      // clear the rule only when the compared attribute has non-conflicting
      // attribute-level evidence of at least grade C.
      if (comparison.known && (comparison.match || canClear)) {
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
    if (typeof exactScore === "number" && Number.isFinite(exactScore)) {
      const evidenceMeta = exact && typeof exact === "object" ? exact : candidate?.game_fitness_evidence?.[exactKey];
      const rule = GAME_INPUT_RULES[exactKey];
      const ledger = candidate?.evidence || [];
      const sourceRecords = Array.isArray(evidenceMeta?.source_ids) ? evidenceMeta.source_ids.map(sourceId => ledger.find(item => item.evidence_id === sourceId)) : [];
      const currentSourceRecords = evidence.currentEvidence(sourceRecords);
      const sourceAttributes = new Set(sourceRecords.map(item => item?.normalized_fact?.attribute).filter(Boolean));
      const sourceGrades = [...sourceAttributes].map(attribute => candidate?.attribute_evidence?.[attribute]?.grade);
      const sourcesResolved = sourceRecords.length >= 2 && currentSourceRecords.length === sourceRecords.length && sourceRecords.every(record => record &&
        record.product_id === candidate.product_id && record.product_variant_id === candidate.variant_id &&
        record.rights_status !== "do_not_reuse_content" &&
        ["spec","measurement","fact_correction"].includes(record.evidence_type) &&
        (record.evidence_type !== "measurement" || ["verified_lab","publisher_test"].includes(record.measurement_verification)) &&
        rule?.allowed_attributes.includes(record.normalized_fact?.attribute)) &&
        sourceAttributes.size >= 2 && sourceGrades.every(grade => ["A","B","C"].includes(grade));
      const profileResolved = evidenceMeta?.game_profile_id === exactKey;
      const ruleResolved = rule?.category === candidate.category && evidenceMeta?.rule_id === rule.rule_id &&
        evidenceMeta?.derivation === "attribute_evidence_rule_v1" && evidenceMeta?.calibration_status === "provisional_no_outcomes";
      const exactVerified = evidenceMeta?.verified === true && evidenceMeta?.assessment_type === "game_input_rules" &&
        sourcesResolved && profileResolved && ruleResolved;
      const grade = exactVerified ? "C" : "D";
      return {
        score:0.5, confidence:exactVerified ? confidenceFromGrade(grade) : "Low", coverage:exactVerified ? 1 : 0, incompatible:false,
        evidence_grade:grade, exact_verified:exactVerified, data_gaps:grade === "D" || !exactVerified ? ["game_fitness_evidence_missing"] : []
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
      coverage:covered, exact_verified:false,
      incompatible:false,
      data_gaps:["game_fitness_is_trait_derived"]
    };
  }

  function calculateCurrentGearDelta(candidate, currentGear) {
    if (["known", "partial"].includes(candidate?.current_gear_delta_assessment?.status) && hasFiniteValue(candidate.current_gear_delta_assessment.model_score)) {
      return clamp01(candidate.current_gear_delta_assessment.model_score);
    }
    if (hasFiniteValue(candidate?.current_gear_delta)) return clamp01(candidate.current_gear_delta);
    if (!hasFiniteValue(candidate?.performance_score) || !hasFiniteValue(currentGear?.performance_score)) return 0;
    const candidateScore = Number(candidate.performance_score) > 1 ? Number(candidate.performance_score) / 100 : Number(candidate.performance_score);
    const currentScore = Number(currentGear.performance_score) > 1 ? Number(currentGear.performance_score) / 100 : Number(currentGear.performance_score);
    return clamp01(candidateScore - currentScore);
  }

  function hasFiniteValue(value) {
    return value !== null && value !== undefined && value !== "" && Number.isFinite(Number(value));
  }

  function highConfidenceGate(input={}) {
    const criticalGrades = input.critical_attribute_grades || [];
    const numeric = value => typeof value === "number" && Number.isFinite(value);
    const severeErrors = numeric(input.severe_error_count) ? input.severe_error_count : null;
    const gate = {
      critical_attributes_supported:criticalGrades.length > 0 && criticalGrades.every(grade => ["A", "B"].includes(grade)),
      game_fit_supported:["A", "B"].includes(input.game_fit_grade),
      delta_verified:input.delta_verified === true,
      compatibility_verified:input.compatibility_verified === true,
      no_critical_gaps:(input.critical_data_gaps || []).length === 0,
      affiliate_invariant:input.affiliate_permutation_passed === true,
      adversarial_passed:input.adversarial_pass_rate === 1,
      enough_decided_feedback:numeric(input.decided_feedback_count) && input.decided_feedback_count >= 30,
      enough_purchase_outcomes:numeric(input.purchase_outcome_count) && input.purchase_outcome_count >= 10,
      real_outcomes_only:input.real_outcomes_only === true,
      enough_independent_users:numeric(input.independent_decided_users) && input.independent_decided_users >= 30,
      enough_calibration_samples:numeric(input.calibration_sample_size) && input.calibration_sample_size >= 30,
      enough_holdout_samples:numeric(input.holdout_sample_size) && input.holdout_sample_size >= 10,
      same_category_game_input:input.same_category_game_input === true,
      outcome_verification_passed:input.outcome_verification_passed === true,
      calibration_gap_ok:numeric(input.calibration_gap) && input.calibration_gap >= 0 && input.calibration_gap <= 0.15,
      brier_score_ok:numeric(input.brier_score) && input.brier_score >= 0 && input.brier_score <= 0.20,
      regret_rate_ok:numeric(input.regret_rate) && input.regret_rate >= 0 && input.regret_rate <= 0.15,
      no_severe_errors:severeErrors === 0
    };
    return { eligible:Object.values(gate).every(Boolean), checks:gate, provisional:true };
  }

  function hasCurrentGearDelta(candidate, currentGear) {
    return (["known", "partial"].includes(candidate?.current_gear_delta_assessment?.status) && hasFiniteValue(candidate.current_gear_delta_assessment.model_score)) ||
      hasFiniteValue(candidate?.current_gear_delta) ||
      (hasFiniteValue(candidate?.performance_score) && hasFiniteValue(currentGear?.performance_score));
  }

  function calculateValue(candidate, budget) {
    if (typeof candidate?.price === "number" && Number.isFinite(candidate.price) && typeof budget === "number" && Number.isFinite(budget) && budget > 0) {
      return clamp01(1 - Math.max(0, candidate.price - budget) / budget);
    }
    if (typeof candidate?.value_score === "number" && Number.isFinite(candidate.value_score)) return clamp01(candidate.value_score);
    return 0.5;
  }

  function scoreCandidate(candidate, context) {
    const gameFit = calculateGameFit(candidate, context.dna_profile);
    const preferenceFit = calculatePreferenceFit(candidate, context.profile, context);
    const regret = evaluateRegretShield(candidate, context.profile, context);
    const currentDeltaKnown = hasCurrentGearDelta(candidate, context.current_gear);
    const currentDelta = calculateCurrentGearDelta(candidate, context.current_gear);
    const priceAssessment = priceTiming.assess(candidate?.price_snapshot || {}, {
      as_of:context.as_of,
      region:context.region,
      currency:context.currency,
      product_id:candidate?.product_id,
      variant_id:candidate?.variant_id
    });
    const canonicalPrice = priceAssessment.status === "known" && priceAssessment.price_fresh ?
      candidate?.price_snapshot?.current_price : null;
    const value = calculateValue({ ...candidate, price:canonicalPrice, value_score:undefined }, context.budget);
    const valueAssessment = candidate?.value_assessment;
    const valueAlternativeVerified = valueAssessment?.assessment_type === "evidence_value" &&
      valueAssessment?.status === "verified" && valueAssessment?.same_use_case === true &&
      valueAssessment?.compared_price_supported === true;
    const evidence = ({ A:1, B:0.8, C:0.55, D:0.25 })[candidate?.evidence_grade] || 0.15;
    const compatibilityAssessment = candidate?.compatibility_assessment;
    const evaluatedFields = compatibilityAssessment?.evaluated_fields;
    const requiredCompatibilityFields = candidate?.category === "controller" ? ["platform"] :
      candidate?.category === "network" ? ["connection_type","packet_loss_pct","jitter_ms","bufferbloat_method","bufferbloat_result"] :
      candidate?.category === "monitor" ? ["gpu_connector","monitor_connector","cable_connector"] :
      candidate?.category === "audio" ? ["audio_connector","source_connector"] :
      candidate?.category === "cable" ? ["cable_connector"] :
      ["device_connector","host_connector"];
    const compatibilityAssessmentVerified = compatibilityAssessment?.assessment_type === "rule_evaluation" &&
      compatibilityAssessment?.status === "compatible" &&
      Array.isArray(evaluatedFields) && evaluatedFields.length > 0 &&
      evaluatedFields.every(field => COMPATIBILITY_FIELDS.has(field)) &&
      requiredCompatibilityFields.every(field => evaluatedFields.includes(field)) &&
      Array.isArray(compatibilityAssessment?.issues) && compatibilityAssessment.issues.length === 0 &&
      Array.isArray(compatibilityAssessment?.unknowns) && compatibilityAssessment.unknowns.length === 0;
    const compatibilityVerified = candidate?.compatibility_status === "compatible" && candidate?.compatible === true && compatibilityAssessmentVerified;
    const compatibilityIncompatible = candidate?.compatibility_status === "incompatible" ||
      (candidate?.compatible === false && candidate?.compatibility_status !== "unknown") || gameFit.incompatible;
    const compatibility = compatibilityIncompatible ? 0 : compatibilityVerified ? 1 : null;
    const compatibilityUnknown = compatibility === null;
    const budgetProvided = typeof context.budget === "number" && Number.isFinite(context.budget) && context.budget > 0;
    const priceKnown = typeof canonicalPrice === "number" && Number.isFinite(canonicalPrice) && canonicalPrice >= 0;
    const budgetExceeded = budgetProvided && priceKnown && canonicalPrice > context.budget;
    const priceUnknownForBudget = budgetProvided && !priceKnown;
    const lifecycleBlocked = !BUYABLE_LIFECYCLES.includes(candidate?.lifecycle_state);
    const categoryUnknown = !candidate?.category || !["mouse","keyboard","monitor","mousepad","mouse_skates","audio","controller","network","cable"].includes(candidate.category);
    const cableNeedAssessment = candidate?.need_assessment;
    const cableNeedVerified = cableNeedAssessment?.status === "verified" &&
      CABLE_NEED_REASONS.has(cableNeedAssessment?.reason_code) &&
      Array.isArray(cableNeedAssessment?.evidence) && cableNeedAssessment.evidence.length > 0 &&
      cableNeedAssessment.evidence.every(item => item && typeof item === "object" &&
        ["setup","compatibility_assessment","observed_fault"].includes(item.source) && typeof item.fact === "string" && item.fact.length > 0);
    const variantBlocked = candidate?.category === "cable" ? !(
      candidate?.variant_scope === "exact" && typeof candidate?.variant_id === "string" && candidate.variant_id.length > 0 &&
      compatibilityAssessment?.variant_id === candidate.variant_id && cableNeedAssessment?.variant_id === candidate.variant_id
    ) : candidate?.variant_scope === "family" || candidate?.variant_scope === "unknown";
    const cableNeedUnknown = candidate?.category === "cable" && !cableNeedVerified;
    const regretPenalty = regret.risk_level === "high" ? (regret.confidence === "Low" ? 0.18 : 0.35) :
      regret.risk_level === "medium" ? 0.12 : 0;
    const raw = gameFit.score * 0.25 + preferenceFit.score * 0.30 + currentDelta * 0.20 +
      value * 0.10 + evidence * 0.10 + (compatibility === 1 ? 0.05 : 0) - regretPenalty;
    const confidencePoints = [gameFit.confidence, preferenceFit.confidence, confidenceFromGrade(candidate?.evidence_grade)]
      .reduce((sum, level) => sum + ({ Low:0, Medium:1, High:2 })[level], 0);
    const candidateEvidenceConfidence = confidenceFromGrade(candidate?.evidence_grade);
    const scored = {
      product_id:candidate.product_id,
      category:candidate.category,
      game_id:context.game_id,
      input_method:context.input_method,
      recommendation_score:Math.round(clamp01(raw) * 100),
      // Real purchase outcomes do not exist yet. Recommendation confidence is
      // intentionally capped at Medium until highConfidenceGate is satisfied.
      confidence:candidateEvidenceConfidence === "Low" || !currentDeltaKnown ? "Low" : confidencePoints >= 2 ? "Medium" : "Low",
      evidence_grade:candidate?.evidence_grade || "D",
      components:{ game_fit:gameFit.score, preference_fit:preferenceFit.score, current_gear_delta:currentDelta, value, evidence, compatibility },
      value_alternative_verified:valueAlternativeVerified,
      current_gear_delta_assessment:candidate?.current_gear_delta_assessment || null,
      compatibility_assessment:compatibilityAssessment || null,
      need_assessment:cableNeedAssessment || null,
      fix_before_buy:[...(candidate?.fix_before_buy || [])],
      coverage:{ game:gameFit.coverage, preference:preferenceFit.coverage },
      regret_shield:regret,
      familiar_score:hasFiniteValue(candidate?.current_gear_delta_assessment?.similarity_score) ? clamp01(candidate.current_gear_delta_assessment.similarity_score) : 0,
      direction_codes:[...(candidate.direction_codes || [])],
      compatible:compatibility === 1,
      compatibility_status:compatibility === null ? "unknown" : compatibility === 1 ? "compatible" : "incompatible",
      safety_gate:{ budget_exceeded:budgetExceeded, price_unknown_for_budget:priceUnknownForBudget, lifecycle_blocked:lifecycleBlocked, variant_unresolved:variantBlocked, category_unknown:categoryUnknown, cable_need_unverified:cableNeedUnknown, high_priority_fix:context.high_priority_fix === true },
      data_gaps:[
        ...(candidateEvidenceConfidence === "Low" ? ["evidence_insufficient"] : []),
        ...(!currentDeltaKnown ? ["current_gear_delta_missing"] : []),
        ...(gameFit.data_gaps || []),
        ...(compatibilityUnknown ? ["compatibility_unknown"] : []),
        ...(budgetExceeded ? ["budget_exceeded"] : []),
        ...(priceUnknownForBudget ? ["price_unknown_for_budget"] : []),
        ...(lifecycleBlocked ? ["non_buyable_lifecycle"] : []),
        ...(variantBlocked ? ["exact_variant_unresolved"] : []),
        ...(categoryUnknown ? ["category_unknown"] : []),
        ...(cableNeedUnknown ? ["cable_need_unverified"] : []),
        ...(regret.data_gaps || []),
        ...(priceAssessment.status !== "known" || !priceAssessment.price_fresh ? ["price_context_unknown"] : []),
        "confidence_calibration_incomplete"
      ]
    };
    const relevantGrades = (candidate?.current_gear_delta_assessment?.compared_attributes || [])
      .filter(item => item.critical)
      .map(item => candidate?.attribute_evidence?.[item.attribute]?.grade)
      .filter(Boolean);
    scored.price_assessment = priceAssessment;
    scored.decision_readiness = readiness.evaluate({
      candidate, scored, price_assessment:priceAssessment,
      exact_game_input_profile:gameFit.exact_verified === true,
      relevant_attribute_grades:relevantGrades,
      affiliate_used_in_ranking:false,
      setup_assessment_valid:context.setup_assessment_valid === true,
      high_priority_fix:context.high_priority_fix === true
    });
    return scored;
  }

  function classifyUpgradeMatch(scored) {
    if (scored.compatibility_status === "incompatible" || scored.regret_shield.should_block) return "AVOID";
    if (scored.decision_readiness?.eligible !== true) return "DONT_UPGRADE";
    if (scored.safety_gate && Object.values(scored.safety_gate).some(Boolean)) return "DONT_UPGRADE";
    if ((scored.data_gaps || []).includes("game_fitness_evidence_missing")) return "DONT_UPGRADE";
    if ((scored.data_gaps || []).includes("setup_assessment_missing")) return "DONT_UPGRADE";
    if (scored.compatibility_status === "unknown" || scored.regret_shield.requires_clarification) return "DONT_UPGRADE";
    if (scored.evidence_grade === "D" || scored.components.evidence < 0.55) return "DONT_UPGRADE";
    if (scored.components.current_gear_delta <= 0.05) return "DONT_UPGRADE";
    if (scored.components.preference_fit >= 0.72) return "BETTER_FIT";
    if (scored.familiar_score >= 0.72 && !["high", "medium"].includes(scored.regret_shield.risk_level)) return "SAFE / FAMILIAR";
    if (scored.components.value >= 0.75 && scored.value_alternative_verified === true) return "VALUE_ALTERNATIVE";
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
    const setupAssessmentMissing = !(
      Array.isArray(input.fix_before_buy) &&
      input?.setup_assessment?.assessment_type === "observed_setup_checks" &&
      input?.setup_assessment?.status === "evaluated" &&
      Array.isArray(input.setup_assessment.checks) && input.setup_assessment.checks.length > 0 &&
      input.setup_assessment.checks.every(check => check && typeof check === "object" &&
        SETUP_CHECK_CODES.has(check.code) && SETUP_CHECK_RESULTS.has(check.result))
    );
    const highPriorityFix = (input.fix_before_buy || []).some(item => Number(item.priority) >= 90);
    const scored = (input.candidates || []).map(candidate => {
      const candidateHighPriorityFix = highPriorityFix || (candidate?.fix_before_buy || []).some(item => Number(item.priority) >= 90);
      const currentGear = Array.isArray(input.current_gear) ?
        input.current_gear.find(item => item.category === candidate.category) : input.current_gear;
      const result = scoreCandidate(candidate, {
        game_id:input.game_id,
        input_method:input.input_method,
        dna_profile:dnaProfile,
        profile:input.profile || preferences.createProfile(),
        current_gear:currentGear || null,
        budget:input.budget,
        setup_assessment_valid:!setupAssessmentMissing,
        high_priority_fix:candidateHighPriorityFix,
        as_of:input.as_of,
        region:input.region,
        currency:input.currency
      });
      const guarded = setupAssessmentMissing ? { ...result, data_gaps:[...result.data_gaps, "setup_assessment_missing"] } : result;
      return { ...guarded, upgrade_match:classifyUpgradeMatch(guarded) };
    });
    const classOrder = { "BETTER_FIT":0, "SAFE / FAMILIAR":1, "VALUE_ALTERNATIVE":2, "EXPLORE":3, "DONT_UPGRADE":4, "AVOID":5 };
    scored.sort((a,b) => classOrder[a.upgrade_match] - classOrder[b.upgrade_match] || b.recommendation_score - a.recommendation_score || String(a.product_id).localeCompare(String(b.product_id)));
    const purchasable = scored.filter(item => !["AVOID", "DONT_UPGRADE"].includes(item.upgrade_match));
    const anyHighPriorityFix = highPriorityFix || scored.some(item => item.safety_gate?.high_priority_fix === true);
    const decision = anyHighPriorityFix || !purchasable.length || purchasable[0].recommendation_score < 45 ? "DONT_UPGRADE" : "CONSIDER_UPGRADE";
    return {
      status:"ok",
      decision,
      reason_codes:anyHighPriorityFix ? ["fix_before_buy"] : setupAssessmentMissing ? ["setup_assessment_missing"] : [],
      game_context:{ game_id:dnaProfile.game_id, input_method:dnaProfile.input_method },
      recommendations:scored
    };
  }

  return {
    UPGRADE_MATCHES, CONFIDENCE_LEVELS, CATEGORY_INPUT_METHODS, BUYABLE_LIFECYCLES, evaluateRegretShield, calculatePreferenceFit,
    calculateGameFit, calculateCurrentGearDelta, hasCurrentGearDelta, highConfidenceGate, scoreCandidate, classifyUpgradeMatch,
    recommendUpgrades
  };
});
