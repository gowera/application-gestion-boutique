import { supabase } from "@/integrations/supabase/client";
import { cacheSet, setLocalUser } from "./store";

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
  "settings", "user_roles", "products", "categories", "product_images", "customers",
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

export function getBootstrapProgress() {
  return progress;
}

export async function bootstrapOfflineData(userId: string): Promise<void> {
  if (progress.running || typeof navigator === "undefined" || !navigator.onLine) return;
  setLocalUser(userId);
  emit({ running: true, completed: 0, current: null, error: null });
  try {
    for (let index = 0; index < DATASETS.length; index += 1) {
      const table = DATASETS[index];
      emit({ current: table, completed: index });
      // The signed-in user's RLS policies decide which rows may be copied locally.
      const { data, error } = await supabase.from(table).select("*").limit(5000);
      if (error) throw new Error(`${table}: ${error.message}`);
      await cacheSet(`table:${table}`, data ?? []);
    }
    const at = new Date().toISOString();
    await cacheSet("bootstrap:meta", { ready: true, at, version: 1 });
    emit({ running: false, completed: DATASETS.length, current: null, ready: true, lastBootstrapAt: at });
  } catch (error) {
    emit({ running: false, current: null, error: error instanceof Error ? error.message : String(error) });
  }
}

export async function provisionOfflinePin(pin: string, profile: { userId: string; email: string; roles: string[] }) {
  if (!window.conetecDesktop) return { ok: false, error: "Disponible uniquement dans l’application Windows." };
  return window.conetecDesktop.configureOfflinePin(pin, profile);
}