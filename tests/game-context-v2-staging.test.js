const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");
const test = require("node:test");
const gameContext = require("../data/game-context-v2.staging.js");
const proReference = require("../data/pro-role-reference.staging.js");
const engine = require("../personal-gear-engine.js");
const pairs = require("../data/recommendation-pairs.js");
const privateStore = require("../private-validation-store.js");

const root = path.resolve(__dirname,"..");

const MATCH_SOURCE = proReference.testSourcePolicies["test:match-1"];
const GEAR_SOURCE = proReference.testSourcePolicies["test:gear-1"];

function identityFor(playerId,sourceIds=["test:match-1","test:gear-1"]) {
  const sourcePlayerId = playerId.split(":").slice(1).join(":");
  return proReference.createPlayerIdentity({
    player_id:playerId, display_name:"Example Player", identity_namespace:playerId.split(":",1)[0],
    source_identity_links:sourceIds.map(sourceId=>({
      source_id:sourceId, source_player_id:sourcePlayerId, checked_at:"2026-10-10",
      resolution_method:"manual_exact_source_id_match", reviewed_by:"GameFit synthetic test"
    }))
  },sourceIds.map(sourceId=>proReference.testSourcePolicies[sourceId]));
}

test("every Game Context v2 profile is valid and ranking-neutral", () => {
  for (const source of Object.values(gameContext.sources)) assert.deepEqual(gameContext.validateSourcePolicy(source),[],source.source_id);
  for (const profile of Object.values(gameContext.gameProfiles)) {
    assert.deepEqual(gameContext.validateGameProfile(profile),[],profile.game_id);
    assert.equal(profile.ranking_effect,"none");
    assert.equal(profile.pro_fixed_role_allowed,false);
  }
});

test("recommendation remains valid without any Role context", () => {
  const input = pairs.buildCases()[0].input;
  const result = engine.recommendUpgrades(input);
  assert.equal(result.status,"ok");
  assert.ok(result.recommendations.length > 0);
});

test("adding role_id and Pro reference data cannot change recommendation ranking", () => {
  const input = pairs.buildCases()[0].input;
  const baseline = engine.recommendUpgrades(input);
  const withRole = engine.recommendUpgrades({
    ...input,
    role_id:"duelist",
    role_reference:{ role_id:"duelist", ranking_effect:"none" },
    pro_adoption:{ product_id:"paid-product", sample_size:9999 },
    affiliate:{ commission_rate:100 }
  });
  assert.deepEqual(withRole,baseline);
  assert.deepEqual(withRole.recommendations.map(item=>item.product_id),baseline.recommendations.map(item=>item.product_id));
});

test("Role, Pro adoption, and Affiliate permutations stay neutral across all staged recommendation pairs", () => {
  for (const testCase of pairs.buildCases()) {
    const baseline = engine.recommendUpgrades(testCase.input);
    const candidates = testCase.input.candidates.map(candidate=>({
      ...candidate, affiliate:true, commission_rate:100,
      pro_adoption:{ sample_size:10000, role_id:"controller" }
    }));
    const permuted = engine.recommendUpgrades({
      ...testCase.input, candidates, role_id:"controller",
      role_reference:{ ranking_effect:"none", affiliate_program:"high_commission" }
    });
    assert.deepEqual(permuted,baseline,testCase.id);
  }
});

test("VALORANT official taxonomy has exactly four localized roles", () => {
  assert.deepEqual(gameContext.valorantRoles.map(item=>item.role_id),["duelist","initiator","controller","sentinel"]);
  assert.deepEqual(gameContext.valorantRoles.map(item=>item.label_ja),["デュエリスト","イニシエーター","コントローラー","センチネル"]);
  for (const mapping of Object.values(gameContext.valorantAgentRoles)) {
    assert.deepEqual(gameContext.validateValorantAgentRole(mapping),[]);
  }
  assert.ok(gameContext.validateValorantAgentRole({ ...gameContext.valorantAgentRoles.jett, source_ids:["valorant-agent-sova"] }).some(error=>error.includes("does not match")));
  assert.equal(gameContext.resolveValorantAgentRole("unverified-agent").role_id,null);
});

