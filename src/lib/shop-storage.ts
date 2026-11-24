import { supabase } from "@/integrations/supabase/client";

/** Storage paths must start with the caller's shop id (enforced by access rules). */
export async function shopStoragePath(rest: string): Promise<string> {
  const { data, error } = await supabase.rpc("current_shop_id");
  if (error || !data) throw new Error("Boutique introuvable pour l'envoi du fichier.");
  return `${data}/${rest}`;
}
