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
      const align = (el.align ?? "left") as "left" | "center" | "right";
      // Retour à la ligne automatique : indispensable sur les tickets étroits (58 mm).
      const avail = align === "left" ? tpl.pageWidth - el.x - 2 : align === "right" ? el.x - 2 : Math.min(el.x, tpl.pageWidth - el.x) * 2 - 2;
      const lines = doc.splitTextToSize(txt, Math.max(10, avail));
      doc.text(lines, el.x, el.y, { align });
    } else if (el.type === "items_table") {
      const cols = el.columns ?? ["name", "qty", "unit", "total"];
      const head = cols.map((c) => c === "name" ? "Article" : c === "qty" ? "Qt" : c === "unit" ? "P.U." : "Total");
      const body = data.items.map((it) => cols.map((c) => {
        if (c === "name") return it.name;
        if (c === "qty") return String(it.qty);
        if (c === "unit") return formatMoney(it.unit, data.currency, data.rate);
        return formatMoney(it.total, data.currency, data.rate);
      }));
      const tableW = el.w ?? tpl.pageWidth - el.x * 2;
      const narrow = tpl.pageWidth <= 80;
      autoTable(doc, {
        startY: el.y,
        head: [head],
        body,
        styles: { fontSize: el.fontSize ?? 9, cellPadding: narrow ? { top: 1, bottom: 1, left: 0.6, right: 0.6 } : 1, overflow: "linebreak", textColor: [0, 0, 0] },
        headStyles: { fillColor: hexToRgbArray(el.headerFill ?? "#0B1E3F"), textColor: hexToRgbArray(el.headerColor ?? "#FFFFFF"), fontStyle: "bold" },
        columnStyles: cols.length === 4
          ? { 0: { cellWidth: tableW * 0.42 }, 1: { cellWidth: tableW * 0.12, halign: "center" }, 2: { cellWidth: tableW * 0.23, halign: "right" }, 3: { cellWidth: "auto", halign: "right" } }
          : {},
        margin: { left: el.x, right: Math.max(0, tpl.pageWidth - el.x - tableW) },
        theme: narrow ? "plain" : "grid",
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

  // Reçu = ticket 58 mm (petites imprimantes portables), Facture = ticket 80 mm.
  const isTicket58 = kind === "recu";
  const w = isTicket58 ? 58 : 80;
  const margin = isTicket58 ? 3 : 4;
  // Hauteur estimée pour éviter toute coupure du contenu.
  const pageHeight = Math.max(120, 90 + data.items.length * (isTicket58 ? 9 : 7));
  const doc = new jsPDF({ unit: "mm", format: [w, pageHeight] });
  const isPro = data.template === "pro";
  // Tailles augmentées : lisibilité à l'impression thermique.
  const fs = { title: isTicket58 ? 12 : 14, meta: isTicket58 ? 8 : 8, body: isTicket58 ? 9 : 9, table: isTicket58 ? 8.5 : 8, total: isTicket58 ? 11 : 10 };
  let y = 8;

  // Logo (centré en tête du document) — visible à l'impression et au téléchargement.
  let logoH = 0;
  if (data.logoDataUrl) {
    try {
      const fmt = data.logoDataUrl.includes("image/jpeg") || data.logoDataUrl.includes("image/jpg") ? "JPEG" : "PNG";
      const props = doc.getImageProperties(data.logoDataUrl);
      const maxW = isTicket58 ? 24 : 30;
      const maxH = isTicket58 ? 12 : 15;
      const ratio = Math.min(maxW / props.width, maxH / props.height);
      const lw = props.width * ratio;
      const lh = props.height * ratio;
      doc.addImage(data.logoDataUrl, fmt, (w - lw) / 2, y - 3, lw, lh);
      logoH = lh + 2;
      y += logoH;
    } catch { /* logo indisponible */ }
  }

  doc.setFont("helvetica", "bold");
  doc.setFontSize(fs.title);
  if (isPro) {
    doc.setDrawColor(17, 30, 63);
    doc.setLineWidth(0.4);
    doc.roundedRect(2, 4, w - 4, 24 + logoH, 1.5, 1.5);
  }
  doc.text(doc.splitTextToSize(data.shopName.toUpperCase(), w - margin * 2), w / 2, y, { align: "center" });
  y += 5;
  doc.setFont("helvetica", "normal");
  doc.setFontSize(fs.meta);
  if (data.address) {
    const lines = doc.splitTextToSize(data.address, w - margin * 2) as string[];
    doc.text(lines, w / 2, y, { align: "center" });
    y += 3.6 * lines.length;
  }
  if (data.phone) { doc.text(`Tél: ${data.phone}`, w / 2, y, { align: "center" }); y += 4; }
  y += 2;
  doc.setLineWidth(0.2);
  doc.line(margin, y, w - margin, y);
  y += 4.5;
  doc.setFontSize(fs.body);
  doc.setFont("helvetica", "bold");
  const label = data.documentType ?? "Reçu";
  doc.text(`${label}: ${data.code}`, margin, y); y += 4.5;
  doc.setFont("helvetica", "normal");
  doc.text(`Date: ${new Date().toLocaleString("fr-FR")}`, margin, y); y += 4.5;
  doc.text(doc.splitTextToSize(`Client: ${data.customer}`, w - margin * 2), margin, y);
  y += 4.5;

  const tableWidth = w - margin * 2;
  autoTable(doc, {
    startY: y + 1,
    head: [["Article", "Qt", "P.U.", "Total"]],
    body: data.items.map((it) => [it.name, String(it.qty), formatMoney(it.unit, data.currency, data.rate), formatMoney(it.total, data.currency, data.rate)]),
    styles: { fontSize: fs.table, cellPadding: { top: 1, bottom: 1, left: 0.6, right: 0.6 }, overflow: "linebreak", lineColor: [180, 180, 180], textColor: [0, 0, 0] },
    headStyles: { fillColor: [11, 30, 63], textColor: [255, 255, 255], fontSize: fs.table, fontStyle: "bold" },
    columnStyles: {
      0: { cellWidth: tableWidth * (isTicket58 ? 0.42 : 0.45) },
      1: { cellWidth: tableWidth * 0.12, halign: "center" },
      2: { cellWidth: tableWidth * (isTicket58 ? 0.23 : 0.21), halign: "right" },
      3: { cellWidth: "auto", halign: "right" },
    },
    margin: { left: margin, right: margin },
    theme: "plain",
  });
  const yAfter = (doc as unknown as { lastAutoTable: { finalY: number } }).lastAutoTable.finalY + 4;
  let y2 = yAfter;

  const line = (lbl: string, val: string, bold = false) => {
    doc.setFont("helvetica", bold ? "bold" : "normal");
    doc.setFontSize(bold ? fs.total : fs.body);
    doc.text(lbl, margin, y2);
    doc.text(val, w - margin, y2, { align: "right" });
    y2 += bold ? 6 : 4.6;
  };
  line("Sous-total", formatMoney(data.subtotal, data.currency, data.rate));
  if (data.discount > 0) line("Remise", "-" + formatMoney(data.discount, data.currency, data.rate));
  line("TOTAL", formatMoney(data.total, data.currency, data.rate), true);
  line("Payé", formatMoney(data.paid, data.currency, data.rate));
  if (data.credit > 0) line("Crédit", formatMoney(data.credit, data.currency, data.rate));
  if (data.note) {
    y2 += 2;
    doc.setFont("helvetica", "normal");
    doc.setFontSize(fs.meta);
    doc.text(doc.splitTextToSize(data.note, w - margin * 2), margin, y2);
    y2 += 4;
  }
  y2 += 4;
  doc.setFontSize(fs.meta);
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
