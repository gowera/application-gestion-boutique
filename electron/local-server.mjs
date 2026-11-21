import { createServer } from "node:http";
import { createReadStream, existsSync, statSync } from "node:fs";
import { extname, join, normalize } from "node:path";
import appHandler from "../dist/server/index.mjs";

const host = process.env.HOST || "127.0.0.1";
const port = Number(process.env.PORT || 41731);
const publicDir = join(import.meta.dirname, "..", "dist", "client");

const mimeTypes = {
  ".css": "text/css; charset=utf-8",
  ".ico": "image/x-icon",
  ".js": "text/javascript; charset=utf-8",
  ".json": "application/json; charset=utf-8",
  ".png": "image/png",
  ".svg": "image/svg+xml",
  ".webp": "image/webp",
  ".woff": "font/woff",
  ".woff2": "font/woff2",
};

function localAsset(request) {
  const pathname = decodeURIComponent(new URL(request.url).pathname);
  const safePath = normalize(pathname).replace(/^(\.\.[/\\])+/, "");
  const filePath = join(publicDir, safePath);
  if (!filePath.startsWith(publicDir) || !existsSync(filePath) || !statSync(filePath).isFile()) {
    return new Response("Fichier introuvable", { status: 404 });
  }
  const body = createReadStream(filePath);
  return new Response(body, {
    headers: {
      "content-type": mimeTypes[extname(filePath)] || "application/octet-stream",
      "cache-control": "public, max-age=31536000, immutable",
    },
  });
}

const server = createServer(async (req, res) => {
  try {
    const url = `http://${host}:${port}${req.url || "/"}`;
    const chunks = [];
    for await (const chunk of req) chunks.push(chunk);
    const body = chunks.length ? Buffer.concat(chunks) : undefined;
    const request = new Request(url, {
      method: req.method,
      headers: req.headers,
      body,
      duplex: body ? "half" : undefined,
    });
    const response = await appHandler.fetch(request, { ASSETS: { fetch: localAsset } }, {
      waitUntil() {},
      passThroughOnException() {},
    });
    res.writeHead(response.status, Object.fromEntries(response.headers));
    if (!response.body) return res.end();
    for await (const chunk of response.body) res.write(chunk);
    res.end();
  } catch (error) {
    res.writeHead(500, { "content-type": "text/plain; charset=utf-8" });
    res.end(`Gestion Stock ne peut pas démarrer : ${error instanceof Error ? error.message : String(error)}`);
  }
});

server.listen(port, host);