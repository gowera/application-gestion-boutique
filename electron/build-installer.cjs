const fs = require("node:fs");
const os = require("node:os");
const path = require("node:path");
const { spawnSync } = require("node:child_process");

const root = path.join(__dirname, "..");
const manifest = JSON.parse(fs.readFileSync(path.join(root, "package.json"), "utf8"));
const appDirectory = path.join(os.tmpdir(), "gestionstock-release", "GestionStock-win32-x64");
const outputFile = path.join(os.tmpdir(), `GestionStock-Setup-${manifest.version}.exe`);

if (!fs.existsSync(appDirectory)) {
  throw new Error(`Le paquet Windows est absent : ${appDirectory}`);
}

const result = spawnSync("makensis", [
  `-DAPP_DIR=${appDirectory}`,
  `-DICON_FILE=${path.join(__dirname, "icon.ico")}`,
  `-DOUTPUT_FILE=${outputFile}`,
  `-DAPP_VERSION=${manifest.version}`,
  path.join(__dirname, "installer.nsi"),
], { cwd: root, stdio: "inherit" });

if (result.error) throw result.error;
if (result.status !== 0) throw new Error(`NSIS a échoué avec le code ${result.status}.`);
if (!fs.existsSync(outputFile)) throw new Error(`NSIS n’a pas généré l’installeur attendu : ${outputFile}`);

console.log(outputFile);
