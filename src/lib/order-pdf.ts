import { supabase } from "@/integrations/supabase/client";
import { downloadReceipt } from "@/lib/pdf";
import { getStoredDocumentTemplate } from "@/lib/document-template";
import { loadLogoDataUrl } from "@/lib/logo";
import type { AppSettings } from "@/lib/currency";

export interface OnlineOrderPdfInput {
  code: string;
  customer_name: string;
  customer_phone?: string | null;
  delivery_address?: string | null;
  delivery_fee_usd?: number | null;
  subtotal_usd?: number | null;
  total_usd: number;
  paid?: boolean | null;
  order_items?: { product_name: string; qty: number; unit_price_usd: number; line_total_usd: number }[];
}

/**
 * Télécharge la facture (ou le reçu si la commande est payée) d'une commande en ligne,
 * côté client, sans consommer la numérotation séquentielle des documents internes.
 */
export async function downloadOnlineOrderDocument(
  order: OnlineOrderPdfInput,
  settings: AppSettings | undefined,
  docType: "Facture" | "Reçu" = "Facture",
) {
  const currency = settings?.primary_currency ?? "USD";
  const rate = settings?.usd_to_cdf_rate ?? 2800;
  const logoDataUrl = await loadLogoDataUrl((settings as { logo_url?: string } | undefined)?.logo_url);

  let items = order.order_items;
  if (!items) {
    const { data } = await supabase
      .from("order_items")
      .select("product_name, qty, unit_price_usd, line_total_usd, online_orders!inner(code)")
      .eq("online_orders.code", order.code);
    items = (data ?? []) as OnlineOrderPdfInput["order_items"];
  }

  const subtotal = Number(order.subtotal_usd ?? order.total_usd);
  const total = Number(order.total_usd);
  const paid = order.paid ? total : 0;

  const lines = (items ?? []).map((i) => ({
    name: i.product_name,
    qty: i.qty,
    unit: Number(i.unit_price_usd),
    total: Number(i.line_total_usd),
  }));
  const fee = Number(order.delivery_fee_usd ?? 0);
  if (fee > 0) lines.push({ name: "Frais de livraison", qty: 1, unit: fee, total: fee });

  downloadReceipt({
    logoDataUrl,
    shopName: settings?.shop_name ?? "CONETEC",
    address: settings?.address ?? "",
    phone: settings?.phone ?? "",
    code: order.code,
    customer: order.customer_name,
    items: lines,
    subtotal,
    discount: 0,
    total,
    paid,
    credit: Math.max(total - paid, 0),
    currency,
    rate,
    documentType: docType,
    template: getStoredDocumentTemplate(),
    note: order.delivery_address ? `Livraison : ${order.delivery_address}` : undefined,
  });
}
