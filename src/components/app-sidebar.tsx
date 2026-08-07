import { Link, useRouterState } from "@tanstack/react-router";
import {
  LayoutDashboard, Package, ShoppingCart, Receipt, Users, Wallet, Settings as SettingsIcon,
  Inbox, UserCog, Zap, Boxes, Wrench, Home, FolderTree, ChartBar, ShoppingBag, Briefcase, Activity, FileText, Users2,
} from "lucide-react";
import logo from "@/assets/brand/logo.png";
import {
  Sidebar, SidebarContent, SidebarGroup, SidebarGroupContent, SidebarGroupLabel,
  SidebarHeader, SidebarMenu, SidebarMenuButton, SidebarMenuItem, useSidebar,
} from "@/components/ui/sidebar";

const groups: { label: string; items: { title: string; url: string; icon: typeof Zap }[] }[] = [
  {
    label: "Pilotage",
    items: [
      { title: "Tableau de bord", url: "/admin", icon: LayoutDashboard },
      { title: "Vente directe (POS)", url: "/admin/pos", icon: ShoppingCart },
    ],
  },
  {
    label: "Commercial",
    items: [
      { title: "Commandes en ligne", url: "/admin/orders", icon: ShoppingBag },
      { title: "Ventes", url: "/admin/sales", icon: Receipt },
      { title: "Documents", url: "/admin/documents", icon: FileText },
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
      { title: "Achats & fournisseurs", url: "/admin/purchases", icon: Boxes },
    ],
  },
  {
    label: "Finance & RH",
    items: [
      { title: "Dépenses", url: "/admin/expenses", icon: Wallet },
      { title: "Loyer", url: "/admin/rent", icon: Home },
      { title: "Employés & salaires", url: "/admin/employees", icon: Briefcase },
      { title: "Rapports de caisse", url: "/admin/reports", icon: ChartBar },
    ],
  },
  {
    label: "Configuration",
    items: [
      { title: "Espace équipe", url: "/admin/team", icon: Users2 },
      { title: "Rôles utilisateurs", url: "/admin/users", icon: UserCog },
      { title: "Paramètres", url: "/admin/settings", icon: SettingsIcon },
    ],
  },
];

export function AppSidebar() {
  const pathname = useRouterState({ select: (s) => s.location.pathname });
  const { isMobile, setOpenMobile } = useSidebar();
  const closeOnMobile = () => { if (isMobile) setOpenMobile(false); };
  const isActive = (url: string) =>
    url === "/admin" ? pathname === "/admin" : pathname === url || pathname.startsWith(url + "/");

  return (
    <Sidebar collapsible="icon">
      <SidebarHeader className="border-b border-sidebar-border/50">
        <Link to="/admin" onClick={closeOnMobile} className="flex items-center gap-2 px-2 py-3">
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
                      <Link to={item.url} onClick={closeOnMobile}>
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
