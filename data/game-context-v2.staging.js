(function (root, factory) {
  const api = factory();
  root.GameFitGameContextV2Staging = api;
  if (typeof module === "object" && module.exports) module.exports = api;
})(typeof window !== "undefined" ? window : globalThis, function () {
  "use strict";

  const CHECKED_AT = "2026-10-10";
  const ROLE_REFERENCE_MODES = Object.freeze([
    "official_optional",
    "legend_class_reference_only",
    "disabled"
  ]);
  const RANKING_EFFECTS = Object.freeze(["none"]);
  const OFFICIAL_ROLE_KINDS = Object.freeze(["player_role", "legend_class"]);
  const PROHIBITED_RECOMMENDATION_FIELDS = Object.freeze([
    "performance_score", "game_fit_score", "personal_fit_score", "recommendation_score",
    "ranking_weight", "purchase_priority", "confidence_boost", "affiliate_weight", "commission_rate",
    "game_fitness", "performance_traits", "evidence_grade", "preference_fit",
    "current_gear_delta", "value_score", "compatible", "compatibility_status",
    "regret_shield", "upgrade_match", "attribute_evidence", "game_fitness_evidence",
    "current_gear_delta_assessment", "value_assessment", "price_snapshot", "price_assessment",
    "current_price", "lifecycle_state", "fix_before_buy", "compatibility_assessment",
    "compatibility_verified", "delta_verified", "critical_attributes_supported",
    "exact_game_input_profile", "game_fit_supported", "game_fit", "preference",
    "preferences", "budget", "candidate", "candidates", "recommendations",
    "attributes", "evidence", "need_assessment", "price", "variant_scope",
    "direction_codes", "input_methods"
  ]);

  function isDateOnly(value) {
    if (typeof value !== "string" || !/^\d{4}-\d{2}-\d{2}$/.test(value)) return false;
    const timestamp = Date.parse(value + "T00:00:00Z");
    return Number.isFinite(timestamp) && new Date(timestamp).toISOString().slice(0,10) === value;
  }

  function currentUtcDate() {
    return new Date().toISOString().slice(0,10);
  }

  function makeOfficialSource(record) {
    return Object.freeze({
      acquisition_mode:"manual_only",
      allowed_scope:"normalized_factual_taxonomy_only",
      redistribution_status:"normalized_facts_with_attribution_only",
      attribution_status:"source_url_required",
      commercial_relationship:"publisher_primary_source",
      reviewed_by:"GameFit Guard staging review",
      expires_at:"2027-01-10",
      ...record
    });
  }

  const sources = Object.freeze({
    "valorant-role-overview": makeOfficialSource({
      source_id:"valorant-role-overview",
      source_type:"official_game_publisher",
      publisher:"Riot Games", terms_url:"https://www.riotgames.com/en/legal",
      source_url:"https://playvalorant.com/en-us/console/",
      checked_at:CHECKED_AT,
      claim_scopes:Object.freeze(["valorant_role_taxonomy"]),
      rights_status:"safe_for_internal_fact",
      use_note:"Store only the four factual role labels and source URL; do not copy page text, images, icons, or layout."
    }),
    "valorant-agent-jett": makeOfficialSource({
      source_id:"valorant-agent-jett", source_type:"official_game_publisher",
      publisher:"Riot Games", terms_url:"https://www.riotgames.com/en/legal",
      source_url:"https://playvalorant.com/en-us/agents/jett/", checked_at:CHECKED_AT,
      claim_scopes:Object.freeze(["valorant_agent_role_mapping:jett"]),
      rights_status:"safe_for_internal_fact", use_note:"Store only the factual Agent-to-Role mapping and attribution URL."
    }),
    "valorant-agent-sova": makeOfficialSource({
      source_id:"valorant-agent-sova", source_type:"official_game_publisher",
      publisher:"Riot Games", terms_url:"https://www.riotgames.com/en/legal",
      source_url:"https://playvalorant.com/en-us/agents/sova/", checked_at:CHECKED_AT,
      claim_scopes:Object.freeze(["valorant_agent_role_mapping:sova"]),
      rights_status:"safe_for_internal_fact", use_note:"Store only the factual Agent-to-Role mapping and attribution URL."
    }),
    "valorant-agent-omen": makeOfficialSource({
      source_id:"valorant-agent-omen", source_type:"official_game_publisher",
      publisher:"Riot Games", terms_url:"https://www.riotgames.com/en/legal",
      source_url:"https://playvalorant.com/en-us/agents/omen/", checked_at:CHECKED_AT,
      claim_scopes:Object.freeze(["valorant_agent_role_mapping:omen"]),
      rights_status:"safe_for_internal_fact", use_note:"Store only the factual Agent-to-Role mapping and attribution URL."
    }),
    "valorant-agent-killjoy": makeOfficialSource({
      source_id:"valorant-agent-killjoy", source_type:"official_game_publisher",
      publisher:"Riot Games", terms_url:"https://www.riotgames.com/en/legal",
      source_url:"https://playvalorant.com/en-us/agents/killjoy/", checked_at:CHECKED_AT,
      claim_scopes:Object.freeze(["valorant_agent_role_mapping:killjoy"]),
      rights_status:"safe_for_internal_fact", use_note:"Store only the factual Agent-to-Role mapping and attribution URL."
    }),
    "apex-character-hub": makeOfficialSource({
      source_id:"apex-character-hub", source_type:"official_game_publisher",
      publisher:"Electronic Arts", terms_url:"https://www.ea.com/legal/user-agreement",
      source_url:"https://www.ea.com/games/apex-legends/apex-legends/game-objects/characters-hub", checked_at:CHECKED_AT,
      claim_scopes:Object.freeze(["apex_legend_class_taxonomy"]),
      rights_status:"safe_for_internal_fact", use_note:"Store only factual class labels; do not copy character art or publisher descriptions."
    }),
    "overwatch-heroes": makeOfficialSource({
      source_id:"overwatch-heroes", source_type:"official_game_publisher",
      publisher:"Blizzard Entertainment", terms_url:"https://www.blizzard.com/en-us/legal",
      source_url:"https://overwatch.blizzard.com/en-us/heroes/", checked_at:CHECKED_AT,
      claim_scopes:Object.freeze(["overwatch_core_role_taxonomy"]),
      rights_status:"safe_for_internal_fact", use_note:"Store only the three core role labels. GameFit v1 intentionally excludes newer sub-role labels."
    }),
    "counter-strike-2-official": makeOfficialSource({
      source_id:"counter-strike-2-official", source_type:"official_game_publisher",
      publisher:"Valve", terms_url:"https://store.steampowered.com/legal",
      source_url:"https://www.counter-strike.net/cs2", checked_at:CHECKED_AT,
      claim_scopes:Object.freeze(["cs2_taxonomy_review_only"]),
      rights_status:"safe_for_internal_fact", use_note:"Reviewed for a stable official player-role taxonomy; no GameFit taxonomy is inferred from community labels."
    }),
    "fortnite-competitive-rules": makeOfficialSource({
      source_id:"fortnite-competitive-rules", source_type:"official_game_publisher",
      publisher:"Epic Games", terms_url:"https://legal.epicgames.com/epicgames/tos",
      source_url:"https://www.fortnite.com/competitive/rules-guidelines/rules-library/fortnite-competitive-master-rules", checked_at:CHECKED_AT,
      claim_scopes:Object.freeze(["fortnite_taxonomy_review_only"]),
      rights_status:"safe_for_internal_fact", use_note:"Reviewed for a stable official player-role taxonomy; no GameFit taxonomy is inferred from team conventions."
    })
  });

  const valorantRoles = Object.freeze([
    Object.freeze({ role_id:"duelist", role_key:"valorant:duelist", label_en:"Duelist", label_ja:"デュエリスト", role_kind:"player_role", source_ids:Object.freeze(["valorant-role-overview"]) }),
    Object.freeze({ role_id:"initiator", role_key:"valorant:initiator", label_en:"Initiator", label_ja:"イニシエーター", role_kind:"player_role", source_ids:Object.freeze(["valorant-role-overview"]) }),
    Object.freeze({ role_id:"controller", role_key:"valorant:controller", label_en:"Controller", label_ja:"コントローラー", role_kind:"player_role", source_ids:Object.freeze(["valorant-role-overview"]) }),
    Object.freeze({ role_id:"sentinel", role_key:"valorant:sentinel", label_en:"Sentinel", label_ja:"センチネル", role_kind:"player_role", source_ids:Object.freeze(["valorant-role-overview"]) })
  ]);

  const apexLegendClasses = Object.freeze([
    Object.freeze({ role_id:"assault", role_key:"apex:assault", label_en:"Assault", label_ja:"アサルト", role_kind:"legend_class", source_ids:Object.freeze(["apex-character-hub"]) }),
    Object.freeze({ role_id:"controller", role_key:"apex:controller", label_en:"Controller", label_ja:"コントローラー", role_kind:"legend_class", source_ids:Object.freeze(["apex-character-hub"]) }),
    Object.freeze({ role_id:"recon", role_key:"apex:recon", label_en:"Recon", label_ja:"リコン", role_kind:"legend_class", source_ids:Object.freeze(["apex-character-hub"]) }),
    Object.freeze({ role_id:"skirmisher", role_key:"apex:skirmisher", label_en:"Skirmisher", label_ja:"スカーミッシャー", role_kind:"legend_class", source_ids:Object.freeze(["apex-character-hub"]) }),
    Object.freeze({ role_id:"support", role_key:"apex:support", label_en:"Support", label_ja:"サポート", role_kind:"legend_class", source_ids:Object.freeze(["apex-character-hub"]) })
  ]);

  const overwatchCoreRoles = Object.freeze([
    Object.freeze({ role_id:"tank", role_key:"overwatch2:tank", label_en:"Tank", label_ja:"タンク", role_kind:"player_role", source_ids:Object.freeze(["overwatch-heroes"]) }),
    Object.freeze({ role_id:"damage", role_key:"overwatch2:damage", label_en:"Damage", label_ja:"ダメージ", role_kind:"player_role", source_ids:Object.freeze(["overwatch-heroes"]) }),
    Object.freeze({ role_id:"support", role_key:"overwatch2:support", label_en:"Support", label_ja:"サポート", role_kind:"player_role", source_ids:Object.freeze(["overwatch-heroes"]) })
  ]);

  // supported_input_methods means "GameFit has a Game/Input recommendation
  // profile", not every input device accepted by the game itself.
  const gameProfiles = Object.freeze({
    valorant:Object.freeze({
      game_id:"valorant", supported_input_methods:Object.freeze(["mnk"]),
      role_reference_mode:"official_optional", official_role_taxonomy:valorantRoles,
      ranking_effect:"none", source_type:"official_game_publisher",
      evidence_status:"verified_official_taxonomy", checked_at:CHECKED_AT,
      source_ids:Object.freeze(["valorant-role-overview"]), pro_fixed_role_allowed:false
    }),
    apex:Object.freeze({
      game_id:"apex", supported_input_methods:Object.freeze(["mnk", "controller"]),
      role_reference_mode:"legend_class_reference_only", official_role_taxonomy:apexLegendClasses,
      ranking_effect:"none", source_type:"official_game_publisher",
      evidence_status:"verified_official_legend_classes", checked_at:CHECKED_AT,
      source_ids:Object.freeze(["apex-character-hub"]), pro_fixed_role_allowed:false
    }),
    overwatch2:Object.freeze({
      game_id:"overwatch2", supported_input_methods:Object.freeze(["mnk"]),
      role_reference_mode:"official_optional", official_role_taxonomy:overwatchCoreRoles,
      ranking_effect:"none", source_type:"official_game_publisher",
      evidence_status:"verified_official_core_roles", checked_at:CHECKED_AT,
      source_ids:Object.freeze(["overwatch-heroes"]), pro_fixed_role_allowed:false,
      excluded_from_v1:Object.freeze(["subroles"])
    }),
    cs2:Object.freeze({
      game_id:"cs2", supported_input_methods:Object.freeze(["mnk"]),
      role_reference_mode:"disabled", official_role_taxonomy:Object.freeze([]),
      ranking_effect:"none", source_type:"official_game_publisher",
      evidence_status:"disabled_no_stable_gamefit_taxonomy", checked_at:CHECKED_AT,
      source_ids:Object.freeze(["counter-strike-2-official"]), pro_fixed_role_allowed:false
    }),
    fortnite:Object.freeze({
      game_id:"fortnite", supported_input_methods:Object.freeze(["mnk"]),
      role_reference_mode:"disabled", official_role_taxonomy:Object.freeze([]),
      ranking_effect:"none", source_type:"official_game_publisher",
      evidence_status:"disabled_no_stable_gamefit_taxonomy", checked_at:CHECKED_AT,
      source_ids:Object.freeze(["fortnite-competitive-rules"]), pro_fixed_role_allowed:false
    })
  });

  // Only mappings checked on individual publisher pages are included. Unknown
  // Agents must stay unknown; this is intentionally not a guessed full roster.
  const valorantAgentRoles = Object.freeze({
    jett:Object.freeze({ agent_id:"jett", role_id:"duelist", source_ids:Object.freeze(["valorant-agent-jett"]), checked_at:CHECKED_AT, evidence_status:"verified_official" }),
    sova:Object.freeze({ agent_id:"sova", role_id:"initiator", source_ids:Object.freeze(["valorant-agent-sova"]), checked_at:CHECKED_AT, evidence_status:"verified_official" }),
    omen:Object.freeze({ agent_id:"omen", role_id:"controller", source_ids:Object.freeze(["valorant-agent-omen"]), checked_at:CHECKED_AT, evidence_status:"verified_official" }),
    killjoy:Object.freeze({ agent_id:"killjoy", role_id:"sentinel", source_ids:Object.freeze(["valorant-agent-killjoy"]), checked_at:CHECKED_AT, evidence_status:"verified_official" })
  });

  function getGameProfile(gameId) {
    return gameProfiles[gameId] || null;
  }

  function findProhibitedRecommendationFields(value,path="$",seen=new Set()) {
    if (!value || typeof value !== "object") return [];
    if (seen.has(value)) return [path + " contains a cycle"];
    seen.add(value);
    const errors = [];
    for (const [key,nested] of Object.entries(value)) {
      const nextPath = Array.isArray(value) ? `${path}[${key}]` : `${path}.${key}`;
      if (PROHIBITED_RECOMMENDATION_FIELDS.includes(key)) errors.push(nextPath + " is prohibited in reference-only data");
      errors.push(...findProhibitedRecommendationFields(nested,nextPath,seen));
    }
    seen.delete(value);
    return errors;
  }

  function validateSourcePolicy(source) {
    const errors = [];
    for (const key of ["source_id", "source_type", "source_url", "publisher", "terms_url", "acquisition_mode", "allowed_scope", "rights_status", "redistribution_status", "attribution_status", "checked_at", "expires_at", "reviewed_by", "commercial_relationship", "claim_scopes"]) {
      if (!source?.[key]) errors.push(key + " is required");
    }
    if (!Array.isArray(source?.claim_scopes) || !source.claim_scopes.length || source.claim_scopes.some(scope=>typeof scope !== "string" || !scope)) errors.push("claim_scopes must be a non-empty string array");
    for (const key of ["source_url", "terms_url"]) {
      try {
        if (new URL(source?.[key]).protocol !== "https:") errors.push(key + " must use https");
      } catch (_) { errors.push(key + " is invalid"); }
    }
    if (source?.checked_at && !isDateOnly(source.checked_at)) errors.push("checked_at is invalid");
    if (source?.expires_at && !isDateOnly(source.expires_at)) errors.push("expires_at is invalid");
    if (isDateOnly(source?.checked_at) && isDateOnly(source?.expires_at) && source.expires_at <= source.checked_at) errors.push("expires_at must be after checked_at");
    if (isDateOnly(source?.expires_at) && source.expires_at < currentUtcDate()) errors.push("source policy is expired at runtime");
    if (source?.rights_status !== "safe_for_internal_fact") errors.push("official taxonomy source must be cleared for internal facts");
    return [...new Set(errors)];
  }

  function resolveValorantAgentRole(agentId) {
    const key = String(agentId || "").trim().toLowerCase();
    return valorantAgentRoles[key] || Object.freeze({
      agent_id:key || null, role_id:null, source_ids:Object.freeze([]), checked_at:CHECKED_AT,
      evidence_status:"unknown", reason_code:"agent_role_not_verified"
    });
  }

  function validateGameProfile(profile) {
    const errors = [];
    const allowedProfileKeys = new Set(["game_id","supported_input_methods","role_reference_mode","official_role_taxonomy","ranking_effect","source_type","evidence_status","checked_at","source_ids","pro_fixed_role_allowed","excluded_from_v1"]);
    const allowedRoleKeys = new Set(["role_id","role_key","label_en","label_ja","role_kind","source_ids"]);
    for (const key of Object.keys(profile || {})) if (!allowedProfileKeys.has(key)) errors.push("unknown profile field: " + key);
    for (const key of ["game_id", "supported_input_methods", "role_reference_mode", "official_role_taxonomy", "ranking_effect", "source_type", "evidence_status", "checked_at"]) {
      if (profile?.[key] === undefined || profile?.[key] === null) errors.push(key + " is required");
    }
    if (!Array.isArray(profile?.supported_input_methods) || !profile.supported_input_methods.length) errors.push("supported_input_methods must be non-empty");
    if (profile?.supported_input_methods?.some(item=>!["mnk","controller"].includes(item))) errors.push("supported_input_methods contains an invalid value");
    if (profile?.supported_input_methods && new Set(profile.supported_input_methods).size !== profile.supported_input_methods.length) errors.push("supported_input_methods contains duplicates");
    if (!ROLE_REFERENCE_MODES.includes(profile?.role_reference_mode)) errors.push("role_reference_mode is invalid");
    if (!RANKING_EFFECTS.includes(profile?.ranking_effect)) errors.push("ranking_effect must be none");
    if (profile?.pro_fixed_role_allowed !== false) errors.push("pro_fixed_role_allowed must be false");
    if (!Array.isArray(profile?.official_role_taxonomy)) errors.push("official_role_taxonomy must be an array");
    if (!isDateOnly(profile?.checked_at)) errors.push("checked_at is invalid");
    if (!Array.isArray(profile?.source_ids) || !profile.source_ids.length || profile.source_ids.some(id=>!sources[id])) errors.push("profile source is invalid");
    if (profile?.role_reference_mode === "disabled" && profile?.official_role_taxonomy?.length) errors.push("disabled profiles cannot define a taxonomy");
    if (profile?.role_reference_mode !== "disabled" && !profile?.official_role_taxonomy?.length) errors.push("enabled profiles require a taxonomy");
    for (const role of profile?.official_role_taxonomy || []) {
      for (const key of Object.keys(role || {})) if (!allowedRoleKeys.has(key)) errors.push("unknown role field: " + key);
      if (!role.role_id || !role.label_en || !role.label_ja) errors.push("role labels are required");
      if (role?.role_key !== `${profile.game_id}:${role.role_id}`) errors.push("role_key must be game-namespaced");
      if (!OFFICIAL_ROLE_KINDS.includes(role.role_kind)) errors.push("role_kind is invalid");
      if (!Array.isArray(role.source_ids) || !role.source_ids.length || role.source_ids.some(id => !sources[id])) errors.push("role source is invalid");
    }
    for (const prohibited of ["weapon", "combat_style", "player_style", "sensitivity_style", "ranking_weight", "fit_score"]) {
      if (profile?.[prohibited] !== undefined) errors.push(prohibited + " is prohibited");
    }
    errors.push(...findProhibitedRecommendationFields(profile));
    return [...new Set(errors)];
  }

  function validateValorantAgentRole(mapping) {
    const errors = [];
    if (!mapping?.agent_id) errors.push("agent_id is required");
    if (!valorantRoles.some(role => role.role_id === mapping?.role_id)) errors.push("role_id is not an official VALORANT role");
    if (!Array.isArray(mapping?.source_ids) || !mapping.source_ids.length || mapping.source_ids.some(id => !sources[id])) errors.push("verified source is required");
    if (mapping?.agent_id && !mapping?.source_ids?.includes("valorant-agent-" + mapping.agent_id)) errors.push("Agent mapping source does not match agent_id");
    if (mapping?.evidence_status !== "verified_official") errors.push("mapping must be publisher-verified");
    return errors;
  }

  return {
    CHECKED_AT, ROLE_REFERENCE_MODES, RANKING_EFFECTS, OFFICIAL_ROLE_KINDS, PROHIBITED_RECOMMENDATION_FIELDS,
    sources, gameProfiles, valorantRoles, apexLegendClasses, overwatchCoreRoles,
    valorantAgentRoles, getGameProfile, resolveValorantAgentRole,
    validateGameProfile, validateValorantAgentRole, findProhibitedRecommendationFields, validateSourcePolicy
  };
});
