import { useEffect, useState } from "react";
import { useSettings } from "@/lib/currency";
import { resolveImageUrl } from "@/lib/storage";
import fallbackLogo from "@/assets/brand/logo.png";

/** Displayable URL of the shop logo (settings logo, or bundled CONETEC logo). */
export function useLogoUrl(): string {
  const { data: settings } = useSettings();
  const [url, setUrl] = useState<string>(fallbackLogo);
  useEffect(() => {
    let active = true;
    const src = settings?.logo_url;
    if (!src) { setUrl(fallbackLogo); return; }
    resolveImageUrl(src).then((next) => { if (active) setUrl(next || fallbackLogo); });
    return () => { active = false; };
  }, [settings?.logo_url]);
  return url;
}

/** Same logo, converted to a data URL so jsPDF can embed it. */
export function useLogoDataUrl(): string | undefined {
  const url = useLogoUrl();
  const [dataUrl, setDataUrl] = useState<string | undefined>(undefined);
  useEffect(() => {
    let active = true;
    if (!url) { setDataUrl(undefined); return; }
    if (url.startsWith("data:")) { setDataUrl(url); return; }
    (async () => {
      try {
        const res = await fetch(url);
        const blob = await res.blob();
        const reader = new FileReader();
        reader.onload = () => { if (active) setDataUrl(String(reader.result)); };
        reader.readAsDataURL(blob);
      } catch {
        if (active) setDataUrl(undefined);
      }
    })();
    return () => { active = false; };
  }, [url]);
  return dataUrl;
}

/**
 * Non-hook variant: resolves a logo reference (storage path/URL) into a data URL
 * usable by jsPDF. Returns undefined when unavailable.
 */
export async function loadLogoDataUrl(logoUrl?: string | null): Promise<string | undefined> {
  try {
    const src = (await resolveImageUrl(logoUrl)) || fallbackLogo;
    if (src.startsWith("data:")) return src;
    const res = await fetch(src);
    const blob = await res.blob();
    return await new Promise<string>((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = () => resolve(String(reader.result));
      reader.onerror = reject;
      reader.readAsDataURL(blob);
    });
  } catch {
    return undefined;
  }
}
