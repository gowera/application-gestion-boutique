export function formatDate(d: string | Date | null | undefined, withTime = false): string {
  if (!d) return "—";
  const date = typeof d === "string" ? new Date(d) : d;
  return new Intl.DateTimeFormat("fr-FR", {
    dateStyle: "medium",
    ...(withTime ? { timeStyle: "short" } : {}),
  }).format(date);
}
export function formatNumber(n: number, digits = 0): string {
  return new Intl.NumberFormat("fr-FR", { maximumFractionDigits: digits }).format(n);
}
