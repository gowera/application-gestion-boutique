import { createFileRoute } from "@tanstack/react-router";

/**
 * Public Open Graph image proxy for a product.
 * Product images live in a private bucket, so social crawlers cannot read them directly.
 * This route streams the first readable product image with a public, cacheable response
 * (and answers HEAD requests, which several crawlers send first).
 */
const STORAGE_RE = /\/storage\/v1\/object\/(?:public|sign|authenticated)\/([^/]+)\/(.+?)(?:\?.*)?$/;

async function serve(productId: string, headOnly: boolean): Promise<Response> {
  try {
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const { data: product } = await supabaseAdmin
      .from("products")
      .select("images")
      .eq("id", productId)
      .maybeSingle();

    const images = ((product?.images as string[] | null) ?? []).filter(Boolean);
    if (!images.length) return new Response("not found", { status: 404 });

    for (const candidate of images) {
      const match = candidate.match(STORAGE_RE);
      if (!match) {
        // External URL — fetch it so crawlers always get an image body from our origin.
        try {
          const res = await fetch(candidate);
          if (!res.ok) continue;
          const buf = await res.arrayBuffer();
          return new Response(headOnly ? null : buf, {
            headers: {
              "content-type": res.headers.get("content-type") || "image/jpeg",
              "content-length": String(buf.byteLength),
              "cache-control": "public, max-age=86400",
            },
          });
        } catch {
          continue;
        }
      }

      const bucket = match[1];
      const path = decodeURIComponent(match[2]);
      const { data: file, error } = await supabaseAdmin.storage.from(bucket).download(path);
      if (error || !file) continue;
      const buf = await file.arrayBuffer();
      return new Response(headOnly ? null : buf, {
        headers: {
          "content-type": file.type || "image/jpeg",
          "content-length": String(buf.byteLength),
          "cache-control": "public, max-age=86400",
        },
      });
    }

    return new Response("not found", { status: 404 });
  } catch {
    return new Response("error", { status: 500 });
  }
}

export const Route = createFileRoute("/api/public/og/product/$productId")({
  server: {
    handlers: {
      GET: async ({ params }: { params: { productId: string } }) => serve(params.productId, false),
      HEAD: async ({ params }: { params: { productId: string } }) => serve(params.productId, true),
    },
  },
} as never);
