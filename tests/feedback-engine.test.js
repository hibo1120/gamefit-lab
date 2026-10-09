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

test("global learning requires multiple independent users", () => {
  assert.equal(feedback.globalLearningEligible([
    {user_key:"u1"},{user_key:"u2"}
  ]), false);
  assert.equal(feedback.globalLearningEligible([
    {user_key:"u1"},{user_key:"u2"},{user_key:"u3"}
  ]), true);
});