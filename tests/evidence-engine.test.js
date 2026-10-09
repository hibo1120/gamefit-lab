const assert = require("node:assert/strict");
const test = require("node:test");
const evidence = require("../evidence-engine.js");

function validRow(id,type,options={}) {
  const sourceType = options.source_type || (type === "measurement" ? "independent_lab" : type === "subjective" ? "specialist_review" : type === "issue" ? "community" : "official");
  return {
    evidence_id:id, source_id:options.source_id || id, source_origin_id:options.source_origin_id || id, product_id:"p",
    evidence_type:type, source_type:sourceType, summary:"Short GameFit-authored fact.", source_url:options.source_url || `https://${id}.example/fact`,
    retrieved_at:"2026-10-09", checked_date:"2026-10-09", raw_fact:"Short GameFit-authored fact.",
    normalized_fact:{ attribute:options.attribute || "test_attribute", value:options.value ?? "same" }, locale:"en-US",
    methodology_family:options.methodology_family || (type === "measurement" ? "lab_method" : type === "subjective" ? "specialist_editorial" : "official_spec"),
    rights_use_note:"No copied content.", commercial_relationship:sourceType === "official" ? "manufacturer" : "none",
    independent:sourceType !== "official", stance:options.stance || null, long_term:options.long_term === true,
    measurement_verification:type === "measurement" ? "verified_lab" : "not_applicable"
  };
}

test("subjective consensus needs independent repeated agreement", () => {
  assert.equal(evidence.normalizeSubjectiveConsensus([
    { evidence_type:"subjective", source_id:"review-1", stance:"light_clicks", independent:true }
  ]), "anecdotal");
  assert.equal(evidence.normalizeSubjectiveConsensus([
    { evidence_type:"subjective", source_id:"review-1", stance:"light_clicks", independent:true },
    { evidence_type:"subjective", source_id:"review-2", stance:"light_clicks", independent:true }
  ]), "medium");
  assert.equal(evidence.normalizeSubjectiveConsensus([
    { evidence_type:"subjective", source_id:"review-1", stance:"light_clicks", independent:true },
    { evidence_type:"subjective", source_id:"review-2", stance:"heavy_clicks", independent:true }
  ]), "mixed");
});

test("incompatible measurement methodologies are never averaged", () => {
  const grouped = evidence.groupCompatibleMeasurements([
    { evidence_type:"measurement", methodology_family:"lab_a_click_latency", value:0.4 },
    { evidence_type:"measurement", methodology_family:"lab_b_click_latency", value:0.8 },
    { evidence_type:"measurement", methodology_family:"lab_a_click_latency", value:0.5 }
  ]);
  assert.deepEqual(Object.keys(grouped).sort(), ["lab_a_click_latency","lab_b_click_latency"]);
  assert.equal(grouped.lab_a_click_latency.length, 2);
  assert.equal(grouped.lab_b_click_latency.length, 1);
});

test("new products cannot jump straight to highest confidence", () => {
  const product = { lifecycle_state:"announced", evidence_grade:"D" };
  assert.equal(evidence.newProductConfidenceCap(product), 0.35);
  const grade = evidence.gradeFromEvidence([
    validRow("official","spec"),
    validRow("lab-1","measurement"),
    validRow("lab-2","measurement"),
    validRow("review-1","subjective",{ stance:"good" }),
    validRow("review-2","subjective",{ stance:"good" }),
    validRow("review-3","subjective",{ stance:"good" })
  ], product);
  assert.equal(grade, "C");
});

test("credible negatives remain visible as concerns", () => {
  const assessment = evidence.buildAssessment([
    { evidence_type:"measurement", independent:true, effect:"strength", summary:"Low click latency" },
    { evidence_type:"subjective", independent:true, stance:"loud_click", effect:"concern", summary:"Click sound is loud" },
    { evidence_type:"subjective", independent:true, stance:"loud_click", effect:"concern", summary:"Click sound is loud" }
  ], { lifecycle_state:"mature", evidence_grade:"C" });
  assert.ok(assessment.strengths.includes("Low click latency"));
  assert.ok(assessment.concerns.includes("Click sound is loud"));
});

test("duplicate records from one source never create fake consensus", () => {
  assert.equal(evidence.normalizeSubjectiveConsensus([
    { evidence_type:"subjective", source_id:"same-review", independent:true, stance:"light_clicks" },
    { evidence_type:"subjective", source_id:"same-review", independent:true, stance:"light_clicks" },
    { evidence_type:"subjective", source_id:"other-review", independent:true, stance:"heavy_clicks" }
  ]), "mixed");
});

test("records without source provenance never create independent consensus or grade A", () => {
  const unknown = [
    { evidence_type:"measurement", evidence_id:"m1", independent:true },
    { evidence_type:"measurement", evidence_id:"m2", independent:true },
    { evidence_type:"subjective", evidence_id:"s1", independent:true, stance:"good" },
    { evidence_type:"subjective", evidence_id:"s2", independent:true, stance:"good" },
    { evidence_type:"subjective", evidence_id:"s3", independent:true, stance:"good", long_term:true }
  ];
  assert.equal(evidence.normalizeSubjectiveConsensus(unknown), "anecdotal");
  assert.equal(evidence.gradeFromEvidence(unknown, { lifecycle_state:"mature" }), "D");
});

