import { cacheGet, cacheSet } from "./store";
import { isOffline } from "./sync";

const READ_TIMEOUT_MS = 8_000;

function withReadTimeout<T>(promise: Promise<T>): Promise<T> {
  return new Promise<T>((resolve, reject) => {
    const timer = window.setTimeout(() => reject(new Error("offline-read-timeout")), READ_TIMEOUT_MS);
    promise.then(
      (value) => { window.clearTimeout(timer); resolve(value); },
      (error) => { window.clearTimeout(timer); reject(error); },
    );
  });
}

/**
 * Enveloppe une requête React Query : les données réussies sont mises en cache
 * local, et en cas de coupure réseau on renvoie la dernière version connue.
 */
export function offlineQueryFn<T>(cacheKey: string, fn: () => Promise<T>, bootstrapKey?: string) {
  return async (): Promise<T> => {
    const desktopLocal = typeof window !== "undefined" && Boolean(window.conetecDesktop);
    const cached = desktopLocal
      ? undefined
      : await cacheGet<T>(cacheKey) ?? (bootstrapKey ? await cacheGet<T>(bootstrapKey) : undefined);
    if (!desktopLocal && isOffline() && cached !== undefined) return cached;
    try {
      const data = await withReadTimeout(fn());
      if (!desktopLocal) await cacheSet(cacheKey, data);
      return data;
    } catch (err) {
      if (!desktopLocal && cached !== undefined) return cached;
      throw err;
    }
  };
}
