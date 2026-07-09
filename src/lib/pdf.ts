import jsPDF from "jspdf";
import autoTable from "jspdf-autotable";
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
}

export function downloadReceipt(data: ReceiptData) {
  const doc = new jsPDF({ unit: "mm", format: [80, 200] });
  const w = 80;
  let y = 8;

  doc.setFont("helvetica", "bold");
  doc.setFontSize(14);
  doc.text(data.shopName, w / 2, y, { align: "center" });
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
  doc.text(`Reçu: ${data.code}`, 4, y); y += 4;
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

  const line = (label: string, val: string, bold = false) => {
    doc.setFont("helvetica", bold ? "bold" : "normal");
    doc.setFontSize(bold ? 10 : 8);
    doc.text(label, 4, y2);
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

  doc.save(`recu-${data.code}.pdf`);
}
