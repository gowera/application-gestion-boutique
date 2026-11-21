import { supabase } from "@/integrations/supabase/client";
import { downloadReceipt } from "@/lib/pdf";
import { getStoredDocumentTemplate } from "@/lib/document-template";
import { issueDocumentNumber, docTypeLabel, type DocumentType } from "@/lib/documents";
import type { AppSettings } from "@/lib/currency";
import { loadLogoDataUrl } from "@/lib/logo";

/**
 * Reprint a Facture/Reçu for an existing sale.
 * - If a document was already issued for that sale + type, reuses the same code
 *   (no duplicate numbering).
 * - Otherwise issues a new sequential number.
 */
export async function reprintSaleDocument(opts: {
  saleId: string;
  docType: DocumentType;
  settings: AppSettings | undefined;
}) {
  const { saleId, docType, settings } = opts;
  const currency = settings?.primary_currency ?? "USD";
  const rate = settings?.usd_to_cdf_rate ?? 2800;

  const [{ data: sale, error: saleErr }, { data: items }] = await Promise.all([
    supabase.from("sales").select("*, customers(name)").eq("id", saleId).maybeSingle(),
    supabase.from("sale_items").select("*").eq("sale_id", saleId),
  ]);
  if (saleErr) throw saleErr;
  if (!sale) throw new Error("Vente introuvable");

  const customerName = (sale as { customers?: { name?: string } }).customers?.name ?? "Client anonyme";

  const { data: existing } = await supabase
    .from("document_registry")
    .select("code")
    .eq("sale_id", saleId)
    .eq("doc_type", docType)
    .order("created_at", { ascending: false })
    .limit(1)
    .maybeSingle();

  let code = existing?.code as string | undefined;
  if (!code) {
    const issued = await issueDocumentNumber({
      docType,
      saleId,
      customerName,
      totalUsd: Number(sale.total_usd),
    });
    code = issued.code;
  }

  const logoDataUrl = await loadLogoDataUrl((settings as { logo_url?: string } | undefined)?.logo_url);

  downloadReceipt({
    logoDataUrl,
    shopName: settings?.shop_name ?? "Ma boutique",
    address: settings?.address ?? "",
    phone: settings?.phone ?? "",
    code: code!,
    customer: customerName,
    items: (items ?? []).map((i) => ({
      name: i.product_name, qty: i.qty,
      unit: Number(i.unit_price_usd), total: Number(i.line_total_usd),
    })),
    subtotal: Number(sale.subtotal_usd),
    discount: Number(sale.discount_usd),
    total: Number(sale.total_usd),
    paid: Number(sale.paid_usd),
    credit: Number(sale.credit_usd),
    currency, rate,
    documentType: docTypeLabel(docType),
    template: getStoredDocumentTemplate(),
  });

  return code!;
}
