import { createFileRoute } from "@tanstack/react-router";

/**
 * Public Open Graph image proxy for a product.
 * Product images live in a private bucket, so social crawlers cannot read them directly.
 * This route streams the first product image with a public, cacheable response.
 */
export const Route = createFileRoute("/api/public/og/product/$productId")({
  server: {
    handlers: {
      GET: async ({ params }: { params: { productId: string } }) => {
        try {
          const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
          const { data: product } = await supabaseAdmin
            .from("products")
            .select("images")
            .eq("id", params.productId)
            .maybeSingle();

          const first = (product?.images as string[] | null)?.[0];
          if (!first) return new Response("not found", { status: 404 });

          const match = first.match(
            /\/storage\/v1\/object\/(?:public|sign|authenticated)\/([^/]+)\/(.+?)(?:\?.*)?$/,
          );
          if (!match) {
            // External URL — redirect the crawler to it.
            return new Response(null, { status: 302, headers: { location: first } });
          }

          const bucket = match[1];
          const path = decodeURIComponent(match[2]);
          const { data: file, error } = await supabaseAdmin.storage.from(bucket).download(path);
          if (error || !file) return new Response("not found", { status: 404 });

          return new Response(await file.arrayBuffer(), {
            headers: {
              "content-type": file.type || "image/jpeg",
              "cache-control": "public, max-age=86400",
            },
          });
        } catch {
          return new Response("error", { status: 500 });
        }
      },
    },
  },
} as never);
