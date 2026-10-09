const assert = require("node:assert/strict");
const test = require("node:test");
const fixtures = require("../data/personal-gear-fixtures.js");
const pairs = require("../data/recommendation-pairs.js");
const tester = require("../data/private-tester-spec.js");
const gear = require("../personal-gear-engine.js");
const evidence = require("../evidence-engine.js");
const audit = require("../evidence-audit.js");
const price = require("../price-timing-engine.js");
const delta = require("../current-gear-delta.js");
const feedback = require("../feedback-engine.js");
const prefs = require("../preference-engine.js");

const IDS = ["mouse-razer-viper-v4-pro","mouse-razer-viper-v3-pro","mouse-logitech-pro-x2-superstrike"];

test("three exact mouse SKUs reach Evidence B only through their ledgers", () => {
  for (const id of IDS) {
    const item = fixtures.products.find(product => product.product_id === id);
    assert.ok(item.variant_id,id);
    assert.equal(item.evidence_grade,"B",id);
    assert.ok(item.evidence.some(row => row.source_type === "official"),id);
    assert.ok(item.evidence.some(row => row.evidence_type === "measurement" && row.independent),id);
    assert.ok(item.evidence.some(row => row.source_type === "specialist_review"),id);
    assert.ok(item.evidence.some(row => row.claim_scope === "lifecycle" || row.long_term),id);
  }
});

test("the three end-to-end recommendation pairs preserve personal SAFE versus AVOID", () => {
  const results = pairs.buildCases().map(item => ({ item, result:gear.recommendUpgrades(item.input) }));
  for (const { item,result } of results) {
    assert.equal(result.status,"ok",item.id);
    assert.equal(result.recommendations[0].upgrade_match,item.expected_action,item.id);
    assert.ok(result.recommendations[0].decision_readiness,item.id);
    assert.ok(result.recommendations[0].current_gear_delta_assessment,item.id);
    assert.ok(result.recommendations[0].compatibility_assessment,item.id);
    assert.equal(item.input.decision_brief.brief.id,item.input.decision_brief_id,item.id);
    assert.ok(item.input.decision_brief.evidence.length > 0,item.id);
  }
  assert.equal(results[0].result.recommendations[0].product_id,results[2].result.recommendations[0].product_id);
  assert.equal(results[2].result.recommendations[0].regret_shield.should_block,true);
});

test("non-DONT gate exposes every mandatory check and keeps confidence capped", () => {
  const safe = gear.recommendUpgrades(pairs.buildCases()[0].input).recommendations[0];
  assert.equal(safe.decision_readiness.eligible,true);
  assert.equal(safe.decision_readiness.confidence_cap,"Medium");
  assert.ok(Object.values(safe.decision_readiness.checks).every(Boolean));
  assert.notEqual(safe.confidence,"High");
});

test("unresolved game evidence IDs and cross-region prices fail closed", () => {
  const base = pairs.buildCases()[0].input;
  const original = base.candidates[0];
  const exact = original.game_fitness.valorant_mnk;
  const unresolved = { ...original, game_fitness:{ valorant_mnk:{ ...exact, source_ids:["missing-ledger-id"] } } };
  const sourceResult = gear.recommendUpgrades({ ...base, candidates:[unresolved] }).recommendations[0];
  assert.equal(sourceResult.upgrade_match,"DONT_UPGRADE");
  assert.ok(sourceResult.data_gaps.includes("game_fitness_evidence_missing"));
  const wrongClaim = { ...original, game_fitness:{ valorant_mnk:{ ...exact, source_ids:[
    "mouse-razer-viper-v4-pro-official-10",
    "mouse-razer-viper-v4-pro-official-9"
  ] } } };
  const claimResult = gear.recommendUpgrades({ ...base, candidates:[wrongClaim] }).recommendations[0];
  assert.equal(claimResult.upgrade_match,"DONT_UPGRADE");
  assert.ok(claimResult.data_gaps.includes("game_fitness_evidence_missing"));
  const regionResult = gear.recommendUpgrades({ ...base, region:"JP", currency:"JPY" }).recommendations[0];
  assert.equal(regionResult.upgrade_match,"DONT_UPGRADE");
  assert.ok(regionResult.price_assessment.errors.includes("region_mismatch"));
  assert.ok(regionResult.price_assessment.errors.includes("currency_mismatch"));
});

