const assert = require("node:assert/strict");
const test = require("node:test");
const dna = require("../data/game-dna.js");

test("Apex MnK and controller profiles are separated", () => {
  const mnk = dna.get("apex","mnk");
  const controller = dna.get("apex","controller");
  assert.equal(mnk.input_method, "mnk");
  assert.equal(controller.input_method, "controller");
  assert.notEqual(mnk, controller);
});

test("unregistered input profiles do not silently fall back across games", () => {
  assert.equal(dna.get("valorant","controller"), dna.get("valorant","mnk"));
  assert.equal(dna.get("overwatch2","controller"), null);
});

test("every profile uses only declared dimensions", () => {
  for (const profile of Object.values(dna.gameProfiles)) {
    assert.deepEqual(dna.validateProfile(profile), []);
  }
});