import { supabase } from "@/integrations/supabase/client";
import { cacheGet, cacheSet, setLocalUser } from "./store";
import { resolveTableRows } from "./conflict";


export type BootstrapProgress = {
  running: boolean;
  completed: number;
  total: number;
  current: string | null;
  ready: boolean;
  lastBootstrapAt: string | null;
  error: string | null;
};

const DATASETS = [
  "settings", "user_roles", "products", "categories", "product_images", "product_suppliers", "customers",
  "customer_ledger", "sales", "sale_items", "payments", "online_orders", "order_items",
  "document_registry", "stock_movements", "expenses", "expense_categories", "cash_sessions",
  "suppliers", "purchases", "purchase_items", "employees", "salary_payments", "rent_payments",
  "interventions", "quote_requests", "notifications", "team_members", "activity_log",
] as const;

let progress: BootstrapProgress = {
  running: false, completed: 0, total: DATASETS.length, current: null,
  ready: false, lastBootstrapAt: null, error: null,
};
const listeners = new Set<() => void>();

function emit(patch: Partial<BootstrapProgress>) {
  progress = { ...progress, ...patch };
  listeners.forEach((listener) => listener());
}

export function subscribeBootstrap(listener: () => void) {
  listeners.add(listener);
  return () => listeners.delete(listener);
}

const refreshListeners = new Set<() => void>();

/**
 * Notifie l'application qu'un nouveau jeu de données serveur est disponible
 * localement : les écrans (produits, clients, documents…) se rafraîchissent
 * ainsi tous à partir des mêmes données.
 */
export function onBootstrapRefreshed(listener: () => void) {
  refreshListeners.add(listener);
  return () => refreshListeners.delete(listener);
}

export function getBootstrapProgress() {
  return progress;
}

const REFRESH_INTERVAL_MS = 10 * 60_000;
let lastRunAt = 0;
let metaRestoredFor: string | null = null;

/** Relit l'état du dernier téléchargement conservé dans la base locale. */
export async function restoreBootstrapMeta(userId: string): Promise<void> {
  if (metaRestoredFor === userId) return;
  metaRestoredFor = userId;
  setLocalUser(userId);
  const meta = await cacheGet<{ ready: boolean; at: string; counts?: Record<string, number> }>("bootstrap:meta");
  if (meta?.ready) emit({ ready: true, lastBootstrapAt: meta.at });
}


/**
 * Télécharge (ou rafraîchit) toutes les données autorisées dans la base locale.
 * Rappelée à chaque retour de connexion ; limitée à un rafraîchissement toutes
 * les 10 minutes sauf demande explicite (`force`).
 */
export async function bootstrapOfflineData(userId: string, force = false): Promise<void> {
  if (progress.running || typeof navigator === "undefined" || !navigator.onLine) return;
  if (!force && progress.ready && Date.now() - lastRunAt < REFRESH_INTERVAL_MS) return;
  lastRunAt = Date.now();
  setLocalUser(userId);
  emit({ running: true, completed: 0, current: null, error: null });
  try {
    const skipped: string[] = [];
    const counts: Record<string, number> = {};
    for (let index = 0; index < DATASETS.length; index += 1) {
      const table = DATASETS[index];
      emit({ current: table, completed: index });
      // The signed-in user's RLS policies decide which rows may be copied locally.
      const rows: unknown[] = [];
      let offset = 0;
      let failed = false;
      while (true) {
        const { data, error } = await supabase.from(table).select("*").range(offset, offset + 999);
        if (error) {
          skipped.push(table);
          failed = true;
          break;
        }
        const page = (data ?? []) as unknown[];
        rows.push(...page);
        if (page.length < 1000) break;
        offset += 1000;
      }
      if (!failed) {
        const merged = await resolveTableRows(table, rows);
        await cacheSet(`table:${table}`, merged);
        counts[table] = Array.isArray(merged) ? merged.length : 0;
      }
    }
    const at = new Date().toISOString();
    await cacheSet("bootstrap:meta", { ready: true, at, version: 1, counts });
    refreshListeners.forEach((listener) => { try { listener(); } catch { /* ignore */ } });
    emit({ running: false, completed: DATASETS.length, current: null, ready: true, lastBootstrapAt: at, error: skipped.length ? `${skipped.length} jeu(x) non autorisé(s) ignoré(s)` : null });
  } catch (error) {
    emit({ running: false, current: null, error: error instanceof Error ? error.message : String(error) });
  }
}

export async function provisionOfflinePin(pin: string, profile: { userId: string; email: string; roles: string[] }) {
  if (!window.conetecDesktop) return { ok: false, error: "Disponible uniquement dans l’application Windows." };
  return window.conetecDesktop.configureOfflinePin(pin, profile);
}