"use client";

import { useMemo, useState } from "react";
import { Button } from "@/components/ui/button";
import { Slider } from "@/components/ui/slider";
import { ZoomIn, ZoomOut, Printer, RefreshCw } from "lucide-react";
import { buildCustomTemplatePreviewDoc } from "@/lib/pdf";
import { useSettings } from "@/lib/currency";
import { useLogoDataUrl } from "@/lib/logo";
import type { CanvasTemplate } from "@/lib/document-template";
import type { ReceiptData } from "@/lib/pdf";
import { PdfPreview } from "@/components/documents/pdf-preview";

type ShopInfo = { shopName: string; address: string; phone: string; currency: "USD" | "CDF"; rate: number };

function makeSampleData(docLabel: "Facture" | "Reçu" | "Facture Proforma", shop: ShopInfo): ReceiptData {
  return {
    shopName: shop.shopName,
    address: shop.address,
    phone: shop.phone,
    code: docLabel === "Reçu" ? "RECU-2026-00042" : docLabel === "Facture Proforma" ? "PRO-2026-00042" : "FACT-2026-00042",
    customer: "Aperçu Client",
    items: [
      { name: "Câble électrique 2.5mm", qty: 3, unit: 4.5, total: 13.5 },
      { name: "Disjoncteur 16A", qty: 2, unit: 8, total: 16 },
      { name: "Prise murale", qty: 5, unit: 2.2, total: 11 },
      { name: "Installation main d'œuvre", qty: 1, unit: 25, total: 25 },
    ],
    subtotal: 65.5,
    discount: 2.5,
    total: 63,
    paid: 60,
    credit: 3,
    currency: shop.currency,
    rate: shop.rate,
    documentType: docLabel,
    template: "custom",
  };
}

/**
 * Live PDF preview of the current custom template. Regenerates a real jsPDF
 * blob (same engine used at print time) whenever the template or sample data
 * changes, so the user sees the exact output while editing.
 */
export function TemplatePreview({ template, docLabel }: { template: CanvasTemplate; docLabel: "Facture" | "Reçu" | "Facture Proforma" }) {
  const [zoom, setZoom] = useState(100);
  const [nonce, setNonce] = useState(0);
  const { data: settings } = useSettings();
  const logoDataUrl = useLogoDataUrl();
  const shop: ShopInfo = {
    shopName: settings?.shop_name || "Ma boutique",
    address: settings?.address || "",
    phone: settings?.phone || "",
    currency: (settings?.primary_currency ?? "USD") as "USD" | "CDF",
    rate: Number(settings?.usd_to_cdf_rate ?? 2800),
  };
  const sample = useMemo(
    () => ({ ...makeSampleData(docLabel, shop), logoDataUrl }),
    [docLabel, shop.shopName, shop.address, shop.phone, shop.currency, shop.rate, logoDataUrl],
  );

  const dataUri = useMemo(() => {
    try {
      const doc = buildCustomTemplatePreviewDoc(template, sample);
      return doc.output("datauristring");
    } catch {
      return null;
    }
    // include nonce so a manual refresh regenerates the URL
  }, [template, sample, nonce]);

  return (
    <div className="flex h-full flex-col rounded border bg-muted/20">
      <div className="flex flex-wrap items-center gap-2 border-b bg-background/60 p-2">
        <span className="text-xs font-semibold uppercase text-muted-foreground">Aperçu PDF · {docLabel}</span>
        <div className="flex flex-wrap items-center gap-2 sm:ml-auto">
          <Button size="icon" variant="ghost" onClick={() => setZoom((z) => Math.max(50, z - 10))} title="Dézoomer"><ZoomOut className="h-4 w-4" /></Button>
          <div className="w-24 sm:w-32"><Slider value={[zoom]} min={50} max={200} step={5} onValueChange={(v) => setZoom(v[0])} /></div>
          <Button size="icon" variant="ghost" onClick={() => setZoom((z) => Math.min(200, z + 10))} title="Zoomer"><ZoomIn className="h-4 w-4" /></Button>
          <span className="w-12 text-right text-xs tabular-nums">{zoom}%</span>
          <Button size="icon" variant="ghost" onClick={() => setNonce((n) => n + 1)} title="Rafraîchir"><RefreshCw className="h-4 w-4" /></Button>
          <Button size="sm" variant="outline" onClick={() => window.print()} disabled={!dataUri}>
            <Printer className="h-4 w-4 mr-1" />Imprimer
          </Button>
        </div>
      </div>
      <div className="min-h-[360px] flex-1 overflow-auto p-2 sm:p-3">
        {dataUri ? (
          <PdfPreview dataUri={dataUri} zoom={zoom} />
        ) : (
          <div className="flex h-full items-center justify-center text-sm text-muted-foreground">Aperçu indisponible.</div>
        )}
      </div>
      <p className="border-t px-3 py-1.5 text-[11px] text-muted-foreground">
        L'aperçu utilise le même moteur PDF que la génération réelle (POS, caisse, factures). Les pages sont paginées automatiquement par le lecteur PDF.
      </p>
    </div>
  );
}