test("price snapshot is canonical and a conflicting convenience price cannot bypass budget", () => {
  const base = pairs.buildCases()[0].input;
  const candidate = { ...base.candidates[0], price:0 };
  const result = gear.recommendUpgrades({ ...base, budget:100, candidates:[candidate] }).recommendations[0];
  assert.equal(result.upgrade_match,"DONT_UPGRADE");
  assert.equal(result.safety_gate.budget_exceeded,true);
  assert.equal(result.price_assessment.current_price,159.99);

  const v3 = fixtures.products.find(product => product.product_id === "mouse-razer-viper-v3-pro");
  const swapped = { ...base.candidates[0], price_snapshot:v3.price_snapshot };
  const swappedResult = gear.recommendUpgrades({ ...base, budget:150, candidates:[swapped] }).recommendations[0];
  assert.equal(swappedResult.upgrade_match,"DONT_UPGRADE");
  assert.ok(swappedResult.price_assessment.errors.includes("product_id_mismatch"));
  assert.ok(swappedResult.price_assessment.errors.includes("variant_id_mismatch"));
});

test("price freshness never manufactures a Deal Score without history", () => {
  const item = fixtures.products.find(product => product.product_id === "mouse-razer-viper-v4-pro");
  const context = { as_of:fixtures.CHECKED_DATE, region:"US", currency:"USD", product_id:item.product_id, variant_id:item.variant_id };
  const assessed = price.assess(item.price_snapshot,context);
  assert.equal(assessed.status,"known");
  assert.equal(assessed.price_fresh,true);
  assert.equal(assessed.deal_score,null);
  assert.equal(assessed.buy_timing,"unknown");
  for (const invalid of [{...item.price_snapshot,current_price:null},{...item.price_snapshot,current_price:"159.99"},{...item.price_snapshot,availability:"unknown"}]) {
    assert.equal(price.assess(invalid,context).status,"unknown");
  }
  assert.equal(price.assess(item.price_snapshot,{ ...context, region:"JP", currency:"JPY" }).status,"unknown");
});

test("Evidence audit checks the extended ledger and separates rights review", () => {
  const ledger = fixtures.products.flatMap(product => product.evidence);
  assert.ok(ledger.length >= 130);
  const report = audit.auditEvidence(ledger,{ as_of:fixtures.CHECKED_DATE });
  assert.equal(report.record_count,ledger.length);
  assert.ok(report.rights_queue.manual_review_required.length > 0);
  assert.match(report.policy,/never ingest/i);
  assert.equal(report.counts.malformed_source_url || 0,0);
  assert.equal(report.counts.missing_checked_date || 0,0);
  assert.equal(report.counts.source_type_mismatch || 0,0);
});

test("same corporate owner and invalid ledger rows cannot manufacture consensus or B", () => {
  const rows = ["techradar.com","pcgamer.com"].map((host,index) => ({
    evidence_id:"same-owner-"+index, source_id:"s"+index, source_origin_id:"o"+index, product_id:"p",
    evidence_type:"subjective", source_type:"specialist_review", stance:"positive", summary:"Short normalized fact.",
    source_url:"https://"+host+"/review", retrieved_at:fixtures.CHECKED_DATE, checked_date:fixtures.CHECKED_DATE,
    raw_fact:"Short normalized fact.", normalized_fact:{ attribute:"shape", value:"symmetrical" }, locale:"en",
    methodology_family:"specialist_editorial", rights_use_note:"No copied content.", commercial_relationship:"affiliate_links_disclosed",
    independent:true, publisher_group:"future_plc"
  }));
  assert.equal(evidence.normalizeSubjectiveConsensus(rows),"anecdotal");
  const forged = [{ evidence_type:"measurement", independent:true },...rows];
  assert.equal(evidence.gradeFromEvidence(forged,{ lifecycle_state:"mature" }),"D");

  const sharedPublisher = ["one.example","two.example","three.example"].map((host,index) => ({
    ...rows[0], evidence_id:"shared-publisher-"+index, source_id:"sp"+index, source_origin_id:"spo"+index,
    source_url:"https://"+host+"/review", publisher_group:null, publisher_id:"shared-corporate-publisher"
  }));
  assert.equal(evidence.normalizeSubjectiveConsensus(sharedPublisher,"shape"),"anecdotal");

  const forumPosts = ["a","b","c"].map((post,index) => ({
    ...rows[0], evidence_id:"forum-"+index, source_id:"forum-"+index, source_origin_id:"forum-"+index,
    source_type:"community", source_url:"https://community.example/posts/"+post, publisher_group:null, publisher_id:null
  }));
  assert.equal(evidence.normalizeSubjectiveConsensus(forumPosts,"shape"),"anecdotal");
});

