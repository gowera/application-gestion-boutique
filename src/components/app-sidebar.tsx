import { Link, useRouterState } from "@tanstack/react-router";
import {
  LayoutDashboard,
  Package,
  ShoppingCart,
  Receipt,
  Users,
  Wallet,
  Settings as SettingsIcon,
  Inbox,
  UserCog,
  Zap,
} from "lucide-react";
import {
  Sidebar,
  SidebarContent,
  SidebarGroup,
  SidebarGroupContent,
  SidebarGroupLabel,
  SidebarHeader,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
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
      { title: "Ventes", url: "/admin/sales", icon: Receipt },
      { title: "Clients & crédits", url: "/admin/customers", icon: Users },
      { title: "Demandes de devis", url: "/admin/messages", icon: Inbox },
    ],
  },
  {
    label: "Stock",
    items: [{ title: "Produits & stock", url: "/admin/products", icon: Package }],
  },
  {
    label: "Finance",
    items: [{ title: "Dépenses", url: "/admin/expenses", icon: Wallet }],
  },
  {
    label: "Configuration",
    items: [
      { title: "Employés & rôles", url: "/admin/users", icon: UserCog },
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
          <div className="flex h-9 w-9 items-center justify-center rounded-md bg-sidebar-primary text-sidebar-primary-foreground">
            <Zap className="h-5 w-5" />
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
