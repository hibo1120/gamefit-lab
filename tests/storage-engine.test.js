const assert = require("node:assert/strict");
const test = require("node:test");
const store = require("../storage-engine.js");

class MemoryStorage {
  constructor() { this.map = new Map(); this.failWrites = false; }
  get length() { return this.map.size; }
  key(index) { return [...this.map.keys()][index] ?? null; }
  getItem(key) { return this.map.has(key) ? this.map.get(key) : null; }
  setItem(key,value) { if (this.failWrites) { const error = new Error("quota"); error.name = "QuotaExceededError"; throw error; } this.map.set(key,String(value)); }
  removeItem(key) { this.map.delete(key); }
}

test("local state saves, loads and exports without generating an identity", () => {
  const storage = new MemoryStorage();
  const state = store.createState();
  state.feedback.push({ type:"recommendation_feedback", verdict:"agree" });
  const saved = store.save(storage,state,"2026-10-09T00:00:00.000Z");
  const loaded = store.load(storage);
  assert.equal(loaded.status,"ok");
  assert.equal(loaded.state.feedback.length,1);
  assert.equal("user_id" in loaded.state,false);
  assert.match(store.exportState(saved), /"schema_version": 1/);
});

test("corrupt and future schemas are detected without automatic overwrite", () => {
  const storage = new MemoryStorage();
  storage.setItem(store.STORAGE_KEY,"{broken");
  const before = storage.getItem(store.STORAGE_KEY);
  const corrupt = store.load(storage);
  assert.equal(corrupt.status,"corrupt");
  assert.equal(corrupt.read_only,true);
  assert.equal(store.exportRecovery(corrupt.recovery_raw),before);
  assert.equal(storage.getItem(store.STORAGE_KEY),before);
  const futureRaw = JSON.stringify({ schema_version:99, future_data:{ keep:true } });
  storage.setItem(store.STORAGE_KEY,futureRaw);
  const future = store.load(storage);
  assert.equal(future.status,"future_schema");
  assert.equal(store.exportRecovery(future.recovery_raw),futureRaw);
  assert.equal(storage.getItem(store.STORAGE_KEY),futureRaw);
});

test("quota failure keeps the last good state and delete all removes only GameFit keys", () => {
  const storage = new MemoryStorage();
  store.save(storage,store.createState(),"2026-10-09T00:00:00.000Z");
  const before = storage.getItem(store.STORAGE_KEY);
  storage.failWrites = true;
  assert.throws(() => store.save(storage,store.createState()), /quota/);
  assert.equal(storage.getItem(store.STORAGE_KEY),before);
  storage.failWrites = false;
  storage.setItem("unrelated","keep");
  storage.setItem("gamefit.personal_gear.backup","remove");
  store.deleteAll(storage);
  assert.equal(storage.getItem("unrelated"),"keep");
  assert.equal(storage.getItem(store.STORAGE_KEY),null);
});

test("unsafe keys and malformed arrays are rejected", () => {
  const unsafe = store.createState();
  unsafe.profile = JSON.parse('{"__proto__":{"polluted":true}}');
  assert.ok(store.validateState(unsafe).some(error => error.includes("prohibited")));
  const malformed = store.createState();
  malformed.feedback = "not-an-array";
  assert.ok(store.validateState(malformed).includes("feedback must be an array"));
});

test("storage access denial enters read-only mode instead of crashing initialization", () => {
  const denied = { getItem() { throw new Error("SecurityError"); } };
  const result = store.load(denied);
  assert.equal(result.status,"unavailable");
  assert.equal(result.read_only,true);
  assert.equal(result.state.schema_version,store.SCHEMA_VERSION);
});