test("Apex Legend class is reference-only and never a fixed Pro role", () => {
  const apex = gameContext.getGameProfile("apex");
  assert.equal(apex.role_reference_mode,"legend_class_reference_only");
  assert.equal(apex.pro_fixed_role_allowed,false);
  assert.equal(apex.official_role_taxonomy.every(item=>item.role_kind === "legend_class"),true);
  assert.deepEqual(apex.official_role_taxonomy.map(item=>item.role_id),["assault","controller","recon","skirmisher","support"]);
});

test("CS2 and Fortnite role reference stays disabled", () => {
  for (const gameId of ["cs2","fortnite"]) {
    const profile = gameContext.getGameProfile(gameId);
    assert.equal(profile.role_reference_mode,"disabled");
    assert.deepEqual(profile.official_role_taxonomy,[]);
    assert.equal(profile.ranking_effect,"none");
  }
});

function usage(playerId,items,extra={}) {
  const periodStart = extra.period_start || "2026-07-12";
  const periodEnd = extra.period_end || "2026-10-10";
  const matchCount = extra.match_count || 8;
  const startMs = Date.parse(periodStart + "T00:00:00Z");
  const endMs = Date.parse(periodEnd + "T00:00:00Z");
  const matchObservations = [];
  const counts = items.map(([,rounds])=>Number.isSafeInteger(rounds) && rounds > 0 ? Math.max(1,Math.ceil(rounds / 60)) : 1);
  let remainingSlots = matchCount - counts.reduce((sum,count)=>sum + count,0);
  while (remainingSlots > 0) {
    let selected = 0;
    for (let index=1; index<items.length; index += 1) {
      const selectedDensity = Number.isFinite(items[selected][1]) ? items[selected][1] / counts[selected] : 0;
      const density = Number.isFinite(items[index][1]) ? items[index][1] / counts[index] : 0;
      if (density > selectedDensity) selected = index;
    }
    counts[selected] += 1;
    remainingSlots -= 1;
  }
  let matchIndex = 0;
  for (let itemIndex=0; itemIndex<items.length; itemIndex += 1) {
    const [agentId,totalRounds] = items[itemIndex];
    const count = counts[itemIndex];
    for (let localIndex=0; localIndex<count; localIndex += 1) {
      const playedMs = matchCount === 1 ? startMs : startMs + Math.round((endMs - startMs) * matchIndex / (matchCount - 1));
      const rounds = Number.isSafeInteger(totalRounds) ? Math.floor(totalRounds / count) + (localIndex < totalRounds % count ? 1 : 0) : totalRounds;
      matchObservations.push({
        observation_id:`obs-${matchIndex + 1}`, match_id:`match-${matchIndex + 1}`,
        agent_id:agentId, rounds, source_ids:["test:match-1"],
        patch_id:"11.08", competition_mode:"tournament", played_at:new Date(playedMs).toISOString().slice(0,10),
        round_count_method:"source_match_total"
      });
      matchIndex += 1;
    }
  }
  return {
    player_id:playerId, game_id:"valorant",
    source_player_id:playerId.split(":").slice(1).join(":"),
    period_start:periodStart, period_end:periodEnd, observed_at:extra.observed_at || periodEnd,
    source_records:[MATCH_SOURCE], match_observations:matchObservations,
    ...extra
  };
}

test("mixed or flex usage is not forced into a dominant role", () => {
  const result = proReference.deriveValorantRecentRole(usage("vlr:100",[["jett",160],["sova",140]]));
  assert.equal(result.result,"mixed_flex");
  assert.equal(result.role_id,null);
  assert.ok(result.reason_codes.includes("mixed_flex"));
  assert.equal(result.derived,true);
});

