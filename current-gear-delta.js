(function (root, factory) {
  const api = factory();
  root.GameFitCurrentGearDelta = api;
  if (typeof module === "object" && module.exports) module.exports = api;
})(typeof window !== "undefined" ? window : globalThis, function () {
  "use strict";

  const GRADE_POINTS = Object.freeze({ A:4, B:3, C:2, D:1 });
  const MIN_EVIDENCE_GRADE = "C";
  const CATEGORY_RULES = Object.freeze({
    mouse:Object.freeze({
      shape:{ kind:"enum", critical:true }, length:{ kind:"number", threshold:2, critical:true },
      width:{ kind:"number", threshold:2, critical:true }, height:{ kind:"number", threshold:2, critical:true },
      hump:{ kind:"enum", critical:true }, weight:{ kind:"number", threshold:5, critical:true },
      click:{ kind:"enum" }, polling_rate:{ kind:"number", threshold:500 }
    }),
    keyboard:Object.freeze({
      layout:{ kind:"enum", critical:true }, switch:{ kind:"enum" }, actuation:{ kind:"number", threshold:0.2, critical:true },
      rapid_trigger:{ kind:"boolean", critical:true }, key_weight:{ kind:"number", threshold:5 },
      latency:{ kind:"number", threshold:1, objective:"lower" }, polling_rate:{ kind:"number", threshold:500 }
    }),
    monitor:Object.freeze({
      panel:{ kind:"enum", critical:true }, resolution:{ kind:"enum", critical:true },
      refresh_rate:{ kind:"number", threshold:30, objective:"higher", critical:true },
      response_time:{ kind:"number", threshold:1, objective:"lower", critical:true },
      motion_clarity:{ kind:"enum" }, vrr:{ kind:"boolean" }, brightness:{ kind:"number", threshold:50 }
    }),
    mousepad:Object.freeze({
      surface:{ kind:"enum", critical:true }, speed:{ kind:"enum", critical:true }, stopping_power:{ kind:"enum" },
      width:{ kind:"number", threshold:20 }, length:{ kind:"number", threshold:20 }, thickness:{ kind:"number", threshold:1 }
    }),
    audio:Object.freeze({
      fit:{ kind:"enum", critical:true }, bass:{ kind:"enum" }, mid:{ kind:"enum" }, treble:{ kind:"enum" },
      imaging:{ kind:"enum", critical:true }, soundstage:{ kind:"enum" }, latency:{ kind:"number", threshold:10, objective:"lower", critical:true }
    }),
    controller:Object.freeze({
      layout:{ kind:"enum", critical:true }, stick_type:{ kind:"enum", critical:true }, trigger_type:{ kind:"enum" },
      polling_rate:{ kind:"number", threshold:250, critical:true },
      stick_latency:{ kind:"number", threshold:1, objective:"lower", critical:true }, weight:{ kind:"number", threshold:20 }
    }),
    network:Object.freeze({
      wifi_generation:{ kind:"enum" }, bands:{ kind:"set" }, wired_wan_speed:{ kind:"number", threshold:1 },
      wired_lan_speed:{ kind:"number", threshold:1 }, mesh:{ kind:"boolean" }, wired_backhaul:{ kind:"boolean" },
      qos:{ kind:"boolean" }, latency:{ kind:"number", threshold:2, objective:"lower", methodology_sensitive:true },
      jitter:{ kind:"number", threshold:2, objective:"lower", methodology_sensitive:true },
      packet_loss:{ kind:"number", threshold:0.1, objective:"lower", methodology_sensitive:true },
      bufferbloat:{ kind:"number", threshold:5, objective:"lower", methodology_sensitive:true }
    }),
    cable:Object.freeze({
      connector:{ kind:"enum", critical:true }, standard:{ kind:"enum", critical:true },
      certified_bandwidth:{ kind:"number", threshold:5, critical:true }, length:{ kind:"number", threshold:0.5 },
      active_passive:{ kind:"enum" }, certification:{ kind:"enum", critical:true }
    })
  });

  function comparable(value) {
    if (value && typeof value === "object" && Object.prototype.hasOwnProperty.call(value, "normalized_value")) return value.normalized_value;
    return value;
  }

  function evidenceFor(product, attribute) {
    return product?.attribute_evidence?.[attribute] || null;
  }

  function hasMinimumEvidence(product, attribute, minimum=MIN_EVIDENCE_GRADE) {
    const item = evidenceFor(product, attribute);
    return Boolean(item && (GRADE_POINTS[item.grade] || 0) >= (GRADE_POINTS[minimum] || 0));
  }

  function sameMethodology(current, candidate, attribute) {
    const left = evidenceFor(current, attribute)?.methodology_families || [];
    const right = evidenceFor(candidate, attribute)?.methodology_families || [];
    if (!left.length || !right.length) return true;
    return left.some(item => right.includes(item));
  }

  function compareSet(left, right) {
    const a = new Set(Array.isArray(left) ? left : [left]);
    const b = new Set(Array.isArray(right) ? right : [right]);
    return a.size !== b.size || [...a].some(item => !b.has(item));
  }

  function compareAttribute(current, candidate, attribute, rule) {
    const from = comparable(current?.attributes?.[attribute]);
    const to = comparable(candidate?.attributes?.[attribute]);
    if (from === undefined || from === null || to === undefined || to === null) return { excluded:"value_missing" };
    if (!hasMinimumEvidence(current, attribute) || !hasMinimumEvidence(candidate, attribute)) return { excluded:"evidence_below_C" };
    if (rule.methodology_sensitive && !sameMethodology(current, candidate, attribute)) return { excluded:"methodology_not_comparable" };

    if (rule.kind === "number") {
      const left = Number(from);
      const right = Number(to);
      if (!Number.isFinite(left) || !Number.isFinite(right)) return { excluded:"normalized_number_missing" };
      const difference = right - left;
      const changed = Math.abs(difference) >= rule.threshold;
      let objectiveDirection = null;
      if (changed && rule.objective === "higher") objectiveDirection = difference > 0 ? "better_capacity" : "lower_capacity";
      if (changed && rule.objective === "lower") objectiveDirection = difference < 0 ? "better_measured_result" : "worse_measured_result";
      return { from:left, to:right, difference:Number(difference.toFixed(4)), changed, objective_direction:objectiveDirection };
    }
    const changed = rule.kind === "set" ? compareSet(from, to) : from !== to;
    return { from, to, changed, objective_direction:null };
  }

  function confidenceFor(comparisons, excluded, rules) {
    const critical = Object.entries(rules).filter(([, rule]) => rule.critical).map(([attribute]) => attribute);
    const comparedCritical = comparisons.filter(item => critical.includes(item.attribute)).length;
    if (comparisons.length >= 4 && comparedCritical >= Math.min(2, critical.length)) return "Medium";
    return "Low";
  }

  function preferenceDirection(attribute, comparison, options) {
    if (!comparison.changed) return "neutral";
    if (["better_capacity","better_measured_result"].includes(comparison.objective_direction)) return "benefit";
    if (["lower_capacity","worse_measured_result"].includes(comparison.objective_direction)) return "regression";
    const directions = new Set(options.desired_direction_codes || []);
    const numeric = Number(comparison.to) - Number(comparison.from);
    if (["weight","length","width","height"].includes(attribute) && Number.isFinite(numeric)) {
      const lowerCode = attribute === "weight" ? "lighter" : "smaller";
      const higherCode = attribute === "weight" ? "heavier" : "larger";
      if ((numeric < 0 && directions.has(lowerCode)) || (numeric > 0 && directions.has(higherCode))) return "benefit";
      if ((numeric > 0 && directions.has(lowerCode)) || (numeric < 0 && directions.has(higherCode))) return "regression";
    }
    const preferred = options.preferred_values?.[attribute];
    if (preferred !== undefined) return comparison.to === preferred ? "benefit" : comparison.from === preferred ? "regression" : "neutral";
    if (attribute === "hump" && directions.has("lower_hump")) return comparison.to === "low" || comparison.to === "lower" ? "benefit" : "regression";
    return "neutral";
  }

  function compareProducts(current, candidate, options={}) {
    if (!current || !candidate || current.category !== candidate.category) {
      return { status:"unknown", confidence:"Low", delta_band:"unknown", model_score:null, compared_attributes:[], excluded_attributes:[{ attribute:"category", reason:"same_category_products_required" }], high_confidence_eligible:false };
    }
    const rules = CATEGORY_RULES[candidate.category];
    if (!rules) return { status:"unknown", confidence:"Low", delta_band:"unknown", model_score:null, compared_attributes:[], excluded_attributes:[{ attribute:"category", reason:"category_not_supported" }], high_confidence_eligible:false };

    const comparisons = [];
    const excluded = [];
    for (const [attribute, rule] of Object.entries(rules)) {
      const result = compareAttribute(current, candidate, attribute, rule);
      if (result.excluded) excluded.push({ attribute, reason:result.excluded });
      else comparisons.push({ attribute, ...result, critical:rule.critical === true, evidence_floor:MIN_EVIDENCE_GRADE, preference_direction:preferenceDirection(attribute,result,options) });
    }
    const criticalCount = Object.values(rules).filter(rule => rule.critical).length;
    const criticalCompared = comparisons.filter(item => rules[item.attribute].critical).length;
    const changedCount = comparisons.filter(item => item.changed).length;
    const benefitCount = comparisons.filter(item => item.preference_direction === "benefit").length;
    const regressionCount = comparisons.filter(item => item.preference_direction === "regression").length;
    const enoughCoverage = comparisons.length >= 2 && criticalCompared >= Math.min(2, criticalCount);
    const status = enoughCoverage ? (excluded.length ? "partial" : "known") : "unknown";
    const deltaBand = !enoughCoverage ? "unknown" : changedCount >= 2 ? "meaningful_change" : changedCount === 1 ? "limited_change" : "small_change";
    const scoreByBand = { meaningful_change:0.35, limited_change:0.15, small_change:0 };
    const confidence = confidenceFor(comparisons, excluded, rules);
    const unchangedCount = comparisons.filter(item => !item.changed).length;
    return {
      assessment_type:"evidence_delta",
      status,
      confidence,
      delta_band:deltaBand,
      model_score:status === "unknown" || benefitCount === 0 || regressionCount > 0 ? null : scoreByBand[deltaBand],
      benefit_count:benefitCount,
      regression_count:regressionCount,
      neutral_change_count:changedCount - benefitCount - regressionCount,
      similarity_score:comparisons.length ? Number((unchangedCount / comparisons.length).toFixed(4)) : null,
      compared_attributes:comparisons,
      excluded_attributes:excluded,
      coverage:{ compared:comparisons.length, supported:Object.keys(rules).length, critical_compared:criticalCompared, critical_total:criticalCount },
      methodology_rule:"Values from different measurement families are not averaged.",
      high_confidence_eligible:false,
      high_confidence_lock_reason:options.outcomes_verified === true ? "provisional_gate_still_requires_calibration" : "real_purchase_outcomes_missing"
    };
  }

  return { CATEGORY_RULES, MIN_EVIDENCE_GRADE, compareProducts, hasMinimumEvidence };
});
