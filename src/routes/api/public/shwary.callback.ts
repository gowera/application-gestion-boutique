import { createFileRoute } from "@tanstack/react-router";

export const Route = createFileRoute("/api/public/shwary/callback")({
  server: {
    handlers: {
      POST: async ({ request }: { request: Request }) => {
        try {
          const body = (await request.json()) as {
            id?: string;
            status?: string;
            failureReason?: string | null;
            txHash?: string | null;
          };
          if (!body?.id || !body?.status) {
            return new Response("bad request", { status: 400 });
          }
          const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
          const update: Record<string, unknown> = {
            payment_status: body.status,
          };
          if (body.status === "completed") {
            update.paid = true;
            update.status = "confirmed";
          } else if (body.status === "failed" || body.status === "cancelled") {
            update.paid = false;
          }
          const { data: order } = await (supabaseAdmin.from("online_orders") as unknown as {
            update: (u: Record<string, unknown>) => { eq: (c: string, v: string) => { select: (s: string) => { maybeSingle: () => Promise<{ data: { id: string; code: string; customer_name: string } | null }> } } };
          })
            .update(update)
            .eq("payment_ref", body.id)
            .select("id, code, customer_name")
            .maybeSingle();


          if (order && body.status === "completed") {
            await supabaseAdmin.from("notifications").insert({
              title: "Paiement reçu",
              message: `Commande ${order.code} payée par ${order.customer_name} (Shwary).`,
              type: "success",
              entity_type: "online_order",
              entity_id: order.id,
            });
          } else if (order && (body.status === "failed" || body.status === "cancelled")) {
            await supabaseAdmin.from("notifications").insert({
              title: "Paiement échoué",
              message: `Commande ${order.code} — ${body.failureReason ?? body.status}.`,
              type: "warning",
              entity_type: "online_order",
              entity_id: order.id,
            });
          }
          return new Response("ok");
        } catch (err) {
          console.error("[shwary callback]", err);
          return new Response("error", { status: 500 });
        }
      },
    },
  },
} as never);
