const assert = require("node:assert/strict");
const test = require("node:test");

const validation = require("../validation-engine.js");
const funnel = require("../data/conversion-funnel-fixtures.js");
const plan = require("../data/validation-growth-plan.js");
const tester = require("../data/private-tester-spec.js");
const business = require("../business-model.js");
const isp = require("../isp-boundary-engine.js");
const programs = require("../data/affiliate-programs.js");
const purchaseRoutes = require("../purchase-route-engine.js");
const listings = require("../data/listings.js");
const affiliate = require("../affiliate.js");

function properties(id, extra = {}) {
  return { journey_id:id, category:"mouse", game_id:"apex", input_method:"mnk", source:"private_fixture", content_id:"test-path", entry_offer:"diagnosis", campaign:"pgi-validation-v1", cohort:"internal", locale:"ja", traffic_class:"tester", sequence:0, elapsed_ms:0, ...extra };
}

test("private validation harness accepts only allowlisted local events and has no transport", () => {
  const harness = validation.createLocalHarness();
  assert.equal(harness.external_sending_enabled,false);
  assert.equal(harness.transport,"none");
  assert.equal(harness.capture("landing_viewed",properties("local-1")).accepted,true);
  assert.equal(harness.capture("landing_viewed",{ ...properties("local-2"), email:"private@example.test" }).accepted,false);
  assert.equal(harness.events().length,1);
});

test("funnel simulation measures decision value and does not treat DONT_UPGRADE as failure", () => {
  const report = validation.computeMetrics(funnel.events);
  assert.equal(report.valid,true);
  assert.equal(report.counts.landings,4);
  assert.equal(report.counts.qualified,3);
  assert.equal(report.counts.successful_journeys,3);
  assert.equal(report.metrics.my_setup_start_rate.rate,1);
  assert.equal(report.metrics.gear_taste_input_rate.rate,0.75);
  assert.equal(report.metrics.next_upgrade_reach_rate.rate,0.75);
  assert.equal(report.metrics.why_not_usage_rate.rate,2/3);
  assert.equal(report.metrics.recommendation_acceptance_rate.rate,0.5);
  assert.equal(report.metrics.correction_rate.rate,0.5);
  assert.equal(report.metrics.re_ranking_success.rate,1);
  assert.equal(report.metrics.dont_upgrade_acceptance_rate.rate,1);
  assert.equal(report.metrics.affiliate_cta_intent_rate.rate,0.5);
});

test("repeated events from one journey do not inflate independent funnel counts", () => {
  const repeated = Array.from({ length:50 }, (_,sequence) => ({ name:"landing_viewed", properties:properties("same-local-journey",{ sequence, elapsed_ms:sequence }) }));
  const feedback = Array.from({ length:50 }, (_,index) => ({ name:"recommendation_feedback", properties:properties("same-local-journey",{ sequence:54+index, elapsed_ms:54+index, verdict:"agree" }) }));
  const path = [
    { name:"my_setup_started", properties:properties("same-local-journey",{ sequence:50, elapsed_ms:50 }) },
    { name:"gear_taste_completed", properties:properties("same-local-journey",{ sequence:51, elapsed_ms:51, attributes_count:1 }) },
    { name:"next_upgrade_reached", properties:properties("same-local-journey",{ sequence:52, elapsed_ms:52 }) },
    { name:"decision_viewed", properties:properties("same-local-journey",{ sequence:53, elapsed_ms:53, decision:"SAFE / FAMILIAR", affiliate_eligible:true }) }
  ];
  const report = validation.computeMetrics([...repeated,...path,...feedback]);
  assert.equal(report.counts.landings,1);
  assert.deepEqual(report.metrics.recommendation_acceptance_rate,{ numerator:1, denominator:1, rate:1 });
});

