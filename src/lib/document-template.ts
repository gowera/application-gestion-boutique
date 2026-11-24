import { cacheGet, cacheSet } from "@/lib/offline/store";

export type DocumentTemplateId = "standard" | "pro" | "custom";
export type DocumentKind = "facture" | "recu" | "proforma";

export const DOCUMENT_TEMPLATES: Array<{ id: DocumentTemplateId; label: string; description: string }> = [
  { id: "standard", label: "Standard", description: "Style simple et rapide pour reçu ou facture." },
  { id: "pro", label: "Professionnel", description: "Présentation plus soignée avec en-tête renforcé." },
  { id: "custom", label: "Personnalisé", description: "Modèle créé par l'utilisateur (éditeur canvas)." },
];

const STORAGE_KEY = "documents:templates";
const LEGACY_STORAGE_KEY = "conetec.document-template";
const LEGACY_CUSTOM_STORAGE_KEY = "conetec.document-template.custom.v2";

type DocumentTemplateState = {
  active: DocumentTemplateId;
  custom: CustomTemplateStore;
};

function createDefaultState(): DocumentTemplateState {
  return {
    active: "standard",
    custom: {
      facture: defaultTemplate("facture"),
      recu: defaultTemplate("recu"),
      proforma: defaultTemplate("proforma"),
    },
  };
}

let state = createDefaultState();
let loading: Promise<void> | null = null;

function parseTemplateId(value: unknown): DocumentTemplateId {
  return value === "pro" || value === "custom" ? value : "standard";
}

export function getStoredDocumentTemplate(): DocumentTemplateId {
  return state.active;
}

async function saveState(next: DocumentTemplateState): Promise<void> {
  await cacheSet(STORAGE_KEY, next);
  state = next;
}

export function setStoredDocumentTemplate(template: DocumentTemplateId): Promise<void> {
  return saveState({ ...state, active: template });
}

/** Charge et migre les modèles avant d’afficher les écrans de l’application. */
export function loadDocumentTemplates(): Promise<void> {
  if (loading) return loading;
  loading = (async () => {
    const stored = await cacheGet<Partial<DocumentTemplateState>>(STORAGE_KEY);
    if (stored) {
      const defaults = createDefaultState();
      state = {
        active: parseTemplateId(stored.active),
        custom: {
          facture: stored.custom?.facture ?? defaults.custom.facture,
          recu: stored.custom?.recu ?? defaults.custom.recu,
          proforma: stored.custom?.proforma ?? defaults.custom.proforma,
        },
      };
    } else {
      const legacyActive = typeof window === "undefined" ? null : window.localStorage.getItem(LEGACY_STORAGE_KEY);
      const legacyCustom = typeof window === "undefined" ? null : window.localStorage.getItem(LEGACY_CUSTOM_STORAGE_KEY);
      const defaults = createDefaultState();
      const parsedCustom = legacyCustom
        ? JSON.parse(legacyCustom) as Partial<CustomTemplateStore>
        : {};
      const migrated: DocumentTemplateState = {
        active: parseTemplateId(legacyActive),
        custom: {
          facture: parsedCustom.facture ?? defaults.custom.facture,
          recu: parsedCustom.recu ?? defaults.custom.recu,
          proforma: defaults.custom.proforma,
        },
      };
      if (legacyActive || legacyCustom) await cacheSet(STORAGE_KEY, migrated);
      state = migrated;
      if (typeof window !== "undefined") {
        window.localStorage.removeItem(LEGACY_STORAGE_KEY);
        window.localStorage.removeItem(LEGACY_CUSTOM_STORAGE_KEY);
      }
    }
  })().finally(() => {
    loading = null;
  });
  return loading;
}

// --- Custom canvas templates ---

export type ElementType = "text" | "rect" | "line" | "image" | "items_table";

export type CanvasElement = {
  id: string;
  type: ElementType;
  x: number; // in mm
  y: number; // in mm
  w?: number; // in mm
  h?: number; // in mm
  text?: string;
  fontSize?: number; // pt
  bold?: boolean;
  italic?: boolean;
  align?: "left" | "center" | "right";
  color?: string; // text or line color hex
  fill?: string; // rectangle fill hex
  strokeWidth?: number;
  imageKey?: "logo";
  // items_table specific
  columns?: Array<"name" | "qty" | "unit" | "total">;
  headerFill?: string;
  headerColor?: string;
};

export type CanvasTemplate = {
  pageWidth: number; // mm
  pageHeight: number; // mm
  elements: CanvasElement[];
};

export type CustomTemplateStore = {
  facture: CanvasTemplate;
  recu: CanvasTemplate;
  proforma: CanvasTemplate;
};

const uid = () => (typeof crypto !== "undefined" && "randomUUID" in crypto ? crypto.randomUUID() : Math.random().toString(36).slice(2));

