export type DocumentTemplateId = "standard" | "pro" | "custom";

export const DOCUMENT_TEMPLATES: Array<{ id: DocumentTemplateId; label: string; description: string }> = [
  { id: "standard", label: "Standard", description: "Style simple et rapide pour reçu ou facture." },
  { id: "pro", label: "Professionnel", description: "Présentation plus soignée avec en-tête renforcé." },
  { id: "custom", label: "Personnalisé", description: "Modèle créé par l'utilisateur (éditeur)." },
];

const STORAGE_KEY = "conetec.document-template";
const STORAGE_CUSTOM_KEY = "conetec.document-template.custom";

export function getStoredDocumentTemplate(): DocumentTemplateId {
  if (typeof window === "undefined") return "standard";
  const value = window.localStorage.getItem(STORAGE_KEY);
  return value === "pro" ? "pro" : value === "custom" ? "custom" : "standard";
}

export function setStoredDocumentTemplate(template: DocumentTemplateId) {
  if (typeof window === "undefined") return;
  window.localStorage.setItem(STORAGE_KEY, template);
}

// Custom template payload is a free-form JSON describing elements and styles.
export type CustomTemplatePayload = {
  width?: number;
  height?: number;
  elements?: Array<Record<string, any>>;
  meta?: Record<string, any>;
};

export function getCustomTemplate(): CustomTemplatePayload | null {
  if (typeof window === "undefined") return null;
  try {
    const raw = window.localStorage.getItem(STORAGE_CUSTOM_KEY);
    if (!raw) return null;
    return JSON.parse(raw) as CustomTemplatePayload;
  } catch (e) {
    return null;
  }
}

export function setCustomTemplate(payload: CustomTemplatePayload) {
  if (typeof window === "undefined") return;
  window.localStorage.setItem(STORAGE_CUSTOM_KEY, JSON.stringify(payload));
}

export function clearCustomTemplate() {
  if (typeof window === "undefined") return;
  window.localStorage.removeItem(STORAGE_CUSTOM_KEY);
}