test("unqualified traffic cannot manufacture qualified demand", () => {
  const events = [
    { name:"landing_viewed", properties:properties("views-only") },
    { name:"demand_qualified", properties:properties("not-buying",{ shopping_state:"not_shopping", purchase_window:"none", problem_state:"no_problem" }) }
  ];
  const report = validation.computeMetrics(events);
  assert.equal(report.metrics.qualified_demand_rate.numerator,0);
});

test("missing or contradictory qualified-demand fields fail closed", () => {
  assert.ok(validation.validateEvent({ name:"demand_qualified", properties:properties("missing") }).length > 0);
  assert.ok(validation.validateEvent({ name:"demand_qualified", properties:properties("contradiction",{ shopping_state:"considering", purchase_window:"none", problem_state:"specific_problem" }) }).length > 0);
});

test("isolated or out-of-order rerank success cannot create a successful journey", () => {
  const lone = validation.computeMetrics([{ name:"rerank_completed", properties:properties("lone",{ rerank_success:true, confidence_change:"increased" }) }]);
  assert.equal(lone.counts.successful_journeys,0);
  const mismatched = funnel.events.map((event,index)=>index===1?{ ...event, properties:{ ...event.properties, game_id:"valorant" } }:event);
  assert.ok(validation.computeMetrics(mismatched).excluded_journeys.length > 0);
});

test("internal QA and suspected bot traffic are excluded from validation denominators", () => {
  const events = Array.from({ length:100 }, (_,index) => ({ name:"landing_viewed", properties:properties(`qa-${index}`,{ traffic_class:index % 2 ? "internal_qa" : "bot_suspected" }) }));
  const report = validation.computeMetrics(events);
  assert.equal(report.counts.landings,0);
  assert.equal(report.metrics.my_setup_start_rate.rate,null);
});

test("keep and DONT_UPGRADE suppress product Affiliate CTAs", () => {
  const enabled = [{ merchant_id:"test", merchant_name:"Test", enabled:true, affiliate_url:"https://example.test/", categories:["ram"], destination_type:"product_page", disclosure_label:"Ad", priority:1 }];
  assert.deepEqual(affiliate.modelsForPersonalGearResult({ topRecommendation:"keep", ranked:[{ key:"keep" },{ key:"ram" }] },{},enabled),[]);
  assert.deepEqual(affiliate.modelsForPersonalGearResult({ recommendations:[{ upgrade_match:"DONT_UPGRADE" }], ranked:[{ key:"ram" }] },{},enabled),[]);
  assert.deepEqual(affiliate.modelsForPersonalGearResult({ recommendations:[{ upgrade_match:"SAFE / FAMILIAR" }], topRecommendation:"keep", ranked:[{ key:"ram" }] },{},enabled),[]);
  assert.equal(affiliate.modelsForResult({ topRecommendation:"keep", ranked:[{ key:"ram" }] },{},enabled).length,1);
});

test("listing selection fails closed on SKU, region, currency, age, URL, and negative price", () => {
  const base = { product_id:"p", variant_id:"v", merchant_id:"m", region:"JP", currency:"JPY", in_stock:true, checked_at:"2026-10-09" };
  const valid = { ...base, listing_id:"valid", price_amount:100, destination_url:"https://approved.example/p" };
  const attacks = [
    { ...valid, listing_id:"negative", price_amount:-1 },
    { ...valid, listing_id:"foreign", region:"US", currency:"USD", price_amount:1 },
    { ...valid, listing_id:"wrong-product", product_id:"q", price_amount:2 },
    { ...valid, listing_id:"wrong-variant", variant_id:"x", price_amount:3 },
    { ...valid, listing_id:"unsafe", destination_url:"javascript:alert(1)", price_amount:4 },
    { ...valid, listing_id:"stale", checked_at:"2026-01-01", price_amount:5 },
    { ...valid, listing_id:"domain", destination_url:"https://unapproved.example/p", price_amount:6 }
  ];
  assert.equal(listings.chooseCheapest([valid,...attacks],{ product_id:"p", variant_id:"v", region:"JP", currency:"JPY", as_of:"2026-10-10", max_age_days:7, approved_domains:["approved.example"] }).listing_id,"valid");
  assert.equal(listings.chooseCheapest([valid]),null);
  assert.equal(listings.chooseCheapest([{ ...valid, in_stock:"unknown" }],{ product_id:"p", variant_id:"v", region:"JP", currency:"JPY", as_of:"2026-10-10", max_age_days:7, approved_domains:["approved.example"] }),null);
  for (const invalidPrice of [null,"",false,"1"]) {
    assert.equal(listings.chooseCheapest([{ ...valid, price_amount:invalidPrice }],{ product_id:"p", variant_id:"v", region:"JP", currency:"JPY", as_of:"2026-10-10", max_age_days:7, approved_domains:["approved.example"] }),null);
  }
});

