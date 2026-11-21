import { supabase } from "@/integrations/supabase/client";

// Thin compatibility shim: some legacy code imports helpers that were meant
// for a "local mode" alternative to Supabase. We route them straight to
// Supabase so pages keep compiling and working.
export async function listAdminData<T = Record<string, unknown>>(table: string): Promise<T[]> {
  // @ts-expect-error dynamic table name for shim
  const { data } = await supabase.from(table).select("*");
  return (data ?? []) as T[];
}

export function useLocalModeEnabled(): boolean {
  return false;
}

export async function setAdminSettings(payload: Record<string, unknown>): Promise<void> {
  const core = ["shop_name","logo_url","address","phone","whatsapp","email","primary_currency","usd_to_cdf_rate","low_stock_threshold","invoice_prefix","legal_mentions","document_theme_color"];
  const { data: current, error: readError } = await supabase.from("shop_settings").select("shop_id, extras").maybeSingle();
  if (readError) throw readError;
  if (!current) throw new Error("Boutique introuvable pour ce compte.");
  const update: Record<string, unknown> = {};
  const extras: Record<string, unknown> = { ...((current.extras as Record<string, unknown>) ?? {}), ...((payload["extras"] as Record<string, unknown>) ?? {}) };
  for (const [k, v] of Object.entries(payload)) {
    if (k === "extras") continue;
    if (core.includes(k)) update[k] = v; else extras[k] = v;
  }
  update["extras"] = extras;
  // @ts-expect-error dynamic payload
  const { error } = await supabase.from("shop_settings").update(update).eq("shop_id", current.shop_id);
  if (error) throw error;
}
