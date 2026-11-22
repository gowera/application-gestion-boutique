const { test } = require("node:test");
const assert = require("node:assert/strict");
const fs = require("node:fs");
const os = require("node:os");
const path = require("node:path");
const { createLocalDatabase } = require("./local-db.cjs");

// Tests exercise persistence; OS encryption is supplied by Electron in production.
const encryption = {
  isEncryptionAvailable: () => true,
  encryptString: (value) => Buffer.from(value),
  decryptString: (value) => value.toString(),
};
function temporary(t) {
  const directory = fs.mkdtempSync(path.join(os.tmpdir(), "gestionstock-db-"));
  t.after(() => fs.rmSync(directory, { recursive: true, force: true }));
  return directory;
}

test("creates a JSON database before any login or write, without internet", (t) => {
  const directory = temporary(t);
  createLocalDatabase(directory, encryption);
  assert.equal(JSON.parse(fs.readFileSync(path.join(directory, "local-db/database.json"), "utf8")).version, 1);
});

test("server products, customers and documents survive restart and browser cache deletion", (t) => {
  const directory = temporary(t);
  const db = createLocalDatabase(directory, encryption);
  const datasets = { products: [{ id: "p1", stock: 7 }], customers: [{ id: "c1", name: "Client local" }], document_registry: [{ id: "d1", doc_number: "FAC-1" }] };
  for (const [table, rows] of Object.entries(datasets)) db.set(`user:owner:cache:table:${table}`, rows);
  fs.mkdirSync(path.join(directory, "Cache"));
  fs.rmSync(path.join(directory, "Cache"), { recursive: true });
  const reopened = createLocalDatabase(directory, encryption);
  for (const [table, rows] of Object.entries(datasets)) assert.deepEqual(reopened.get(`user:owner:cache:table:${table}`), rows);
});

test("offline queued entries remain after server data refresh", (t) => {
  const db = createLocalDatabase(temporary(t), encryption);
  const pending = [{ id: "operation-1", kind: "document", payload: { customer_id: "c1" } }];
  db.set("user:owner:outbox", pending);
  db.set("user:owner:cache:table:products", [{ id: "p1", stock: 8 }]);
  assert.deepEqual(db.get("user:owner:outbox"), pending);
  assert.equal(db.get("user:other-owner:outbox"), null);
});

test("corrupt primary file recovers the previous saved version", (t) => {
  const db = createLocalDatabase(temporary(t), encryption);
  db.set("user:owner:outbox", [{ id: "saved" }]);
  db.set("user:owner:outbox", [{ id: "saved" }, { id: "next" }]);
  const file = fs.readdirSync(db.directory).find((name) => /^[a-f0-9]{64}\.json$/.test(name));
  assert.ok(file);
  fs.writeFileSync(path.join(db.directory, file), "interrupted write");
  assert.deepEqual(db.get("user:owner:outbox"), [{ id: "saved" }]);
});

test("unavailable secure storage fails instead of claiming data was saved", (t) => {
  const db = createLocalDatabase(temporary(t), { ...encryption, isEncryptionAvailable: () => false });
  assert.throws(() => db.set("user:owner:outbox", [{ id: "unsaved" }]), /stockage sécurisé/);
  assert.equal(db.get("user:owner:outbox"), null);
});