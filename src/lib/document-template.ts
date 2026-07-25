export type DocumentTemplateId = "standard" | "pro" | "custom";
export type DocumentKind = "facture" | "recu";

export const DOCUMENT_TEMPLATES: Array<{ id: DocumentTemplateId; label: string; description: string }> = [
  { id: "standard", label: "Standard", description: "Style simple et rapide pour reçu ou facture." },
  { id: "pro", label: "Professionnel", description: "Présentation plus soignée avec en-tête renforcé." },
  { id: "custom", label: "Personnalisé", description: "Modèle créé par l'utilisateur (éditeur canvas)." },
];

const STORAGE_KEY = "conetec.document-template";
const STORAGE_CUSTOM_KEY = "conetec.document-template.custom.v2";

export function getStoredDocumentTemplate(): DocumentTemplateId {
  if (typeof window === "undefined") return "standard";
  const value = window.localStorage.getItem(STORAGE_KEY);
  return value === "pro" ? "pro" : value === "custom" ? "custom" : "standard";
}

export function setStoredDocumentTemplate(template: DocumentTemplateId) {
  if (typeof window === "undefined") return;
  window.localStorage.setItem(STORAGE_KEY, template);
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
};

const uid = () => (typeof crypto !== "undefined" && "randomUUID" in crypto ? crypto.randomUUID() : Math.random().toString(36).slice(2));

export function defaultTemplate(kind: DocumentKind): CanvasTemplate {
  const isFacture = kind === "facture";
  const pageWidth = isFacture ? 210 : 80;
  const pageHeight = isFacture ? 297 : 220;
  const centerX = pageWidth / 2;
  const els: CanvasElement[] = [
    { id: uid(), type: "rect", x: 0, y: 0, w: pageWidth, h: isFacture ? 32 : 22, fill: "#0B1E3F" },
    { id: uid(), type: "text", x: centerX, y: isFacture ? 14 : 10, text: "{{shopName}}", fontSize: isFacture ? 20 : 14, bold: true, color: "#FFFFFF", align: "center" },
    { id: uid(), type: "text", x: centerX, y: isFacture ? 22 : 16, text: "{{address}} · Tél: {{phone}}", fontSize: isFacture ? 9 : 7, color: "#E5EDFF", align: "center" },
    { id: uid(), type: "text", x: 8, y: isFacture ? 42 : 30, text: (isFacture ? "FACTURE " : "REÇU ") + "N° {{code}}", fontSize: isFacture ? 14 : 11, bold: true, color: "#0B1E3F" },
    { id: uid(), type: "text", x: 8, y: isFacture ? 50 : 36, text: "Date: {{date}}", fontSize: 9, color: "#333333" },
    { id: uid(), type: "text", x: 8, y: isFacture ? 56 : 41, text: "Client: {{customer}}", fontSize: 9, color: "#333333" },
    {
      id: uid(),
      type: "items_table",
      x: 8,
      y: isFacture ? 66 : 48,
      w: pageWidth - 16,
      columns: ["name", "qty", "unit", "total"],
      headerFill: "#0B1E3F",
      headerColor: "#FFFFFF",
      fontSize: isFacture ? 10 : 8,
    },
    { id: uid(), type: "text", x: pageWidth - 8, y: isFacture ? 200 : 170, text: "Sous-total: {{subtotal}}", fontSize: 9, align: "right", color: "#333333" },
    { id: uid(), type: "text", x: pageWidth - 8, y: isFacture ? 206 : 175, text: "Remise: {{discount}}", fontSize: 9, align: "right", color: "#333333" },
    { id: uid(), type: "text", x: pageWidth - 8, y: isFacture ? 214 : 181, text: "TOTAL: {{total}}", fontSize: 12, bold: true, align: "right", color: "#0B1E3F" },
    { id: uid(), type: "text", x: pageWidth - 8, y: isFacture ? 220 : 187, text: "Payé: {{paid}}", fontSize: 9, align: "right", color: "#333333" },
    { id: uid(), type: "text", x: pageWidth - 8, y: isFacture ? 226 : 192, text: "Crédit: {{credit}}", fontSize: 9, align: "right", color: "#B91C1C" },
    { id: uid(), type: "text", x: centerX, y: pageHeight - 10, text: "Merci de votre confiance.", fontSize: 9, italic: true, align: "center", color: "#555555" },
  ];
  return { pageWidth, pageHeight, elements: els };
}

export function getCustomTemplates(): CustomTemplateStore {
  if (typeof window === "undefined") return { facture: defaultTemplate("facture"), recu: defaultTemplate("recu") };
  try {
    const raw = window.localStorage.getItem(STORAGE_CUSTOM_KEY);
    if (!raw) return { facture: defaultTemplate("facture"), recu: defaultTemplate("recu") };
    const parsed = JSON.parse(raw) as Partial<CustomTemplateStore>;
    return {
      facture: parsed.facture ?? defaultTemplate("facture"),
      recu: parsed.recu ?? defaultTemplate("recu"),
    };
  } catch {
    return { facture: defaultTemplate("facture"), recu: defaultTemplate("recu") };
  }
}

export function getCustomTemplate(kind: DocumentKind = "recu"): CanvasTemplate {
  return getCustomTemplates()[kind];
}

export function setCustomTemplate(kind: DocumentKind, template: CanvasTemplate) {
  if (typeof window === "undefined") return;
  const all = getCustomTemplates();
  all[kind] = template;
  window.localStorage.setItem(STORAGE_CUSTOM_KEY, JSON.stringify(all));
}

export function resetCustomTemplate(kind: DocumentKind) {
  setCustomTemplate(kind, defaultTemplate(kind));
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
  "shopName", "address", "phone", "code", "customer", "date",
  "subtotal", "discount", "total", "paid", "credit",
];
