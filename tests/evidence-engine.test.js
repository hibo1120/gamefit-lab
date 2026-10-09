const assert = require("node:assert/strict");
const test = require("node:test");
const evidence = require("../evidence-engine.js");

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
    { evidence_type:"measurement", source_id:"lab-1", independent:true },
    { evidence_type:"measurement", source_id:"lab-2", independent:true },
    { evidence_type:"subjective", source_id:"review-1", independent:true, stance:"good" },
    { evidence_type:"subjective", source_id:"review-2", independent:true, stance:"good" },
    { evidence_type:"subjective", source_id:"review-3", independent:true, stance:"good" }
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
    { evidence_type:"measurement", source_id:"lab-1", independent:true },
    { evidence_type:"measurement", source_id:"lab-2", independent:true },
    { evidence_type:"subjective", source_id:"review-1", independent:true, stance:"good" },
    { evidence_type:"subjective", source_id:"review-2", independent:true, stance:"good" },
    { evidence_type:"subjective", source_id:"review-3", independent:true, stance:"good" }
  ];
  assert.equal(evidence.gradeFromEvidence(withoutLongTerm, { lifecycle_state:"mature" }), "B");
  assert.equal(evidence.gradeFromEvidence(withoutLongTerm.concat({
    evidence_type:"issue", source_id:"long-use", independent:true, long_term:true
  }), { lifecycle_state:"mature" }), "A");
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
});
