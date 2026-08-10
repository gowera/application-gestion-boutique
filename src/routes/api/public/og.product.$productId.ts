import { createFileRoute } from "@tanstack/react-router";
import { serverClient } from "@/lib/shwary.server";

/**
 * Proxy Open Graph public de l'image d'un produit.
 * Les crawlers sociaux (WhatsApp, Facebook, X…) ne peuvent pas lire le bucket privé :
 * cette route diffuse la première image du produit depuis notre origine, en cache public.
 * Elle n'utilise que la clé publiable (aucune clé service role requise en production).
 */
const STORAGE_RE = /\/storage\/v1\/object\/(?:public|sign|authenticated)\/([^/]+)\/(.+?)(?:\?.*)?$/;

function imageResponse(buf: ArrayBuffer, type: string, headOnly: boolean): Response {
  return new Response(headOnly ? null : buf, {
    headers: {
      "content-type": type || "image/jpeg",
      "content-length": String(buf.byteLength),
      "cache-control": "public, max-age=86400, s-maxage=86400",
      "access-control-allow-origin": "*",
    },
  });
}

async function serve(productId: string, headOnly: boolean): Promise<Response> {
  try {
    const client = serverClient();
    const { data: product } = await client
      .from("products")
      .select("images")
      .eq("id", productId)
      .maybeSingle();

    const images = ((product?.images as string[] | null) ?? []).filter(Boolean);
    if (!images.length) return new Response("not found", { status: 404 });

    for (const candidate of images) {
      const match = candidate.match(STORAGE_RE);
      if (!match) {
        // URL externe — on la récupère pour toujours servir un corps d'image depuis notre origine.
        try {
          const res = await fetch(candidate);
          if (!res.ok) continue;
          const buf = await res.arrayBuffer();
          return imageResponse(buf, res.headers.get("content-type") || "image/jpeg", headOnly);
        } catch {
          continue;
        }
      }

      const bucket = match[1]!;
      const path = decodeURIComponent(match[2]!);
      const { data: file, error } = await client.storage.from(bucket).download(path);
      if (!error && file) {
        const buf = await file.arrayBuffer();
        return imageResponse(buf, file.type || "image/jpeg", headOnly);
      }
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