test("insufficient samples and unverified Agent coverage remain unknown", () => {
  const small = proReference.deriveValorantRecentRole(usage("vlr:101",[["jett",299]]));
  assert.equal(small.result,"unknown");
  assert.ok(small.reason_codes.includes("sample_insufficient"));
  const unknownAgent = proReference.deriveValorantRecentRole(usage("vlr:102",[["jett",269],["new-agent",31]]));
  assert.equal(unknownAgent.result,"unknown");
  assert.ok(unknownAgent.reason_codes.includes("agent_role_coverage_insufficient"));
});

test("a dominant role is only a Low-confidence derived recent candidate", () => {
  const result = proReference.deriveValorantRecentRole(usage("vlr:103",[["omen",240],["killjoy",60]]));
  assert.equal(result.result,"dominant_role_candidate");
  assert.equal(result.role_id,"controller");
  assert.equal(result.share,0.8);
  assert.equal(result.confidence,"Low");
  assert.equal(result.derived,true);
  assert.equal(result.ranking_effect,"none");
  assert.equal(result.evidence_status,"hypothesis_unvalidated");
});

test("stale observations fail closed", () => {
  const result = proReference.deriveValorantRecentRole(usage("vlr:104",[["omen",300]],{ period_start:"2025-10-01", period_end:"2025-12-30", observed_at:"2026-01-01" }));
  assert.equal(result.result,"unknown");
  assert.ok(result.reason_codes.includes("stale_period"));
});

test("invalid dates, future periods, duplicate rows, and non-finite rounds fail closed", () => {
  const invalidDate = proReference.deriveValorantRecentRole(usage("vlr:date",[["omen",300]],{ period_end:"2026-02-30" }));
  assert.ok(invalidDate.reason_codes.some(code=>["match_date_invalid","period_does_not_match_observations","invalid_period"].includes(code)));
  const future = proReference.deriveValorantRecentRole(usage("vlr:future",[["omen",300]],{ period_start:"2026-09-02", period_end:"2026-12-01" }));
  assert.ok(future.reason_codes.includes("future_or_invalid_period_end"));
  const duplicate = usage("vlr:dup",[["omen",300]]);
  duplicate.match_observations[1].match_id = duplicate.match_observations[0].match_id;
  assert.ok(proReference.deriveValorantRecentRole(duplicate).reason_codes.includes("invalid_or_duplicate_match_id"));
  const infinite = usage("vlr:inf",[["omen",Infinity]]);
  assert.ok(proReference.deriveValorantRecentRole(infinite).reason_codes.includes("invalid_rounds"));
  const numericString = usage("vlr:string",[["omen","300"]]);
  assert.ok(proReference.deriveValorantRecentRole(numericString).reason_codes.includes("invalid_rounds"));
  const decimal = usage("vlr:decimal",[["omen",300.5]]);
  assert.ok(proReference.deriveValorantRecentRole(decimal).reason_codes.includes("invalid_rounds"));
});

test("the fixed derivation policy cannot be weakened by a caller", () => {
  const oneRound = usage("vlr:policy",[["omen",1]],{ match_count:1 });
  const forgedPolicy = {
    ...proReference.DERIVATION_POLICY,
    minimum_sample_rounds:1, minimum_match_count:1, minimum_period_span_days:0,
    dominant_share_minimum:0, lead_over_second_minimum:0
  };
  const result = proReference.deriveValorantRecentRole(oneRound,forgedPolicy);
  assert.equal(result.result,"unknown");
  assert.ok(result.reason_codes.includes("match_sample_insufficient"));
});

test("round and match thresholds are derived from the same match-level observations", () => {
  const forged = usage("vlr:aggregate",[["omen",300]]);
  forged.match_observations = [{ ...forged.match_observations[0], rounds:300 }];
  const result = proReference.deriveValorantRecentRole(forged);
  assert.equal(result.result,"unknown");
  assert.ok(result.reason_codes.includes("match_sample_insufficient") || result.reason_codes.includes("round_count_outlier_or_unverified"));
});

