const assert = require("node:assert/strict");
const test = require("node:test");
const feedback = require("../feedback-engine.js");

test("recommendation disagreement captures reasons and desired direction", () => {
  const item = feedback.recommendationFeedback({
    product_id:"mouse-a",
    game_id:"apex",
    verdict:"disagree",
    reason_codes:["shape","price","shape"],
    desired_direction_codes:["lighter","cheaper","lighter"]
  });
  assert.deepEqual(item.reason_codes, ["shape","price"]);
  assert.deepEqual(item.desired_direction_codes, ["lighter","cheaper"]);
  assert.equal(item.scope, "personal");
});

test("global learning requires independent agreement plus post-purchase outcomes", () => {
  assert.equal(feedback.globalLearningEligible([
    {user_key:"u1", product_id:"m1", game_id:"apex", input_method:"mnk"},
    {user_key:"u2", product_id:"m1", game_id:"apex", input_method:"mnk"},
    {user_key:"u3", product_id:"m1", game_id:"apex", input_method:"mnk"}
  ]), false);

  const records = ["u1","u2","u3"].map(user_key => ({
    type:"recommendation_feedback", scope:"global_candidate", user_key,
    product_id:"m1", game_id:"apex", input_method:"mnk", verdict:"agree",
    independence_verified:true, verification_method:"moderated_research", created_at:"2026-10-01T00:00:00.000Z"
  }));
  records.push(
    { type:"post_purchase_outcome", scope:"global_candidate", user_key:"u1", product_id:"m1", game_id:"apex", input_method:"mnk", satisfaction:5, still_using:true, independence_verified:true, outcome_verified:true, verification_method:"moderated_research", evaluated_at:"2026-10-02T00:00:00.000Z" },
    { type:"post_purchase_outcome", scope:"global_candidate", user_key:"u2", product_id:"m1", game_id:"apex", input_method:"mnk", satisfaction:4, still_using:true, independence_verified:true, outcome_verified:true, verification_method:"moderated_research", evaluated_at:"2026-10-02T00:00:00.000Z" }
  );
  assert.equal(feedback.globalLearningEligible(records), true);
  assert.equal(feedback.globalLearningEligible(records.concat({
    type:"recommendation_feedback", scope:"global_candidate", user_key:"u4",
    product_id:"different", game_id:"valorant", input_method:"mnk", verdict:"agree"
  })), false);
});

test("personal disagreement re-ranks immediately without global records", () => {
  const item = feedback.recommendationFeedback({
    product_id:"mouse-a", game_id:"apex", input_method:"mnk", verdict:"disagree",
    reason_codes:["shape"], desired_direction_codes:["safer_familiar"]
  });
  const reranked = feedback.rerankPersonal([
    { product_id:"mouse-a", game_id:"apex", input_method:"mnk", recommendation_score:80, direction_codes:[] },
    { product_id:"mouse-b", game_id:"apex", input_method:"mnk", recommendation_score:75, direction_codes:["safer_familiar"] }
  ], [item, { ...item, scope:"global_candidate", product_id:"mouse-b", verdict:"agree" }]);
  assert.equal(reranked[0].product_id, "mouse-b");
  assert.equal(reranked[1].product_id, "mouse-a");
});

test("post-purchase outcome stores satisfaction, use state and disposition", () => {
  const snapshot = { product_id:"mouse-b", score:82 };
  const outcome = feedback.postPurchaseOutcome({
    recommendation_id:"rec-1", model_version:"pgi-v1", product_id:"mouse-b", prior_product_id:"mouse-a",
    game_id:"apex", input_method:"mnk", satisfaction:2, still_using:false,
    returned_to_previous:true, reason_codes:["shape"], candidate_snapshot:snapshot
  });
  snapshot.score = 1;
  assert.equal(outcome.satisfaction, 2);
  assert.equal(outcome.disposition, "returned_to_previous");
  assert.equal(outcome.returned_to_previous, true);
  assert.equal(outcome.candidate_snapshot.score, 82);
});

test("recommendation KPIs have fixed denominators and calibration", () => {
  const kpis = feedback.computeKpis({
    feedback:[
      { type:"recommendation_feedback", verdict:"agree" },
      { type:"recommendation_feedback", verdict:"disagree" },
      { type:"recommendation_feedback", verdict:"unsure" }
    ],
    rerank_events:[{ success:true }, { success:false }],
    outcomes:[
      { type:"post_purchase_outcome", satisfaction:5, still_using:true },
      { type:"post_purchase_outcome", satisfaction:1, returned_to_previous:true }
    ],
    confidence_samples:[
      { predicted_probability:0.8, success:true },
      { predicted_probability:0.8, success:false }
    ]
  });
  assert.deepEqual(kpis.recommendation_acceptance_rate, { value:0.5, sample_size:2 });
  assert.deepEqual(kpis.correction_rate, { value:0.5, sample_size:2 });
  assert.equal(kpis.re_ranking_success.value, 0.5);
  assert.equal(kpis.purchase_satisfaction.value, 3);
  assert.equal(kpis.regret_rate.value, 0.5);
  assert.equal(kpis.confidence_calibration.brier_score, 0.34);
});

