import { useMemo } from "react";
import type { Database } from "@/integrations/supabase/types";
import { useMyRoles } from "@/hooks/use-auth";
import { useSettings } from "@/lib/currency";

export type AppRole = Database["public"]["Enums"]["app_role"];

/** Rôles ayant potentiellement accès au tableau de bord (le client n'en fait pas partie). */
export const STAFF_ROLES: AppRole[] = [
  "admin", "manager", "caissier", "vendeur", "comptable", "technicien", "livreur",
];

export const ROLE_LABELS: Record<AppRole, string> = {
  admin: "Administrateur",
  manager: "Manager",
  caissier: "Caissier",
  vendeur: "Vendeur",
  comptable: "Comptable",
  technicien: "Technicien",
  livreur: "Livreur",
  client: "Client",
};

/** Toutes les entrées de menu de l'administration (clé = URL). */
export const MENU_ITEMS: { key: string; label: string; group: string }[] = [
  { key: "/admin", label: "Tableau de bord", group: "Pilotage" },
  { key: "/admin/pos", label: "Vente directe (POS)", group: "Pilotage" },
  { key: "/admin/orders", label: "Commandes en ligne", group: "Commercial" },
  { key: "/admin/sales", label: "Ventes", group: "Commercial" },
  { key: "/admin/documents", label: "Documents", group: "Commercial" },
  { key: "/admin/customers", label: "Clients & crédits", group: "Commercial" },
  { key: "/admin/interventions", label: "Interventions & SAV", group: "Commercial" },
  { key: "/admin/messages", label: "Devis & messages", group: "Commercial" },
  { key: "/admin/products", label: "Produits & stock", group: "Stock & achats" },
  { key: "/admin/stock", label: "Traçabilité stock", group: "Stock & achats" },
  { key: "/admin/categories", label: "Catégories", group: "Stock & achats" },
  { key: "/admin/purchases", label: "Achats & fournisseurs", group: "Stock & achats" },
  { key: "/admin/expenses", label: "Dépenses", group: "Finance & RH" },
  { key: "/admin/rent", label: "Loyer", group: "Finance & RH" },
  { key: "/admin/employees", label: "Employés & salaires", group: "Finance & RH" },
  { key: "/admin/reports", label: "Rapports de caisse", group: "Finance & RH" },
  { key: "/admin/team", label: "Espace équipe", group: "Configuration" },
  { key: "/admin/users", label: "Rôles utilisateurs", group: "Configuration" },
  { key: "/admin/settings", label: "Paramètres", group: "Configuration" },
  { key: "/admin/history", label: "Historique & audit", group: "Configuration" },
  { key: "/admin/sync", label: "Synchronisation", group: "Configuration" },
];

export const ALL_MENU_KEYS = MENU_ITEMS.map((m) => m.key);

/** Permissions par défaut (modifiables dans Paramètres → Accès & rôles). */
export const DEFAULT_ROLE_MENUS: Record<AppRole, string[]> = {
  admin: ALL_MENU_KEYS,
  manager: ALL_MENU_KEYS.filter((k) => k !== "/admin/users" && k !== "/admin/history"),
  caissier: ["/admin", "/admin/sync", "/admin/pos", "/admin/sales", "/admin/documents", "/admin/customers", "/admin/orders", "/admin/reports"],
  vendeur: ["/admin", "/admin/sync", "/admin/pos", "/admin/orders", "/admin/sales", "/admin/customers", "/admin/products", "/admin/messages"],
  comptable: ["/admin", "/admin/sync", "/admin/sales", "/admin/documents", "/admin/expenses", "/admin/rent", "/admin/employees", "/admin/purchases", "/admin/reports"],
  technicien: ["/admin", "/admin/sync", "/admin/interventions", "/admin/messages", "/admin/products"],
  livreur: ["/admin", "/admin/sync", "/admin/orders"],
  client: [],
};

export function menusForRoles(
  roles: AppRole[],
  overrides?: Partial<Record<AppRole, string[]>> | null,
): string[] {
  const allowed = new Set<string>();
  for (const role of roles) {
    const list = overrides?.[role] ?? DEFAULT_ROLE_MENUS[role] ?? [];
    for (const k of list) allowed.add(k);
  }
  return ALL_MENU_KEYS.filter((k) => allowed.has(k));
}

export function readOverrides(settings: unknown): Partial<Record<AppRole, string[]>> {
  const extras = (settings as { extras?: Record<string, unknown> } | null)?.extras;
  const raw = extras && typeof extras === "object" ? (extras as Record<string, unknown>)["role_menus"] : null;
  if (!raw || typeof raw !== "object") return {};
  const out: Partial<Record<AppRole, string[]>> = {};
  for (const [role, value] of Object.entries(raw as Record<string, unknown>)) {
    if (Array.isArray(value)) out[role as AppRole] = value.filter((v): v is string => typeof v === "string");
  }
  return out;
}

/** Menus autorisés pour l'utilisateur courant. */
export function useAllowedMenus() {
  const { data: roles, isLoading } = useMyRoles();
  const { data: settings } = useSettings();
  const overrides = useMemo(() => readOverrides(settings), [settings]);
  const list = useMemo(() => menusForRoles(roles ?? [], overrides), [roles, overrides]);
  const isStaff = (roles ?? []).some((r) => STAFF_ROLES.includes(r));
  return { allowed: list, isStaff, roles: roles ?? [], isLoading };
}
