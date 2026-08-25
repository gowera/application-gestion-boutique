import { get, set, del, createStore } from "idb-keyval";

/** Base locale (IndexedDB) utilisée par le mode hors ligne de l'administration. */
const store = typeof indexedDB !== "undefined" ? createStore("conetec-offline", "kv") : undefined;

export type OutboxOp = {
  id: string;
  kind: "pos_sale" | "expense" | "customer" | "stock_adjust" | "customer_ledger" | "document";
  label: string;
  payload: Record<string, unknown>;
  createdAt: string;
  tries: number;
  error?: string | null;
};

const OUTBOX_KEY = "outbox";

async function read<T>(key: string): Promise<T | undefined> {
  if (!store) return undefined;
  try {
    return (await get<T>(key, store)) ?? undefined;
  } catch {
    return undefined;
  }
}

async function write<T>(key: string, value: T): Promise<void> {
  if (!store) return;
  try {
    await set(key, value, store);
  } catch {
    /* quota ou mode privé : on ignore */
  }
}

/* ---------- Cache de lecture ---------- */

export async function cacheGet<T>(key: string): Promise<T | undefined> {
  const entry = await read<{ data: T; at: string }>(`cache:${key}`);
  return entry?.data;
}

export async function cacheSet<T>(key: string, data: T): Promise<void> {
  await write(`cache:${key}`, { data, at: new Date().toISOString() });
}

export async function cacheClear(key: string): Promise<void> {
  if (!store) return;
  try {
    await del(`cache:${key}`, store);
  } catch {
    /* ignore */
  }
}

/* ---------- File d'attente (outbox) ---------- */

export async function outboxList(): Promise<OutboxOp[]> {
  return (await read<OutboxOp[]>(OUTBOX_KEY)) ?? [];
}

export async function outboxSave(ops: OutboxOp[]): Promise<void> {
  await write(OUTBOX_KEY, ops);
}

export async function outboxAdd(
  op: Omit<OutboxOp, "id" | "createdAt" | "tries">,
): Promise<OutboxOp> {
  const full: OutboxOp = {
    ...op,
    id: crypto.randomUUID(),
    createdAt: new Date().toISOString(),
    tries: 0,
  };
  const list = await outboxList();
  await outboxSave([...list, full]);
  return full;
}

export async function outboxRemove(id: string): Promise<void> {
  const list = await outboxList();
  await outboxSave(list.filter((o) => o.id !== id));
}

export async function outboxUpdate(id: string, patch: Partial<OutboxOp>): Promise<void> {
  const list = await outboxList();
  await outboxSave(list.map((o) => (o.id === id ? { ...o, ...patch } : o)));
}
