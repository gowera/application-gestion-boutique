import { Link, useRouterState } from "@tanstack/react-router";
import {
  LayoutDashboard, Package, ShoppingCart, Receipt, Users, Wallet, Settings as SettingsIcon,
  Inbox, UserCog, Zap, Truck, Boxes, Wrench, Home, FolderTree, ChartBar, ShoppingBag, Briefcase, HandCoins, Banknote, Activity,
} from "lucide-react";
import logo from "@/assets/brand/logo.png";
import {
  Sidebar, SidebarContent, SidebarGroup, SidebarGroupContent, SidebarGroupLabel,
  SidebarHeader, SidebarMenu, SidebarMenuButton, SidebarMenuItem,
} from "@/components/ui/sidebar";

const groups: { label: string; items: { title: string; url: string; icon: typeof Zap }[] }[] = [
  {
    label: "Pilotage",
    items: [
      { title: "Tableau de bord", url: "/admin", icon: LayoutDashboard },
      { title: "Caisse", url: "/admin/caisse", icon: Banknote },
      { title: "Vente directe (POS)", url: "/admin/pos", icon: ShoppingCart },
    ],
  },
  {
    label: "Commercial",
    items: [
      { title: "Commandes en ligne", url: "/admin/orders", icon: ShoppingBag },
      { title: "Ventes", url: "/admin/sales", icon: Receipt },
      { title: "Clients & crédits", url: "/admin/customers", icon: Users },
      { title: "Interventions & SAV", url: "/admin/interventions", icon: Wrench },
      { title: "Devis & messages", url: "/admin/messages", icon: Inbox },
    ],
  },
  {
    label: "Stock & achats",
    items: [
      { title: "Produits & stock", url: "/admin/products", icon: Package },
      { title: "Traçabilité stock", url: "/admin/stock", icon: Activity },
      { title: "Catégories", url: "/admin/categories", icon: FolderTree },
      { title: "Fournisseurs", url: "/admin/suppliers", icon: Truck },
      { title: "Achats", url: "/admin/purchases", icon: Boxes },
    ],
  },
  {
    label: "Finance & RH",
    items: [
      { title: "Dépenses", url: "/admin/expenses", icon: Wallet },
      { title: "Loyer", url: "/admin/rent", icon: Home },
      { title: "Employés", url: "/admin/employees", icon: Briefcase },
      { title: "Salaires", url: "/admin/salaries", icon: HandCoins },
      { title: "Rapports", url: "/admin/reports", icon: ChartBar },
    ],
  },
  {
    label: "Configuration",
    items: [
      { title: "Rôles utilisateurs", url: "/admin/users", icon: UserCog },
      { title: "Paramètres", url: "/admin/settings", icon: SettingsIcon },
    ],
  },
];

export function AppSidebar() {
  const pathname = useRouterState({ select: (s) => s.location.pathname });
  const isActive = (url: string) =>
    url === "/admin" ? pathname === "/admin" : pathname === url || pathname.startsWith(url + "/");

  return (
    <Sidebar collapsible="icon">
      <SidebarHeader className="border-b border-sidebar-border/50">
        <Link to="/admin" className="flex items-center gap-2 px-2 py-3">
          <div className="flex h-9 w-9 items-center justify-center rounded-md bg-white/90 p-1 shadow-sm">
            <img src={logo} alt="CONETEC" className="h-7 w-7 object-contain" />
          </div>
          <div className="flex flex-col leading-tight group-data-[collapsible=icon]:hidden">
            <span className="text-display text-sm font-bold text-sidebar-foreground">CONETEC</span>
            <span className="text-[10px] uppercase tracking-widest text-sidebar-foreground/60">Admin</span>
          </div>
        </Link>
      </SidebarHeader>
      <SidebarContent>
        {groups.map((group) => (
          <SidebarGroup key={group.label}>
            <SidebarGroupLabel>{group.label}</SidebarGroupLabel>
            <SidebarGroupContent>
              <SidebarMenu>
                {group.items.map((item) => (
                  <SidebarMenuItem key={item.url}>
                    <SidebarMenuButton asChild isActive={isActive(item.url)} tooltip={item.title}>
                      <Link to={item.url}>
                        <item.icon />
                        <span>{item.title}</span>
                      </Link>
                    </SidebarMenuButton>
                  </SidebarMenuItem>
                ))}
              </SidebarMenu>
            </SidebarGroupContent>
          </SidebarGroup>
        ))}
      </SidebarContent>
    </Sidebar>
  );
}
