import { useEffect, useState } from "react";
import { cacheGet, cacheSet } from "@/lib/offline/store";

/**
 * Journal local des documents imprimés (factures, reçus, proformas) :
 * date, heure et utilisateur. Enregistré dans la base locale durable, donc
 * disponible même sans connexion et conservé après redémarrage.
 */
export type PrintEntry = {
  id: string;
  code: string;
  documentType: string;
  customer: string;
  totalUsd: number;
  user: string;
  at: string;
  origin: "création" | "réimpression" | "email";
};

const KEY = "print-journal";
const MAX_ENTRIES = 500;

let entries: PrintEntry[] = [];
let loaded = false;
const listeners = new Set<() => void>();

function emit() {
  listeners.forEach((listener) => listener());
}

export async function loadPrintLog(): Promise<PrintEntry[]> {
  entries = (await cacheGet<PrintEntry[]>(KEY)) ?? [];
  loaded = true;
  emit();
  return entries;
}

export function getPrintLog(): PrintEntry[] {
  return entries;
}

export async function recordPrint(entry: Omit<PrintEntry, "id" | "at">): Promise<void> {
  if (!loaded) await loadPrintLog();
  const full: PrintEntry = { ...entry, id: crypto.randomUUID(), at: new Date().toISOString() };
  entries = [full, ...entries].slice(0, MAX_ENTRIES);
  await cacheSet(KEY, entries);
  emit();
}

/** Hook réactif sur le journal d'impression local. */
export function usePrintLog(): PrintEntry[] {
  const [list, setList] = useState<PrintEntry[]>(entries);
  useEffect(() => {
    const sync = () => setList(getPrintLog());
    listeners.add(sync);
    void loadPrintLog();
    return () => { listeners.delete(sync); };
  }, []);
  return list;
}

export function formatPrintDate(iso: string): string {
  const date = new Date(iso);
  return `${date.toLocaleDateString("fr-FR")} à ${date.toLocaleTimeString("fr-FR", { hour: "2-digit", minute: "2-digit" })}`;
}
