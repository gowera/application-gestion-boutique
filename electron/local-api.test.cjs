const { test } = require("node:test");
const assert = require("node:assert/strict");
const fs = require("node:fs");
const os = require("node:os");
const path = require("node:path");
const { createLocalDatabase } = require("./local-db.cjs");
const { createLocalApi } = require("./local-api.cjs");

const encryption = {
  isEncryptionAvailable: () => true,
  encryptString: (value) => Buffer.from(value),
  decryptString: (value) => value.toString(),
};

function setup(t) {
  const directory = fs.mkdtempSync(path.join(os.tmpdir(), "gestionstock-api-"));
  t.after(() => fs.rmSync(directory, { recursive: true, force: true }));
  return { api: createLocalApi(), db: createLocalDatabase(directory, encryption) };
}

function call(api, db, pathName, method = "GET", body, headers = []) {
  return api.handle({
    pathname: pathName,
    search: "",
    method,
    headers,
    body: body === undefined ? undefined : JSON.stringify(body),
  }, db, "owner", { roles: ["owner"] });
}

test("local table inserts and filters persist without a remote request", (t) => {
  const { api, db } = setup(t);
  const inserted = call(api, db, "/rest/v1/products", "POST", { name: "Produit local", stock: 4 }, [["prefer", "return=representation"]]);
  assert.equal(inserted.status, 201);
  const product = JSON.parse(inserted.body)[0];
  assert.equal(product.name, "Produit local");

  const selected = api.handle({
    pathname: "/rest/v1/products",
    search: "?select=*&id=eq." + product.id,
    method: "GET",
    headers: [],
  }, db, "owner", {});
  assert.equal(JSON.parse(selected.body)[0].stock, 4);

  const single = call(api, db, "/rest/v1/products", "POST", { name: "Produit précis" }, [
    ["prefer", "return=representation"],
    ["accept", "application/vnd.pgrst.object+json"],
  ]);
  assert.equal(JSON.parse(single.body).name, "Produit précis");
});

test("local update changes only matching records and remains scoped to the account", (t) => {
  const { api, db } = setup(t);
  call(api, db, "/rest/v1/customers", "POST", [{ id: "c1", name: "Client A" }, { id: "c2", name: "Client B" }]);
  const updated = call(api, db, "/rest/v1/customers?id=eq.c1", "PATCH", { name: "Client local" }, [["prefer", "return=representation"]]);
  assert.equal(JSON.parse(updated.body)[0].name, "Client local");
  assert.deepEqual(db.get("user:other:cache:table:customers"), null);
});

test("local outbox operation applies a stock adjustment to local records", (t) => {
  const { api, db } = setup(t);
  call(api, db, "/rest/v1/products", "POST", { id: "p1", name: "Lampe", stock: 5 });
  const result = call(api, db, "/rest/v1/rpc/sync_apply_operation", "POST", {
    _kind: "stock_adjust",
    _payload: { product_id: "p1", delta: -2, reason: "manual_out" },
  });
  assert.equal(result.status, 200);
  assert.equal(db.get("user:owner:cache:table:products").data[0].stock, 3);
  assert.equal(db.get("user:owner:cache:table:stock_movements").data[0].delta, -2);
});

test("local sale records its items, payment, and stock movement on the device", (t) => {
  const { api, db } = setup(t);
  call(api, db, "/rest/v1/products", "POST", { id: "p1", name: "Lampe", stock: 5, sale_price: 10 });
  const result = call(api, db, "/rest/v1/rpc/sync_apply_operation", "POST", {
    _kind: "pos_sale",
    _payload: {
      customer_id: null,
      items: [{ product_id: "p1", qty: 2, unit_price_usd: 10, discount_usd: 0 }],
      payments: [{ method: "cash", amount: 20, currency: "USD" }],
      discount_usd: 0,
    },
  });
  assert.equal(result.status, 200);
  assert.equal(db.get("user:owner:cache:table:products").data[0].stock, 3);
  assert.equal(db.get("user:owner:cache:table:sales").data[0].total_usd, 20);
  assert.equal(db.get("user:owner:cache:table:sale_items").data[0].qty, 2);
  assert.equal(db.get("user:owner:cache:table:payments").data[0].amount_usd, 20);
});

test("unsupported local RPCs fail explicitly instead of reaching the server", (t) => {
  const { api, db } = setup(t);
  const result = call(api, db, "/rest/v1/rpc/list_trash_items", "POST", {});
  assert.equal(result.status, 501);
  assert.match(JSON.parse(result.body).message, /mode local/);
});