export function defaultTemplate(kind: DocumentKind): CanvasTemplate {
  const isFacture = kind !== "recu";
  const documentLabel = kind === "recu" ? "REÇU" : kind === "proforma" ? "FACTURE PROFORMA" : "FACTURE";
  // Le reçu est calibré pour les petites imprimantes thermiques portables 58 mm.
  const pageWidth = isFacture ? 210 : 58;
  const pageHeight = isFacture ? 297 : 200;
  const centerX = pageWidth / 2;
  const m = isFacture ? 8 : 3;
  const els: CanvasElement[] = [
    { id: uid(), type: "rect", x: 0, y: 0, w: pageWidth, h: isFacture ? 32 : 20, fill: "#0B1E3F" },
    { id: uid(), type: "text", x: centerX, y: isFacture ? 14 : 9, text: "{{shopName}}", fontSize: isFacture ? 20 : 12, bold: true, color: "#FFFFFF", align: "center" },
    { id: uid(), type: "text", x: centerX, y: isFacture ? 22 : 15, text: isFacture ? "{{address}} · Tél: {{phone}}" : "Tél: {{phone}}", fontSize: isFacture ? 9 : 8, color: "#E5EDFF", align: "center" },
    { id: uid(), type: "text", x: m, y: isFacture ? 42 : 27, text: `${documentLabel} N° {{code}}`, fontSize: isFacture ? 14 : 10, bold: true, color: "#0B1E3F" },
    { id: uid(), type: "text", x: m, y: isFacture ? 50 : 33, text: "Date: {{date}}", fontSize: isFacture ? 9 : 8, color: "#000000" },
    { id: uid(), type: "text", x: m, y: isFacture ? 56 : 38, text: "Client: {{customer}}", fontSize: isFacture ? 9 : 8, color: "#000000" },
    {
      id: uid(),
      type: "items_table",
      x: m,
      y: isFacture ? 66 : 44,
      w: pageWidth - m * 2,
      columns: ["name", "qty", "unit", "total"],
      headerFill: "#0B1E3F",
      headerColor: "#FFFFFF",
      fontSize: isFacture ? 10 : 8.5,
    },
    { id: uid(), type: "text", x: pageWidth - m, y: isFacture ? 200 : 150, text: "Sous-total: {{subtotal}}", fontSize: isFacture ? 9 : 8.5, align: "right", color: "#000000" },
    { id: uid(), type: "text", x: pageWidth - m, y: isFacture ? 206 : 156, text: "Remise: {{discount}}", fontSize: isFacture ? 9 : 8.5, align: "right", color: "#000000" },
    { id: uid(), type: "text", x: pageWidth - m, y: isFacture ? 214 : 163, text: "TOTAL: {{total}}", fontSize: isFacture ? 12 : 11, bold: true, align: "right", color: "#0B1E3F" },
    { id: uid(), type: "text", x: pageWidth - m, y: isFacture ? 220 : 170, text: "Payé: {{paid}}", fontSize: isFacture ? 9 : 8.5, align: "right", color: "#000000" },
    { id: uid(), type: "text", x: pageWidth - m, y: isFacture ? 226 : 176, text: "Crédit: {{credit}}", fontSize: isFacture ? 9 : 8.5, align: "right", color: "#B91C1C" },
    { id: uid(), type: "text", x: centerX, y: pageHeight - 10, text: "Merci de votre confiance.", fontSize: isFacture ? 9 : 8, italic: true, align: "center", color: "#333333" },
  ];
  return { pageWidth, pageHeight, elements: els };
}


export function getCustomTemplates(): CustomTemplateStore {
  return state.custom;
}

export function getCustomTemplate(kind: DocumentKind = "recu"): CanvasTemplate {
  return state.custom[kind];
}

export function setCustomTemplate(kind: DocumentKind, template: CanvasTemplate): Promise<void> {
  return saveState({ ...state, custom: { ...state.custom, [kind]: template } });
}

export function resetCustomTemplate(kind: DocumentKind): Promise<void> {
  return setCustomTemplate(kind, defaultTemplate(kind));
}

export function newElement(type: ElementType): CanvasElement {
  const base: CanvasElement = { id: uid(), type, x: 10, y: 10 };
  switch (type) {
    case "text":
      return { ...base, text: "Nouveau texte", fontSize: 10, color: "#000000", align: "left" };
    case "rect":
      return { ...base, w: 40, h: 15, fill: "#E5EDFF" };
    case "line":
      return { ...base, w: 60, h: 0.4, color: "#0B1E3F", strokeWidth: 0.4 };
    case "image":
      return { ...base, w: 30, h: 15, imageKey: "logo" };
    case "items_table":
      return { ...base, w: 100, columns: ["name", "qty", "unit", "total"], headerFill: "#0B1E3F", headerColor: "#FFFFFF", fontSize: 9 };
  }
}

export const AVAILABLE_VARIABLES = [
  "shopName", "address", "phone", "code", "customer", "date", "period",
  "subtotal", "discount", "total", "paid", "credit",
];