test("persisted personal learning is applied once and stays context-scoped", () => {
  const item = feedback.recommendationFeedback({
    product_id:"mouse-a", game_id:"apex", input_method:"controller", verdict:"agree"
  });
  const profile = feedback.applyPersonalLearning({}, item);
  item.verdict = "disagree";
  const reranked = feedback.rerankPersonal([
    { product_id:"mouse-a", game_id:"apex", input_method:"controller", recommendation_score:50 },
    { product_id:"mouse-a", game_id:"valorant", input_method:"mnk", recommendation_score:50 }
  ], profile);
  const apex = reranked.find(row => row.game_id === "apex");
  const valorant = reranked.find(row => row.game_id === "valorant");
  assert.equal(apex.personal_adjustment, 8);
  assert.equal(valorant.personal_adjustment, 0);
  assert.equal(profile.recommendation_feedback[0].verdict, "agree");
});

test("global learning rejects missing targets and calibration rejects invalid probabilities", () => {
  const targetless = ["u1","u2","u3"].map(user_key => ({
    type:"recommendation_feedback", scope:"global_candidate", user_key, verdict:"agree"
  }));
  targetless.push(
    { type:"post_purchase_outcome", scope:"global_candidate", user_key:"u1", satisfaction:5, still_using:true },
    { type:"post_purchase_outcome", scope:"global_candidate", user_key:"u2", satisfaction:5, still_using:true }
  );
  assert.equal(feedback.globalLearningAssessment(targetless).eligible, false);
  assert.equal(feedback.confidenceCalibration([{ predicted_probability:2, success:false }]).sample_size, 0);
});

test("global outcomes must be linked to the same independent users and explicit global-candidate scope", () => {
  const feedbackRows = ["u1","u2","u3"].map(user_key => ({
    type:"recommendation_feedback", scope:"global_candidate", user_key,
    product_id:"m1", game_id:"apex", input_method:"mnk", verdict:"agree"
  }));
  const unlinkedOutcomes = ["u4","u5"].map(user_key => ({
    type:"post_purchase_outcome", scope:"global_candidate", user_key,
    product_id:"m1", game_id:"apex", input_method:"mnk", satisfaction:5, still_using:true
  }));
  assert.equal(feedback.globalLearningAssessment(feedbackRows.concat(unlinkedOutcomes)).eligible, false);
  assert.equal(feedback.globalLearningAssessment(feedbackRows.map(row => ({ ...row, scope:"personal" }))).eligible, false);
});

test("global learning counts the latest decision per user and can gate negative outcomes", () => {
  const target = { scope:"global_candidate", product_id:"m1", game_id:"apex", input_method:"mnk", independence_verified:true, verification_method:"moderated_research", created_at:"2026-10-01T00:00:00.000Z" };
  const contradictory = [
    { ...target, type:"recommendation_feedback", user_key:"u1", verdict:"agree", created_at:"2026-09-01T00:00:00.000Z" },
    { ...target, type:"recommendation_feedback", user_key:"u1", verdict:"disagree", created_at:"2026-10-01T00:00:00.000Z" },
    { ...target, type:"recommendation_feedback", user_key:"u2", verdict:"agree" },
    { ...target, type:"recommendation_feedback", user_key:"u3", verdict:"agree" },
    { ...target, type:"post_purchase_outcome", user_key:"u2", satisfaction:5, still_using:true, outcome_verified:true, evaluated_at:"2026-10-02T00:00:00.000Z" },
    { ...target, type:"post_purchase_outcome", user_key:"u3", satisfaction:5, still_using:true, outcome_verified:true, evaluated_at:"2026-10-02T00:00:00.000Z" }
  ];
  assert.equal(feedback.globalLearningAssessment(contradictory).eligible, false);

  const negative = ["u1","u2","u3"].map(user_key => ({
    ...target, type:"recommendation_feedback", user_key, verdict:"disagree"
  }));
  negative.push(
    { ...target, type:"post_purchase_outcome", user_key:"u1", satisfaction:1, still_using:false, returned_to_previous:true, outcome_verified:true, evaluated_at:"2026-10-02T00:00:00.000Z" },
    { ...target, type:"post_purchase_outcome", user_key:"u2", satisfaction:2, still_using:false, sold_or_replaced:true, outcome_verified:true, evaluated_at:"2026-10-02T00:00:00.000Z" }
  );
  const assessment = feedback.globalLearningAssessment(negative);
  assert.equal(assessment.eligible, true);
  assert.equal(assessment.direction, "negative");
});

test("post-purchase outcome rejects contradictory state", () => {
  assert.throws(() => feedback.postPurchaseOutcome({
    product_id:"mouse-a", satisfaction:5, outcome:"bad", still_using:true
  }), /conflict/);
  assert.throws(() => feedback.postPurchaseOutcome({
    product_id:"mouse-a", satisfaction:5, still_using:true, disposition:"sold"
  }), /conflict/);
});
