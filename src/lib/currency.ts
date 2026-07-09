import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";

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
  shop_name: "CONETEC",
  logo_url: null,
  address: null,
  phone: null,
  whatsapp: null,
  email: null,
  primary_currency: "USD",
  usd_to_cdf_rate: 2800,
  low_stock_threshold: 5,
  invoice_prefix: "CNT",
};

export function useSettings() {
  return useQuery({
    queryKey: ["settings"],
    queryFn: async (): Promise<AppSettings> => {
      const { data, error } = await supabase.from("settings").select("*").eq("id", 1).maybeSingle();
      if (error) throw error;
      return { ...DEFAULT_SETTINGS, ...(data ?? {}) } as AppSettings;
    },
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
