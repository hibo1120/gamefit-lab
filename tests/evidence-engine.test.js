const assert = require("node:assert/strict");
const test = require("node:test");
const evidence = require("../evidence-engine.js");

test("subjective consensus needs independent repeated agreement", () => {
  assert.equal(evidence.normalizeSubjectiveConsensus([
    { evidence_type:"subjective", stance:"light_clicks", independent:true }
  ]), "anecdotal");
  assert.equal(evidence.normalizeSubjectiveConsensus([
    { evidence_type:"subjective", stance:"light_clicks", independent:true },
    { evidence_type:"subjective", stance:"light_clicks", independent:true }
  ]), "medium");
  assert.equal(evidence.normalizeSubjectiveConsensus([
    { evidence_type:"subjective", stance:"light_clicks", independent:true },
    { evidence_type:"subjective", stance:"heavy_clicks", independent:true }
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
    { evidence_type:"measurement", independent:true },
    { evidence_type:"measurement", independent:true },
    { evidence_type:"subjective", independent:true, stance:"good" },
    { evidence_type:"subjective", independent:true, stance:"good" },
    { evidence_type:"subjective", independent:true, stance:"good" }
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