test("handmade Role DTOs and internally inconsistent distributions cannot be displayed", () => {
  const issued = proReference.deriveValorantRecentRole(usage("vlr:issued",[["omen",240],["killjoy",60]]));
  assert.equal(Object.isFrozen(issued),true);
  assert.equal(Object.isFrozen(issued.role_distribution),true);
  issued.role_id = "duelist";
  issued.player_id = "vlr:mutated";
  issued.role_distribution[0].role_id = "duelist";
  assert.equal(issued.role_id,"controller");
  assert.equal(issued.player_id,"vlr:issued");
  assert.equal(issued.role_distribution[0].role_id,"controller");
  const forged = {
    ...issued, role_id:"sniper", role_key:"valorant:sniper", sample_rounds:1, share:1,
    role_distribution:[{ role_id:"sniper", role_key:"valorant:sniper", rounds:1, share:1 }]
  };
  const errors = proReference.validateRoleObservation(forged,[MATCH_SOURCE]);
  assert.ok(errors.some(error=>error.includes("not issued")));
  assert.ok(errors.some(error=>error.includes("official VALORANT role") || error.includes("role_distribution is invalid")));
  assert.throws(()=>proReference.buildReferenceCard({
    identity:identityFor("vlr:issued",["test:match-1"]), role_observation:forged,
    source_records:[MATCH_SOURCE]
  }),/not issued|official VALORANT role/);
});

test("sources are bound to claim scope and caller-supplied source declarations are not trusted", () => {
  const wrongMatchSource = usage("vlr:scope",[["omen",300]]);
  wrongMatchSource.match_observations[0].source_ids = ["valorant-role-overview"];
  const role = proReference.deriveValorantRecentRole(wrongMatchSource);
  assert.equal(role.result,"unknown");
  assert.ok(role.source_errors.some(error=>error.includes("not scoped")));

  const fakeSource = { ...GEAR_SOURCE, source_id:"test:caller-made", source_url:"https://example.com/fake" };
  assert.ok(proReference.sourceResolutionErrors([fakeSource.source_id],[fakeSource],["pro_gear_usage"]).some(error=>error.includes("not allowlisted")));
  assert.ok(proReference.validateGearObservation({
    player_id:"vlr:scope", source_player_id:"scope", product_id:"mouse-example", variant_id:"mouse-example:black",
    category:"mouse", game_id:"valorant", input_method:"mnk", source_id:"apex-character-hub", checked_at:"2026-10-10",
    observation_type:"observed_use", commercial_relationship:"none_confirmed"
  }).some(error=>error.includes("not scoped")));
});

test("one source subject cannot resolve to two canonical players", () => {
  const link = {
    source_id:"test:match-1", source_player_id:"same-subject", checked_at:"2026-10-10",
    resolution_method:"manual_exact_source_id_match", reviewed_by:"GameFit synthetic test"
  };
  proReference.createPlayerIdentity({
    player_id:"vlr:canonical-a", display_name:"A", identity_namespace:"vlr", source_identity_links:[link]
  },[MATCH_SOURCE]);
  assert.throws(()=>proReference.createPlayerIdentity({
    player_id:"vlr:canonical-b", display_name:"B", identity_namespace:"vlr", source_identity_links:[link]
  },[MATCH_SOURCE]),/already linked/);
  assert.throws(()=>proReference.createPlayerIdentity({
    player_id:"vlr:canonical-c", display_name:"C", identity_namespace:"vlr",
    source_identity_links:[{ ...link, source_player_id:"same-subject " }]
  },[MATCH_SOURCE]),/canonical/);
  for (const badSubject of ["Same-Subject",":"]) {
    assert.throws(()=>proReference.createPlayerIdentity({
      player_id:"vlr:canonical-c", display_name:"C", identity_namespace:"vlr",
      source_identity_links:[{ ...link, source_player_id:badSubject }]
    },[MATCH_SOURCE]),/canonical/);
  }
  assert.throws(()=>proReference.createPlayerIdentity({
    player_id:"vlr:", display_name:"C", identity_namespace:"vlr", source_identity_links:[link]
  },[MATCH_SOURCE]),/canonical/);
  for (const badPlayerId of ["vlr::x","vlr:@x","vlr:/x","vlr:.x","vlr:-x"]) {
    assert.throws(()=>proReference.createPlayerIdentity({
      player_id:badPlayerId, display_name:"C", identity_namespace:"vlr", source_identity_links:[link]
    },[MATCH_SOURCE]),/canonical/);
  }
});