test("product, merchant, listing, and affiliate program remain separate and commission cannot choose a route", () => {
  const merchants = [{ merchant_id:"a", name:"A" },{ merchant_id:"b", name:"B" }];
  const listingRows = [
    { listing_id:"a-offer", product_id:"p", variant_id:"v", merchant_id:"a", region:"JP", currency:"JPY", checked_at:"2026-10-10", in_stock:true, price_amount:110, destination_url:"https://a.example/p" },
    { listing_id:"b-offer", product_id:"p", variant_id:"v", merchant_id:"b", region:"JP", currency:"JPY", checked_at:"2026-10-10", in_stock:true, price_amount:100, destination_url:"https://b.example/p" },
    { listing_id:"wrong-route", product_id:"p", variant_id:"other", merchant_id:"a", region:"US", currency:"USD", checked_at:"2020-01-01", in_stock:true, price_amount:1, destination_url:"https://a.example/wrong" }
  ];
  const programRows = [
    { affiliate_program_id:"a-program", merchant_id:"a", status:"approved", tracking_url:"https://a.example/t", commission_rate:0.50 },
    { affiliate_program_id:"b-program", merchant_id:"b", status:"approved", tracking_url:"https://b.example/t", commission_rate:0 }
  ];
  const routes = purchaseRoutes.buildRoutes({ product_id:"p", listings:listingRows, merchants, affiliate_programs:programRows });
  assert.equal(routes.length,3);
  const context = { product_id:"p", variant_id:"v", region:"JP", currency:"JPY", as_of:"2026-10-10", max_age_days:7, approved_domains:["a.example","b.example"] };
  assert.equal(purchaseRoutes.selectRoute(routes,context).listing.listing_id,"b-offer");
  assert.equal(purchaseRoutes.selectRoute(routes),null);
  assert.equal(purchaseRoutes.ranking_inputs.includes("commission_rate"),false);
});

test("real affiliate programs remain disabled and cannot affect recommendation rank", () => {
  assert.ok(programs.programs.every(item => item.status !== "approved" && item.tracking_url === "" && item.recommendation_rank_input === false));
});

test("10, 30, and 100 tester gates include success, stop, time, and no-purchase paths", () => {
  assert.deepEqual(tester.cohorts.map(item => item.size),[10,30,100]);
  assert.ok(tester.cohorts.every(item => item.success.length && item.stop.length && item.estimated_human_hours > 0 && item.purchase_required === false));
  assert.ok(tester.scenarios.some(item => item.id === "no-purchase-needed"));
  assert.equal(tester.external_recruitment_authorized,false);
});

