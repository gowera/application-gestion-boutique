import { useCallback, useEffect, useState } from "react";

/**
 * Signature et sceau des documents : conservés en local (data URL) afin de
 * rester disponibles hors ligne, comme le modèle de document actif.
 */
const SIGNATURE_KEY = "conetec.document.signature";
const STAMP_KEY = "conetec.document.stamp";

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

export function setDocumentMark(kind: keyof DocumentMarks, dataUrl: string | null) {
  if (typeof localStorage === "undefined") return;
  const key = kind === "signature" ? SIGNATURE_KEY : STAMP_KEY;
  if (dataUrl) localStorage.setItem(key, dataUrl);
  else localStorage.removeItem(key);
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

/** Hook réactif sur la signature et le sceau enregistrés. */
export function useDocumentMarks(): DocumentMarks & { save: (kind: keyof DocumentMarks, dataUrl: string | null) => void } {
  const [marks, setMarks] = useState<DocumentMarks>({});
  useEffect(() => {
    const sync = () => setMarks(getDocumentMarks());
    sync();
    listeners.add(sync);
    window.addEventListener("storage", sync);
    return () => { listeners.delete(sync); window.removeEventListener("storage", sync); };
  }, []);
  const save = useCallback((kind: keyof DocumentMarks, dataUrl: string | null) => setDocumentMark(kind, dataUrl), []);
  return { ...marks, save };
}