test("noncanonical match IDs and implausible or unverified per-match rounds fail closed", () => {
  const whitespace = usage("vlr:whitespace",[["omen",300]]);
  whitespace.match_observations[1].match_id = whitespace.match_observations[0].match_id + " ";
  assert.ok(proReference.deriveValorantRecentRole(whitespace).reason_codes.includes("invalid_or_duplicate_match_id"));
  const emptySegment = usage("vlr:empty-segment",[["omen",300]]);
  emptySegment.match_observations[1].match_id = "match::2";
  assert.ok(proReference.deriveValorantRecentRole(emptySegment).reason_codes.includes("invalid_or_duplicate_match_id"));

  const concentrated = usage("vlr:concentrated",[["omen",300]]);
  concentrated.match_observations[0].rounds = 293;
  for (let index=1; index<concentrated.match_observations.length; index += 1) concentrated.match_observations[index].rounds = 1;
  assert.ok(proReference.deriveValorantRecentRole(concentrated).reason_codes.includes("round_count_outlier_or_unverified"));

  const unverified = usage("vlr:unverified",[["omen",300]]);
  delete unverified.match_observations[0].round_count_method;
  assert.ok(proReference.deriveValorantRecentRole(unverified).reason_codes.includes("round_count_outlier_or_unverified"));
});

test("an older supplied as_of cannot bypass runtime freshness and does not break after a date rollover", () => {
  const yesterday = new Date(Date.now() - 86400000).toISOString().slice(0,10);
  const result = proReference.deriveValorantRecentRole(usage("vlr:rollover",[["omen",300]],{ as_of:yesterday }));
  assert.equal(result.result,"dominant_role_candidate");
  const tomorrow = new Date(Date.now() + 86400000).toISOString().slice(0,10);
  const future = proReference.deriveValorantRecentRole(usage("vlr:future-asof",[["omen",300]],{ as_of:tomorrow }));
  assert.ok(future.reason_codes.includes("as_of_invalid_or_future"));
});

test("source expiry, stale adoption, and engine-read fields fail closed", () => {
  assert.ok(proReference.validateSourceRecord({ ...GEAR_SOURCE, expires_at:"2026-10-09" }).some(error=>error.includes("expired")));
  assert.throws(()=>proReference.buildAdoptionReference({
    game_id:"valorant", input_method:"mnk", product_id:"mouse-example", variant_id:"mouse-example:black", category:"mouse",
    numerator:10, denominator:20, sampling_frame:"synthetic sample", coverage_rate:1, missingness_rate:0,
    period_start:"1999-01-01", period_end:"1999-01-10", checked_at:"2026-10-10", source_ids:["test:gear-1"]
  },[GEAR_SOURCE]),/stale/);
  assert.throws(()=>proReference.buildAdoptionReference({
    game_id:"valorant", input_method:"mnk", product_id:"mouse-a", variant_id:"keyboard-b:black", category:"mouse",
    numerator:10, denominator:20, sampling_frame:"synthetic sample", coverage_rate:1, missingness_rate:0,
    period_start:"1999-01-01", period_end:"2026-10-10", checked_at:"2026-10-10", source_ids:["test:gear-1"]
  },[GEAR_SOURCE]),/catalog registry|too wide/);
  assert.ok(proReference.validateGearObservation({
    player_id:"vlr:variant", source_player_id:"variant", product_id:"mouse-a", variant_id:"keyboard-b:black",
    category:"mouse", game_id:"valorant", input_method:"mnk", source_id:"test:gear-1", checked_at:"2026-10-10",
    observation_type:"observed_use", commercial_relationship:"none_confirmed"
  },[GEAR_SOURCE]).some(error=>error.includes("catalog registry")));
  for (const field of ["attribute_evidence","game_fitness_evidence","current_gear_delta_assessment","value_assessment","price_snapshot","lifecycle_state","fix_before_buy","attributes","evidence","need_assessment","price","variant_scope","direction_codes","input_methods"]) {
    assert.ok(proReference.validateReferenceOnlyRecord({ ranking_effect:"none", nested:{ [field]:{} } }).some(error=>error.includes(field)),field);
  }
  assert.ok(gameContext.validateGameProfile({ ...gameContext.getGameProfile("valorant"), pro_fixed_role_allowed:true }).some(error=>error.includes("pro_fixed_role_allowed")));
});

