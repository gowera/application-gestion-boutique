import { QueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";

export type NotificationType = "info" | "success" | "warning" | "error";

export async function createNotification(payload: {
  title: string;
  message: string;
  type?: NotificationType;
  entity_type?: string;
  entity_id?: string | null;
}) {
  const { error } = await supabase.from("notifications").insert({
    title: payload.title,
    message: payload.message,
    type: payload.type ?? "info",
    entity_type: payload.entity_type ?? null,
    entity_id: payload.entity_id ?? null,
  });
  if (error) throw error;
}

export async function createNotificationAndInvalidate(
  qc: QueryClient,
  payload: { title: string; message: string; type?: NotificationType; entity_type?: string; entity_id?: string | null },
) {
  await createNotification(payload);
  await qc.invalidateQueries({ queryKey: ["notifications"] });
}
