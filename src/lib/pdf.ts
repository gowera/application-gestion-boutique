import jsPDF from "jspdf";
import autoTable from "jspdf-autotable";
import { getCustomTemplate, type CanvasElement, type CanvasTemplate, type DocumentKind } from "@/lib/document-template";
import type { Currency } from "./currency";
import { formatMoney } from "./currency";

export interface ReceiptData {
  shopName: string;
  address: string;
  phone: string;
  code: string;
  customer: string;
  items: { name: string; qty: number; unit: number; total: number }[];
  subtotal: number;
  discount: number;
  total: number;
  paid: number;
  credit: number;
  currency: Currency;
  rate: number;
  documentType?: "Facture" | "Reçu";
  template?: "standard" | "pro" | "custom";
  logoDataUrl?: string;
  note?: string;
}

export interface PurchasePdfData {
  code: string;
  supplierName: string;
  note: string;
  items: { product_name: string; qty: number; unit_cost_usd: number; line_total_usd: number }[];
  subtotal: number;
  shipping: number;
  total: number;
}

export interface SalaryPdfData {
  employeeName: string;
  month: string;
  amount: number;
  paymentMethod: string;
  confirmationUrl: string;
  note?: string;
}

export interface SupplierReportPdfData {
  supplierName: string;
  from: string;
  to: string;
  purchases: { code: string; created_at: string; status: string; total_usd: number }[];
  total: number;
}

export interface ReportPdfData {
  title: string;
  summary: { label: string; value: string }[];
  sections: Array<{ title: string; rows: { label: string; value: string }[] }>;
}

export function downloadPurchasePdf(data: PurchasePdfData) {
  const doc = new jsPDF({ unit: "mm", format: [90, 220] });
  const w = 90;
  let y = 10;

  doc.setFont("helvetica", "bold");
  doc.setFontSize(13);
  doc.text("BON D'ACHAT", w / 2, y, { align: "center" });
  y += 6;
  doc.setFont("helvetica", "normal");
  doc.setFontSize(9);
  doc.text(`Code: ${data.code}`, 8, y); y += 5;
  doc.text(`Fournisseur: ${data.supplierName}`, 8, y); y += 5;
  if (data.note) { doc.text(`Note: ${data.note}`, 8, y); y += 5; }
  doc.text(`Date: ${new Date().toLocaleDateString("fr-FR")}`, 8, y); y += 6;

  autoTable(doc, {
    startY: y,
    head: [["Produit", "Qt", "P.U.", "Total"]],
    body: data.items.map((item) => [item.product_name, String(item.qty), formatMoney(item.unit_cost_usd, "USD", 1), formatMoney(item.line_total_usd, "USD", 1)]),
    styles: { fontSize: 8, cellPadding: 1 },
    headStyles: { fillColor: [11, 30, 63] },
    margin: { left: 5, right: 5 },
    theme: "plain",
  });

  const yAfter = (doc as unknown as { lastAutoTable: { finalY: number } }).lastAutoTable.finalY + 4;
  doc.setFont("helvetica", "bold");
  doc.text(`Sous-total: ${formatMoney(data.subtotal, "USD", 1)}`, 8, yAfter);
  doc.text(`Livraison: ${formatMoney(data.shipping, "USD", 1)}`, 8, yAfter + 5);
  doc.text(`TOTAL: ${formatMoney(data.total, "USD", 1)}`, 8, yAfter + 10);
  doc.save(`bon-achat-${data.code}.pdf`);
}

