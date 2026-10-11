(function (root, factory) {
  const api = factory();
  root.GameFitPreferences = api;
  if (typeof module === "object" && module.exports) module.exports = api;
})(typeof window !== "undefined" ? window : globalThis, function () {
  "use strict";

  const SENTIMENTS = Object.freeze(["love", "like", "neutral", "dislike", "avoid"]);
  const TASTE_ATTRIBUTES = Object.freeze({
    mouse:Object.freeze(["shape", "length", "width", "height", "hump", "weight", "weight_balance", "click", "coating", "wheel", "skates"]),
    keyboard:Object.freeze(["layout", "switch", "actuation", "rapid_trigger", "key_weight", "sound"]),
    monitor:Object.freeze(["panel", "resolution", "refresh_rate", "response_time", "overshoot", "vrr", "brightness"]),
    mousepad:Object.freeze(["surface_speed", "stopping_power", "texture", "base_thickness", "humidity_resistance", "durability", "size"]),
    mouse_skates:Object.freeze(["material", "speed", "control", "edge_rounding", "thickness", "break_in", "durability"]),
    audio:Object.freeze(["fit", "bass", "mid", "treble", "imaging", "soundstage", "latency", "isolation", "mic"]),
    controller:Object.freeze(["layout", "stick_type", "stick_tension", "stick_latency", "polling_rate", "deadzone", "trigger", "trigger_type", "back_buttons", "weight", "grip", "wireless_latency"]),
    network:Object.freeze(["connection_type", "latency", "jitter", "packet_loss", "stability", "bufferbloat", "wifi_standard", "wifi_generation", "bands", "ethernet_speed", "wired_wan_speed", "wired_lan_speed", "coverage", "mesh", "wired_backhaul", "qos", "firmware_stability"]),
    cable:Object.freeze(["connector", "standard", "certified_bandwidth", "length", "active_passive", "compatibility", "certification", "flexibility", "weight", "drag", "durability", "bandwidth", "power_delivery"])
  });
  const HARD_AVOID_OPERATORS = Object.freeze(["equals", "includes", "gt", "gte", "lt", "lte"]);

  function clone(value) {
    return JSON.parse(JSON.stringify(value));
  }

  function createProfile() {
    return {
      version:2,
      product_feedback:[],
      attribute_preferences:{},
      hard_avoids:{},
      hard_avoid_rules:[],
      game_context:{},
      recommendation_feedback:[],
      personal_adjustments:{ products:{}, directions:{} }
    };
  }

  function isKnownAttribute(category, attribute) {
    return Array.isArray(TASTE_ATTRIBUTES[category]) && TASTE_ATTRIBUTES[category].includes(attribute);
  }

  function validateAttributePreference(entry) {
    const errors = [];
    if (!TASTE_ATTRIBUTES[entry?.category]) errors.push("category is invalid");
    if (entry?.category && !isKnownAttribute(entry.category, entry.attribute)) errors.push("attribute is invalid for category");
    if (!SENTIMENTS.includes(entry?.sentiment)) errors.push("sentiment is invalid");
    if (entry?.direction_code != null && !/^[a-z0-9_:-]+$/i.test(String(entry.direction_code))) errors.push("direction_code is invalid");
    if ((entry?.value === undefined || entry?.value === null) && !entry?.direction_code) errors.push("value or direction_code is required");
    return errors;
  }

  function normalizeReason(reason, category, fallbackSentiment) {
    if (typeof reason === "string") return { reason_code:reason };
    if (!reason || typeof reason !== "object") throw new Error("invalid preference reason");
    if (!isKnownAttribute(category, reason.attribute)) throw new Error("invalid reason attribute for category");
    const sentiment = reason.sentiment || fallbackSentiment;
    if (!SENTIMENTS.includes(sentiment)) throw new Error("invalid reason sentiment");
    return {
      attribute:reason.attribute,
      sentiment,
      value:reason.value ?? null,
      direction_code:reason.direction_code || null,
      reason_code:reason.reason_code || null
    };
  }

  function recordProductFeedback(profile, entry) {
    if (!SENTIMENTS.includes(entry.sentiment)) throw new Error("invalid sentiment");
    if (!TASTE_ATTRIBUTES[entry.category]) throw new Error("invalid category");
    const next = clone(profile || createProfile());
    const sameContext = item => item.product_id === entry.product_id &&
      (item.game_id || null) === (entry.game_id || null) &&
      (item.input_method || null) === (entry.input_method || null);
    next.product_feedback = (next.product_feedback || []).filter(item => !sameContext(item));
    next.product_feedback.push({
      product_id:entry.product_id,
      category:entry.category,
      sentiment:entry.sentiment,
      reasons:Array.isArray(entry.reasons) ? entry.reasons.map(reason => normalizeReason(reason, entry.category, entry.sentiment)) : [],
      game_id:entry.game_id || null,
      input_method:entry.input_method || null,
      observed_at:entry.observed_at || null
    });
    return next;
  }

  function recordAttributePreference(profile, entry) {
    const errors = validateAttributePreference(entry);
    if (errors.length) throw new Error(errors.join("; "));
    const next = clone(profile || createProfile());
    next.attribute_preferences = next.attribute_preferences || {};
    next.attribute_preferences[entry.category] = next.attribute_preferences[entry.category] || {};
    const history = next.attribute_preferences[entry.category][entry.attribute] || [];
    const sameContext = item => (item.game_id || null) === (entry.game_id || null) &&
      (item.input_method || null) === (entry.input_method || null);
    next.attribute_preferences[entry.category][entry.attribute] = history.filter(item => !sameContext(item));
    next.attribute_preferences[entry.category][entry.attribute].push({
      sentiment:entry.sentiment,
      value:entry.value ?? null,
      direction_code:entry.direction_code || null,
      reason_code:entry.reason_code || null,
      game_id:entry.game_id || null,
      input_method:entry.input_method || null,
      observed_at:entry.observed_at || null,
      source:entry.source || "explicit"
    });
    return next;
  }

  function attributePreferencesFor(profile, category, context={}) {
    const categoryPreferences = profile?.attribute_preferences?.[category] || {};
    const result = [];
    for (const [attribute, history] of Object.entries(categoryPreferences)) {
      for (const item of history || []) {
        const gameMatches = !item.game_id || item.game_id === context.game_id;
        const inputMatches = !item.input_method || item.input_method === context.input_method;
        if (gameMatches && inputMatches) result.push({ category, attribute, ...item });
      }
    }
    return result;
  }

  function inferPreferenceConfidence(profile, categoryOrAttribute, maybeAttribute) {
    const category = maybeAttribute ? categoryOrAttribute : null;
    const attribute = maybeAttribute || categoryOrAttribute;
    const structured = category ? (profile?.attribute_preferences?.[category]?.[attribute] || []) : [];
    const productReasons = (profile?.product_feedback || []).filter(item =>
      (!category || item.category === category) && (item.reasons || []).some(reason => reason.attribute === attribute)
    );
    const count = structured.length + productReasons.length;
    if (count >= 5) return "high";
    if (count >= 2) return "medium";
    return "low";
  }

  function setHardAvoid(profile, category, feature, value=true) {
    const next = clone(profile || createProfile());
    next.hard_avoids = next.hard_avoids || {};
    next.hard_avoids[category] = next.hard_avoids[category] || {};
    next.hard_avoids[category][feature] = value;
    return next;
  }

  function addHardAvoid(profile, rule) {
    if (!isKnownAttribute(rule?.category, rule?.attribute)) throw new Error("invalid hard avoid attribute");
    const operator = rule.operator || "equals";
    if (!HARD_AVOID_OPERATORS.includes(operator)) throw new Error("invalid hard avoid operator");
    if (rule.value === undefined || rule.value === null || rule.value === "") throw new Error("hard avoid value is required");
    const next = clone(profile || createProfile());
    next.hard_avoid_rules = (next.hard_avoid_rules || []).filter(item => !(
      item.category === rule.category && item.attribute === rule.attribute &&
      (item.game_id || null) === (rule.game_id || null) &&
      (item.input_method || null) === (rule.input_method || null)
    ));
    next.hard_avoid_rules.push({
      category:rule.category,
      attribute:rule.attribute,
      operator,
      value:rule.value,
      reason_code:rule.reason_code || null,
      game_id:rule.game_id || null,
      input_method:rule.input_method || null,
      created_at:rule.created_at || null
    });
    return next;
  }

  function hardAvoidsFor(profile, category, context={}) {
    const structured = (profile?.hard_avoid_rules || []).filter(rule => rule.category === category &&
      (!rule.game_id || rule.game_id === context.game_id) &&
      (!rule.input_method || rule.input_method === context.input_method));
    const legacy = Object.entries(profile?.hard_avoids?.[category] || {}).map(([attribute,value]) => ({
      category, attribute, operator:"equals", value, reason_code:"legacy_hard_avoid",
      game_id:null, input_method:null, migrated_from:"hard_avoids"
    }));
    const seen = new Set(structured.map(rule => [rule.category,rule.attribute,rule.operator,JSON.stringify(rule.value),rule.game_id || "",rule.input_method || ""].join("|")));
    return [...structured, ...legacy.filter(rule => !seen.has([rule.category,rule.attribute,rule.operator,JSON.stringify(rule.value),"",""].join("|")))];
  }

  function nextQuestion(profile, candidates=[]) {
    if (!candidates.length) return null;
    const unanswered = candidates.filter(item => !item.answered).sort((a,b)=>(b.information_gain || 0)-(a.information_gain || 0));
    return unanswered[0] || null;
  }

  return {
    SENTIMENTS, TASTE_ATTRIBUTES, HARD_AVOID_OPERATORS, createProfile, isKnownAttribute,
    validateAttributePreference, recordProductFeedback, recordAttributePreference,
    attributePreferencesFor, inferPreferenceConfidence, setHardAvoid, addHardAvoid,
    hardAvoidsFor, nextQuestion
  };
});
