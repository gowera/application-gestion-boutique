import { supabase } from "@/integrations/supabase/client";
import { outboxAdd, outboxList, outboxRemove, outboxUpdate, type OutboxOp } from "./store";

export type SyncState = {
  online: boolean;
  syncing: boolean;
  pending: number;
  lastSyncAt: string | null;
  lastError: string | null;
};

let state: SyncState = {
  online: typeof navigator === "undefined" ? true : navigator.onLine,
  syncing: false,
  pending: 0,
  lastSyncAt: null,
  lastError: null,
};

const listeners = new Set<() => void>();

function emit(patch: Partial<SyncState>) {
  state = { ...state, ...patch };
  listeners.forEach((l) => l());
}

export function subscribeSync(listener: () => void): () => void {
  listeners.add(listener);
  return () => listeners.delete(listener);
}

export function getSyncState(): SyncState {
  return state;
}

export function isOffline(): boolean {
  return typeof navigator !== "undefined" && !navigator.onLine;
}

async function refreshPending() {
  const list = await outboxList();
  emit({ pending: list.length });
}

/** Met une opération en file d'attente (utilisée hors ligne). */
export async function queueOperation(
  kind: OutboxOp["kind"],
  label: string,
  payload: Record<string, unknown>,
): Promise<OutboxOp> {
  const op = await outboxAdd({ kind, label, payload });
  await refreshPending();
  void syncNow();
  return op;
}

async function pushOne(op: OutboxOp): Promise<boolean> {
  const { error } = await supabase.rpc("sync_apply_operation", {
    _client_op_id: op.id,
    _kind: op.kind,
    _payload: op.payload as never,
  });
  if (error) {
    // Erreur métier définitive (stock, droits) : on garde l'opération avec le message.
    await outboxUpdate(op.id, { tries: op.tries + 1, error: error.message });
    return false;
  }
  await outboxRemove(op.id);
  return true;
}

/** Rejoue la file d'attente. Sans réseau ou sans session, ne fait rien. */
export async function syncNow(): Promise<{ sent: number; failed: number }> {
  if (state.syncing) return { sent: 0, failed: 0 };
  if (isOffline()) {
    emit({ online: false });
    await refreshPending();
    return { sent: 0, failed: 0 };
  }
  const list = await outboxList();
  if (list.length === 0) {
    emit({ online: true, pending: 0, lastSyncAt: new Date().toISOString() });
    return { sent: 0, failed: 0 };
  }

  emit({ syncing: true, lastError: null });
  let sent = 0;
  let failed = 0;
  try {
    const { data: session } = await supabase.auth.getSession();
    if (!session.session) {
      emit({ syncing: false, lastError: "Session expirée : reconnectez-vous pour synchroniser." });
      return { sent: 0, failed: list.length };
    }
    for (const op of list) {
      try {
        const ok = await pushOne(op);
        if (ok) sent += 1;
        else failed += 1;
      } catch (e) {
        failed += 1;
        await outboxUpdate(op.id, { tries: op.tries + 1, error: (e as Error).message });
      }
    }
  } finally {
    await refreshPending();
    emit({
      syncing: false,
      lastSyncAt: new Date().toISOString(),
      lastError: failed > 0 ? `${failed} opération(s) en échec` : null,
    });
  }
  return { sent, failed };
}

let started = false;

/** Démarre la surveillance réseau + la synchronisation périodique (client uniquement). */
export function startSyncEngine(): () => void {
  if (typeof window === "undefined" || started) return () => {};
  started = true;

  const onOnline = () => {
    emit({ online: true });
    void syncNow();
  };
  const onOffline = () => emit({ online: false });

  window.addEventListener("online", onOnline);
  window.addEventListener("offline", onOffline);
  const timer = window.setInterval(() => void syncNow(), 60_000);

  void refreshPending();
  void syncNow();

  return () => {
    window.removeEventListener("online", onOnline);
    window.removeEventListener("offline", onOffline);
    window.clearInterval(timer);
    started = false;
  };
}
