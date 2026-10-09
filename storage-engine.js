(function (root, factory) {
  const api = factory();
  root.GameFitStorage = api;
  if (typeof module === "object" && module.exports) module.exports = api;
})(typeof window !== "undefined" ? window : globalThis, function () {
  "use strict";

  const STORAGE_KEY = "gamefit.personal_gear.v1";
  const SCHEMA_VERSION = 1;
  const MAX_BYTES = 512 * 1024;
  const MAX_RECORDS = 500;
  const RETENTION_DAYS = 365;
  const FORBIDDEN_KEYS = new Set(["__proto__", "prototype", "constructor"]);
  const SENSITIVE_KEYS = new Set(["email","phone","address","full_name","real_name","secret","token","password","free_text","ip_address","device_id","contact","serial_number","serial","account_id","advertising_id"]);
  const ROOT_KEYS = new Set(["schema_version","profile","setup","recommendations","feedback","outcomes","rerank_events","confidence_samples","updated_at"]);
  const PROFILE_KEYS = new Set(["version","product_feedback","attribute_preferences","hard_avoids","hard_avoid_rules","game_context","recommendation_feedback","personal_adjustments"]);
  const SETUP_KEYS = new Set(["category","current_product_id","budget_band","game_id","input_method","platform"]);

  function createState() {
    return {
      schema_version:SCHEMA_VERSION,
      profile:{ version:2, product_feedback:[], attribute_preferences:{}, hard_avoids:{}, hard_avoid_rules:[], game_context:{}, recommendation_feedback:[], personal_adjustments:{ products:{}, directions:{} } },
      setup:{}, recommendations:[], feedback:[], outcomes:[], rerank_events:[], confidence_samples:[],
      updated_at:null
    };
  }

  function isPlainObject(value) {
    if (!value || typeof value !== "object" || Array.isArray(value)) return false;
    const prototype = Object.getPrototypeOf(value);
    return prototype === Object.prototype || prototype === null;
  }

  function validateSafeTree(value, path="root", depth=0) {
    const errors = [];
    if (depth > 12) return [path + " exceeds maximum nesting"];
    if (Array.isArray(value)) {
      if (value.length > 5000) errors.push(path + " is too large");
      value.forEach((item, index) => errors.push(...validateSafeTree(item, `${path}[${index}]`, depth + 1)));
      return errors;
    }
    if (value && typeof value === "object") {
      if (!isPlainObject(value)) return [path + " must be a plain object"];
      for (const [key, child] of Object.entries(value)) {
        const canonicalKey = key.toLowerCase().replace(/[^a-z0-9]/g, "");
        if (FORBIDDEN_KEYS.has(key)) errors.push(path + "." + key + " is prohibited");
        else if (SENSITIVE_KEYS.has(key.toLowerCase()) || /^(contact|contactinfo|serial|serialnumber|serialno|email|phone|address|fullname|realname|secret|token|password|freetext|ipaddress|deviceid|accountid|advertisingid|note|notes)$/.test(canonicalKey)) errors.push(path + "." + key + " is not permitted in local storage");
        else errors.push(...validateSafeTree(child, path + "." + key, depth + 1));
      }
      return errors;
    }
    if (typeof value === "number" && !Number.isFinite(value)) errors.push(path + " must be finite");
    if (typeof value === "string" && value.length > 20000) errors.push(path + " string is too large");
    return errors;
  }

  function validateState(state) {
    const errors = [];
    if (!isPlainObject(state)) return ["state must be an object"];
    if (!Number.isInteger(state.schema_version)) errors.push("schema_version must be an integer");
    if (state.schema_version !== SCHEMA_VERSION) errors.push("schema_version is unsupported");
    if (!isPlainObject(state.profile)) errors.push("profile must be an object");
    for (const key of Object.keys(state)) if (!ROOT_KEYS.has(key)) errors.push("root." + key + " is not allowed");
    if (isPlainObject(state.profile)) for (const key of Object.keys(state.profile)) if (!PROFILE_KEYS.has(key)) errors.push("root.profile." + key + " is not allowed");
    if (isPlainObject(state.setup)) for (const key of Object.keys(state.setup)) if (!SETUP_KEYS.has(key)) errors.push("root.setup." + key + " is not allowed");
    for (const key of ["recommendations", "feedback", "outcomes", "rerank_events", "confidence_samples"]) {
      if (!Array.isArray(state[key])) errors.push(key + " must be an array");
      else if (state[key].length > MAX_RECORDS) errors.push(key + " exceeds retention limit");
    }
    errors.push(...validateSafeTree(state));
    return [...new Set(errors)];
  }

  function migrateState(value) {
    if (!isPlainObject(value)) throw new Error("stored state is not an object");
    if (value.schema_version === SCHEMA_VERSION) return value;
    if (value.schema_version === 0 || value.schema_version === undefined) {
      const next = createState();
      if (isPlainObject(value.profile)) next.profile = value.profile;
      if (Array.isArray(value.feedback)) next.feedback = value.feedback;
      if (Array.isArray(value.outcomes)) next.outcomes = value.outcomes;
      next.updated_at = value.updated_at || null;
      return next;
    }
    if (Number(value.schema_version) > SCHEMA_VERSION) {
      const error = new Error("stored schema is newer than this UI");
      error.code = "FUTURE_SCHEMA";
      throw error;
    }
    throw new Error("stored schema cannot be migrated safely");
  }

  function pruneExpiredRecords(state, now=new Date().toISOString()) {
    const next = JSON.parse(JSON.stringify(state));
    const nowMs = Date.parse(now);
    if (!Number.isFinite(nowMs)) throw new Error("retention clock is invalid");
    const cutoff = nowMs - RETENTION_DAYS * 86400000;
    for (const key of ["recommendations", "feedback", "outcomes", "rerank_events", "confidence_samples"]) {
      if (!Array.isArray(next[key])) continue;
      next[key] = next[key].filter(item => {
        const timestamp = item?.created_at || item?.completed_at || item?.recorded_at || null;
        if (!timestamp) return true;
        const parsed = Date.parse(timestamp);
        return Number.isFinite(parsed) && parsed >= cutoff && parsed <= nowMs + 86400000;
      });
    }
    if (Array.isArray(next.profile?.product_feedback)) next.profile.product_feedback = next.profile.product_feedback.filter(item => {
      const timestamp = item?.created_at || null;
      if (!timestamp) return true;
      const parsed = Date.parse(timestamp);
      return Number.isFinite(parsed) && parsed >= cutoff && parsed <= nowMs + 86400000;
    });
    if (Array.isArray(next.profile?.recommendation_feedback)) next.profile.recommendation_feedback = next.profile.recommendation_feedback.filter(item => {
      const timestamp = item?.created_at || null;
      if (!timestamp) return true;
      const parsed = Date.parse(timestamp);
      return Number.isFinite(parsed) && parsed >= cutoff && parsed <= nowMs + 86400000;
    });
    return next;
  }

  function parse(raw) {
    if (typeof raw !== "string" || !raw.trim()) throw new Error("stored data is empty");
    if (raw.length > MAX_BYTES) throw new Error("stored data is too large");
    const parsed = JSON.parse(raw);
    const migrated = pruneExpiredRecords(migrateState(parsed));
    const errors = validateState(migrated);
    if (errors.length) throw new Error(errors.join("; "));
    return JSON.parse(JSON.stringify(migrated));
  }

  function load(storage) {
    let raw;
    try {
      raw = storage?.getItem?.(STORAGE_KEY);
    } catch (error) {
      return { status:"unavailable", state:createState(), read_only:true, recovery_required:false, error:error.message };
    }
    if (raw == null) return { status:"empty", state:createState(), read_only:false, recovery_required:false };
    try {
      return { status:"ok", state:parse(raw), read_only:false, recovery_required:false };
    } catch (error) {
      if (error.code === "FUTURE_SCHEMA") {
        return { status:"future_schema", state:null, recovery_raw:raw, read_only:true, recovery_required:true, error:error.message };
      }
      return { status:"corrupt", state:createState(), recovery_raw:raw, read_only:true, recovery_required:true, error:error.message };
    }
  }

  function save(storage, state, now=new Date().toISOString()) {
    const next = pruneExpiredRecords(state,now);
    next.schema_version = SCHEMA_VERSION;
    next.updated_at = now;
    const errors = validateState(next);
    if (errors.length) throw new Error(errors.join("; "));
    const serialized = JSON.stringify(next);
    if (serialized.length > MAX_BYTES) throw new Error("state exceeds local storage limit");
    storage.setItem(STORAGE_KEY, serialized);
    return next;
  }

  function exportState(state) {
    const errors = validateState(state);
    if (errors.length) throw new Error(errors.join("; "));
    return JSON.stringify(state, null, 2);
  }

  function exportRecovery(raw) {
    if (typeof raw !== "string" || !raw.length) throw new Error("recovery data is unavailable");
    return raw;
  }

  function deleteAll(storage) {
    const keys = [];
    for (let index = 0; index < Number(storage?.length || 0); index += 1) {
      const key = storage.key(index);
      if (key && key.startsWith("gamefit.personal_gear.")) keys.push(key);
    }
    if (!keys.includes(STORAGE_KEY) && storage?.getItem?.(STORAGE_KEY) != null) keys.push(STORAGE_KEY);
    keys.forEach(key => storage.removeItem(key));
    return keys.length;
  }

  function reset(storage) {
    deleteAll(storage);
    return save(storage, createState());
  }

  return {
    STORAGE_KEY, SCHEMA_VERSION, MAX_BYTES, MAX_RECORDS, RETENTION_DAYS, FORBIDDEN_KEYS, SENSITIVE_KEYS,
    createState, validateState, migrateState, pruneExpiredRecords, parse, load, save, exportState, exportRecovery, deleteAll, reset
  };
});
