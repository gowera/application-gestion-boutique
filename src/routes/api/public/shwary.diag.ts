import { createFileRoute } from "@tanstack/react-router";

export const Route = createFileRoute("/api/public/shwary/diag")({
  server: {
    handlers: {
      GET: async () => {
        const { loadCreds, syncCredsToDb } = await import("@/lib/shwary.server");
        const synced = await syncCredsToDb();
        const creds = await loadCreds();
        return Response.json({ synced, configured: Boolean(creds), sandbox: creds?.sandbox ?? null });
      },
    },
  },
} as never);
