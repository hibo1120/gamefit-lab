const assert = require("node:assert/strict");
const test = require("node:test");
const prefs = require("../preference-engine.js");

test("product feedback replaces prior feedback for the same product", () => {
  let profile = prefs.createProfile();
  profile = prefs.recordProductFeedback(profile, { product_id:"a", category:"mouse", sentiment:"like", reasons:[] });
  profile = prefs.recordProductFeedback(profile, { product_id:"a", category:"mouse", sentiment:"dislike", reasons:[] });
  assert.equal(profile.product_feedback.length, 1);
  assert.equal(profile.product_feedback[0].sentiment, "dislike");
});

test("hard avoids are explicit and personal", () => {
  const profile = prefs.setHardAvoid(prefs.createProfile(), "mouse", "high_rear_hump", true);
  assert.equal(profile.hard_avoids.mouse.high_rear_hump, true);
});

test("preference detective asks highest-information unanswered question first", () => {
  const question = prefs.nextQuestion({}, [
    { id:"q1", information_gain:0.2, answered:false },
    { id:"q2", information_gain:0.8, answered:false },
    { id:"q3", information_gain:1.0, answered:true }
  ]);
  assert.equal(question.id, "q2");
});