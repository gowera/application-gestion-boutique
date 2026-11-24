import { useCallback, useEffect, useState } from "react";
import { cacheGet, cacheSet } from "@/lib/offline/store";

/** Signature et sceau stockés dans la base locale durable. */
const LOCAL_DB_KEY = "document-marks";

export type DocumentMarks = { signature?: string; stamp?: string };

const listeners = new Set<() => void>();
let marks: DocumentMarks = {};
let loading: Promise<DocumentMarks> | null = null;
let loaded = false;

/** Recharge la signature et le sceau depuis la base locale durable. */
export function loadDocumentMarks(): Promise<DocumentMarks> {
  if (loading) return loading;
  loading = (async () => {
    const stored = await cacheGet<DocumentMarks>(LOCAL_DB_KEY);
    if (stored) {
      marks = stored;
    } else {
      const signature = typeof localStorage === "undefined" ? null : localStorage.getItem("conetec.document.signature");
      const stamp = typeof localStorage === "undefined" ? null : localStorage.getItem("conetec.document.stamp");
      const migrated = {
        signature: signature?.startsWith("data:") ? signature : undefined,
        stamp: stamp?.startsWith("data:") ? stamp : undefined,
      };
      if (migrated.signature || migrated.stamp) await cacheSet(LOCAL_DB_KEY, migrated);
      marks = migrated;
      if (typeof localStorage !== "undefined") {
        localStorage.removeItem("conetec.document.signature");
        localStorage.removeItem("conetec.document.stamp");
      }
    }
    loaded = true;
    listeners.forEach((listener) => listener());
    return marks;
  })().finally(() => {
    loading = null;
  });
  return loading;
}

export function getDocumentMarks(): DocumentMarks {
  return marks;
}

export async function setDocumentMark(kind: keyof DocumentMarks, dataUrl: string | null): Promise<void> {
  if (!loaded) await loadDocumentMarks();
  const next = { ...marks };
  if (dataUrl) next[kind] = dataUrl;
  else delete next[kind];
  await cacheSet(LOCAL_DB_KEY, next);
  marks = next;
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
export function useDocumentMarks(): DocumentMarks & {
  save: (kind: keyof DocumentMarks, dataUrl: string | null) => Promise<void>;
  loadError: string | null;
  ready: boolean;
} {
  const [marks, setMarks] = useState<DocumentMarks>({});
  const [loadError, setLoadError] = useState<string | null>(null);
  const [ready, setReady] = useState(false);
  useEffect(() => {
    const sync = () => setMarks(getDocumentMarks());
    sync();
    listeners.add(sync);
    void loadDocumentMarks()
      .then(() => { setReady(true); setLoadError(null); })
      .catch((error: unknown) => { setLoadError(error instanceof Error ? error.message : String(error)); });
    return () => { listeners.delete(sync); };
  }, []);
  const save = useCallback(async (kind: keyof DocumentMarks, dataUrl: string | null) => {
    await setDocumentMark(kind, dataUrl);
    setReady(true);
    setLoadError(null);
  }, []);
  return { ...marks, save, loadError, ready };
}