test("Pro adoption is reference-only and has no performance, fit, affiliate, or ranking effect", () => {
  const adoption = proReference.buildAdoptionReference({
    game_id:"valorant", input_method:"mnk", product_id:"mouse-example", variant_id:"mouse-example:black", category:"mouse",
    numerator:30, denominator:120, sampling_frame:"qualified VCT match sample", coverage_rate:0.9, missingness_rate:0.1,
    period_start:"2026-07-12", period_end:"2026-10-10", checked_at:"2026-10-10", source_ids:["test:gear-1"],
    commission_rate:99
  },[GEAR_SOURCE]);
  assert.equal(adoption.evidence_meaning,"adoption_only");
  assert.equal(adoption.performance_evidence,false);
  assert.equal(adoption.personal_fit_evidence,false);
  assert.equal(adoption.ranking_effect,"none");
  assert.equal(adoption.affiliate_effect,"none");
  for (const field of proReference.PROHIBITED_RANKING_FIELDS) assert.equal(adoption[field],undefined,field);
  assert.throws(()=>proReference.buildAdoptionReference({
    game_id:"valorant", input_method:"mnk", product_id:"mouse-example", variant_id:"mouse-example:black", category:"mouse",
    numerator:-1, denominator:0, sampling_frame:"unknown", coverage_rate:2, missingness_rate:0,
    period_start:"1999-01-01", period_end:"1999-02-01", checked_at:"1999-02-02", source_ids:["bogus"]
  }),/numerator|denominator|coverage|not registered/);
});

test("Role and Gear observations remain separate through a source-explicit join", () => {
  const role = proReference.deriveValorantRecentRole(usage("vlr:105",[["sova",300]]));
  const card = proReference.buildReferenceCard({
    identity:identityFor("vlr:105"),
    role_observation:role,
    gear_observations:[{
      player_id:"vlr:105", source_player_id:"105", product_id:"mouse-example", variant_id:"mouse-example:black", category:"mouse", game_id:"valorant", input_method:"mnk",
      source_id:"test:gear-1", checked_at:"2026-10-10",
      observation_type:"observed_use", commercial_relationship:"unknown_disclosed"
    }],
    source_records:[MATCH_SOURCE,GEAR_SOURCE]
  });
  assert.equal(card.reference_only,true);
  assert.equal(card.join_metadata.joined_from_separate_records,true);
  assert.equal(card.join_metadata.role_and_gear_are_one_claim,false);
  assert.deepEqual(card.join_metadata.overlapping_source_ids,[]);
  assert.throws(()=>proReference.buildReferenceCard({
    identity:identityFor("vlr:105"),
    role_observation:role,
    gear_observations:[{ player_id:"other:105", source_player_id:"105", product_id:"mouse-example", variant_id:"mouse-example:black", category:"mouse", game_id:"valorant", input_method:"mnk", source_id:"test:gear-1", checked_at:"2026-10-10", observation_type:"observed_use", commercial_relationship:"unknown_disclosed" }],
    source_records:[MATCH_SOURCE,GEAR_SOURCE]
  }),/player identity mismatch/);
});