test("exact-SKU grades reject family leakage and unverified measurements", () => {
  const item = fixtures.products.find(product => product.product_id === "mouse-razer-viper-v4-pro");
  const withoutVariant = item.evidence.map(row => ({ ...row, product_variant_id:null }));
  assert.equal(evidence.gradeFromEvidence(withoutVariant,{ lifecycle_state:item.lifecycle_state, variant_id:item.variant_id }),"D");

  const unverified = item.evidence.map(row => row.evidence_type === "measurement" ?
    { ...row, measurement_verification:null } : row);
  const measurement = unverified.find(row => row.evidence_type === "measurement");
  assert.ok(evidence.validateFixtureEvidenceRecord(measurement).includes("measurement_verification is required for measurement"));
  assert.equal(evidence.gradeFromEvidence(unverified,{ lifecycle_state:item.lifecycle_state, variant_id:item.variant_id }),"D");

  const foreign = { ...item.evidence.find(row => row.evidence_type === "subjective"), product_variant_id:"OTHER-SKU" };
  const assessment = evidence.buildAttributeAssessment([...item.evidence,foreign],"review_scope",{
    lifecycle_state:item.lifecycle_state,
    variant_id:item.variant_id
  });
  assert.equal(assessment.source_count,1);
});

test("a regression or neutral change never becomes a positive current gear delta", () => {
  const measured = (refresh,panel) => ({ category:"monitor", attributes:{ refresh_rate:{ normalized_value:refresh }, panel:{ normalized_value:panel } }, attribute_evidence:{ refresh_rate:{ grade:"B", methodology_families:["shared"] }, panel:{ grade:"B", methodology_families:["official_spec"] } } });
  const result = delta.compareProducts(measured(600,"oled"),measured(400,"fast_tn"));
  assert.equal(result.regression_count,1);
  assert.equal(result.model_score,null);
  const polling = delta.compareProducts(
    { category:"controller", attributes:{ polling_rate:{ normalized_value:125 }, layout:{ normalized_value:"asymmetric" } }, attribute_evidence:{ polling_rate:{ grade:"B", methodology_families:["shared"] }, layout:{ grade:"B", methodology_families:["official_spec"] } } },
    { category:"controller", attributes:{ polling_rate:{ normalized_value:8000 }, layout:{ normalized_value:"asymmetric" } }, attribute_evidence:{ polling_rate:{ grade:"B", methodology_families:["shared"] }, layout:{ grade:"B", methodology_families:["official_spec"] } } }
  );
  assert.equal(polling.compared_attributes.find(item=>item.attribute === "polling_rate").preference_direction,"neutral");
  assert.equal(polling.model_score,null);
});

test("one personal feedback cannot promote AVOID or DONT across the safety boundary", () => {
  const record = feedback.recommendationFeedback({ product_id:"safe", game_id:"apex", input_method:"mnk", verdict:"disagree", reason_codes:["weight"], desired_direction_codes:["lighter"] });
  const recommendations = [
    { product_id:"safe", game_id:"apex", input_method:"mnk", recommendation_score:80, upgrade_match:"SAFE / FAMILIAR" },
    { product_id:"avoid", game_id:"apex", input_method:"mnk", recommendation_score:77, upgrade_match:"AVOID", direction_codes:["lighter"] }
  ];
  const learned = feedback.applyPersonalLearningWithExplanation(prefs.createProfile(),record,recommendations);
  assert.equal(learned.recommendations[0].product_id,"safe");
  assert.equal(learned.explanation.user_facing_explanation.safety_boundary_preserved,true);
  assert.equal("delta" in learned.explanation.user_facing_explanation,false);
});

test("legacy hard avoids are migrated at read time and remain blocking", () => {
  const profile = prefs.setHardAvoid(prefs.createProfile(),"mouse","weight",49);
  const result = gear.evaluateRegretShield(fixtures.products.find(item=>item.product_id === "mouse-razer-viper-v4-pro"),profile,{ game_id:"apex", input_method:"mnk" });
  assert.equal(result.should_block,true);
});

test("private tester spec includes privacy, outcome and a no-purchase path without authorizing outreach", () => {
  assert.match(tester.privacyNotice,/localStorage/);
  assert.equal(tester.external_recruitment_authorized,false);
  assert.ok(tester.scenarios.some(item=>item.id === "no-purchase-needed" && item.purchase_required === false));
  assert.ok(tester.scenarios.every(item=>item.feedback_question && item.post_purchase_outcome_question));
});
