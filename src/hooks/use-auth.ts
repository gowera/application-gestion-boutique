import { useMemo } from "react";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import type { Database } from "@/integrations/supabase/types";

export type AppRole = Database["public"]["Enums"]["app_role"];

export function useSession() {
  return useQuery({
    queryKey: ["auth", "session"],
    queryFn: async () => {
      const { data } = await supabase.auth.getSession();
      return data.session;
    },
    staleTime: 60_000,
  });
}

export function useCurrentUser() {
  const { data: session, isLoading } = useSession();
  return { user: session?.user ?? null, isLoading };
}

export function useMyRoles() {
  const { user } = useCurrentUser();
  return useQuery({
    queryKey: ["auth", "roles", user?.id],
    enabled: !!user,
    queryFn: async () => {
      const { data, error } = await supabase.from("user_roles").select("role").eq("user_id", user!.id);
      if (error) throw error;
      return (data ?? []).map((r) => r.role as AppRole);
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
