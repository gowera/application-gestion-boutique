import { supabase } from "@/integrations/supabase/client";

// Thin compatibility shim: some legacy code imports helpers that were meant
// for a "local mode" alternative to Supabase. We route them straight to
// Supabase so pages keep compiling and working.
export async function listAdminData<T = Record<string, unknown>>(table: string): Promise<T[]> {
  // @ts-expect-error dynamic table name for shim
  const { data } = await supabase.from(table).select("*");
  return (data ?? []) as T[];
}

export function useLocalModeEnabled(): boolean {
  return false;
}

export async function setAdminSettings(payload: Record<string, unknown>): Promise<void> {
  // @ts-expect-error dynamic settings row
  const { error } = await supabase.from("settings").update(payload).eq("id", 1);
  if (error) throw error;
}
