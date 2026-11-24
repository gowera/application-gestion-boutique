import { useNavigate } from "@tanstack/react-router";
import { useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useCurrentUser, useMyRoles } from "@/hooks/use-auth";
import { Button } from "@/components/ui/button";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuLabel, DropdownMenuSeparator, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";
import { LogOut, User } from "lucide-react";
import { clearOfflineUnlocked } from "@/lib/offline/auth";

export function UserMenu() {
  const { user } = useCurrentUser();
  const { data: roles } = useMyRoles();
  const navigate = useNavigate();
  const qc = useQueryClient();

  async function signOut() {
    const desktop = typeof window !== "undefined" && Boolean(window.conetecDesktop);
    if (!desktop) {
      await supabase.rpc("log_auth_event", { _action: "auth.signout", _metadata: {} }).then(() => {}, () => {});
    }
    await qc.cancelQueries();
    qc.clear();
    clearOfflineUnlocked();
    if (!desktop && navigator.onLine) await supabase.auth.signOut();
    navigate({ to: "/auth", replace: true });
  }

  if (!user) return null;
  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button variant="ghost" size="sm" className="gap-2">
          <div className="flex h-7 w-7 items-center justify-center rounded-full bg-primary text-primary-foreground text-xs font-semibold">
            {(user.email ?? "?").slice(0, 1).toUpperCase()}
          </div>
          <span className="hidden md:inline text-sm">{user.email}</span>
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="w-56">
        <DropdownMenuLabel className="flex flex-col">
          <span className="truncate">{user.email}</span>
          <span className="text-xs font-normal text-muted-foreground">
            {roles && roles.length ? roles.join(", ") : "Sans rôle"}
          </span>
        </DropdownMenuLabel>
        <DropdownMenuSeparator />
        <DropdownMenuItem disabled><User className="mr-2 h-4 w-4" />Mon profil</DropdownMenuItem>
        <DropdownMenuItem onClick={signOut}><LogOut className="mr-2 h-4 w-4" />Se déconnecter</DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
