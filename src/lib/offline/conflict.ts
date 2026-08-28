import { cacheGet, cacheSet } from "./store";

/**
 * Stratégie de résolution des conflits lorsqu'une même donnée a été modifiée
 * en local (hors ligne) et sur le serveur pendant la coupure.
 *
 * - `server` : le serveur gagne toujours (les modifications locales non
 *   synchronisées sur la fiche sont abandonnées après envoi).
 * - `local`  : la version locale gagne (elle reste affichée jusqu'à ce que la
 *   file d'attente l'ait poussée au serveur).
 * - `merge`  : fusion champ par champ, le champ le plus récemment modifié
 *   gagne (par défaut).
 */
export type ConflictPolicy = "server" | "local" | "merge";

const POLICY_KEY = "conetec:conflict-policy";
const DIRTY_KEY = "local:dirty";
const CONFLICTS_KEY = "sync:conflicts";

export type DirtyEntry = { table: string; id: string; fields: Record<string, unknown>; at: string };
export type ConflictEntry = {
  id: string;
  table: string;
  rowId: string;
  field: string;
  localValue: unknown;
  serverValue: unknown;
  winner: "local" | "server";
  policy: ConflictPolicy;
  at: string;
};

export const POLICY_LABELS: Record<ConflictPolicy, string> = {
  merge: "Fusion champ par champ (le plus récent gagne)",
  local: "Priorité aux modifications locales",
  server: "Priorité aux données du serveur",
};

export function getConflictPolicy(): ConflictPolicy {
  if (typeof localStorage === "undefined") return "merge";
  const raw = localStorage.getItem(POLICY_KEY);
  return raw === "server" || raw === "local" || raw === "merge" ? raw : "merge";
}

export function setConflictPolicy(policy: ConflictPolicy): void {
  if (typeof localStorage !== "undefined") localStorage.setItem(POLICY_KEY, policy);
}

/** Enregistre une modification locale d'une fiche (pour arbitrage ultérieur). */
export async function markLocalChange(table: string, id: string, fields: Record<string, unknown>): Promise<void> {
  const list = (await cacheGet<DirtyEntry[]>(DIRTY_KEY)) ?? [];
  const at = new Date().toISOString();
  const existing = list.find((entry) => entry.table === table && entry.id === id);
  const next = existing
    ? list.map((entry) => (entry === existing ? { ...entry, fields: { ...entry.fields, ...fields }, at } : entry))
    : [...list, { table, id, fields, at }];
  await cacheSet(DIRTY_KEY, next);
}

export async function listDirty(): Promise<DirtyEntry[]> {
  return (await cacheGet<DirtyEntry[]>(DIRTY_KEY)) ?? [];
}

export async function clearDirty(table: string, id?: string): Promise<void> {
  const list = await listDirty();
  await cacheSet(DIRTY_KEY, list.filter((entry) => entry.table !== table || (id ? entry.id !== id : false)));
}

export async function listConflicts(): Promise<ConflictEntry[]> {
  return (await cacheGet<ConflictEntry[]>(CONFLICTS_KEY)) ?? [];
}

export async function clearConflicts(): Promise<void> {
  await cacheSet(CONFLICTS_KEY, []);
}

async function logConflicts(entries: ConflictEntry[]): Promise<void> {
  if (entries.length === 0) return;
  const list = await listConflicts();
  await cacheSet(CONFLICTS_KEY, [...list, ...entries].slice(-200));
}

function rowTimestamp(row: Record<string, unknown>): number {
  const raw = (row["updated_at"] ?? row["created_at"]) as string | undefined;
  const value = raw ? Date.parse(raw) : NaN;
  return Number.isNaN(value) ? 0 : value;
}

/**
 * Applique la stratégie de conflit aux lignes fraîchement téléchargées :
 * renvoie les lignes à stocker en local et journalise les arbitrages.
 */
export async function resolveTableRows(
  table: string,
  serverRows: unknown[],
  policy: ConflictPolicy = getConflictPolicy(),
): Promise<unknown[]> {
  const dirty = (await listDirty()).filter((entry) => entry.table === table);
  if (dirty.length === 0 || policy === "server") {
    if (dirty.length > 0 && policy === "server") await clearDirty(table);
    return serverRows;
  }

  const conflicts: ConflictEntry[] = [];
  const byId = new Map(dirty.map((entry) => [entry.id, entry]));
  const merged = serverRows.map((raw) => {
    const row = raw as Record<string, unknown>;
    const entry = byId.get(String(row["id"] ?? ""));
    if (!entry) return row;
    const serverAt = rowTimestamp(row);
    const localAt = Date.parse(entry.at);
    const next = { ...row };
    for (const [field, localValue] of Object.entries(entry.fields)) {
      const serverValue = row[field];
      if (JSON.stringify(serverValue) === JSON.stringify(localValue)) continue;
      const localWins = policy === "local" || localAt >= serverAt;
      if (localWins) next[field] = localValue;
      conflicts.push({
        id: crypto.randomUUID(),
        table,
        rowId: entry.id,
        field,
        localValue,
        serverValue,
        winner: localWins ? "local" : "server",
        policy,
        at: new Date().toISOString(),
      });
    }
    return next;
  });

  await logConflicts(conflicts);
  return merged;
}
