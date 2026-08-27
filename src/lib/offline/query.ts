import { cacheGet, cacheSet } from "./store";
import { isOffline } from "./sync";

/**
 * Enveloppe une requête React Query : les données réussies sont mises en cache
 * local, et en cas de coupure réseau on renvoie la dernière version connue.
 */
export function offlineQueryFn<T>(cacheKey: string, fn: () => Promise<T>, bootstrapKey?: string) {
  return async (): Promise<T> => {
    if (isOffline()) {
      const cached = await cacheGet<T>(cacheKey) ?? (bootstrapKey ? await cacheGet<T>(bootstrapKey) : undefined);
      if (cached !== undefined) return cached;
    }
    try {
      const data = await fn();
      await cacheSet(cacheKey, data);
      return data;
    } catch (err) {
      const cached = await cacheGet<T>(cacheKey) ?? (bootstrapKey ? await cacheGet<T>(bootstrapKey) : undefined);
      if (cached !== undefined) return cached;
      throw err;
    }
  };
}
