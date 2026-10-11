const assert = require("node:assert/strict");
const test = require("node:test");
const priority = require("../priority-engine.js");

test("higher improvement impact increases priority when other factors are equal", () => {
  const low = priority.scoreCategory({ improvement_impact:0.2, game_fit:0.8, current_gear_delta:0.5, price_efficiency:0.5, evidence_strength:0.8, risk_compatibility:0.8 });
  const high = priority.scoreCategory({ improvement_impact:0.9, game_fit:0.8, current_gear_delta:0.5, price_efficiency:0.5, evidence_strength:0.8, risk_compatibility:0.8 });
  assert.ok(high > low);
});

test("priority engine has no trend or affiliate weight", () => {
  assert.equal("trend" in priority.DEFAULT_WEIGHTS, false);
  assert.equal("affiliate" in priority.DEFAULT_WEIGHTS, false);
  assert.equal("commission" in priority.DEFAULT_WEIGHTS, false);
});

test("keep current is a valid outcome", () => {
  assert.equal(priority.shouldKeepCurrent(20), true);
  assert.equal(priority.shouldKeepCurrent(60), false);
});