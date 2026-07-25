import { supabase } from "@/integrations/supabase/client";

const SIGN_TTL = 60 * 60; // 1h
const cache = new Map<string, { url: string; expires: number }>();

/** Extracts { bucket, path } from a Supabase storage URL (public or signed), or null. */
export function parseStorageUrl(value: string): { bucket: string; path: string } | null {
  const match = value.match(/\/storage\/v1\/object\/(?:public|sign|authenticated)\/([^/]+)\/(.+?)(?:\?.*)?$/);
  if (!match) return null;
  return { bucket: match[1], path: decodeURIComponent(match[2]) };
}

/**
 * Returns a displayable URL for an image reference.
 * Storage references (private buckets) are converted to short-lived signed URLs.
 * External URLs are returned unchanged.
 */
export async function resolveImageUrl(value?: string | null): Promise<string | null> {
  if (!value) return null;
  const raw = value.trim();
  if (!raw) return null;
  if (raw.startsWith("data:") || raw.startsWith("blob:")) return raw;

  const parsed = parseStorageUrl(raw);
  if (!parsed) return raw;

  const key = `${parsed.bucket}/${parsed.path}`;
  const hit = cache.get(key);
  if (hit && hit.expires > Date.now()) return hit.url;

  const { data, error } = await supabase.storage.from(parsed.bucket).createSignedUrl(parsed.path, SIGN_TTL);
  if (error || !data?.signedUrl) return raw;
  cache.set(key, { url: data.signedUrl, expires: Date.now() + (SIGN_TTL - 300) * 1000 });
  return data.signedUrl;
}
