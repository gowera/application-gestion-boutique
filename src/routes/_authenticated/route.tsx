import { createFileRoute, Outlet, redirect, useRouterState, Link } from "@tanstack/react-router";
import { supabase } from "@/integrations/supabase/client";
import { SidebarProvider, SidebarTrigger, SidebarInset } from "@/components/ui/sidebar";
import { AppSidebar } from "@/components/app-sidebar";
import { UserMenu } from "@/components/user-menu";
import { NotificationsCenter } from "@/components/admin/notifications-center";
import { SyncStatus } from "@/components/admin/sync-status";
import { useAllowedMenus, STAFF_ROLES } from "@/lib/permissions";
import { Button } from "@/components/ui/button";

export const Route = createFileRoute("/_authenticated")({
  ssr: false,
  beforeLoad: async () => {
    const { data, error } = await supabase.auth.getUser();
    if (error || !data.user) throw redirect({ to: "/auth" });
    const { data: roles } = await supabase.from("user_roles").select("role").eq("user_id", data.user.id);
    const list = (roles ?? []).map((r) => r.role as string);
    const isStaff = list.some((r) => (STAFF_ROLES as string[]).includes(r));
    if (!isStaff) {
      await supabase.rpc("log_auth_event", {
        _action: "auth.denied",
        _metadata: { path: typeof window !== "undefined" ? window.location.pathname : null, roles: list },
      }).then(() => {}, () => {});
      throw redirect({ to: "/mon-compte" });
    }
    return { user: data.user };
  },
  component: AuthenticatedLayout,
});

function AccessDenied() {
  return (
    <div className="mx-auto max-w-md py-16 text-center">
      <h1 className="text-display text-xl font-semibold">Accès non autorisé</h1>
      <p className="mt-2 text-sm text-muted-foreground">
        Votre rôle ne donne pas accès à cette section. Contactez un administrateur.
      </p>
      <Button asChild className="mt-6"><Link to="/admin">Retour au tableau de bord</Link></Button>
    </div>
  );
}

function Guarded() {
  const pathname = useRouterState({ select: (s) => s.location.pathname });
  const { allowed, isLoading } = useAllowedMenus();
  if (isLoading) return <Outlet />;
  const match = allowed.some((k) => (k === "/admin" ? pathname === "/admin" : pathname === k || pathname.startsWith(k + "/")));
  if (!match) return <AccessDenied />;
  return <Outlet />;
}

function AuthenticatedLayout() {
  return (
    <SidebarProvider>
      <AppSidebar />
      <SidebarInset>
        <header className="sticky top-0 z-30 flex h-14 items-center gap-3 border-b bg-background/95 px-4 backdrop-blur">
          <SidebarTrigger />
          <div className="text-display text-sm font-semibold text-primary">CONETEC · Administration</div>
          <div className="ml-auto flex items-center gap-2">
            <SyncStatus />
            <NotificationsCenter />
            <UserMenu />
          </div>
        </header>
        <main className="flex-1 p-4 md:p-6"><Guarded /></main>
      </SidebarInset>
    </SidebarProvider>
  );
}
