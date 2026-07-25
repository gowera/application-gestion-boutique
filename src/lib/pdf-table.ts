import jsPDF from "jspdf";
import autoTable from "jspdf-autotable";

export interface TablePdfOptions {
  filename?: string;
  title: string;
  subtitle?: string;
  columns: string[];
  rows: (string | number)[][];
  footer?: string[];
  orientation?: "p" | "l";
}

export function downloadTablePdf(opts: TablePdfOptions) {
  const doc = new jsPDF({ unit: "mm", format: "a4", orientation: opts.orientation ?? "p" });
  doc.setFont("helvetica", "bold");
  doc.setFontSize(14);
  doc.text(opts.title, 14, 15);
  if (opts.subtitle) {
    doc.setFont("helvetica", "normal");
    doc.setFontSize(9);
    doc.setTextColor(90);
    doc.text(opts.subtitle, 14, 21);
    doc.setTextColor(0);
  }
  autoTable(doc, {
    startY: opts.subtitle ? 25 : 20,
    head: [opts.columns],
    body: opts.rows.map((r) => r.map((c) => (c == null ? "" : String(c)))),
    headStyles: { fillColor: [11, 30, 63] },
    styles: { fontSize: 9, cellPadding: 2 },
    margin: { left: 10, right: 10 },
  });
  if (opts.footer && opts.footer.length) {
    const y = (doc as unknown as { lastAutoTable: { finalY: number } }).lastAutoTable.finalY + 6;
    doc.setFont("helvetica", "bold");
    doc.setFontSize(10);
    opts.footer.forEach((line, i) => doc.text(line, 14, y + i * 5));
  }
  doc.save(opts.filename ?? `${opts.title.toLowerCase().replace(/\s+/g, "-")}.pdf`);
}
