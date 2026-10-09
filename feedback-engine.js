(function (root, factory) {
  const api = factory();
  root.GameFitFeedback = api;
  if (typeof module === "object" && module.exports) module.exports = api;
})(typeof window !== "undefined" ? window : globalThis, function () {
  "use strict";

  const VERDICTS = Object.freeze(["agree", "disagree", "unsure"]);
  const OUTCOMES = Object.freeze(["great", "good", "neutral", "poor", "bad"]);
  const DISPOSITIONS = Object.freeze(["kept", "returned_to_previous", "sold", "exchanged", "other"]);
  const REASON_CODES = Object.freeze([
    "shape", "size", "weight", "click", "price", "brand", "game_fit", "durability", "software", "current_gear_delta_small",
    "wrong_shape", "wrong_size", "too_heavy", "too_light", "too_expensive",
    "insufficient_delta", "game_mismatch", "input_mismatch", "comfort", "sound", "latency",
    "evidence_weak", "other"
  ]);
  const DIRECTION_CODES = Object.freeze([
    "lighter", "heavier", "smaller", "larger", "lower_hump", "cheaper", "same_brand", "different_brand",
    "higher_performance", "safer_familiar", "do_not_upgrade", "more_control", "more_speed",
    "lower_latency", "better_fit", "different_layout", "more_bass", "less_bass"
  ]);

  function uniqueCodes(values) {
    return [...new Set((values || []).filter(value => typeof value === "string" && /^[a-z0-9_:-]+$/i.test(value)))];
  }

  function cloneSerializable(value) {
    return value == null ? null : JSON.parse(JSON.stringify(value));
  }

  function recommendationFeedback(input) {
    if (!VERDICTS.includes(input.verdict)) throw new Error("invalid verdict");
    const reasonCodes = uniqueCodes(input.reason_codes);
    const desiredDirections = uniqueCodes(input.desired_direction_codes);
    if (input.verdict === "disagree" && (!reasonCodes.length || !desiredDirections.length)) {
      throw new Error("disagree requires reason_codes and desired_direction_codes");
    }
    return {
      type:"recommendation_feedback",
      recommendation_id:input.recommendation_id || null,
      product_id:input.product_id || null,
      category:input.category || null,
      game_id:input.game_id || null,
      input_method:input.input_method || null,
      verdict:input.verdict,
      reason_codes:reasonCodes,
      desired_direction_codes:desiredDirections,
      confidence_at_recommendation:input.confidence_at_recommendation || null,
      scope:"personal",
      created_at:input.created_at || null
    };
  }

  function postPurchaseOutcome(input) {
    let satisfaction = Number(input.satisfaction);
    if (!Number.isFinite(satisfaction) && OUTCOMES.includes(input.outcome)) {
      satisfaction = ({ great:5, good:4, neutral:3, poor:2, bad:1 })[input.outcome];
    }
    if (!Number.isInteger(satisfaction) || satisfaction < 1 || satisfaction > 5) {
      throw new Error("satisfaction must be an integer from 1 to 5");
    }
    const outcome = input.outcome || ([null, "bad", "poor", "neutral", "good", "great"])[satisfaction];
    if (!OUTCOMES.includes(outcome)) throw new Error("invalid outcome");
    const expectedSatisfaction = ({ great:5, good:4, neutral:3, poor:2, bad:1 })[outcome];
    if (expectedSatisfaction !== satisfaction) throw new Error("outcome and satisfaction conflict");
    const disposition = input.disposition || (input.returned_to_previous ? "returned_to_previous" :
      input.sold_or_replaced ? "sold" : input.exchanged ? "exchanged" : "kept");
    if (!DISPOSITIONS.includes(disposition)) throw new Error("invalid disposition");
    if (input.still_using === true && disposition !== "kept") throw new Error("still_using conflicts with disposition");
    if (disposition === "kept" && (input.returned_to_previous === true || input.sold_or_replaced === true || input.exchanged === true)) {
      throw new Error("kept disposition conflicts with exit flags");
    }
    return {
      type:"post_purchase_outcome",
      recommendation_id:input.recommendation_id || null,
      model_version:input.model_version || null,
      candidate_snapshot:cloneSerializable(input.candidate_snapshot),
      product_id:input.product_id,
      prior_product_id:input.prior_product_id || null,
      game_id:input.game_id || null,
      input_method:input.input_method || null,
      outcome,
      satisfaction,
      still_using:input.still_using === true,
      returned_to_previous:input.returned_to_previous === true || disposition === "returned_to_previous",
      sold_or_replaced:input.sold_or_replaced === true || ["sold", "exchanged"].includes(disposition),
      exchanged:input.exchanged === true || disposition === "exchanged",
      disposition,
      reason_codes:uniqueCodes(input.reason_codes),
      purchased_at:input.purchased_at || null,
      evaluated_at:input.evaluated_at || null,
      created_at:input.created_at || null,
      scope:"personal"
    };
  }

  function applyPersonalLearning(profile, feedback) {
    if (feedback?.type !== "recommendation_feedback" || feedback.scope !== "personal") {
      throw new Error("personal recommendation feedback is required");
    }
    const next = JSON.parse(JSON.stringify(profile || {}));
    next.recommendation_feedback = next.recommendation_feedback || [];
    next.recommendation_feedback.push(cloneSerializable(feedback));
    next.personal_adjustments = next.personal_adjustments || { products:{}, directions:{} };
    next.personal_adjustments.products = next.personal_adjustments.products || {};
    next.personal_adjustments.directions = next.personal_adjustments.directions || {};
    if (feedback.product_id) {
      const delta = feedback.verdict === "agree" ? 8 : feedback.verdict === "disagree" ? -12 : 0;
      const key = contextKey(feedback, feedback.product_id);
      next.personal_adjustments.products[key] = Number(next.personal_adjustments.products[key] || 0) + delta;
    }
    if (feedback.verdict === "disagree") {
      for (const code of feedback.desired_direction_codes) {
        const key = contextKey(feedback, code);
        next.personal_adjustments.directions[key] = Number(next.personal_adjustments.directions[key] || 0) + 4;
      }
    }
    return next;
  }

  function rerankPersonal(recommendations, profileOrFeedback) {
    const isRecordList = Array.isArray(profileOrFeedback);
    const records = isRecordList ? profileOrFeedback : [];
    const persisted = isRecordList ? { products:{}, directions:{} } :
      (profileOrFeedback?.personal_adjustments || { products:{}, directions:{} });
    const safetyBucket = item => item.upgrade_match === "AVOID" ? 2 : item.upgrade_match === "DONT_UPGRADE" ? 1 : 0;
    return (recommendations || []).map(item => {
      let adjustment = Number(persisted.products?.[contextKey(item, item.product_id)] || 0);
      for (const code of item.direction_codes || []) adjustment += Number(persisted.directions?.[contextKey(item, code)] || 0);
      for (const feedback of records) {
        if (feedback.scope !== "personal" || feedback.type !== "recommendation_feedback") continue;
        if (!sameContext(feedback, item)) continue;
        if (feedback.product_id === item.product_id) {
          adjustment += feedback.verdict === "agree" ? 8 : feedback.verdict === "disagree" ? -12 : 0;
        }
        if (feedback.verdict === "disagree") {
          adjustment += (item.direction_codes || []).filter(code => feedback.desired_direction_codes.includes(code)).length * 4;
          adjustment -= (item.risk_codes || []).filter(code => feedback.reason_codes.includes(code)).length * 3;
        }
      }
      return { ...item, personal_adjustment:adjustment, personalized_score:Number(item.recommendation_score || 0) + adjustment };
    }).sort((a,b) => safetyBucket(a) - safetyBucket(b) || b.personalized_score - a.personalized_score || String(a.product_id).localeCompare(String(b.product_id)));
  }

  function learningExplanation(beforeProfile, afterProfile, feedback, beforeRanking=[], afterRanking=[]) {
    if (feedback?.type !== "recommendation_feedback") throw new Error("recommendation feedback is required");
    const beforeAdjustments = beforeProfile?.personal_adjustments || { products:{}, directions:{} };
    const afterAdjustments = afterProfile?.personal_adjustments || { products:{}, directions:{} };
    const preferenceUpdates = [];
    for (const [kind, values] of Object.entries(afterAdjustments)) {
      for (const [key, value] of Object.entries(values || {})) {
        const previous = Number(beforeAdjustments?.[kind]?.[key] || 0);
        const next = Number(value || 0);
        if (previous !== next) preferenceUpdates.push({ kind, key, previous, next, delta:next - previous });
      }
    }
    const beforePositions = new Map((beforeRanking || []).map((item, index) => [item.product_id, { index, score:Number(item.personalized_score ?? item.recommendation_score ?? 0) }]));
    const rankingChanges = (afterRanking || []).map((item, index) => {
      const before = beforePositions.get(item.product_id);
      return {
        product_id:item.product_id,
        previous_rank:before ? before.index + 1 : null,
        new_rank:index + 1,
        rank_delta:before ? before.index - index : null,
        score_delta:before ? Number((Number(item.personalized_score ?? item.recommendation_score ?? 0) - before.score).toFixed(4)) : null
      };
    });
    const targetChange = rankingChanges.find(item => item.product_id === feedback.product_id) || null;
    const afterTarget = (afterRanking || []).find(item => item.product_id === feedback.product_id);
    const beforeTarget = (beforeRanking || []).find(item => item.product_id === feedback.product_id);
    const confidenceBefore = feedback.confidence_at_recommendation || beforeTarget?.confidence || null;
    const confidenceAfter = afterTarget?.confidence || confidenceBefore;
    return {
      scope:"personal",
      global_model_changed:false,
      trigger:{ verdict:feedback.verdict, reason_codes:[...(feedback.reason_codes || [])], desired_direction_codes:[...(feedback.desired_direction_codes || [])] },
      preference_updates:preferenceUpdates,
      ranking_changes:rankingChanges,
      user_facing_explanation:{
        preference_changed:[
          ...(feedback.reason_codes || []).map(code => ({ category:"rejected_reason", code })),
          ...(feedback.desired_direction_codes || []).map(code => ({ category:"desired_direction", code }))
        ],
        candidate_rank_changed:Boolean(targetChange && targetChange.rank_delta !== 0),
        why_ranking_changed:[
          ...(feedback.verdict === "disagree" ? ["rejected_candidate_penalty"] : feedback.verdict === "agree" ? ["accepted_candidate_support"] : []),
          ...((feedback.desired_direction_codes || []).length ? ["desired_direction_match"] : [])
        ],
        confidence_changed:confidenceBefore !== confidenceAfter,
        confidence_before:confidenceBefore,
        confidence_after:confidenceAfter,
        safety_boundary_preserved:true
      },
      explanation_rule:"One user's feedback changes only that user's context-scoped adjustments."
    };
  }

  function applyPersonalLearningWithExplanation(profile, feedback, recommendations=[]) {
    const beforeRanking = rerankPersonal(recommendations, profile || {});
    const nextProfile = applyPersonalLearning(profile, feedback);
    const afterRanking = rerankPersonal(recommendations, nextProfile);
    return { profile:nextProfile, recommendations:afterRanking, explanation:learningExplanation(profile || {}, nextProfile, feedback, beforeRanking, afterRanking) };
  }

  function targetKey(record) {
    return [record.product_id || "", record.game_id || "", record.input_method || ""].join("|");
  }

  function contextKey(record, subject) {
    return [record.game_id || "*", record.input_method || "*", subject || ""].join("|");
  }

  function sameContext(left, right) {
    return (left.game_id || null) === (right.game_id || null) &&
      (left.input_method || null) === (right.input_method || null);
  }

  function latestByUser(records) {
    const latest = new Map();
    for (const record of records) latest.set(record.user_key, record);
    return [...latest.values()];
  }

  function globalLearningAssessment(records, options={}) {
    const minIndependent = Number(options.minIndependent || 3);
    const minOutcomes = Number(options.minOutcomes || 2);
    const minAgreementRatio = Number(options.minAgreementRatio || 0.67);
    const valid = (records || []).filter(item => item && item.user_key && item.product_id && item.game_id && item.input_method && item.scope === "global_candidate");
    if (valid.length !== (records || []).length) {
      return { eligible:false, reason:"missing_target_or_user", independent_users:0, outcome_users:0, agreement_ratio:null };
    }
    const keys = new Set(valid.map(targetKey));
    if (keys.size !== 1) {
      return { eligible:false, reason:"mixed_or_missing_target", independent_users:0, outcome_users:0, agreement_ratio:null };
    }
    const feedback = latestByUser(valid.filter(item => item.type === "recommendation_feedback" && ["agree", "disagree"].includes(item.verdict)));
    const independentUsers = new Set(feedback.map(item => item.user_key));
    const agreeUsers = new Set(feedback.filter(item => item.verdict === "agree").map(item => item.user_key));
    const agreementRatio = independentUsers.size ? agreeUsers.size / independentUsers.size : 0;
    const disagreementRatio = independentUsers.size ? 1 - agreementRatio : 0;
    const outcomes = latestByUser(valid.filter(item => item.type === "post_purchase_outcome" && Number.isInteger(Number(item.satisfaction)) && independentUsers.has(item.user_key)));
    const outcomeUsers = new Set(outcomes.map(item => item.user_key));
    const positiveOutcomeUsers = new Set(outcomes.filter(item => Number(item.satisfaction) >= 4 && item.still_using === true &&
      item.returned_to_previous !== true && item.sold_or_replaced !== true).map(item => item.user_key));
    const negativeOutcomeUsers = new Set(outcomes.filter(item => Number(item.satisfaction) <= 2 ||
      item.returned_to_previous === true || item.sold_or_replaced === true).map(item => item.user_key));
    const direction = agreementRatio >= minAgreementRatio && positiveOutcomeUsers.size >= minOutcomes ? "positive" :
      disagreementRatio >= minAgreementRatio && negativeOutcomeUsers.size >= minOutcomes ? "negative" : "mixed";
    const eligible = independentUsers.size >= minIndependent && outcomeUsers.size >= minOutcomes && direction !== "mixed";
    return {
      eligible,
      reason:eligible ? "evidence_gate_passed" : "insufficient_independent_feedback_and_outcomes",
      independent_users:independentUsers.size,
      outcome_users:outcomeUsers.size,
      positive_outcome_users:positiveOutcomeUsers.size,
      negative_outcome_users:negativeOutcomeUsers.size,
      agreement_ratio:Number(agreementRatio.toFixed(4)),
      disagreement_ratio:Number(disagreementRatio.toFixed(4)),
      direction
    };
  }

  function globalLearningEligible(records, minIndependent=3) {
    return globalLearningAssessment(records, { minIndependent }).eligible;
  }

  function rate(numerator, denominator) {
    return denominator ? Number((numerator / denominator).toFixed(4)) : null;
  }

  function confidenceCalibration(samples) {
    const valid = (samples || []).filter(item => Number.isFinite(Number(item.predicted_probability)) &&
      Number(item.predicted_probability) >= 0 && Number(item.predicted_probability) <= 1 &&
      (item.success === true || item.success === false));
    if (!valid.length) return { sample_size:0, brier_score:null, mean_confidence:null, observed_success_rate:null };
    const brier = valid.reduce((sum, item) => sum + Math.pow(Number(item.predicted_probability) - (item.success ? 1 : 0), 2), 0) / valid.length;
    const mean = valid.reduce((sum, item) => sum + Number(item.predicted_probability), 0) / valid.length;
    const success = valid.filter(item => item.success).length / valid.length;
    return {
      sample_size:valid.length,
      brier_score:Number(brier.toFixed(4)),
      mean_confidence:Number(mean.toFixed(4)),
      observed_success_rate:Number(success.toFixed(4)),
      calibration_gap:Number(Math.abs(mean - success).toFixed(4))
    };
  }

  function computeKpis(input={}) {
    const feedback = (input.feedback || []).filter(item => item.type === "recommendation_feedback");
    const decided = feedback.filter(item => ["agree", "disagree"].includes(item.verdict));
    const agree = decided.filter(item => item.verdict === "agree").length;
    const disagree = decided.filter(item => item.verdict === "disagree").length;
    const reranks = input.rerank_events || [];
    const rerankSuccess = reranks.filter(item => item.success === true).length;
    const outcomes = (input.outcomes || []).filter(item => item.type === "post_purchase_outcome");
    const satisfactionValues = outcomes.map(item => Number(item.satisfaction)).filter(value => Number.isFinite(value));
    const regret = outcomes.filter(item => Number(item.satisfaction) <= 2 || item.returned_to_previous === true || item.sold_or_replaced === true).length;
    return {
      recommendation_acceptance_rate:{ value:rate(agree, decided.length), sample_size:decided.length },
      correction_rate:{ value:rate(disagree, decided.length), sample_size:decided.length },
      re_ranking_success:{ value:rate(rerankSuccess, reranks.length), sample_size:reranks.length },
      purchase_satisfaction:{
        value:satisfactionValues.length ? Number((satisfactionValues.reduce((a,b)=>a+b,0) / satisfactionValues.length).toFixed(2)) : null,
        sample_size:satisfactionValues.length
      },
      regret_rate:{ value:rate(regret, outcomes.length), sample_size:outcomes.length },
      confidence_calibration:confidenceCalibration(input.confidence_samples || [])
    };
  }

  return {
    VERDICTS, OUTCOMES, DISPOSITIONS, REASON_CODES, DIRECTION_CODES,
    recommendationFeedback, postPurchaseOutcome, applyPersonalLearning, applyPersonalLearningWithExplanation, rerankPersonal, learningExplanation,
    globalLearningAssessment, globalLearningEligible, confidenceCalibration, computeKpis
  };
});
