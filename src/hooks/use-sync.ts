import { useEffect, useSyncExternalStore } from "react";
import { useQueryClient } from "@tanstack/react-query";
import { onBootstrapRefreshed } from "@/lib/offline/bootstrap";
import { getSyncState, startSyncEngine, subscribeSync, type SyncState } from "@/lib/offline/sync";

const serverState: SyncState = {
  online: true,
  syncing: false,
  pending: 0,
  lastSyncAt: null,
  lastError: null,
};

export function useSync(): SyncState {
  const qc = useQueryClient();
  useEffect(() => startSyncEngine(), []);
  // Après chaque téléchargement serveur -> local, toutes les listes affichées
  // (produits, clients, documents…) repartent de la base locale à jour.
  useEffect(() => onBootstrapRefreshed(() => { void qc.invalidateQueries(); }), [qc]);
  return useSyncExternalStore(subscribeSync, getSyncState, () => serverState);
}