test("cohort gates are executable and incomplete samples stay INCONCLUSIVE", () => {
  assert.equal(validation.evaluateCohortGate(funnel.events,10).status,"INCONCLUSIVE");
  const incident = funnel.events.map(event=>event.name==="session_review_completed"?{ ...event, properties:{ ...event.properties, severe_error:true } }:event);
  assert.equal(validation.evaluateCohortGate(incident,10).status,"STOP");
  const complete = Array.from({ length:10 },(_,index) => {
    const id = `tester-${index}`;
    const p = (sequence,extra={}) => properties(id,{ cohort:"n10", sequence, elapsed_ms:sequence===5?300000:sequence*1000, ...extra });
    return [
      { name:"landing_viewed", properties:p(0) }, { name:"my_setup_started", properties:p(1) },
      { name:"gear_taste_completed", properties:p(2,{ attributes_count:2 }) }, { name:"next_upgrade_reached", properties:p(3) },
      { name:"decision_viewed", properties:p(4,{ decision:"DONT_UPGRADE", affiliate_eligible:false }) },
      { name:"session_review_completed", properties:p(5,{ reason_understood:index<7, severe_error:false, privacy_incident:false }) }
    ];
  }).flat();
  assert.equal(validation.evaluateCohortGate(complete,10).status,"PASS");
});

test("growth channels are ranked by decision funnel fit and publication remains unauthorized", () => {
  assert.equal(plan.channels[0].channel,"comparison_diagnosis_pages");
  assert.ok(plan.channels.every(item => item.role && item.gate));
  assert.equal(plan.external_publication_authorized,false);
  assert.ok(plan.hooks.every(item => item.cta && item.feature));
});

test("every monetization route is recommendation-independent and free decision value remains intact", () => {
  assert.ok(plan.monetization.every(item => item.recommendation_rank_input === false));
  assert.ok(plan.premium.free.includes("Regret Shield"));
  assert.match(plan.premium.rule,/free decision must remain useful/i);
});

test("three-case revenue model is transparent math and remains hypothesis-only", () => {
  const results = plan.revenue_scenarios.map(business.calculateScenario);
  assert.deepEqual(plan.revenue_scenarios.map(item => item.name),["pessimistic","base","success"]);
  assert.equal(results[0].status,"hypothesis_not_actual");
  assert.equal(results[0].affiliate_revenue,20.16);
  assert.equal(results[1].affiliate_revenue,3672);
  assert.equal(results[1].premium_revenue,27600);
  assert.equal(results[1].revenue,30192);
  assert.equal(results[2].revenue,488250);
  assert.equal(results[2].net_profit,223250);
  assert.equal(results[0].taxes_included,false);
  assert.ok(results[0].net_profit < 0);
  assert.ok(results[2].net_profit > 0);
});

test("human-time model uses a conservative workload-weighted A/B/C/D baseline", () => {
  const result = business.automationRatio(plan.workstreams);
  assert.equal(result.basis,"weighted workload units, not task count");
  assert.equal(result.total_units,100);
  assert.equal(result.ratio,0.60);
  assert.equal(plan.workstreams.reduce((sum,item)=>sum+item.mature_human_hours,0),35);
});

test("ISP boundary never auto-recommends a provider or enables an affiliate route", () => {
  assert.equal(isp.evaluate({}).status,"FIX_BEFORE_BUY");
  const measured = { connection_type:"wired_direct", sample_windows:3, sample_days:2, wired_direct_tested:true, local_fix_checks_complete:true, router_firmware_checked:true, os_network_settings_checked:true };
  assert.equal(isp.evaluate(measured).status,"OFFICIAL_CHECK_REQUIRED");
  const reviewed = { ...measured, official_area_eligibility_checked:true, building_type_checked:true, installation_terms_checked:true, contract_terms_checked:true, persistent_issue_observed:true };
  const result = isp.evaluate(reviewed);
  assert.equal(result.status,"HUMAN_OFFICIAL_REVIEW_REQUIRED");
  assert.equal(result.can_recommend_isp,false);
  assert.equal(result.affiliate_eligible,false);
});

test("research references are current-date, https, and typed", () => {
  assert.ok(plan.sources.every(source => source.checked_date === plan.checked_date && source.type && source.url.startsWith("https://")));
});