export function downloadSalaryPdf(data: SalaryPdfData) {
  const doc = new jsPDF({ unit: "mm", format: [90, 180] });
  const w = 90;
  let y = 10;

  doc.setFont("helvetica", "bold");
  doc.setFontSize(13);
  doc.text("REÇU DE SALAIRE", w / 2, y, { align: "center" });
  y += 8;
  doc.setFont("helvetica", "normal");
  doc.setFontSize(9);
  doc.text(`Employé: ${data.employeeName}`, 8, y); y += 5;
  doc.text(`Période: ${data.month}`, 8, y); y += 5;
  doc.text(`Montant: ${formatMoney(data.amount, "USD", 1)}`, 8, y); y += 5;
  doc.text(`Mode: ${data.paymentMethod}`, 8, y); y += 5;
  if (data.note) { doc.text(`Note: ${data.note}`, 8, y); y += 5; }
  doc.text(`Confirmation: ${data.confirmationUrl}`, 8, y, { maxWidth: 74 });
  doc.save(`salaire-${data.employeeName.toLowerCase().replace(/[^a-z0-9]+/g, "-")}.pdf`);
}

export function downloadSupplierPurchasesReportPdf(data: SupplierReportPdfData) {
  const doc = new jsPDF({ unit: "mm", format: [90, 220] });
  const w = 90;
  let y = 10;

  doc.setFont("helvetica", "bold");
  doc.setFontSize(13);
  doc.text("RAPPORT ACHATS FOURNISSEUR", w / 2, y, { align: "center" });
  y += 6;
  doc.setFont("helvetica", "normal");
  doc.setFontSize(9);
  doc.text(`Fournisseur: ${data.supplierName}`, 8, y); y += 5;
  doc.text(`Période: ${data.from} → ${data.to}`, 8, y); y += 5;

  autoTable(doc, {
    startY: y,
    head: [["Code", "Date", "Statut", "Total"]],
    body: data.purchases.map((p) => [p.code, new Date(p.created_at).toLocaleDateString("fr-FR"), p.status, formatMoney(p.total_usd, "USD", 1)]),
    styles: { fontSize: 8, cellPadding: 1 },
    headStyles: { fillColor: [11, 30, 63] },
    margin: { left: 5, right: 5 },
    theme: "plain",
  });

  const yAfter = (doc as unknown as { lastAutoTable: { finalY: number } }).lastAutoTable.finalY + 4;
  doc.setFont("helvetica", "bold");
  doc.text(`TOTAL: ${formatMoney(data.total, "USD", 1)}`, 8, yAfter);
  doc.save(`rapport-achats-${data.supplierName.toLowerCase().replace(/[^a-z0-9]+/g, "-")}.pdf`);
}

export function downloadReportPdf(data: ReportPdfData) {
  const doc = new jsPDF({ unit: "mm", format: [100, 220] });
  const w = 100;
  let y = 10;

  doc.setFont("helvetica", "bold");
  doc.setFontSize(13);
  doc.text(data.title.toUpperCase(), w / 2, y, { align: "center" });
  y += 8;
  doc.setFont("helvetica", "normal");
  doc.setFontSize(9);
  data.summary.forEach((item) => {
    doc.text(`${item.label}: ${item.value}`, 8, y); y += 5;
  });

  y += 2;
  data.sections.forEach((section) => {
    doc.setFont("helvetica", "bold");
    doc.text(section.title, 8, y); y += 5;
    doc.setFont("helvetica", "normal");
    section.rows.forEach((row) => {
      doc.text(`${row.label}: ${row.value}`, 10, y); y += 4;
    });
    y += 2;
  });

  doc.save(`${data.title.toLowerCase().replace(/[^a-z0-9]+/g, "-")}.pdf`);
}

function hexToRgbArray(hex: string): [number, number, number] {
  const sanitized = (hex || "#000000").replace("#", "");
  if (sanitized.length === 3) {
    return [
      parseInt(sanitized[0] + sanitized[0], 16),
      parseInt(sanitized[1] + sanitized[1], 16),
      parseInt(sanitized[2] + sanitized[2], 16),
    ];
  }
  const bigint = parseInt(sanitized, 16);
  return [(bigint >> 16) & 255, (bigint >> 8) & 255, bigint & 255];
}

