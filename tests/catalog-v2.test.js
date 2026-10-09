const assert = require("node:assert/strict");
const test = require("node:test");
const catalog = require("../data/catalog-v2.js");

test("wide catalog supports long-tail gaming categories", () => {
  for (const category of ["mouse","keyboard","monitor","mousepad","mouse_skates","audio","network","cable","controller"]) {
    assert.ok(catalog.CATEGORIES.includes(category), category);
  }
});

test("catalog validation separates identity from monetization", () => {
  const product = {
    product_id:"mouse-example",
    product_name:"Example Mouse",
    brand:"Example",
    category:"mouse",
    catalog_state:"catalog",
    lifecycle_state:"available",
    evidence_grade:"D",
    official_url:"https://example.test/product"
  };
  assert.deepEqual(catalog.validateProduct(product), []);
  assert.ok(!catalog.schema.productMasterRequired.includes("merchant_id"));
  assert.ok(!catalog.schema.productMasterRequired.includes("destination_url"));
});