test("reference firewall rejects nested ranking fields, identity drift, unknown sources, and source overlap", () => {
  const maliciousProfile = {
    ...gameContext.getGameProfile("valorant"),
    official_role_taxonomy:[...gameContext.valorantRoles,{ role_id:"fake", label_en:"Fake", label_ja:"偽", role_kind:"player_role", source_ids:["valorant-role-overview"], game_fitness:{ score:1 } }]
  };
  assert.ok(gameContext.validateGameProfile(maliciousProfile).some(error=>error.includes("game_fitness")));
  assert.ok(proReference.validatePlayerIdentity({ player_id:"vlr:1", identity_namespace:"other", display_name:"Player" }).some(error=>error.includes("namespace")));
  assert.ok(proReference.validateReferenceOnlyRecord({ ranking_effect:"none", nested:{ performance_traits:{ tracking:1 } } }).some(error=>error.includes("performance_traits")));

  const role = proReference.deriveValorantRecentRole(usage("vlr:source",[["sova",300]]));
  const base = {
    identity:identityFor("vlr:source",["test:match-1"]), role_observation:role,
    gear_observations:[{ player_id:"vlr:source", source_player_id:"source", product_id:"mouse-example", variant_id:"mouse-example:black", category:"mouse", game_id:"valorant", input_method:"mnk", source_id:"unknown-source", checked_at:"2026-10-10", observation_type:"observed_use", commercial_relationship:"unknown_disclosed" }],
    source_records:[MATCH_SOURCE]
  };
  assert.throws(()=>proReference.buildReferenceCard(base),/not registered/);

  const overlap = {
    ...base,
    gear_observations:[{ ...base.gear_observations[0], source_id:"test:match-1" }]
  };
  assert.throws(()=>proReference.buildReferenceCard(overlap),/separate sources/);
});

test("sponsorship announcements are not accepted as gear-use evidence and stale Gear is labeled", () => {
  assert.ok(proReference.validateGearObservation({
    player_id:"vlr:106", product_id:"mouse-example", category:"mouse", source_id:"sponsor-post-1",
    checked_at:"2026-10-10", observation_type:"sponsorship_announcement", commercial_relationship:"sponsor_or_provided"
  }).some(error=>error.includes("evidence of use")));
  assert.deepEqual(proReference.observationFreshness({ checked_at:"2026-01-01" },"2026-10-10",90),{ status:"stale", age_days:282 });
  const role = proReference.deriveValorantRecentRole(usage("vlr:stale",[["sova",300]]));
  assert.throws(()=>proReference.buildReferenceCard({
    identity:identityFor("vlr:stale"), role_observation:role,
    gear_observations:[{ player_id:"vlr:stale", source_player_id:"stale", product_id:"mouse-example", variant_id:"mouse-example:black", category:"mouse", game_id:"valorant", input_method:"mnk", source_id:"test:gear-1", checked_at:"2026-01-01", observation_type:"observed_use", commercial_relationship:"unknown_disclosed" }],
    source_records:[MATCH_SOURCE,GEAR_SOURCE]
  }),/stale observation/);
  assert.ok(proReference.validateTeamObservation({
    player_id:"vlr:stale", source_player_id:"stale", team_id:"team:1", display_name:"Team", source_id:"test:gear-1", checked_at:"2026-10-10",
    nested:{ performance_score:1 }
  },[GEAR_SOURCE]).some(error=>error.includes("performance_score")));
});

test("private tester bundle does not import staging files or symbols", () => {
  const html = fs.readFileSync(path.join(root,"private","personal-gear.html"),"utf8");
  const script = fs.readFileSync(path.join(root,"private","personal-gear.js"),"utf8");
  for (const marker of ["game-context-v2.staging.js","pro-role-reference.staging.js","GameFitGameContextV2Staging","GameFitProRoleReferenceStaging"]) {
    assert.equal(html.includes(marker),false,marker);
    assert.equal(script.includes(marker),false,marker);
  }
  const scriptSources = [...html.matchAll(/<script\s+src="([^"]+)"/g)].map(match=>match[1]);
  for (const source of scriptSources) {
    const dependency = fs.readFileSync(path.resolve(root,"private",source),"utf8");
    for (const marker of ["game-context-v2.staging.js","pro-role-reference.staging.js","GameFitGameContextV2Staging","GameFitProRoleReferenceStaging"]) {
      assert.equal(dependency.includes(marker),false,`${source}:${marker}`);
    }
  }
  assert.equal(privateStore.COMMON.build_id,"pgi-n10-preflight-v3");
});
