"use client";

import { useEffect, useRef, useState } from "react";
import { Loader2 } from "lucide-react";

/**
 * Aperçu PDF fiable sur mobile : les navigateurs mobiles n'affichent pas les
 * PDF dans une iframe (blob/data URI). On rend donc chaque page en image
 * (canvas) via pdf.js, ce qui fonctionne partout, y compris hors ligne.
 */
export function PdfPreview({ dataUri }: { dataUri: string }) {
  const containerRef = useRef<HTMLDivElement>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    const container = containerRef.current;
    if (!container) return;
    container.innerHTML = "";
    setLoading(true);
    setError(null);

    (async () => {
      try {
        const pdfjs = await import("pdfjs-dist");
        const workerUrl = (await import("pdfjs-dist/build/pdf.worker.min.mjs?url")).default;
        pdfjs.GlobalWorkerOptions.workerSrc = workerUrl;

        const base64 = dataUri.includes(",") ? dataUri.split(",")[1] : dataUri;
        const binary = atob(base64);
        const bytes = new Uint8Array(binary.length);
        for (let i = 0; i < binary.length; i += 1) bytes[i] = binary.charCodeAt(i);

        const pdf = await pdfjs.getDocument({ data: bytes }).promise;
        if (cancelled) return;

        const width = Math.max(280, container.clientWidth - 8);
        for (let pageNumber = 1; pageNumber <= pdf.numPages; pageNumber += 1) {
          const page = await pdf.getPage(pageNumber);
          if (cancelled) return;
          const base = page.getViewport({ scale: 1 });
          const scale = (width / base.width) * Math.min(2, window.devicePixelRatio || 1);
          const viewport = page.getViewport({ scale });
          const canvas = document.createElement("canvas");
          canvas.width = Math.floor(viewport.width);
          canvas.height = Math.floor(viewport.height);
          canvas.style.width = "100%";
          canvas.style.height = "auto";
          canvas.className = "mx-auto mb-3 block rounded-md border bg-white shadow-sm";
          const ctx = canvas.getContext("2d");
          if (!ctx) continue;
          await page.render({ canvas, canvasContext: ctx, viewport }).promise;
          if (cancelled) return;
          container.appendChild(canvas);
        }
        setLoading(false);
      } catch {
        if (!cancelled) { setError("Aperçu indisponible sur cet appareil."); setLoading(false); }
      }
    })();

    return () => { cancelled = true; };
  }, [dataUri]);

  return (
    <div className="max-h-[65vh] overflow-auto rounded-md border bg-muted/30 p-1">
      {loading && (
        <div className="flex items-center justify-center gap-2 py-10 text-sm text-muted-foreground">
          <Loader2 className="h-4 w-4 animate-spin" /> Préparation de l'aperçu…
        </div>
      )}
      {error && <p className="py-10 text-center text-sm text-muted-foreground">{error}</p>}
      <div ref={containerRef} />
    </div>
  );
}
