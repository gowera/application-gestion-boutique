/**
 * Statuts de commandes en ligne pris en compte dans les calculs financiers.
 * Les commandes "pending", "cancelled" et "refunded" sont exclues afin
 * d'éviter de fausser les totaux avant confirmation.
 */
export const COUNTED_ORDER_STATUSES = ["confirmed", "preparing", "shipping", "delivered"] as const;

export function isCountedOrder(status?: string | null): boolean {
  return !!status && (COUNTED_ORDER_STATUSES as readonly string[]).includes(status);
}
