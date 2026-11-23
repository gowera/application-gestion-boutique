import { cacheGet, cacheSet } from "./store";
import { resolveImageUrl } from "@/lib/storage";

/** Persist the actual image bytes, not just a network URL. */
export async function localLogoDataUrl(source: string): Promise<string | undefined> {
  if (source.startsWith("data:")) return source;
  const key = `logo:${source}`;
  const cached = await cacheGet<string>(key);
  if (!navigator.onLine) return cached;
  try {
    const url = await resolveImageUrl(source);
    if (!url) return cached;
    const response = await fetch(url, { signal: AbortSignal.timeout(8000) });
    if (!response.ok) throw new Error("Logo indisponible");
    const blob = await response.blob();
    const data = await new Promise<string>((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = () => resolve(String(reader.result));
      reader.onerror = () => reject(reader.error);
      reader.readAsDataURL(blob);
    });
    await cacheSet(key, data);
    return data;
  } catch (error) {
    if (cached) return cached;
    throw error;
  }
}