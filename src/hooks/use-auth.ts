import { useMemo } from "react";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import type { Database } from "@/integrations/supabase/types";
import { getOfflineProfile } from "@/lib/offline/auth";

export type AppRole = Database["public"]["Enums"]["app_role"];

export function useSession() {
  return useQuery({
    queryKey: ["auth", "session"],
    queryFn: async () => {
      if (typeof window !== "undefined" && window.conetecDesktop && await window.conetecDesktop.isLocalOnly()) return null;
      const { data } = await supabase.auth.getSession();
      return data.session;
    },
    staleTime: 60_000,
  });
}

export function useCurrentUser() {
  const { data: session, isLoading } = useSession();
  const offline = typeof window !== "undefined" ? getOfflineProfile() : null;
  const localUser = offline ? { id: offline.userId, email: offline.email } : null;
  return { user: localUser ?? session?.user ?? null, isLoading };
}

export function useMyRoles() {
  const { user } = useCurrentUser();
  return useQuery({
    queryKey: ["auth", "roles", user?.id],
    enabled: !!user,
    queryFn: async () => {
      if (!user) return [];
      const offline = getOfflineProfile();
      if (typeof window !== "undefined" && window.conetecDesktop && await window.conetecDesktop.isLocalOnly()) {
        return offline?.userId === user.id ? offline.roles as AppRole[] : [];
      }
      if (!navigator.onLine && offline?.userId === user.id) return offline.roles as AppRole[];
      const cacheKey = `conetec:roles:${user.id}`;
      try {
        const { data, error } = await supabase.from("user_roles").select("role").eq("user_id", user.id);
        if (error) throw error;
        const roles = (data ?? []).map((r) => r.role as AppRole);
        localStorage.setItem(cacheKey, JSON.stringify(roles));
        return roles;
      } catch (error) {
        try {
          const cached = JSON.parse(localStorage.getItem(cacheKey) ?? "[]");
          if (Array.isArray(cached)) return cached as AppRole[];
        } catch {
          // Sans cache local, l'erreur réseau d'origine reste la plus utile.
        }
        throw error;
      }
    },
    staleTime: 60_000,
  });
}

export function useHasRole(roles: AppRole | AppRole[]) {
  const { data } = useMyRoles();
  return useMemo(() => {
    const wanted = Array.isArray(roles) ? roles : [roles];
    return (data ?? []).some((r) => wanted.includes(r));
  }, [data, roles]);
}
