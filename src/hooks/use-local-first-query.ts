import { useQuery, useQueryClient, type QueryKey } from "@tanstack/react-query";
import { cacheGet, cacheSet } from "@/lib/offline/store";
import { isOffline } from "@/lib/offline/sync";

export type LocalFirstResult<T> = {
  data: T | undefined;
  /** "local" = données de la base locale, "server" = données fraîches du serveur. */
  source: "local" | "server" | "none";
  refreshing: boolean;
};

type Payload<T> = { data: T; source: "local" | "server" };

/**
 * Affiche immédiatement les données de la base locale (sans attendre le réseau),
 * puis rafraîchit en arrière-plan dès que le serveur répond.
 */
export function useLocalFirstQuery<T>(options: {
  queryKey: QueryKey;
  cacheKey: string;
  queryFn: () => Promise<T>;
}): LocalFirstResult<T> {
  const { queryKey, cacheKey, queryFn } = options;
  const qc = useQueryClient();

  const query = useQuery<Payload<T>>({
    queryKey,
    queryFn: async () => {
      const cached = await cacheGet<T>(cacheKey);

      const fetchFresh = async (): Promise<Payload<T>> => {
        const data = await queryFn();
        await cacheSet(cacheKey, data);
        return { data, source: "server" };
      };

      if (cached !== undefined) {
        // Rendu instantané depuis le disque local ; le serveur met à jour ensuite.
        if (!isOffline()) {
          void fetchFresh()
            .then((fresh) => qc.setQueryData(queryKey, fresh))
            .catch(() => undefined);
        }
        return { data: cached, source: "local" };
      }

      if (isOffline()) return { data: undefined as T, source: "local" };
      return fetchFresh();
    },
  });

  return {
    data: query.data?.data,
    source: query.data ? query.data.source : "none",
    refreshing: query.isFetching,
  };
}
