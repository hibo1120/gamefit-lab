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

test("Gear Taste exposes category-specific attribute taxonomies", () => {
  const required = {
    mouse:["shape","length","width","height","hump","weight","weight_balance","click","coating","wheel","skates"],
    keyboard:["layout","switch","actuation","rapid_trigger","key_weight","sound"],
    monitor:["panel","resolution","refresh_rate","response_time","overshoot","vrr","brightness"],
    audio:["fit","bass","mid","treble","imaging","soundstage","latency"]
  };
  for (const category of ["mouse","keyboard","monitor","mousepad","mouse_skates","audio","controller","network","cable"]) {
    assert.ok(prefs.TASTE_ATTRIBUTES[category], category);
  }
  for (const [category, attributes] of Object.entries(required)) {
    for (const attribute of attributes) assert.ok(prefs.TASTE_ATTRIBUTES[category].includes(attribute), `${category}.${attribute}`);
  }
});

test("structured preference reasons are validated inside their category", () => {
  let profile = prefs.createProfile();
  profile = prefs.recordAttributePreference(profile, {
    category:"mouse", attribute:"hump", sentiment:"dislike", value:"rear_high",
    direction_code:"lower_center_hump", game_id:"apex", input_method:"mnk"
  });
  assert.equal(profile.attribute_preferences.mouse.hump[0].value, "rear_high");
  assert.throws(() => prefs.recordAttributePreference(profile, {
    category:"mouse", attribute:"overshoot", sentiment:"dislike"
  }), /attribute is invalid/);
  assert.throws(() => prefs.recordAttributePreference(profile, {
    category:"mouse", attribute:"weight", sentiment:"dislike"
  }), /value or direction_code is required/);
});

test("product feedback remains separate across game and input contexts", () => {
  let profile = prefs.createProfile();
  profile = prefs.recordProductFeedback(profile, {
    product_id:"shared-device", category:"controller", sentiment:"like", reasons:[], game_id:"apex", input_method:"controller"
  });
  profile = prefs.recordProductFeedback(profile, {
    product_id:"shared-device", category:"controller", sentiment:"dislike", reasons:[], game_id:"fortnite", input_method:"controller"
  });
  assert.equal(profile.product_feedback.length, 2);
});

test("structured hard avoids carry category, value and context", () => {
  const profile = prefs.addHardAvoid(prefs.createProfile(), {
    category:"monitor", attribute:"panel", value:"tn", game_id:"apex", input_method:"mnk", reason_code:"poor_viewing_angles"
  });
  assert.equal(prefs.hardAvoidsFor(profile, "monitor", { game_id:"apex", input_method:"mnk" }).length, 1);
  assert.equal(prefs.hardAvoidsFor(profile, "monitor", { game_id:"valorant", input_method:"mnk" }).length, 0);
});
