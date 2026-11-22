import { supabase } from "@/integrations/supabase/client";
import { archiveSynced, outboxAdd, outboxList, outboxRemove, outboxUpdate, type OutboxOp } from "./store";
import { bootstrapOfflineData } from "./bootstrap";

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
  if (typeof navigator !== "undefined" && !navigator.onLine) return true;
  return state.online === false;
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
  id?: string,
): Promise<OutboxOp> {
  const op = await outboxAdd({ kind, label, payload }, id);
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
  await archiveSynced(op);
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
    // Même sans écriture en attente, on rapatrie les données du serveur vers la base locale.
    const { data } = await supabase.auth.getSession();
    if (data.session?.user.id) await bootstrapOfflineData(data.session.user.id);
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
    const { data } = await supabase.auth.getSession();
    if (data.session?.user.id) await bootstrapOfflineData(data.session.user.id, sent > 0);
  }
  return { sent, failed };
}

/** Réessaie immédiatement une opération précise de la file d'attente. */
export async function retryOperation(id: string): Promise<boolean> {
  const list = await outboxList();
  const op = list.find((o) => o.id === id);
  if (!op) return false;
  if (isOffline()) return false;
  emit({ syncing: true });
  try {
    return await pushOne(op);
  } catch (e) {
    await outboxUpdate(op.id, { tries: op.tries + 1, error: (e as Error).message });
    return false;
  } finally {
    await refreshPending();
    emit({ syncing: false, lastSyncAt: new Date().toISOString() });
  }
}

/** Abandonne définitivement une opération en échec. */
export async function discardOperation(id: string): Promise<void> {
  await outboxRemove(id);
  await refreshPending();
}

let started = false;

/** Vérifie réellement la disponibilité du serveur (navigator.onLine ment souvent). */
async function probeConnectivity(): Promise<boolean> {
  if (typeof navigator !== "undefined" && !navigator.onLine) return false;
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), 5000);
  try {
    const response = await fetch(`${import.meta.env.VITE_SUPABASE_URL}/auth/v1/health`, {
      method: "HEAD",
      cache: "no-store",
      headers: { apikey: import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY },
      signal: controller.signal,
    });
    return response.ok;
  } catch {
    return false;
  } finally {
    clearTimeout(timer);
  }
}

/**
 * Démarre la surveillance réseau et la synchronisation automatique en arrière-plan
 * (montée une seule fois au niveau de l'application, quelle que soit la page ouverte).
 */
export function startSyncEngine(): () => void {
  if (typeof window === "undefined" || started) return () => {};
  started = true;

  const onOnline = () => {
    void tick(true);
  };
  const onOffline = () => emit({ online: false });
  const onWake = () => { if (!document.hidden) void tick(); };

  async function tick(reconnected = false) {
    const reachable = await probeConnectivity();
    const wasOffline = !state.online;
    if (reachable !== state.online) emit({ online: reachable });
    if (reachable) {
      await syncNow();
      if (wasOffline || reconnected) {
        const { data } = await supabase.auth.getSession();
        if (data.session?.user.id) await bootstrapOfflineData(data.session.user.id, true);
      }
    }
  }

  window.addEventListener("online", onOnline);
  window.addEventListener("offline", onOffline);
  window.addEventListener("focus", onWake);
  document.addEventListener("visibilitychange", onWake);
  const timer = window.setInterval(() => void tick(), 30_000);

  void refreshPending();
  void tick();

  return () => {
    window.removeEventListener("online", onOnline);
    window.removeEventListener("offline", onOffline);
    window.removeEventListener("focus", onWake);
    document.removeEventListener("visibilitychange", onWake);
    window.clearInterval(timer);
    started = false;
  };
}

