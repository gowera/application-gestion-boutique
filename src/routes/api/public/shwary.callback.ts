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
          const { serverClient, rpcSecret } = await import("@/lib/shwary.server");
          const sb = serverClient();
          const { error } = await sb.rpc("shwary_apply_status", {
            _secret: rpcSecret(),
            _order_id: null,
            _ref: body.id,
            _status: body.status,
            _reason: body.failureReason ?? null,
          });
          if (error) throw new Error(error.message);
          return new Response("ok");
        } catch (err) {
          console.error("[shwary callback]", err);
          return new Response("error", { status: 500 });
        }
      },
    },
  },
} as never);
