import { createFileRoute } from "@tanstack/react-router";

export const Route = createFileRoute("/api/public/shwary/diag")({
  server: {
    handlers: {
      GET: async () => {
        const env = (typeof process !== "undefined" ? process.env : {}) as Record<string, string | undefined>;
        const has = (k: string) => Boolean(env[k]);
        return Response.json({
          SUPABASE_URL: has("SUPABASE_URL"),
          SUPABASE_PUBLISHABLE_KEY: has("SUPABASE_PUBLISHABLE_KEY"),
          SUPABASE_SERVICE_ROLE_KEY: has("SUPABASE_SERVICE_ROLE_KEY"),
          SHWARY_RPC_SECRET: has("SHWARY_RPC_SECRET"),
          SHWARY_MERCHANT_ID: has("SHWARY_MERCHANT_ID"),
          SHWARY_MERCHANT_KEY: has("SHWARY_MERCHANT_KEY"),
          SHWARY_SANDBOX: env["SHWARY_SANDBOX"] ?? null,
          keys: Object.keys(env).length,
        });
      },
    },
  },
} as never);