function buildVariables(data: ReceiptData): Record<string, string> {
  return {
    shopName: data.shopName,
    address: data.address,
    phone: data.phone,
    code: data.code,
    customer: data.customer,
    date: new Date().toLocaleString("fr-FR"),
    subtotal: formatMoney(data.subtotal, data.currency, data.rate),
    discount: formatMoney(data.discount, data.currency, data.rate),
    total: formatMoney(data.total, data.currency, data.rate),
    paid: formatMoney(data.paid, data.currency, data.rate),
    credit: formatMoney(data.credit, data.currency, data.rate),
  };
}

function interpolate(text: string, vars: Record<string, string>) {
  return (text || "").replace(/\{\{(\w+)\}\}/g, (_, k) => vars[k] ?? "");
}

function renderCustomTemplate(doc: jsPDF, tpl: CanvasTemplate, data: ReceiptData) {
  const vars = buildVariables(data);
  tpl.elements.forEach((el: CanvasElement) => {
    if (el.type === "rect") {
      const [r, g, b] = hexToRgbArray(el.fill ?? "#EEEEEE");
      doc.setFillColor(r, g, b);
      doc.rect(el.x, el.y, el.w ?? 40, el.h ?? 10, "F");
    } else if (el.type === "line") {
      const [r, g, b] = hexToRgbArray(el.color ?? "#000000");
      doc.setDrawColor(r, g, b);
      doc.setLineWidth(el.strokeWidth ?? 0.4);
      doc.line(el.x, el.y, el.x + (el.w ?? 60), el.y);
    } else if (el.type === "image") {
      if (data.logoDataUrl) {
        try { doc.addImage(data.logoDataUrl, "PNG", el.x, el.y, el.w ?? 30, el.h ?? 15); } catch { /* ignore */ }
      }
    } else if (el.type === "text") {
      const [r, g, b] = hexToRgbArray(el.color ?? "#000000");
      doc.setTextColor(r, g, b);
      doc.setFontSize(el.fontSize ?? 10);
      doc.setFont("helvetica", el.bold ? "bold" : el.italic ? "italic" : "normal");
      const txt = interpolate(el.text ?? "", vars);
      doc.text(txt, el.x, el.y, { align: (el.align ?? "left") as "left" | "center" | "right" });
    } else if (el.type === "items_table") {
      const cols = el.columns ?? ["name", "qty", "unit", "total"];
      const head = cols.map((c) => c === "name" ? "Article" : c === "qty" ? "Qt" : c === "unit" ? "P.U." : "Total");
      const body = data.items.map((it) => cols.map((c) => {
        if (c === "name") return it.name;
        if (c === "qty") return String(it.qty);
        if (c === "unit") return formatMoney(it.unit, data.currency, data.rate);
        return formatMoney(it.total, data.currency, data.rate);
      }));
      autoTable(doc, {
        startY: el.y,
        head: [head],
        body,
        styles: { fontSize: el.fontSize ?? 9, cellPadding: 1 },
        headStyles: { fillColor: hexToRgbArray(el.headerFill ?? "#0B1E3F"), textColor: hexToRgbArray(el.headerColor ?? "#FFFFFF") },
        margin: { left: el.x, right: Math.max(0, tpl.pageWidth - el.x - (el.w ?? tpl.pageWidth - el.x * 2)) },
        theme: "grid",
      });
    }
  });
  // Reset text color for safety
  doc.setTextColor(0, 0, 0);
}

