import { getSyncState, isOffline, queueOperation } from "./sync";
import type { OutboxOp } from "./store";

export type RunResult<T> = { queued: boolean; data?: T };

const TIMEOUT_MS = 8000;

function withTimeout<T>(p: Promise<T>): Promise<T> {
  return new Promise<T>((resolve, reject) => {
    const t = setTimeout(() => reject(new Error("network-timeout")), TIMEOUT_MS);
    p.then(
      (v) => { clearTimeout(t); resolve(v); },
      (e) => { clearTimeout(t); reject(e); },
    );
  });
}

/**
 * Exécute l'opération en ligne ; si le réseau est absent, lent ou en erreur
 * réseau, l'opération est mise en file d'attente locale pour synchronisation.
 */
export async function runOrQueue<T>(
  kind: OutboxOp["kind"],
  label: string,
  payload: Record<string, unknown>,
  online: () => Promise<T>,
  operationId?: string,
): Promise<RunResult<T>> {
  if (typeof window !== "undefined" && window.conetecDesktop) {
    return { queued: false, data: await online() };
  }
  if (isOffline() || !getSyncState().online) {
    await queueOperation(kind, label, payload, operationId);
    return { queued: true };
  }
  try {
    return { queued: false, data: await withTimeout(online()) };
  } catch (err) {
    const msg = (err as Error)?.message ?? "";
    if (/network-timeout|fetch|network|Failed to fetch|NetworkError|timeout|offline/i.test(msg)) {
      await queueOperation(kind, label, payload, operationId);
      return { queued: true };
    }
    throw err;
  }
}

export function queuedMessage(label: string) {
  if (typeof window !== "undefined" && window.conetecDesktop) return `${label} enregistré localement sur cet ordinateur.`;
  return `${label} enregistré localement — sera synchronisé au retour de la connexion.`;
}
