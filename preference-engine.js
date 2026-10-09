(function (root, factory) {
  const api = factory();
  root.GameFitPreferences = api;
  if (typeof module === "object" && module.exports) module.exports = api;
})(typeof window !== "undefined" ? window : globalThis, function () {
  "use strict";

  const SENTIMENTS = Object.freeze(["love","like","neutral","dislike","avoid"]);

  function createProfile() {
    return { version:1, product_feedback:[], attribute_preferences:{}, hard_avoids:{}, game_context:{} };
  }

  function recordProductFeedback(profile, entry) {
    if (!SENTIMENTS.includes(entry.sentiment)) throw new Error("invalid sentiment");
    const next = JSON.parse(JSON.stringify(profile || createProfile()));
    next.product_feedback = (next.product_feedback || []).filter(item => item.product_id !== entry.product_id);
    next.product_feedback.push({
      product_id:entry.product_id,
      category:entry.category,
      sentiment:entry.sentiment,
      reasons:Array.isArray(entry.reasons) ? [...new Set(entry.reasons)] : [],
      game_id:entry.game_id || null,
      input_method:entry.input_method || null,
      observed_at:entry.observed_at || null
    });
    return next;
  }

  function inferPreferenceConfidence(profile, attribute) {
    const values = (profile?.product_feedback || []).filter(item => (item.reasons || []).some(reason => reason.attribute === attribute));
    if (values.length >= 5) return "high";
    if (values.length >= 2) return "medium";
    return "low";
  }

  function setHardAvoid(profile, category, feature, value=true) {
    const next = JSON.parse(JSON.stringify(profile || createProfile()));
    next.hard_avoids = next.hard_avoids || {};
    next.hard_avoids[category] = next.hard_avoids[category] || {};
    next.hard_avoids[category][feature] = value;
    return next;
  }

  function nextQuestion(profile, candidates=[]) {
    if (!candidates.length) return null;
    const unanswered = candidates.filter(item => !item.answered).sort((a,b)=>(b.information_gain || 0)-(a.information_gain || 0));
    return unanswered[0] || null;
  }

  return { SENTIMENTS, createProfile, recordProductFeedback, inferPreferenceConfidence, setHardAvoid, nextQuestion };
});
