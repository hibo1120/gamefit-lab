(function (root, factory) {
  const gameContext = root.GameFitGameContextV2Staging || (
    typeof module === "object" && module.exports ? require("./game-context-v2.staging.js") : null
  );
  const api = factory(gameContext);
  root.GameFitProRoleReferenceStaging = api;
  if (typeof module === "object" && module.exports) module.exports = api;
})(typeof window !== "undefined" ? window : globalThis, function (gameContext) {
  "use strict";

  if (!gameContext) throw new Error("Game Context v2 staging dependency is required");

  const DERIVATION_POLICY = Object.freeze({
    policy_id:"valorant-derived-recent-role-hypothesis-v1",
    evidence_status:"hypothesis_unvalidated",
    window_days:90,
    minimum_sample_rounds:300,
    minimum_match_count:8,
    maximum_rounds_per_match:60,
    minimum_period_span_days:14,
    dominant_share_minimum:0.60,
    lead_over_second_minimum:0.15,
    maximum_unknown_share:0.10,
    maximum_observation_age_days:120,
    confidence_cap:"Low",
    policy_fingerprint:"w90-r300-m8-x60-d14-s60-l15-u10-a120",
    rationale:"Pre-registered conservative staging thresholds; not tuned on recommendation outcomes or engagement."
  });

  const sourcePolicies = Object.freeze({
    vlr_public_web:Object.freeze({
      source_id:"vlr_public_web", source_url:"https://www.vlr.gg/terms",
      source_type:"competitive_match_database", acquisition_mode:"manual_only",
      claim_scopes:Object.freeze(["valorant_match_agent_usage"]),
      checked_at:gameContext.CHECKED_AT,
      publisher:"VLR.GG LLC", terms_url:"https://www.vlr.gg/terms", expires_at:"2027-01-10",
      allowed_scope:"none_until_permission_or_case_review", attribution_status:"source_url_required",
      reviewed_by:"GameFit Guard staging review", commercial_relationship:"unknown_disclosed",
      automation_status:"prohibited_without_written_permission", rights_status:"manual_terms_review",
      redistribution_status:"do_not_redistribute_source_content",
      use_note:"VLR terms prohibit automated extraction. No scraper or copied table is included in this staging layer."
    }),
    prosettings_public_web:Object.freeze({
      source_id:"prosettings_public_web", source_url:"https://prosettings.net/about/",
      source_type:"pro_gear_database", acquisition_mode:"manual_only",
      claim_scopes:Object.freeze(["pro_gear_usage", "pro_gear_adoption_sample", "pro_team_membership"]),
      checked_at:gameContext.CHECKED_AT,
      publisher:"ProSettings.net", terms_url:"https://prosettings.net/about/", expires_at:"2027-01-10",
      allowed_scope:"none_until_terms_review", attribution_status:"source_url_required",
      reviewed_by:"GameFit Guard staging review", commercial_relationship:"affiliate_supported_publisher",
      automation_status:"not_authorized", rights_status:"manual_terms_review",
      redistribution_status:"do_not_redistribute_source_content",
      use_note:"Use only small manually verified factual observations with URL and date after terms review; do not copy lists, images, reviews, or tables."
    })
  });

  // These immutable sources exist only so the staging contract can be tested
  // without treating caller-supplied records as trusted evidence.
  const testSourcePolicies = Object.freeze({
    "test:match-1":Object.freeze({
      source_id:"test:match-1", source_url:"https://example.com/match/1", source_type:"synthetic_test_fixture",
      publisher:"GameFit synthetic test", terms_url:"https://example.com/terms", acquisition_mode:"synthetic_test_only",
      allowed_scope:"test_only", rights_status:"safe_for_internal_fact", redistribution_status:"test_only",
      attribution_status:"test_only", checked_at:gameContext.CHECKED_AT, expires_at:"2027-01-10",
      reviewed_by:"automated test", commercial_relationship:"none_confirmed", test_only:true,
      claim_scopes:Object.freeze(["valorant_match_agent_usage", "player_identity_link"])
    }),
    "test:gear-1":Object.freeze({
      source_id:"test:gear-1", source_url:"https://example.com/gear/1", source_type:"synthetic_test_fixture",
      publisher:"GameFit synthetic test", terms_url:"https://example.com/terms", acquisition_mode:"synthetic_test_only",
      allowed_scope:"test_only", rights_status:"safe_for_internal_fact", redistribution_status:"test_only",
      attribution_status:"test_only", checked_at:gameContext.CHECKED_AT, expires_at:"2027-01-10",
      reviewed_by:"automated test", commercial_relationship:"none_confirmed", test_only:true,
      claim_scopes:Object.freeze(["pro_gear_usage", "pro_gear_adoption_sample", "player_identity_link"])
    }),
    "test:team-1":Object.freeze({
      source_id:"test:team-1", source_url:"https://example.com/team/1", source_type:"synthetic_test_fixture",
      publisher:"GameFit synthetic test", terms_url:"https://example.com/terms", acquisition_mode:"synthetic_test_only",
      allowed_scope:"test_only", rights_status:"safe_for_internal_fact", redistribution_status:"test_only",
      attribution_status:"test_only", checked_at:gameContext.CHECKED_AT, expires_at:"2027-01-10",
      reviewed_by:"automated test", commercial_relationship:"none_confirmed", test_only:true,
      claim_scopes:Object.freeze(["pro_team_membership", "player_identity_link"])
    })
  });

  const PROHIBITED_RANKING_FIELDS = gameContext.PROHIBITED_RECOMMENDATION_FIELDS;
  const GEAR_CATEGORIES = Object.freeze(["mouse", "keyboard", "mousepad", "monitor", "audio"]);
  const RIGHTS_STATES = Object.freeze(["safe_for_internal_fact", "manual_terms_review", "do_not_reuse_content"]);
  const productVariantRegistry = Object.freeze({
    "mouse-example:black":Object.freeze({ product_id:"mouse-example", variant_id:"mouse-example:black", category:"mouse", catalog_status:"synthetic_test_only" })
  });
  const issuedRoleObservations = new WeakSet();
  const issuedPlayerIdentities = new WeakSet();
  const identityResolutionLedger = new Map();

  function deepFreeze(value,seen=new Set()) {
    if (!value || typeof value !== "object" || seen.has(value)) return value;
    seen.add(value);
    for (const nested of Object.values(value)) deepFreeze(nested,seen);
    return Object.freeze(value);
  }

  function issueRoleObservation(observation) {
    deepFreeze(observation);
    issuedRoleObservations.add(observation);
    return observation;
  }

  function isDateOnly(value) {
    if (typeof value !== "string" || !/^\d{4}-\d{2}-\d{2}$/.test(value)) return false;
    const timestamp = Date.parse(value + "T00:00:00Z");
    return Number.isFinite(timestamp) && new Date(timestamp).toISOString().slice(0,10) === value;
  }

  function parseDate(value) {
    if (!isDateOnly(value)) return null;
    return Date.parse(value + "T00:00:00Z");
  }

  function currentUtcDate() {
    return new Date().toISOString().slice(0,10);
  }

  function daysBetween(start, end) {
    const a = parseDate(start);
    const b = parseDate(end);
    return a === null || b === null ? null : Math.round((b - a) / 86400000);
  }

  function isExactProductVariant(productId,variantId,category) {
    const record = productVariantRegistry[variantId];
    return Boolean(record && record.product_id === productId && record.variant_id === variantId && record.category === category);
  }

  function isCanonicalIdentifier(value) {
    return typeof value === "string" && value.length > 0 && value.length <= 128 &&
      value === value.trim() && value === value.toLowerCase() &&
      /^[a-z0-9]+(?:[._:@/-][a-z0-9]+)*$/.test(value);
  }

  function sourceRegistry() {
    return new Map([
      ...Object.values(gameContext.sources), ...Object.values(sourcePolicies), ...Object.values(testSourcePolicies)
    ].map(item=>[item.source_id,item]));
  }

  function sourceResolutionErrors(sourceIds,sourceRecords=[],expectedScopes=[]) {
    const registry = sourceRegistry();
    const errors = [];
    for (const record of sourceRecords || []) {
      const canonical = registry.get(record?.source_id);
      if (!canonical) errors.push("caller-supplied source is not allowlisted: " + (record?.source_id || "missing"));
      else if (JSON.stringify(record) !== JSON.stringify(canonical)) errors.push("caller-supplied source does not match immutable registry: " + record.source_id);
    }
    for (const sourceId of sourceIds || []) {
      const source = registry.get(sourceId);
      if (!source) errors.push("observation source is not registered: " + sourceId);
      else if (source.rights_status !== "safe_for_internal_fact") errors.push("observation source is not cleared for factual display: " + sourceId);
      else {
        errors.push(...validateSourceRecord(source,currentUtcDate()).map(error=>`${sourceId}: ${error}`));
        const scopes = Array.isArray(source.claim_scopes) ? source.claim_scopes : [];
        if (expectedScopes.length && !expectedScopes.some(scope=>scopes.includes(scope))) errors.push("observation source is not scoped for this claim: " + sourceId);
      }
    }
    return errors;
  }

  function unknownObservation(input, reasonCodes, extra={}) {
    const sampleRounds = Array.isArray(input?.match_observations) ? input.match_observations.reduce((sum,item)=>{
      const value = Number(item?.rounds);
      return Number.isFinite(value) && value > 0 ? sum + value : sum;
    },0) : 0;
    return issueRoleObservation({
      player_id:input?.player_id || null,
      source_player_id:input?.source_player_id || null,
      game_id:"valorant",
      role_id:null,
      role_key:null,
      method:"recent_agent_usage_to_official_role",
      period_start:input?.period_start || null,
      period_end:input?.period_end || null,
      sample_rounds:sampleRounds,
      sample_matches:Array.isArray(input?.match_observations) ? input.match_observations.length : 0,
      share:null,
      confidence:"Low",
      source_ids:[],
      usage_source_ids:[],
      taxonomy_source_ids:[],
      observed_at:input?.observed_at || null,
      derived:true,
      evidence_status:"hypothesis_unvalidated",
      policy_id:DERIVATION_POLICY.policy_id,
      policy_fingerprint:DERIVATION_POLICY.policy_fingerprint,
      result:"unknown",
      reason_codes:[...new Set(reasonCodes)],
      ranking_effect:"none",
      ...extra
    });
  }

  function deriveValorantRecentRole(input={}) {
    if (input.game_id && input.game_id !== "valorant") return unknownObservation(input,["unsupported_game"]);
    if (!isCanonicalIdentifier(input.player_id)) return unknownObservation(input,["player_id_missing_or_noncanonical"]);
    if (!isCanonicalIdentifier(input.source_player_id)) return unknownObservation(input,["source_player_id_missing_or_noncanonical"]);
    const usage = Array.isArray(input.match_observations) ? input.match_observations : [];
    if (usage.some(item=>typeof item?.rounds !== "number" || !Number.isSafeInteger(item.rounds) || item.rounds <= 0)) {
      return unknownObservation(input,["invalid_rounds"]);
    }
    if (usage.some(item=>item.rounds > DERIVATION_POLICY.maximum_rounds_per_match || item?.round_count_method !== "source_match_total")) return unknownObservation(input,["round_count_outlier_or_unverified"]);
    if (usage.some(item=>!isCanonicalIdentifier(item?.observation_id))) return unknownObservation(input,["observation_id_missing_or_noncanonical"]);
    if (new Set(usage.map(item=>item.observation_id)).size !== usage.length) return unknownObservation(input,["duplicate_observation"]);
    if (usage.some(item=>!isCanonicalIdentifier(item?.agent_id) || item.agent_id !== item.agent_id.toLowerCase())) return unknownObservation(input,["agent_id_missing_or_noncanonical"]);
    if (usage.some(item=>!isCanonicalIdentifier(item?.match_id)) || new Set(usage.map(item=>item.match_id)).size !== usage.length) return unknownObservation(input,["invalid_or_duplicate_match_id"]);
    if (usage.length < DERIVATION_POLICY.minimum_match_count) return unknownObservation(input,["match_sample_insufficient"]);
    if (usage.some(item=>item?.competition_mode !== "tournament")) return unknownObservation(input,["competition_mode_not_verified"]);
    if (usage.some(item=>typeof item?.patch_id !== "string" || !item.patch_id.trim())) return unknownObservation(input,["patch_context_missing"]);
    if (usage.some(item=>!isDateOnly(item?.played_at))) return unknownObservation(input,["match_date_invalid"]);
    const playedDates = usage.map(item=>item.played_at).sort();
    const periodStart = playedDates[0];
    const periodEnd = playedDates[playedDates.length - 1];
    if ((input.period_start && input.period_start !== periodStart) || (input.period_end && input.period_end !== periodEnd)) return unknownObservation(input,["period_does_not_match_observations"],{ period_start:periodStart, period_end:periodEnd });
    const windowDays = daysBetween(periodStart,periodEnd);
    if (windowDays === null || windowDays < 0) return unknownObservation(input,["invalid_period"]);
    if (windowDays > DERIVATION_POLICY.window_days + 7) return unknownObservation(input,["window_too_wide"]);
    if (windowDays < DERIVATION_POLICY.minimum_period_span_days) return unknownObservation(input,["period_span_insufficient"]);
    const asOf = currentUtcDate();
    if (input.as_of && (!isDateOnly(input.as_of) || daysBetween(input.as_of,asOf) < 0)) return unknownObservation(input,["as_of_invalid_or_future"]);
    const periodAgeDays = daysBetween(periodEnd,asOf);
    if (periodAgeDays === null || periodAgeDays < 0) return unknownObservation(input,["future_or_invalid_period_end"]);
    if (periodAgeDays > DERIVATION_POLICY.maximum_observation_age_days) return unknownObservation(input,["stale_period"]);
    if (daysBetween(periodEnd,input.observed_at) < 0) return unknownObservation(input,["observed_before_period_end"]);
    const ageDays = daysBetween(input.observed_at,asOf);
    if (ageDays === null || ageDays < 0) return unknownObservation(input,["invalid_observed_at"]);
    if (ageDays > DERIVATION_POLICY.maximum_observation_age_days) return unknownObservation(input,["stale_observation"]);

    const totals = new Map();
    const usageSourceIds = new Set();
    const taxonomySourceIds = new Set();
    let totalRounds = 0;
    let unknownRounds = 0;
    let missingSource = false;
    for (const item of usage) {
      const rounds = Number(item.rounds);
      totalRounds += rounds;
      const sourceList = Array.isArray(item?.source_ids) ? item.source_ids.filter(Boolean) : [];
      if (!sourceList.length) missingSource = true;
      sourceList.forEach(id => usageSourceIds.add(id));
      const mapping = gameContext.resolveValorantAgentRole(item.agent_id);
      if (!mapping.role_id) {
        unknownRounds += rounds;
        continue;
      }
      totals.set(mapping.role_id,(totals.get(mapping.role_id) || 0) + rounds);
      mapping.source_ids.forEach(id => taxonomySourceIds.add(id));
    }
    const sourceIds = [...new Set([...usageSourceIds,...taxonomySourceIds])];
    const sourceErrors = [
      ...sourceResolutionErrors([...usageSourceIds],input.source_records,["valorant_match_agent_usage"]),
      ...sourceResolutionErrors([...taxonomySourceIds],input.source_records,["valorant_agent_role_mapping:jett","valorant_agent_role_mapping:sova","valorant_agent_role_mapping:omen","valorant_agent_role_mapping:killjoy"])
    ];
    if (sourceErrors.length) return unknownObservation(input,["source_not_cleared"],{ sample_rounds:totalRounds, source_ids:sourceIds, usage_source_ids:[...usageSourceIds], taxonomy_source_ids:[...taxonomySourceIds], source_errors:sourceErrors });
    if (totalRounds < DERIVATION_POLICY.minimum_sample_rounds) return unknownObservation(input,["sample_insufficient"],{ sample_rounds:totalRounds, source_ids:sourceIds, usage_source_ids:[...usageSourceIds], taxonomy_source_ids:[...taxonomySourceIds] });
    if (missingSource) return unknownObservation(input,["usage_source_missing"],{ sample_rounds:totalRounds, source_ids:sourceIds, usage_source_ids:[...usageSourceIds], taxonomy_source_ids:[...taxonomySourceIds] });
    const unknownShare = totalRounds ? unknownRounds / totalRounds : 1;
    if (unknownShare > DERIVATION_POLICY.maximum_unknown_share) return unknownObservation(input,["agent_role_coverage_insufficient"],{ sample_rounds:totalRounds, source_ids:sourceIds, usage_source_ids:[...usageSourceIds], taxonomy_source_ids:[...taxonomySourceIds], unknown_share:unknownShare });

    const ranked = [...totals.entries()].map(([roleId,rounds]) => ({ role_id:roleId, role_key:`valorant:${roleId}`, rounds, share:rounds / totalRounds }))
      .sort((a,b) => b.share - a.share || a.role_id.localeCompare(b.role_id));
    if (!ranked.length) return unknownObservation(input,["role_unknown"],{ sample_rounds:totalRounds, source_ids:sourceIds, usage_source_ids:[...usageSourceIds], taxonomy_source_ids:[...taxonomySourceIds] });
    const leader = ranked[0];
    const runnerUpShare = ranked[1]?.share || 0;
    if (leader.share < DERIVATION_POLICY.dominant_share_minimum || leader.share - runnerUpShare < DERIVATION_POLICY.lead_over_second_minimum) {
      return issueRoleObservation({
        ...unknownObservation(input,["mixed_flex"],{ sample_rounds:totalRounds, source_ids:sourceIds, usage_source_ids:[...usageSourceIds], taxonomy_source_ids:[...taxonomySourceIds] }),
        result:"mixed_flex",
        role_distribution:ranked,
        unknown_share:unknownShare
      });
    }
    return issueRoleObservation({
      player_id:input.player_id,
      source_player_id:input.source_player_id,
      game_id:"valorant",
      role_id:leader.role_id,
      role_key:leader.role_key,
      method:"recent_agent_usage_to_official_role",
      period_start:periodStart,
      period_end:periodEnd,
      sample_rounds:totalRounds,
      sample_matches:usage.length,
      share:leader.share,
      confidence:DERIVATION_POLICY.confidence_cap,
      source_ids:sourceIds,
      usage_source_ids:[...usageSourceIds],
      taxonomy_source_ids:[...taxonomySourceIds],
      observed_at:input.observed_at,
      derived:true,
      evidence_status:"hypothesis_unvalidated",
      policy_id:DERIVATION_POLICY.policy_id,
      policy_fingerprint:DERIVATION_POLICY.policy_fingerprint,
      result:"dominant_role_candidate",
      reason_codes:[],
      role_distribution:ranked,
      unknown_share:unknownShare,
      ranking_effect:"none"
    });
  }

  function createPlayerIdentity(input={},sourceRecords=[]) {
    const links = Array.isArray(input.source_identity_links) ? input.source_identity_links.map(link=>({
      source_id:link?.source_id,
      source_player_id:link?.source_player_id,
      canonical_player_id:input.player_id,
      checked_at:link?.checked_at,
      resolution_method:link?.resolution_method,
      reviewed_by:link?.reviewed_by
    })) : [];
    const identity = Object.freeze({
      player_id:input.player_id,
      display_name:input.display_name,
      identity_namespace:input.identity_namespace,
      source_identity_links:Object.freeze(links.map(Object.freeze))
    });
    const structuralErrors = validatePlayerIdentity(identity,sourceRecords,true);
    if (structuralErrors.length) throw new Error(structuralErrors.join("; "));
    for (const link of links) {
      const key = `${link.source_id}\u0000${link.source_player_id}`;
      const existing = identityResolutionLedger.get(key);
      if (existing && existing !== input.player_id) throw new Error("source subject is already linked to a different canonical player");
    }
    for (const link of links) identityResolutionLedger.set(`${link.source_id}\u0000${link.source_player_id}`,input.player_id);
    issuedPlayerIdentities.add(identity);
    return identity;
  }

  function validatePlayerIdentity(identity,sourceRecords=[],allowUnissued=false) {
    const errors = [];
    const allowedKeys = new Set(["player_id","display_name","identity_namespace","source_identity_links"]);
    if (!allowUnissued && (!identity || !issuedPlayerIdentities.has(identity))) errors.push("player identity was not issued by the identity builder");
    for (const key of Object.keys(identity || {})) if (!allowedKeys.has(key)) errors.push("unknown identity field: " + key);
    if (!isCanonicalIdentifier(identity?.player_id)) errors.push("player_id is required and must be canonical");
    if (!identity?.display_name) errors.push("display_name is required");
    if (!identity?.identity_namespace) errors.push("identity_namespace is required to prevent name collisions");
    if (identity?.player_id && !String(identity.player_id).includes(":")) errors.push("player_id must be namespaced");
    if (identity?.player_id && identity?.identity_namespace && String(identity.player_id).split(":",1)[0] !== identity.identity_namespace) errors.push("player_id namespace does not match identity_namespace");
    const links = Array.isArray(identity?.source_identity_links) ? identity.source_identity_links : [];
    if (!links.length) errors.push("source_identity_links are required");
    for (const link of links) {
      const linkKeys = Object.keys(link || {});
      if (linkKeys.some(key=>!["source_id","source_player_id","canonical_player_id","checked_at","resolution_method","reviewed_by"].includes(key))) errors.push("identity link contains an unknown field");
      for (const key of ["source_id","source_player_id","canonical_player_id","checked_at","resolution_method","reviewed_by"]) if (!link?.[key]) errors.push("identity link " + key + " is required");
      if (!isCanonicalIdentifier(link?.source_player_id)) errors.push("identity link source_player_id must be canonical");
      if (link?.canonical_player_id !== identity?.player_id) errors.push("identity link canonical_player_id does not match");
      if (link?.resolution_method !== "manual_exact_source_id_match") errors.push("identity link resolution_method is not allowlisted");
      if (!isDateOnly(link?.checked_at) || daysBetween(link.checked_at,currentUtcDate()) < 0) errors.push("identity link checked_at is invalid");
      const ledgerIdentity = identityResolutionLedger.get(`${link?.source_id}\u0000${link?.source_player_id}`);
      if (!allowUnissued && ledgerIdentity !== identity?.player_id) errors.push("identity link does not match the resolution ledger");
      errors.push(...sourceResolutionErrors(link?.source_id ? [link.source_id] : [],sourceRecords,["player_identity_link"]));
    }
    if (new Set(links.map(link=>link.source_id)).size !== links.length) errors.push("identity source links contain duplicates");
    errors.push(...gameContext.findProhibitedRecommendationFields(identity));
    return [...new Set(errors)];
  }

  function validateRoleObservation(observation,sourceRecords=[]) {
    const errors = [];
    const allowedKeys = new Set([
      "player_id","source_player_id","game_id","role_id","role_key","method","period_start","period_end","sample_rounds","sample_matches","share","confidence",
      "source_ids","usage_source_ids","taxonomy_source_ids","observed_at","derived","evidence_status","result","reason_codes","role_distribution","unknown_share",
      "ranking_effect","policy_id","policy_fingerprint","source_errors"
    ]);
    if (!observation || !issuedRoleObservations.has(observation)) errors.push("role observation was not issued by the fixed derivation function");
    for (const key of Object.keys(observation || {})) if (!allowedKeys.has(key)) errors.push("unknown role observation field: " + key);
    for (const key of ["player_id", "source_player_id", "game_id", "method", "period_start", "period_end", "sample_rounds", "sample_matches", "confidence", "source_ids", "observed_at", "derived", "result", "ranking_effect"]) {
      if (observation?.[key] === undefined || observation?.[key] === null) errors.push(key + " is required");
    }
    if (observation?.derived !== true) errors.push("derived must be true");
    if (observation?.ranking_effect !== "none") errors.push("ranking_effect must be none");
    if (observation?.game_id !== "valorant") errors.push("only VALORANT derived role is supported in this hypothesis");
    if (observation?.method !== "recent_agent_usage_to_official_role") errors.push("role method is invalid");
    if (observation?.evidence_status !== "hypothesis_unvalidated" || observation?.confidence !== "Low") errors.push("role evidence/confidence may not be promoted");
    if (observation?.policy_id !== DERIVATION_POLICY.policy_id || observation?.policy_fingerprint !== DERIVATION_POLICY.policy_fingerprint) errors.push("role derivation policy does not match");
    if (!Number.isSafeInteger(observation?.sample_rounds) || observation.sample_rounds < 0) errors.push("sample_rounds must be a non-negative safe integer");
    if (!Number.isSafeInteger(observation?.sample_matches) || observation.sample_matches < 0) errors.push("sample_matches must be a non-negative safe integer");
    if (!isDateOnly(observation?.period_start) || !isDateOnly(observation?.period_end) || !isDateOnly(observation?.observed_at) || daysBetween(observation.period_start,observation.period_end) < 0 || daysBetween(observation.period_end,observation.observed_at) < 0) errors.push("role observation dates are invalid");
    if (observation?.result === "dominant_role_candidate" && !observation?.role_id) errors.push("candidate result requires role_id");
    if (observation?.result === "dominant_role_candidate" && (!Array.isArray(observation?.source_ids) || !observation.source_ids.length)) errors.push("candidate result requires sources");
    if (Array.isArray(observation?.source_ids) && new Set(observation.source_ids).size !== observation.source_ids.length) errors.push("role sources contain duplicates");
    if (observation?.result === "dominant_role_candidate" && (!Number.isFinite(observation?.share) || observation.share < 0 || observation.share > 1)) errors.push("candidate share is invalid");
    if (observation?.role_id && observation?.role_key !== `${observation.game_id}:${observation.role_id}`) errors.push("role_key must be game-namespaced");
    if (!["dominant_role_candidate", "mixed_flex", "unknown"].includes(observation?.result)) errors.push("result is invalid");
    const distribution = Array.isArray(observation?.role_distribution) ? observation.role_distribution : [];
    const officialRoles = new Set(gameContext.valorantRoles.map(role=>role.role_id));
    for (const item of distribution) {
      const keys = Object.keys(item || {});
      if (keys.some(key=>!["role_id","role_key","rounds","share"].includes(key))) errors.push("role_distribution contains an unknown field");
      if (!officialRoles.has(item?.role_id) || item?.role_key !== `valorant:${item?.role_id}` || !Number.isSafeInteger(item?.rounds) || item.rounds <= 0 || !Number.isFinite(item?.share) || item.share < 0 || item.share > 1) errors.push("role_distribution is invalid");
    }
    if (new Set(distribution.map(item=>item.role_id)).size !== distribution.length) errors.push("role_distribution contains duplicate roles");
    if (observation?.result === "dominant_role_candidate") {
      const periodSpan = daysBetween(observation.period_start,observation.period_end);
      const observationAge = daysBetween(observation.observed_at,currentUtcDate());
      const periodAge = daysBetween(observation.period_end,currentUtcDate());
      const usageSources = Array.isArray(observation.usage_source_ids) ? observation.usage_source_ids : [];
      const taxonomySources = Array.isArray(observation.taxonomy_source_ids) ? observation.taxonomy_source_ids : [];
      const combinedSources = [...new Set([...usageSources,...taxonomySources])];
      const knownRounds = distribution.reduce((sum,item)=>sum + (Number.isSafeInteger(item?.rounds) ? item.rounds : 0),0);
      const distributionShare = distribution.reduce((sum,item)=>sum + (Number.isFinite(item?.share) ? item.share : 0),0);
      const runnerUpShare = distribution[1]?.share || 0;
      if (!officialRoles.has(observation.role_id)) errors.push("candidate role is not an official VALORANT role");
      if (observation.sample_rounds < DERIVATION_POLICY.minimum_sample_rounds) errors.push("candidate sample is below the fixed minimum");
      if (observation.sample_matches < DERIVATION_POLICY.minimum_match_count) errors.push("candidate match count is below the fixed minimum");
      if (periodSpan === null || periodSpan < DERIVATION_POLICY.minimum_period_span_days || periodSpan > DERIVATION_POLICY.window_days + 7) errors.push("candidate period violates the fixed window");
      if (observationAge === null || observationAge < 0 || observationAge > DERIVATION_POLICY.maximum_observation_age_days || periodAge === null || periodAge < 0 || periodAge > DERIVATION_POLICY.maximum_observation_age_days) errors.push("candidate observation is stale or future-dated");
      if (!distribution.length || distribution[0]?.role_id !== observation.role_id || Math.abs((distribution[0]?.share ?? -1) - observation.share) > 1e-12) errors.push("candidate role/share does not match the leading distribution entry");
      if (distribution.some((item,index)=>index > 0 && item.share > distribution[index - 1].share)) errors.push("role_distribution must be sorted descending");
      if (observation.share < DERIVATION_POLICY.dominant_share_minimum || observation.share - runnerUpShare < DERIVATION_POLICY.lead_over_second_minimum) errors.push("candidate dominance is below the fixed threshold");
      if (!Number.isFinite(observation.unknown_share) || observation.unknown_share < 0 || observation.unknown_share > DERIVATION_POLICY.maximum_unknown_share) errors.push("candidate unknown share exceeds the fixed threshold");
      if (knownRounds > observation.sample_rounds || Math.abs(distributionShare + observation.unknown_share - 1) > 1e-9) errors.push("role distribution does not reconcile to the sample");
      if (distribution.some(item=>Math.abs(item.share - item.rounds / observation.sample_rounds) > 1e-12)) errors.push("role distribution shares do not match rounds");
      if (!usageSources.length || !taxonomySources.length || combinedSources.length !== observation.source_ids.length || combinedSources.some(id=>!observation.source_ids.includes(id))) errors.push("role source partitions do not reconcile");
      if (!Array.isArray(observation.reason_codes) || observation.reason_codes.length) errors.push("candidate reason_codes must be empty");
      errors.push(...sourceResolutionErrors(usageSources,sourceRecords,["valorant_match_agent_usage"]));
      errors.push(...sourceResolutionErrors(taxonomySources,sourceRecords,["valorant_agent_role_mapping:jett","valorant_agent_role_mapping:sova","valorant_agent_role_mapping:omen","valorant_agent_role_mapping:killjoy"]));
    }
    for (const field of ["product_id", "category", "gear"]) {
      if (observation?.[field] !== undefined) errors.push(field + " is prohibited in role observation");
    }
    errors.push(...gameContext.findProhibitedRecommendationFields(observation));
    if (observation?.result !== "dominant_role_candidate") errors.push(...sourceResolutionErrors(observation?.source_ids,sourceRecords,["valorant_match_agent_usage","valorant_agent_role_mapping:jett","valorant_agent_role_mapping:sova","valorant_agent_role_mapping:omen","valorant_agent_role_mapping:killjoy"]));
    return [...new Set(errors)];
  }

  function validateGearObservation(observation,sourceRecords=[]) {
    const errors = [];
    for (const key of ["player_id", "source_player_id", "product_id", "variant_id", "category", "game_id", "input_method", "source_id", "checked_at", "observation_type", "commercial_relationship"]) {
      if (!observation?.[key]) errors.push(key + " is required");
    }
    if (observation?.observation_type && !["observed_use", "self_reported_current_use"].includes(observation.observation_type)) {
      errors.push("gear observation must be evidence of use, not a sponsorship announcement");
    }
    if (observation?.commercial_relationship && !["none_confirmed", "sponsor_or_provided", "unknown_disclosed"].includes(observation.commercial_relationship)) {
      errors.push("commercial_relationship is invalid");
    }
    if (observation?.category && !GEAR_CATEGORIES.includes(observation.category)) errors.push("gear category is invalid");
    if (observation?.product_id && observation?.variant_id && observation?.category && !isExactProductVariant(observation.product_id,observation.variant_id,observation.category)) errors.push("gear product, variant, and category must match the catalog registry");
    if (observation?.game_id && !gameContext.getGameProfile(observation.game_id)?.supported_input_methods.includes(observation.input_method)) errors.push("gear observation game/input is invalid");
    if (observation?.checked_at && !isDateOnly(observation.checked_at)) errors.push("checked_at is invalid");
    for (const field of ["role_id", "role", "role_share"]) {
      if (observation?.[field] !== undefined) errors.push(field + " is prohibited in gear observation");
    }
    errors.push(...gameContext.findProhibitedRecommendationFields(observation));
    errors.push(...sourceResolutionErrors(observation?.source_id ? [observation.source_id] : [],sourceRecords,["pro_gear_usage"]));
    return [...new Set(errors)];
  }

  function validateTeamObservation(observation,sourceRecords=[]) {
    if (observation === null || observation === undefined) return [];
    const errors = [];
    for (const key of ["player_id", "source_player_id", "team_id", "display_name", "source_id", "checked_at"]) {
      if (!observation?.[key]) errors.push(key + " is required");
    }
    if (observation?.checked_at && !isDateOnly(observation.checked_at)) errors.push("checked_at is invalid");
    errors.push(...gameContext.findProhibitedRecommendationFields(observation));
    errors.push(...sourceResolutionErrors(observation?.source_id ? [observation.source_id] : [],sourceRecords,["pro_team_membership"]));
    return [...new Set(errors)];
  }

  function validateSourceRecord(record,asOf=currentUtcDate()) {
    const errors = [];
    for (const key of ["source_id", "source_url", "source_type", "publisher", "terms_url", "acquisition_mode", "allowed_scope", "rights_status", "redistribution_status", "attribution_status", "checked_at", "expires_at", "reviewed_by", "commercial_relationship", "claim_scopes"]) {
      if (!record?.[key]) errors.push(key + " is required");
    }
    if (!Array.isArray(record?.claim_scopes) || !record.claim_scopes.length || record.claim_scopes.some(scope=>typeof scope !== "string" || !scope)) errors.push("claim_scopes must be a non-empty string array");
    for (const key of ["source_url","terms_url"]) try {
      if (new URL(record?.[key]).protocol !== "https:") errors.push(key + " must use https");
    } catch (_) { errors.push(key + " is invalid"); }
    if (record?.checked_at && !isDateOnly(record.checked_at)) errors.push("source checked_at is invalid");
    if (record?.rights_status && !RIGHTS_STATES.includes(record.rights_status)) errors.push("rights_status is invalid");
    if (record?.expires_at && !isDateOnly(record.expires_at)) errors.push("source expires_at is invalid");
    if (isDateOnly(record?.expires_at) && isDateOnly(asOf) && record.expires_at < asOf) errors.push("source policy is expired");
    if (record?.test_only === true && !String(record?.source_id || "").startsWith("test:")) errors.push("test-only source_id must use test: namespace");
    const allowedCombination = (
      record?.acquisition_mode === "manual_only" &&
      record?.allowed_scope === "normalized_factual_taxonomy_only" &&
      record?.redistribution_status === "normalized_facts_with_attribution_only" &&
      record?.attribution_status === "source_url_required"
    ) || (
      record?.test_only === true && record?.acquisition_mode === "synthetic_test_only" &&
      record?.allowed_scope === "test_only" && record?.redistribution_status === "test_only" &&
      record?.attribution_status === "test_only"
    );
    if (!allowedCombination) errors.push("source permission combination is not allowlisted");
    return [...new Set(errors)];
  }

  function observationFreshness(observation,asOf=currentUtcDate(),maxAgeDays=90) {
    const ageDays = daysBetween(observation?.checked_at,asOf);
    if (ageDays === null || ageDays < 0) return { status:"unknown", age_days:null };
    return { status:ageDays <= maxAgeDays ? "current" : "stale", age_days:ageDays };
  }

  function buildAdoptionReference(input={},sourceRecords=[]) {
    const errors = [];
    const numerator = input.numerator;
    const denominator = input.denominator;
    if (!Number.isSafeInteger(numerator) || numerator < 0) errors.push("numerator must be a non-negative safe integer");
    if (!Number.isSafeInteger(denominator) || denominator <= 0 || numerator > denominator) errors.push("denominator must be a positive safe integer not below numerator");
    for (const key of ["coverage_rate","missingness_rate"]) if (!Number.isFinite(input[key]) || input[key] < 0 || input[key] > 1) errors.push(key + " must be within 0..1");
    if (Number.isFinite(input.coverage_rate) && Number.isFinite(input.missingness_rate) && Math.abs(input.coverage_rate + input.missingness_rate - 1) > 1e-9) errors.push("coverage and missingness must sum to 1");
    if (!input.game_id || !gameContext.getGameProfile(input.game_id)?.supported_input_methods.includes(input.input_method)) errors.push("exact supported game/input is required");
    for (const key of ["product_id","variant_id","category","sampling_frame","period_start","period_end","checked_at"]) if (!input[key]) errors.push(key + " is required");
    if (input.product_id && input.variant_id && input.category && !isExactProductVariant(input.product_id,input.variant_id,input.category)) errors.push("adoption product, variant, and category must match the catalog registry");
    if (!Array.isArray(input.source_ids) || !input.source_ids.length) errors.push("source_ids are required");
    const adoptionSpanDays = daysBetween(input.period_start,input.period_end);
    if (!isDateOnly(input.period_start) || !isDateOnly(input.period_end) || !isDateOnly(input.checked_at) || adoptionSpanDays === null || adoptionSpanDays < 0 || adoptionSpanDays > DERIVATION_POLICY.window_days + 7 || daysBetween(input.period_end,input.checked_at) < 0) errors.push("adoption dates are invalid or the observation window is too wide");
    if (isDateOnly(input.checked_at) && daysBetween(input.checked_at,currentUtcDate()) < 0) errors.push("adoption checked_at cannot be after runtime date");
    if (isDateOnly(input.checked_at)) {
      const ageDays = daysBetween(input.checked_at,currentUtcDate());
      if (ageDays === null || ageDays < 0 || ageDays > DERIVATION_POLICY.maximum_observation_age_days) errors.push("adoption evidence is stale or future-dated");
      const periodAgeDays = daysBetween(input.period_end,currentUtcDate());
      if (periodAgeDays === null || periodAgeDays < 0 || periodAgeDays > DERIVATION_POLICY.maximum_observation_age_days) errors.push("adoption observation period is stale or future-dated");
    }
    errors.push(...sourceResolutionErrors(input.source_ids,sourceRecords,["pro_gear_adoption_sample"]));
    if (errors.length) throw new Error([...new Set(errors)].join("; "));
    return {
      signal_type:"adoption_reference",
      game_id:input.game_id || null,
      input_method:input.input_method || null,
      product_id:input.product_id, variant_id:input.variant_id, category:input.category,
      numerator, denominator, sample_size:denominator,
      sampling_frame:input.sampling_frame, coverage_rate:input.coverage_rate, missingness_rate:input.missingness_rate,
      period_start:input.period_start, period_end:input.period_end, checked_at:input.checked_at,
      source_ids:[...(input.source_ids || [])],
      evidence_meaning:"adoption_only",
      performance_evidence:false,
      personal_fit_evidence:false,
      ranking_effect:"none",
      affiliate_effect:"none"
    };
  }

  function buildReferenceCard({ identity, role_observation, gear_observations=[], team_observation=null, source_records=[] }={}) {
    const identityErrors = validatePlayerIdentity(identity,source_records);
    const roleErrors = validateRoleObservation(role_observation,source_records);
    const gearErrors = gear_observations.flatMap(item=>validateGearObservation(item,source_records));
    const teamErrors = validateTeamObservation(team_observation,source_records);
    const sourceErrors = source_records.flatMap(record=>validateSourceRecord(record,currentUtcDate()));
    const mismatched = [role_observation,...gear_observations,team_observation].filter(Boolean)
      .some(item => item.player_id !== identity?.player_id);
    const roleSources = [...role_observation.source_ids];
    const gearSources = [...new Set(gear_observations.map(item => item.source_id))];
    const teamSources = team_observation ? [team_observation.source_id] : [];
    const overlappingSources = roleSources.filter(id => gearSources.includes(id));
    const knownSources = sourceRegistry(source_records);
    const requiredSources = [...new Set([...roleSources,...gearSources,...teamSources])];
    const missingSources = requiredSources.filter(id=>!knownSources.has(id));
    const unclearedSources = requiredSources.filter(id=>knownSources.get(id)?.rights_status !== "safe_for_internal_fact");
    const staleObservations = [...gear_observations,...(team_observation ? [team_observation] : [])].filter(item=>observationFreshness(item).status !== "current");
    const crossGameGear = gear_observations.filter(item=>item.game_id !== role_observation.game_id);
    const temporallyMisalignedGear = gear_observations.filter(item=>Math.abs(daysBetween(item.checked_at,role_observation.observed_at) ?? Infinity) > 90);
    const roleNotDisplayable = role_observation?.result !== "dominant_role_candidate";
    const identityLinks = Array.isArray(identity?.source_identity_links) ? identity.source_identity_links : [];
    const identityClaimPairs = [
      ...(role_observation?.usage_source_ids || []).map(sourceId=>({ source_id:sourceId, source_player_id:role_observation.source_player_id })),
      ...gear_observations.map(item=>({ source_id:item.source_id, source_player_id:item.source_player_id })),
      ...(team_observation ? [{ source_id:team_observation.source_id, source_player_id:team_observation.source_player_id }] : [])
    ];
    const unlinkedIdentityClaims = identityClaimPairs.filter(claim=>!identityLinks.some(link=>
      link.source_id === claim.source_id && link.source_player_id === claim.source_player_id && link.canonical_player_id === identity?.player_id
    ));
    if (identityErrors.length || roleErrors.length || gearErrors.length || teamErrors.length || sourceErrors.length || mismatched || overlappingSources.length || missingSources.length || unclearedSources.length || staleObservations.length || crossGameGear.length || temporallyMisalignedGear.length || roleNotDisplayable || unlinkedIdentityClaims.length) {
      throw new Error([
        ...identityErrors,...roleErrors,...gearErrors,...teamErrors,...sourceErrors,
        ...(mismatched ? ["player identity mismatch"] : []),
        ...(overlappingSources.length ? ["Role and Gear observations require separate sources"] : []),
        ...(missingSources.length ? ["observation source is not registered: " + missingSources.join(",")] : []),
        ...(unclearedSources.length ? ["observation source is not cleared for factual display: " + unclearedSources.join(",")] : [])
        ,...(staleObservations.length ? ["stale observation cannot be displayed"] : [])
        ,...(crossGameGear.length ? ["Role and Gear game context does not match"] : [])
        ,...(temporallyMisalignedGear.length ? ["Role and Gear observation periods are not aligned"] : [])
        ,...(roleNotDisplayable ? ["only a dominant recent role candidate can be displayed"] : [])
        ,...(unlinkedIdentityClaims.length ? ["observation subject is not linked to the canonical player identity"] : [])
      ].join("; "));
    }
    return {
      reference_only:true,
      ranking_effect:"none",
      player:{ player_id:identity.player_id, display_name:identity.display_name },
      team_observation:team_observation ? {
        player_id:team_observation.player_id, source_player_id:team_observation.source_player_id, team_id:team_observation.team_id,
        display_name:team_observation.display_name, source_id:team_observation.source_id,
        checked_at:team_observation.checked_at, freshness:observationFreshness(team_observation)
      } : null,
      recent_role:{
        player_id:role_observation.player_id, source_player_id:role_observation.source_player_id, game_id:role_observation.game_id,
        role_id:role_observation.role_id, role_key:role_observation.role_key,
        method:role_observation.method, period_start:role_observation.period_start,
        period_end:role_observation.period_end, sample_rounds:role_observation.sample_rounds, sample_matches:role_observation.sample_matches,
        share:role_observation.share, confidence:role_observation.confidence,
        source_ids:[...role_observation.source_ids], usage_source_ids:[...role_observation.usage_source_ids], taxonomy_source_ids:[...role_observation.taxonomy_source_ids], observed_at:role_observation.observed_at,
        derived:true, evidence_status:role_observation.evidence_status,
        result:role_observation.result, role_distribution:role_observation.role_distribution.map(item=>({ ...item })),
        unknown_share:role_observation.unknown_share, ranking_effect:"none",
        policy_id:role_observation.policy_id, policy_fingerprint:role_observation.policy_fingerprint
      },
      gear:gear_observations.map(item => ({
        player_id:item.player_id, source_player_id:item.source_player_id, product_id:item.product_id, variant_id:item.variant_id, category:item.category,
        game_id:item.game_id, input_method:item.input_method,
        source_id:item.source_id, checked_at:item.checked_at,
        observation_type:item.observation_type, commercial_relationship:item.commercial_relationship,
        freshness:observationFreshness(item)
      })),
      join_metadata:{
        joined_from_separate_records:true,
        role_source_ids:roleSources,
        gear_source_ids:gearSources,
        overlapping_source_ids:overlappingSources,
        role_and_gear_are_one_claim:false,
        identity_links_verified:true
      },
      display_guardrails:Object.freeze([
        "recent_usage_not_permanent_title",
        "pro_adoption_not_performance_proof",
        "pro_adoption_not_personal_fit"
      ])
    };
  }

  function validateReferenceOnlyRecord(record) {
    const errors = [];
    if (record?.ranking_effect !== "none") errors.push("ranking_effect must be none");
    errors.push(...gameContext.findProhibitedRecommendationFields(record));
    return [...new Set(errors)];
  }

  return {
    DERIVATION_POLICY, sourcePolicies, testSourcePolicies, productVariantRegistry, PROHIBITED_RANKING_FIELDS, GEAR_CATEGORIES, RIGHTS_STATES,
    deriveValorantRecentRole, createPlayerIdentity, validatePlayerIdentity, validateRoleObservation,
    validateGearObservation, validateTeamObservation, validateSourceRecord, sourceResolutionErrors, observationFreshness, buildAdoptionReference, buildReferenceCard,
    validateReferenceOnlyRecord
  };
});
