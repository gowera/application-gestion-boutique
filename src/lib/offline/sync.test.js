import { beforeEach, expect, mock, test } from "bun:test";

const events = [];
let operations = [];
let downloadError = null;
mock.module("@/integrations/supabase/client", () => ({ supabase: {
  auth: { getSession: async () => ({ data: { session: { user: { id: "owner" } } } }) },
  rpc: async () => { events.push("upload"); return { error: null }; },
} }));
mock.module("./store", () => ({
  outboxList: async () => operations,
  archiveSynced: async () => { events.push("archive"); },
  outboxRemove: async () => { events.push("remove"); operations = []; },
  outboxAdd: async () => {}, outboxUpdate: async () => {},
}));
mock.module("./bootstrap", () => ({
  bootstrapOfflineData: async () => { events.push("download"); },
  getBootstrapProgress: () => ({ ready: true, error: downloadError }),
}));
const { syncNow, getSyncState } = await import("./sync");
beforeEach(() => { events.length = 0; operations = []; downloadError = null; });
test("downloads server records even when no offline writes are queued", async () => {
  await syncNow(true);
  expect(events).toEqual(["download"]);
});
test("uploads and archives local writes before downloading server records", async () => {
  operations = [{ id: "invoice-1", kind: "document", tries: 0, payload: {} }];
  expect(await syncNow(true)).toEqual({ sent: 1, failed: 0 });
  expect(events).toEqual(["upload", "archive", "remove", "download"]);
});
test("reports a failed local download instead of successful synchronization", async () => {
  downloadError = "Écriture disque refusée";
  await syncNow(true);
  expect(getSyncState().lastError).toBe("Écriture disque refusée");
});