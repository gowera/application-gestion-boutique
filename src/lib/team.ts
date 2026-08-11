import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";

export interface TeamMember {
  id: string;
  name: string;
  role: string;
  bio: string | null;
  photo_url: string | null;
  cv_url: string | null;
  email: string | null;
  phone: string | null;
  sort_order: number;
  is_published: boolean;
  website_url?: string | null;
  linkedin_url?: string | null;
  facebook_url?: string | null;
  instagram_url?: string | null;
  youtube_url?: string | null;
  x_url?: string | null;
}


export type TeamMemberInput = Omit<TeamMember, "id"> & { id?: string };

/** Membres publiés, pour le site public. */
export function usePublicTeam() {
  return useQuery({
    queryKey: ["team-public"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("team_members")
        .select("*")
        .eq("is_published", true)
        .order("sort_order", { ascending: true })
        .order("created_at", { ascending: true });
      if (error) throw error;
      return (data ?? []) as TeamMember[];
    },
  });
}

/** Tous les membres, pour l'administration. */
export function useAdminTeam() {
  return useQuery({
    queryKey: ["team-admin"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("team_members")
        .select("*")
        .order("sort_order", { ascending: true })
        .order("created_at", { ascending: true });
      if (error) throw error;
      return (data ?? []) as TeamMember[];
    },
  });
}

export function useSaveTeamMember() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (input: TeamMemberInput) => {
      const payload = {
        name: input.name,
        role: input.role,
        bio: input.bio,
        photo_url: input.photo_url,
        cv_url: input.cv_url,
        email: input.email,
        phone: input.phone,
        sort_order: input.sort_order,
        is_published: input.is_published,
        website_url: input.website_url ?? null,
        linkedin_url: input.linkedin_url ?? null,
        facebook_url: input.facebook_url ?? null,
        instagram_url: input.instagram_url ?? null,
        youtube_url: input.youtube_url ?? null,
        x_url: input.x_url ?? null,
      };
      const res = input.id
        ? await supabase.from("team_members").update(payload).eq("id", input.id)
        : await supabase.from("team_members").insert(payload);
      if (res.error) throw res.error;
    },

    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["team-admin"] });
      qc.invalidateQueries({ queryKey: ["team-public"] });
    },
  });
}

export function useDeleteTeamMember() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from("team_members").delete().eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["team-admin"] });
      qc.invalidateQueries({ queryKey: ["team-public"] });
    },
  });
}

/** Upload d'une photo ou d'un CV dans le bucket partagé. */
export async function uploadTeamFile(file: File, kind: "photo" | "cv"): Promise<string> {
  const ext = file.name.split(".").pop() || (kind === "photo" ? "jpg" : "pdf");
  const path = `team/${kind}-${Date.now()}-${Math.random().toString(36).slice(2, 8)}.${ext}`;
  const { error } = await supabase.storage
    .from("product-images")
    .upload(path, file, { upsert: true, contentType: file.type || undefined });
  if (error) throw error;
  return supabase.storage.from("product-images").getPublicUrl(path).data.publicUrl;
}
