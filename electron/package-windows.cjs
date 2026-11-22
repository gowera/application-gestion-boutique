const fs = require("node:fs");
const path = require("node:path");
const os = require("node:os");

async function main() {
  const root = path.join(__dirname, "..");
  const dist = path.join(root, "dist");
  if (!fs.existsSync(path.join(dist, "server", "index.mjs")) || !fs.existsSync(path.join(dist, "client"))) {
    throw new Error("La version compilée actuelle est absente : impossible de livrer un logiciel à jour.");
  }
  const staging = fs.mkdtempSync(path.join(os.tmpdir(), "gestionstock-package-"));
  try {
    // Explicit allowlist: never embed .env, repository metadata or browser test credentials.
    fs.cpSync(dist, path.join(staging, "dist"), { recursive: true });
    fs.mkdirSync(path.join(staging, "electron"));
    for (const file of ["main.cjs", "preload.cjs", "local-server.mjs", "local-db.cjs", "offline.html", "icon.ico", "icon.png"]) {
      fs.copyFileSync(path.join(__dirname, file), path.join(staging, "electron", file));
    }
    const manifest = JSON.parse(fs.readFileSync(path.join(root, "package.json"), "utf8"));
    fs.writeFileSync(path.join(staging, "package.json"), JSON.stringify({ name: "gestionstock", version: manifest.version, main: "electron/main.cjs", type: "module" }));
    const { default: packager } = await import("@electron/packager");
    const electronVersion = JSON.parse(fs.readFileSync(require.resolve("electron/package.json"), "utf8")).version;
    const outputs = await packager({ dir: staging, name: "GestionStock", platform: "win32", arch: "x64", electronVersion, appVersion: manifest.version, out: "/tmp/gestionstock-release", overwrite: true, asar: true, icon: path.join(__dirname, "icon.ico"), win32metadata: { CompanyName: "Gestion Stock", FileDescription: "Gestion Stock", ProductName: "Gestion Stock" } });
    console.log(outputs.join("\n"));
  } finally {
    fs.rmSync(staging, { recursive: true, force: true });
  }
}
main().catch((error) => { console.error(error.message); process.exitCode = 1; });