test("highest evidence grade requires independent long-term coverage", () => {
  const withoutLongTerm = [
    validRow("official","spec"),
    validRow("lab-1","measurement"),
    validRow("lab-2","measurement"),
    validRow("review-1","subjective",{ stance:"good" }),
    validRow("review-2","subjective",{ stance:"good" }),
    validRow("review-3","subjective",{ stance:"good" })
  ];
  assert.equal(evidence.gradeFromEvidence(withoutLongTerm, { lifecycle_state:"mature" }), "B");
  assert.equal(evidence.gradeFromEvidence(withoutLongTerm.concat(validRow("long-use","issue",{ long_term:true })), { lifecycle_state:"mature" }), "A");
});

test("Evidence records keep normalized facts and reject copied media or review bodies", () => {
  const base = {
    evidence_id:"ev-1", source_id:"manufacturer", product_id:"mouse-a", evidence_type:"spec",
    summary:"Manufacturer lists a 55 g nominal weight.", source_url:"https://example.test/mouse-a",
    retrieved_at:"2026-10-09", methodology_family:"official_spec"
  };
  assert.deepEqual(evidence.validateEvidenceRecord(base), []);
  assert.ok(evidence.validateEvidenceRecord({ ...base, review_body:"copied review" }).includes("review_body is prohibited"));
  assert.ok(evidence.validateEvidenceRecord({ ...base, thumbnail_url:"https://example.test/thumb.jpg" }).includes("thumbnail_url is prohibited"));
  for (const field of ["body","quote","captions","ocr_text","html","markdown","raw_table","image_data"]) {
    assert.ok(evidence.validateEvidenceRecord({ ...base, [field]:"copied" }).includes(field + " is prohibited"), field);
  }
  const fixtureBase = {
    ...base, source_origin_id:"origin-1", source_type:"official", checked_date:"2026-10-09",
    raw_fact:"Short GameFit-authored fact.", normalized_fact:{ attribute:"weight", value:55, unit:"g" },
    locale:"en-US", rights_use_note:"GameFit fact only; do not copy source content.",
    commercial_relationship:"manufacturer", independent:false
  };
  assert.deepEqual(evidence.validateFixtureEvidenceRecord(fixtureBase),[]);
  assert.ok(evidence.validateFixtureEvidenceRecord({ ...fixtureBase, raw_fact:"x".repeat(281) })
    .includes("raw_fact must be a concise plain-text GameFit-authored fact"));
  const implicit = { ...fixtureBase };
  delete implicit.independent;
  assert.ok(evidence.validateFixtureEvidenceRecord(implicit).includes("independent must be explicit"));
});

test("stance-free records and conflicting subjective claims cannot manufacture consensus", () => {
  const stanceFree = ["a","b","c"].map(source_id => ({ evidence_type:"subjective", source_id, independent:true }));
  assert.equal(evidence.normalizeSubjectiveConsensus(stanceFree), "anecdotal");
  const conflict = [
    ...["a","b","c"].map(source_id => ({ evidence_type:"subjective", source_id, independent:true, stance:"positive" })),
    ...["d","e"].map(source_id => ({ evidence_type:"subjective", source_id, independent:true, stance:"negative" }))
  ];
  assert.equal(evidence.normalizeSubjectiveConsensus(conflict), "mixed");
});

test("mirrors with the same origin and adoption-only history do not inflate evidence grade", () => {
  const records = [
    validRow("official-mirror","spec"),
    validRow("mirror-a","measurement",{ source_origin_id:"lab-origin" }),
    validRow("mirror-b","measurement",{ source_origin_id:"lab-origin" }),
    validRow("r1","subjective",{ stance:"positive" }),
    validRow("r2","subjective",{ stance:"positive" }),
    validRow("r3","subjective",{ stance:"positive" }),
    validRow("pros","adoption",{ source_type:"esports_database", long_term:true })
  ];
  assert.equal(evidence.uniqueIndependent(records.slice(1,3)).length,1);
  assert.equal(evidence.gradeFromEvidence(records,{ lifecycle_state:"mature" }),"B");
});

test("attribute evidence is independent from product-level grade and preserves conflicts", () => {
  assert.deepEqual(evidence.buildAttributeAssessment([],"shape",{ evidence_grade:"A" }), {
    attribute:"shape", grade:"D", confidence:"Low", source_count:0, independent_source_count:0, conflict:false,
    consensus:"anecdotal", methodology_families:[], normalized_facts:[], data_gaps:["attribute_evidence_missing"]
  });
  const assessment = evidence.buildAttributeAssessment([
    { evidence_type:"measurement", source_id:"lab-a", independent:true, methodology_family:"lab-a", normalized_fact:{ attribute:"weight", value:49, unit:"g" } },
    { evidence_type:"measurement", source_id:"lab-b", independent:true, methodology_family:"lab-b", normalized_fact:{ attribute:"weight", value:52, unit:"g" } }
  ],"weight",{ lifecycle_state:"mature" });
  assert.equal(assessment.conflict,true);
  assert.equal(assessment.confidence,"Low");
});
