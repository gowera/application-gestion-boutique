import { useEffect, useSyncExternalStore } from "react";
import { getSyncState, startSyncEngine, subscribeSync, type SyncState } from "@/lib/offline/sync";

const serverState: SyncState = {
  online: true,
  syncing: false,
  pending: 0,
  lastSyncAt: null,
  lastError: null,
};

export function useSync(): SyncState {
  useEffect(() => startSyncEngine(), []);
  return useSyncExternalStore(subscribeSync, getSyncState, () => serverState);
}
