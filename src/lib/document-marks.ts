import { useCallback, useEffect, useState } from "react";
import { cacheGet, cacheSet } from "@/lib/offline/store";

/**
 * Signature et sceau des documents : conservés sur l'appareil (application
 * Windows : base locale chiffrée sur disque ; navigateur : IndexedDB), avec un
 * miroir localStorage pour un affichage immédiat au démarrage. Ils ne dépendent
 * d'aucune donnée du serveur et restent disponibles 100 % hors ligne.
 */
const SIGNATURE_KEY = "conetec.document.signature";
const STAMP_KEY = "conetec.document.stamp";
const LOCAL_DB_KEY = "document-marks";

export type DocumentMarks = { signature?: string; stamp?: string };

const listeners = new Set<() => void>();

function read(key: string): string | undefined {
  if (typeof localStorage === "undefined") return undefined;
  const value = localStorage.getItem(key);
  return value && value.startsWith("data:") ? value : undefined;
}

export function getDocumentMarks(): DocumentMarks {
  return { signature: read(SIGNATURE_KEY), stamp: read(STAMP_KEY) };
}

function writeMirror(kind: keyof DocumentMarks, dataUrl: string | null) {
  if (typeof localStorage === "undefined") return;
  const key = kind === "signature" ? SIGNATURE_KEY : STAMP_KEY;
  if (dataUrl) localStorage.setItem(key, dataUrl);
  else localStorage.removeItem(key);
}

/** Recharge la signature et le sceau depuis la base locale durable. */
export async function loadDocumentMarks(): Promise<DocumentMarks> {
  const stored = (await cacheGet<DocumentMarks>(LOCAL_DB_KEY)) ?? {};
  const current = getDocumentMarks();
  const merged: DocumentMarks = {
    signature: stored.signature ?? current.signature,
    stamp: stored.stamp ?? current.stamp,
  };
  writeMirror("signature", merged.signature ?? null);
  writeMirror("stamp", merged.stamp ?? null);
  listeners.forEach((listener) => listener());
  return merged;
}

export function setDocumentMark(kind: keyof DocumentMarks, dataUrl: string | null) {
  writeMirror(kind, dataUrl);
  const next = getDocumentMarks();
  void cacheSet(LOCAL_DB_KEY, next);
  listeners.forEach((listener) => listener());
}

export function fileToDataUrl(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(String(reader.result));
    reader.onerror = () => reject(new Error("Image illisible"));
    reader.readAsDataURL(file);
  });
}

/** Hook réactif sur la signature et le sceau enregistrés sur cet appareil. */
export function useDocumentMarks(): DocumentMarks & { save: (kind: keyof DocumentMarks, dataUrl: string | null) => void } {
  const [marks, setMarks] = useState<DocumentMarks>({});
  useEffect(() => {
    const sync = () => setMarks(getDocumentMarks());
    sync();
    listeners.add(sync);
    window.addEventListener("storage", sync);
    void loadDocumentMarks();
    return () => { listeners.delete(sync); window.removeEventListener("storage", sync); };
  }, []);
  const save = useCallback((kind: keyof DocumentMarks, dataUrl: string | null) => setDocumentMark(kind, dataUrl), []);
  return { ...marks, save };
}
