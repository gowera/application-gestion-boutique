"use client";

import { useEffect, useMemo, useState } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Eye, Download, Printer } from "lucide-react";
import { buildReceiptDoc, type ReceiptData } from "@/lib/pdf";
import { getStoredDocumentTemplate } from "@/lib/document-template";
import { useLogoDataUrl } from "@/lib/logo";

interface Props {
  disabled?: boolean;
  buildData: () => ReceiptData | null;
}

/**
 * Aperçu avant génération : rend un PDF temporaire (code APERÇU) à partir de
 * l'état actuel du panier, avec impression et téléchargement direct.
 */
export function SalePreviewDialog({ disabled, buildData }: Props) {
  const [open, setOpen] = useState(false);
  const [data, setData] = useState<ReceiptData | null>(null);
  const logoDataUrl = useLogoDataUrl();

  useEffect(() => {
    if (open) setData(buildData());
    else setData(null);
  }, [open, buildData]);

  const blobUrl = useMemo(() => {
    if (!data) return null;
    try {
      const doc = buildReceiptDoc({ ...data, logoDataUrl, template: getStoredDocumentTemplate() });
      return String(doc.output("bloburl"));
    } catch {
      return null;
    }
  }, [data, logoDataUrl]);

  useEffect(() => {
    return () => {
      if (blobUrl?.startsWith("blob:")) {
        try { URL.revokeObjectURL(blobUrl); } catch { /* ignore */ }
      }
    };
  }, [blobUrl]);

  function download() {
    if (!data) return;
    const doc = buildReceiptDoc({ ...data, logoDataUrl, template: getStoredDocumentTemplate() });
    const prefix = data.documentType === "Facture" ? "facture" : "recu";
    doc.save(`${prefix}-${data.code}.pdf`);
  }

  function print() {
    if (!blobUrl) return;
    const w = window.open(blobUrl, "_blank");
    if (w) setTimeout(() => { try { w.print(); } catch { /* ignore */ } }, 500);
  }

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button variant="outline" className="w-full" disabled={disabled}>
          <Eye className="h-4 w-4 mr-2" /> Aperçu avant génération
        </Button>
      </DialogTrigger>
      <DialogContent className="max-w-4xl">
        <DialogHeader>
          <DialogTitle>Aperçu du document</DialogTitle>
        </DialogHeader>
        <div className="flex items-center gap-2">
          <Button size="sm" variant="outline" onClick={print} disabled={!blobUrl}>
            <Printer className="h-4 w-4 mr-1" /> Imprimer
          </Button>
          <Button size="sm" variant="outline" onClick={download} disabled={!data}>
            <Download className="h-4 w-4 mr-1" /> Télécharger PDF
          </Button>
          <span className="ml-auto text-xs text-muted-foreground">
            Numéro provisoire — un numéro définitif sera attribué à la validation.
          </span>
        </div>
        <div className="min-h-[600px] rounded border bg-muted/20 p-2">
          {blobUrl ? (
            <iframe
              key={blobUrl}
              title="Aperçu"
              src={`${blobUrl}#toolbar=1&navpanes=0`}
              className="h-[70vh] w-full border bg-white"
            />
          ) : (
            <div className="flex h-full items-center justify-center py-20 text-sm text-muted-foreground">
              Ajoutez des articles au panier pour afficher un aperçu.
            </div>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}
