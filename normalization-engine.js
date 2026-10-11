(function (root, factory) {
  const api = factory();
  root.GameFitNormalization = api;
  if (typeof module === "object" && module.exports) module.exports = api;
})(typeof window !== "undefined" ? window : globalThis, function () {
  "use strict";

  const UNIT_ALIASES = Object.freeze({
    g:"g", gram:"g", grams:"g", kg:"kg",
    mm:"mm", millimeter:"mm", millimeters:"mm", cm:"cm", in:"in", inch:"in", inches:"in",
    hz:"hz", khz:"khz", mhz:"mhz",
    ms:"ms", millisecond:"ms", milliseconds:"ms", us:"us", "µs":"us",
    bps:"bps", kbps:"kbps", mbps:"mbps", gbps:"gbps", tbps:"tbps",
    w:"w", watt:"w", watts:"w", "%":"pct", pct:"pct", percent:"pct"
  });
  const PANEL_ALIASES = Object.freeze({
    ips:"ips", "fast ips":"fast_ips", fastips:"fast_ips", tn:"tn", "fast tn":"fast_tn", fasttn:"fast_tn",
    oled:"oled", woled:"woled", "qd-oled":"qd_oled", qdoled:"qd_oled", va:"va", "fast va":"fast_va"
  });
  const SHAPE_ALIASES = Object.freeze({
    symmetric:"symmetrical", symmetrical:"symmetrical", ambidextrous:"symmetrical", ambi:"symmetrical",
    "right-handed symmetrical":"right_handed_symmetrical", "right handed symmetrical":"right_handed_symmetrical",
    ergonomic:"ergonomic", ergo:"ergonomic", "right-handed":"right_handed", "right handed":"right_handed",
    "left-handed":"left_handed", "left handed":"left_handed"
  });
  const HUMP_ALIASES = Object.freeze({
    rear:"rear", back:"rear", "rear hump":"rear", "back hump":"rear", "rear-shifted":"rear", "rear shifted":"rear",
    "rear high":"rear_high", "high rear":"rear_high", "high rear hump":"rear_high",
    center:"center", central:"center", "center hump":"center", "central hump":"center",
    "center low":"center_low", "low center":"center_low", "low center hump":"center_low",
    front:"front", "front hump":"front"
  });
  const BOOLEAN_TRUE = new Set([true, 1, "1", "true", "yes", "supported", "enabled", "on"]);
  const BOOLEAN_FALSE = new Set([false, 0, "0", "false", "no", "unsupported", "disabled", "off"]);

  function cleanToken(value) {
    return String(value ?? "").trim().toLowerCase().replace(/[_-]+/g, " ").replace(/\s+/g, " ");
  }

  function finiteNumber(value) {
    const number = typeof value === "number" ? value : Number(String(value).trim().replace(/,/g, ""));
    if (!Number.isFinite(number)) throw new Error("measurement must be finite");
    return number;
  }

  function parseMeasurement(rawValue, rawUnit) {
    if (typeof rawValue === "number") return { value:finiteNumber(rawValue), unit:rawUnit ? cleanToken(rawUnit) : null };
    const text = String(rawValue ?? "").trim();
    const match = text.match(/^(-?(?:\d+(?:\.\d+)?|\.\d+))\s*([a-zA-Zµ]+)?$/);
    if (!match) throw new Error("measurement format is invalid");
    return { value:finiteNumber(match[1]), unit:cleanToken(rawUnit || match[2] || "") || null };
  }

  function normalizeMeasurement(input) {
    const dimension = cleanToken(input?.dimension);
    const parsed = parseMeasurement(input?.raw_value, input?.raw_unit);
    if (parsed.unit && !Object.prototype.hasOwnProperty.call(UNIT_ALIASES, parsed.unit)) {
      throw new Error("measurement unit is unknown");
    }
    const unit = parsed.unit ? UNIT_ALIASES[parsed.unit] : null;
    let value = parsed.value;
    let normalizedUnit;

    if (dimension === "mass" || dimension === "weight") {
      if (!unit && typeof input.raw_value === "number") normalizedUnit = "g";
      else if (unit === "kg") { value *= 1000; normalizedUnit = "g"; }
      else if (unit === "g") normalizedUnit = "g";
      else throw new Error("weight unit is invalid");
      if (value <= 0 || value > 100000) throw new Error("weight is outside the accepted range");
    } else if (["length", "size", "distance", "actuation"].includes(dimension)) {
      if (!unit && typeof input.raw_value === "number") normalizedUnit = "mm";
      else if (unit === "cm") { value *= 10; normalizedUnit = "mm"; }
      else if (unit === "in") { value *= 25.4; normalizedUnit = "mm"; }
      else if (unit === "mm") normalizedUnit = "mm";
      else throw new Error("length unit is invalid");
      if (value < 0 || value > 100000) throw new Error("length is outside the accepted range");
    } else if (["frequency", "refresh rate", "polling rate", "sample rate"].includes(dimension)) {
      if (!unit && typeof input.raw_value === "number") normalizedUnit = "hz";
      else if (unit === "khz") { value *= 1000; normalizedUnit = "hz"; }
      else if (unit === "mhz") { value *= 1000000; normalizedUnit = "hz"; }
      else if (unit === "hz") normalizedUnit = "hz";
      else throw new Error("frequency unit is invalid");
      if (value <= 0 || value > 1000000000) throw new Error("frequency is outside the accepted range");
    } else if (["time", "latency", "response time"].includes(dimension)) {
      if (!unit && typeof input.raw_value === "number") normalizedUnit = "ms";
      else if (unit === "us") { value /= 1000; normalizedUnit = "ms"; }
      else if (unit === "ms") normalizedUnit = "ms";
      else throw new Error("time unit is invalid");
      if (value < 0 || value > 600000) throw new Error("time is outside the accepted range");
    } else if (["bandwidth", "throughput", "data rate"].includes(dimension)) {
      if (unit === "bps") { value /= 1000000; normalizedUnit = "mbps"; }
      else if (unit === "kbps") { value /= 1000; normalizedUnit = "mbps"; }
      else if (unit === "mbps") normalizedUnit = "mbps";
      else if (unit === "gbps") { value *= 1000; normalizedUnit = "mbps"; }
      else if (unit === "tbps") { value *= 1000000; normalizedUnit = "mbps"; }
      else throw new Error("data-rate unit is invalid");
      if (value < 0 || value > 1000000000) throw new Error("data rate is outside the accepted range");
    } else if (dimension === "power") {
      if (unit !== "w") throw new Error("power unit is invalid");
      normalizedUnit = "w";
      if (value < 0 || value > 1000000) throw new Error("power is outside the accepted range");
    } else if (dimension === "percentage") {
      if (unit !== "pct") throw new Error("percentage unit is invalid");
      normalizedUnit = "pct";
      if (value < 0 || value > 100) throw new Error("percentage is outside the accepted range");
    } else {
      throw new Error("measurement dimension is invalid");
    }

    return Object.freeze({
      raw_value:input.raw_value,
      raw_unit:rawUnitOrNull(input.raw_unit || parsed.unit),
      normalized_value:Number(value.toFixed(6)),
      normalized_unit:normalizedUnit
    });
  }

  function rawUnitOrNull(value) {
    return value == null || value === "" ? null : String(value);
  }

  function normalizeEnum(value, aliases, label) {
    const key = cleanToken(value);
    const normalized = aliases[key];
    if (!normalized) throw new Error(label + " value is unknown");
    return Object.freeze({ raw_value:value, normalized_value:normalized, normalized_unit:null });
  }

  function normalizeBoolean(value, label) {
    const token = typeof value === "string" ? cleanToken(value) : value;
    if (BOOLEAN_TRUE.has(token)) return Object.freeze({ raw_value:value, normalized_value:true, normalized_unit:null });
    if (BOOLEAN_FALSE.has(token)) return Object.freeze({ raw_value:value, normalized_value:false, normalized_unit:null });
    throw new Error(label + " value is invalid");
  }

  function normalizeAttribute(category, attribute, rawValue, rawUnit) {
    const key = cleanToken(attribute).replace(/ /g, "_");
    if (["weight", "key_weight"].includes(key)) return normalizeMeasurement({ dimension:"weight", raw_value:rawValue, raw_unit:rawUnit });
    if (["length", "width", "height", "base_thickness", "thickness", "actuation"].includes(key)) {
      return normalizeMeasurement({ dimension:key === "actuation" ? "actuation" : "length", raw_value:rawValue, raw_unit:rawUnit });
    }
    if (["refresh_rate", "polling_rate", "sample_rate"].includes(key)) return normalizeMeasurement({ dimension:"frequency", raw_value:rawValue, raw_unit:rawUnit });
    if (["latency", "response_time", "stick_latency", "wireless_latency", "jitter", "bufferbloat"].includes(key)) return normalizeMeasurement({ dimension:"latency", raw_value:rawValue, raw_unit:rawUnit });
    if (["certified_bandwidth", "wired_wan_speed", "wired_lan_speed", "ethernet_speed", "throughput"].includes(key)) return normalizeMeasurement({ dimension:"bandwidth", raw_value:rawValue, raw_unit:rawUnit });
    if (key === "power_delivery") return normalizeMeasurement({ dimension:"power", raw_value:rawValue, raw_unit:rawUnit });
    if (key === "packet_loss") return normalizeMeasurement({ dimension:"percentage", raw_value:rawValue, raw_unit:rawUnit });
    if (key === "panel") return normalizeEnum(rawValue, PANEL_ALIASES, "panel");
    if (key === "shape") return normalizeEnum(rawValue, SHAPE_ALIASES, "shape");
    if (key === "hump") return normalizeEnum(rawValue, HUMP_ALIASES, "hump");
    if (["rapid_trigger","mesh","wired_backhaul","qos","replaceable_stick_modules","rear_controls"].includes(key)) return normalizeBoolean(rawValue, key);
    if (Array.isArray(rawValue)) return Object.freeze({ raw_value:rawValue, normalized_value:Object.freeze(rawValue.map(item => cleanToken(item).replace(/ /g, "_"))), normalized_unit:rawUnitOrNull(rawUnit) });
    return Object.freeze({ raw_value:rawValue, normalized_value:cleanToken(rawValue).replace(/ /g, "_"), normalized_unit:rawUnitOrNull(rawUnit) });
  }

  function comparableValue(value) {
    if (value && typeof value === "object" && Object.prototype.hasOwnProperty.call(value, "normalized_value")) {
      return value.normalized_value;
    }
    return value;
  }

  return {
    UNIT_ALIASES, PANEL_ALIASES, SHAPE_ALIASES, HUMP_ALIASES,
    normalizeMeasurement, normalizeAttribute, comparableValue, cleanToken
  };
});
