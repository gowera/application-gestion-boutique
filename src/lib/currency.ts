import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { offlineQueryFn } from "@/lib/offline/query";
import { cacheGet } from "@/lib/offline/store";
import { isOffline } from "@/lib/offline/sync";

export type Currency = "USD" | "CDF";

export interface AppSettings {
  shop_name: string;
  logo_url: string | null;
  address: string | null;
  phone: string | null;
  whatsapp: string | null;
  email: string | null;
  primary_currency: Currency;
  usd_to_cdf_rate: number;
  low_stock_threshold: number;
  invoice_prefix: string;
}

export const DEFAULT_SETTINGS: AppSettings = {
  shop_name: "Ma boutique",
  logo_url: null,
  address: null,
  phone: null,
  whatsapp: null,
  email: null,
  primary_currency: "USD",
  usd_to_cdf_rate: 2800,
  low_stock_threshold: 5,
  invoice_prefix: "FAC",
};

export function useSettings() {
  return useQuery({
    queryKey: ["settings"],
    queryFn: offlineQueryFn("query:settings", async (): Promise<AppSettings> => {
      if (isOffline()) {
        const rows = await cacheGet<Array<Record<string, unknown>>>("table:shop_settings");
        const local = rows?.[0];
        if (!local) throw new Error("Les paramètres de la boutique ne sont pas encore téléchargés sur cet appareil.");
        const extras = local["extras"] && typeof local["extras"] === "object" ? local["extras"] : {};
        return { ...DEFAULT_SETTINGS, ...extras, ...local } as unknown as AppSettings;
      }
      const { data, error } = await supabase.from("shop_settings").select("*").maybeSingle();
      if (error) throw error;
      const extras = (data?.extras && typeof data.extras === "object" ? data.extras : {}) as Record<string, unknown>;
      return { ...DEFAULT_SETTINGS, ...extras, ...(data ?? {}) } as unknown as AppSettings;
    }),
    staleTime: 5 * 60_000,
  });
}

export function formatMoney(amountUsd: number, currency: Currency, rate: number): string {
  const value = currency === "USD" ? amountUsd : amountUsd * rate;
  return new Intl.NumberFormat("fr-FR", {
    style: "currency",
    currency: currency === "USD" ? "USD" : "CDF",
    maximumFractionDigits: currency === "USD" ? 2 : 0,
  }).format(value);
}

export function convertToUsd(amount: number, currency: Currency, rate: number): number {
  return currency === "USD" ? amount : amount / rate;
}
export function convertFromUsd(amountUsd: number, currency: Currency, rate: number): number {
  return currency === "USD" ? amountUsd : amountUsd * rate;
}