export function buildReceiptDoc(data: ReceiptData): jsPDF {
  const kind: DocumentKind = data.documentType === "Facture" ? "facture" : "recu";
  if (data.template === "custom") {
    const tpl = getCustomTemplate(kind);
    const doc = new jsPDF({ unit: "mm", format: [tpl.pageWidth, tpl.pageHeight] });
    renderCustomTemplate(doc, tpl, data);
    return doc;
  }

  const doc = new jsPDF({ unit: "mm", format: [80, 220] });
  const w = 80;
  const isPro = data.template === "pro";
  let y = 8;

  // Logo (centré en tête du document) — visible à l'impression et au téléchargement.
  let logoH = 0;
  if (data.logoDataUrl) {
    try {
      const fmt = data.logoDataUrl.includes("image/jpeg") || data.logoDataUrl.includes("image/jpg") ? "JPEG" : "PNG";
      const props = doc.getImageProperties(data.logoDataUrl);
      const maxW = 30;
      const maxH = 15;
      const ratio = Math.min(maxW / props.width, maxH / props.height);
      const lw = props.width * ratio;
      const lh = props.height * ratio;
      doc.addImage(data.logoDataUrl, fmt, (w - lw) / 2, y - 3, lw, lh);
      logoH = lh + 2;
      y += logoH;
    } catch { /* logo indisponible */ }
  }

  doc.setFont("helvetica", "bold");
  doc.setFontSize(14);
  if (isPro) {
    doc.setDrawColor(17, 30, 63);
    doc.setLineWidth(0.4);
    doc.roundedRect(3, 4, w - 6, 24 + logoH, 1.5, 1.5);
  }
  doc.text(data.shopName.toUpperCase(), w / 2, y, { align: "center" });
  y += 5;
  doc.setFont("helvetica", "normal");
  doc.setFontSize(8);
  if (data.address) { doc.text(data.address, w / 2, y, { align: "center" }); y += 4; }
  if (data.phone) { doc.text(`Tél: ${data.phone}`, w / 2, y, { align: "center" }); y += 4; }
  y += 2;
  doc.setLineWidth(0.2);
  doc.line(4, y, w - 4, y);
  y += 4;
  doc.setFontSize(9);
  const label = data.documentType ?? "Reçu";
  doc.text(`${label}: ${data.code}`, 4, y); y += 4;
  doc.text(`Date: ${new Date().toLocaleString("fr-FR")}`, 4, y); y += 4;
  doc.text(`Client: ${data.customer}`, 4, y); y += 4;

  autoTable(doc, {
    startY: y + 1,
    head: [["Article", "Qt", "P.U.", "Total"]],
    body: data.items.map((it) => [it.name, String(it.qty), formatMoney(it.unit, data.currency, data.rate), formatMoney(it.total, data.currency, data.rate)]),
    styles: { fontSize: 7, cellPadding: 1 },
    headStyles: { fillColor: [11, 30, 63] },
    margin: { left: 3, right: 3 },
    theme: "plain",
  });
  const yAfter = (doc as unknown as { lastAutoTable: { finalY: number } }).lastAutoTable.finalY + 4;
  let y2 = yAfter;

  const line = (lbl: string, val: string, bold = false) => {
    doc.setFont("helvetica", bold ? "bold" : "normal");
    doc.setFontSize(bold ? 10 : 8);
    doc.text(lbl, 4, y2);
    doc.text(val, w - 4, y2, { align: "right" });
    y2 += bold ? 5 : 4;
  };
  line("Sous-total", formatMoney(data.subtotal, data.currency, data.rate));
  if (data.discount > 0) line("Remise", "-" + formatMoney(data.discount, data.currency, data.rate));
  line("TOTAL", formatMoney(data.total, data.currency, data.rate), true);
  line("Payé", formatMoney(data.paid, data.currency, data.rate));
  if (data.credit > 0) line("Crédit", formatMoney(data.credit, data.currency, data.rate));
  y2 += 4;
  doc.setFontSize(8);
  doc.text("Merci de votre confiance.", w / 2, y2, { align: "center" });
  return doc;
}

export function downloadReceipt(data: ReceiptData) {
  const kind: DocumentKind = data.documentType === "Facture" ? "facture" : "recu";
  const doc = buildReceiptDoc(data);
  const prefix = kind === "facture" ? "facture" : "recu";
  doc.save(`${prefix}-${data.code}.pdf`);
}

/** Build a jsPDF for a given custom template — used by the live editor preview. */
export function buildCustomTemplatePreviewDoc(template: CanvasTemplate, data: ReceiptData): jsPDF {
  const doc = new jsPDF({ unit: "mm", format: [template.pageWidth, template.pageHeight] });
  renderCustomTemplate(doc, template, data);
  return doc;
}
