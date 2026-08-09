import { createClient, type SupabaseClient } from "@supabase/supabase-js";

export type ShwaryCreds = {
  merchant_id: string;
  merchant_key: string;
  sandbox: boolean;
};

// Valeurs publiques (inlinées au build) — servent de repli si l'env serveur est vide en production.
const FALLBACK_URL = "https://nqbfwchpzkobrxypemhf.supabase.co";
const FALLBACK_KEY = "sb_publishable_JQ5E8pkevD9_rS3jG23U3w_drmOUj8u";

/** Client Supabase serveur avec la clé publiable (aucune clé service role requise). */
export function serverClient(): SupabaseClient {
  const env = (typeof process !== "undefined" ? process.env : {}) as Record<string, string | undefined>;
  const url =
    env['SUPABASE_URL'] || env['VITE_SUPABASE_URL'] ||
    import.meta.env.VITE_SUPABASE_URL || FALLBACK_URL;
  const key =
    env['SUPABASE_PUBLISHABLE_KEY'] || env['VITE_SUPABASE_PUBLISHABLE_KEY'] ||
    import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY || FALLBACK_KEY;
  if (!url || !key) throw new Error("Configuration backend indisponible");
  return createClient(url, key, {
    auth: { storage: undefined, persistSession: false, autoRefreshToken: false },
    global: {
      fetch: (input, init) => {
        const h = new Headers(init?.headers);
        if (key.startsWith("sb_") && h.get("Authorization") === `Bearer ${key}`) h.delete("Authorization");
        h.set("apikey", key);
        return fetch(input, { ...init, headers: h });
      },
    },
  });
}

export function rpcSecret(): string {
  const s = process.env['SHWARY_RPC_SECRET'];
  if (!s) throw new Error("Configuration paiement incomplète");
  return s;
}

/** Identifiants Shwary : variables d'environnement d'abord, table de secours ensuite. */
export async function loadCreds(): Promise<ShwaryCreds | null> {
  const id = process.env['SHWARY_MERCHANT_ID'];
  const key = process.env['SHWARY_MERCHANT_KEY'];
  if (id && key) {
    return { merchant_id: id, merchant_key: key, sandbox: process.env['SHWARY_SANDBOX'] === "true" };
  }
  try {
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const { data } = await supabaseAdmin
      .from("payment_credentials")
      .select("merchant_id, merchant_key, sandbox")
      .eq("provider", "shwary")
      .maybeSingle();
    if (!data?.merchant_id || !data?.merchant_key) return null;
    return data as ShwaryCreds;
  } catch {
    return null;
  }
}

/** Interroge directement Shwary pour connaître l'état d'une transaction. */
export async function fetchRemoteStatus(ref: string, creds: ShwaryCreds): Promise<string | null> {
  const base = "https://api.shwary.com/api/v1/merchants";
  const paths = creds.sandbox
    ? [`${base}/payment/sandbox/${ref}`, `${base}/payment/${ref}`, `${base}/transactions/${ref}`]
    : [`${base}/payment/${ref}`, `${base}/transactions/${ref}`];
  for (const url of paths) {
    try {
      const res = await fetch(url, {
        headers: { "x-merchant-id": creds.merchant_id, "x-merchant-key": creds.merchant_key },
      });
      if (!res.ok) continue;
      const body = (await res.json().catch(() => null)) as { status?: string; data?: { status?: string } } | null;
      const status = body?.status ?? body?.data?.status;
      if (typeof status === "string" && status) return status.toLowerCase();
    } catch { /* endpoint suivant */ }
  }
  return null;
}
