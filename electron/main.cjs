const { app, BrowserWindow, shell, Menu, ipcMain, safeStorage, dialog, session } = require("electron");
const { spawn } = require("child_process");
const path = require("path");
const http = require("http");
const https = require("https");
const net = require("net");
const fs = require("fs");
const crypto = require("crypto");
const { createLocalDatabase } = require("./local-db.cjs");
const { createLocalApi } = require("./local-api.cjs");

const LOCAL_HOST = "127.0.0.1";
let localPort = 0;
const localUrl = () => `http://${LOCAL_HOST}:${localPort}/auth`;
const OFFLINE_PAGE = path.join(__dirname, "offline.html");
const STARTUP_PAGE = path.join(__dirname, "loading.html");
const SERVER_ENTRY = path.join(__dirname, "local-server.mjs");

let win = null;
let localServer = null;
let localDatabase = null;
let localApi = null;
let blockExternalRequests = false;
let localServerReady = false;
let splashReady = false;
let startupError = "";

function fetchLatestRelease() {
  return new Promise((resolve, reject) => {
    const request = https.get(
      "https://api.github.com/repos/gowera/application-gestion-boutique/releases/latest",
      { headers: { Accept: "application/vnd.github+json", "User-Agent": "GestionStock" } },
      (response) => {
        let body = "";
        response.setEncoding("utf8");
        response.on("data", (chunk) => {
          body += chunk;
          if (body.length > 1_000_000) response.destroy(new Error("Réponse de version trop volumineuse."));
        });
        response.on("end", () => {
          if (response.statusCode !== 200) {
            reject(new Error(`Vérification de version refusée (HTTP ${response.statusCode ?? "?"}).`));
            return;
          }
          try {
            resolve(JSON.parse(body));
          } catch {
            reject(new Error("Réponse de version illisible."));
          }
        });
      },
    );
    request.setTimeout(8000, () => request.destroy(new Error("Délai dépassé pendant la vérification de version.")));
    request.on("error", reject);
  });
}

function compareVersions(left, right) {
  const parse = (value) => {
    const match = String(value).match(/^v?(\d+)\.(\d+)\.(\d+)$/);
    if (!match) throw new Error("Format de version non pris en charge.");
    return match.slice(1).map(Number);
  };
  const a = parse(left);
  const b = parse(right);
  for (let index = 0; index < a.length; index += 1) {
    if (a[index] !== b[index]) return a[index] - b[index];
  }
  return 0;
}

ipcMain.handle("app:version", () => app.getVersion());
ipcMain.handle("printers:list", async () => {
  if (!win) throw new Error("La fenêtre de l’application n’est pas prête.");
  const printers = await win.webContents.getPrintersAsync();
  return printers.map(({ name, displayName, isDefault, status }) => ({ name, displayName, isDefault, status }));
});
ipcMain.handle("app:update-check", async () => {
  const release = await fetchLatestRelease();
  const latestVersion = String(release.tag_name ?? "");
  const asset = Array.isArray(release.assets)
    ? release.assets.find((entry) => entry.name === `GestionStock-Setup-${latestVersion.replace(/^v/, "")}.exe`)
    : undefined;
  const downloadUrl = String(asset?.browser_download_url ?? "");
  const parsedUrl = new URL(downloadUrl);
  if (parsedUrl.protocol !== "https:"
    || parsedUrl.hostname !== "github.com"
    || !parsedUrl.pathname.startsWith("/gowera/application-gestion-boutique/releases/download/")) {
    throw new Error("Le lien de mise à jour publié n’est pas autorisé.");
  }
  const currentVersion = app.getVersion();
  return { currentVersion, latestVersion: latestVersion.replace(/^v/, ""), downloadUrl, updateAvailable: compareVersions(latestVersion, currentVersion) > 0 };
});
ipcMain.handle("app:open-release", async (_event, downloadUrl) => {
  const parsedUrl = new URL(String(downloadUrl));
  if (parsedUrl.protocol !== "https:"
    || parsedUrl.hostname !== "github.com"
    || !parsedUrl.pathname.startsWith("/gowera/application-gestion-boutique/releases/download/")) {
    throw new Error("Le lien de téléchargement n’est pas autorisé.");
  }
  await shell.openExternal(parsedUrl.href);
  return true;
});

function offlineAuthFile() {
  return path.join(app.getPath("userData"), "offline-auth.json");
}

function readOfflineAuth() {
  try { return JSON.parse(fs.readFileSync(offlineAuthFile(), "utf8")); } catch { return null; }
}

function hashPin(pin, salt) {
  return crypto.scryptSync(pin, salt, 32).toString("base64");
}

ipcMain.handle("offline-auth:has-pin", () => Boolean(readOfflineAuth()));
ipcMain.handle("offline-auth:is-local-only", () => Boolean(readOfflineAuth()));
ipcMain.handle("offline-auth:configure", (_event, { pin, profile }) => {
  if (!safeStorage.isEncryptionAvailable()) return { ok: false, error: "Le stockage sécurisé Windows n’est pas disponible." };
  if (!/^\d{4,8}$/.test(pin)) return { ok: false, error: "PIN invalide." };
  const salt = crypto.randomBytes(16).toString("base64");
  const record = {
    salt,
    pinHash: hashPin(pin, salt),
    profile: safeStorage.encryptString(JSON.stringify({ ...profile, validatedAt: new Date().toISOString() })).toString("base64"),
    attempts: 0,
    lockedUntil: 0,
  };
  database().set(`user:${profile.userId}:cache:table:user_roles`, {
    data: profile.roles.map((role) => ({ user_id: profile.userId, role })),
    at: new Date().toISOString(),
  });
  fs.writeFileSync(offlineAuthFile(), JSON.stringify(record), { mode: 0o600 });
  blockExternalRequests = true;
  if (localServer && localServer.connected) localServer.send({ type: "enable-local-only" });
  return { ok: true };
});
ipcMain.handle("offline-auth:unlock", (_event, { pin }) => {
  const record = readOfflineAuth();
  if (!record) return { ok: false, error: "Cet appareil n’a pas encore été préparé en ligne." };
  if (Date.now() < Number(record.lockedUntil || 0)) return { ok: false, error: "Trop d’essais. Réessayez plus tard.", retryAfter: Number(record.lockedUntil) };
  if (hashPin(String(pin), record.salt) !== record.pinHash) {
    record.attempts = Number(record.attempts || 0) + 1;
    if (record.attempts >= 5) { record.lockedUntil = Date.now() + 5 * 60_000; record.attempts = 0; }
    fs.writeFileSync(offlineAuthFile(), JSON.stringify(record), { mode: 0o600 });
    return { ok: false, error: "PIN incorrect." };
  }
  const profile = JSON.parse(safeStorage.decryptString(Buffer.from(record.profile, "base64")));
  record.attempts = 0; record.lockedUntil = 0;
  fs.writeFileSync(offlineAuthFile(), JSON.stringify(record), { mode: 0o600 });
  return { ok: true, profile };
});
/* ---------- Base de données locale (fichiers JSON persistants) ---------- */

function database() {
  if (!localDatabase) throw new Error("La base locale n’a pas pu être créée.");
  return localDatabase;
}

ipcMain.handle("local-db:get", (_event, key) => {
  return database().get(key);
});

ipcMain.handle("local-db:set", (_event, { key, value }) => {
  try {
    return database().set(key, value);
  } catch (error) {
    return { ok: false, error: error instanceof Error ? error.message : String(error) };
  }
});

ipcMain.handle("local-db:del", (_event, key) => {
  return database().delete(key);
});

ipcMain.handle("local-db:keys", () => {
  return database().keys();
});

ipcMain.handle("local-api:request", (_event, request) => {
  const record = readOfflineAuth();
  if (!record || !localApi) {
    return { status: 403, headers: { "content-type": "application/json" }, body: JSON.stringify({ message: "Le mode local n’est pas activé." }) };
  }
  try {
    const profile = JSON.parse(safeStorage.decryptString(Buffer.from(record.profile, "base64")));
    const result = localApi.handle(request, database(), profile.userId);
    return result;
  } catch (error) {
    return {
      status: 500,
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ message: error instanceof Error ? error.message : String(error) }),
    };
  }
});

ipcMain.handle("local-data:protect", (_event, value) => {
  if (!safeStorage.isEncryptionAvailable()) throw new Error("Stockage sécurisé indisponible");
  return safeStorage.encryptString(String(value)).toString("base64");
});
ipcMain.handle("local-data:unprotect", (_event, value) => {
  if (!safeStorage.isEncryptionAvailable()) throw new Error("Stockage sécurisé indisponible");
  return safeStorage.decryptString(Buffer.from(String(value), "base64"));
});

function handleSquirrelEvent() {
  const event = process.argv[1];
  if (!event || !event.startsWith("--squirrel-")) return false;
  const updateExe = path.resolve(path.dirname(process.execPath), "..", "Update.exe");
  const exeName = path.basename(process.execPath);
  const shortcutAction = event === "--squirrel-uninstall" ? "--removeShortcut" : "--createShortcut";

  if (["--squirrel-install", "--squirrel-updated", "--squirrel-uninstall"].includes(event)) {
    try {
      spawn(updateExe, [shortcutAction, exeName], { detached: true });
    } catch {
      // L'installation reste utilisable même si Windows refuse la création du raccourci.
    }
    setTimeout(() => app.quit(), 1000);
    return true;
  }
  if (event === "--squirrel-obsolete") {
    app.quit();
    return true;
  }
  return false;
}

if (handleSquirrelEvent()) return;

function findAvailablePort() {
  return new Promise((resolve, reject) => {
    const probe = net.createServer();
    probe.once("error", reject);
    probe.listen(0, LOCAL_HOST, () => {
      const address = probe.address();
      if (!address || typeof address === "string") {
        probe.close();
        reject(new Error("Impossible de réserver un port pour le serveur local."));
        return;
      }
      probe.close((error) => error ? reject(error) : resolve(address.port));
    });
  });
}

async function startLocalServer() {
  localPort = await findAvailablePort();
  localServer = spawn(process.execPath, [SERVER_ENTRY], {
    env: {
      ...process.env,
      ELECTRON_RUN_AS_NODE: "1",
      HOST: LOCAL_HOST,
      PORT: String(localPort),
      NITRO_HOST: LOCAL_HOST,
      NITRO_PORT: String(localPort),
      DESKTOP_LOCAL_ONLY: String(Boolean(readOfflineAuth())),
    },
    stdio: ["ignore", "ignore", "pipe", "ipc"],
    windowsHide: true,
  });
  localServer.stderr.setEncoding("utf8");
  localServer.stderr.on("data", (chunk) => {
    startupError = `${startupError}${chunk}`.slice(-3000).trim();
  });
  localServer.once("error", (error) => {
    startupError = `Impossible de démarrer le serveur local : ${error.message}`;
    showStartupFailure();
  });
  localServer.once("exit", (code, signal) => {
    if (localServerReady) return;
    startupError = startupError || `Le serveur local s’est arrêté avant le démarrage (code ${code ?? "inconnu"}, signal ${signal ?? "aucun"}).`;
    showStartupFailure();
  });
}

function waitForLocalServer(attempt = 0) {
  if (!win || startupError) {
    if (startupError) showStartupFailure();
    return;
  }
  const request = http.get(localUrl(), (response) => {
    response.resume();
    if (response.statusCode >= 500) {
      response.destroy();
      if (attempt < 50) setTimeout(() => waitForLocalServer(attempt + 1), 300);
      else showStartupFailure("Le serveur local a répondu avec une erreur.");
      return;
    }
    // L'application est servie localement : aucune connexion Internet requise.
    win.loadURL(localUrl()).then(() => {
      localServerReady = true;
    }).catch((error) => {
      if (attempt < 50) setTimeout(() => waitForLocalServer(attempt + 1), 300);
      else showStartupFailure(error instanceof Error ? error.message : String(error));
    });
  });
  request.on("error", () => {
    if (attempt < 50) setTimeout(() => waitForLocalServer(attempt + 1), 200);
    else showStartupFailure();
  });
  request.setTimeout(1000, () => request.destroy());
}

function showStartupFailure(message = "") {
  if (!win || win.isDestroyed() || !splashReady) return;
  const detail = message || startupError || "Vérifiez les droits d’accès et réessayez.";
  win.loadFile(OFFLINE_PAGE, { query: { error: detail.slice(0, 3000) } }).catch((error) => {
    dialog.showErrorBox("Impossible d’ouvrir le logiciel", error instanceof Error ? error.message : String(error));
  });
}

function createWindow() {
  win = new BrowserWindow({
    width: 1440,
    height: 900,
    backgroundColor: "#04122e",
    title: "Gestion Stock",
    icon: path.join(__dirname, "icon.png"),
    show: false,
    webPreferences: {
      contextIsolation: true,
      nodeIntegration: false,
      partition: "persist:conetec",
      preload: path.join(__dirname, "preload.cjs"),
    },
  });

  Menu.setApplicationMenu(
    Menu.buildFromTemplate([
      {
        label: "Gestion Stock",
        submenu: [
          { label: "Recharger", accelerator: "F5", click: () => win && win.loadURL(localUrl()) },
          { role: "toggleDevTools", label: "Outils de développement" },
          { type: "separator" },
          { role: "quit", label: "Quitter" },
        ],
      },
      {
        label: "Édition",
        submenu: [
          { role: "undo", label: "Annuler" },
          { role: "redo", label: "Rétablir" },
          { type: "separator" },
          { role: "cut", label: "Couper" },
          { role: "copy", label: "Copier" },
          { role: "paste", label: "Coller" },
          { role: "selectAll", label: "Tout sélectionner" },
        ],
      },
    ]),
  );

  win.webContents.setWindowOpenHandler(({ url }) => {
    shell.openExternal(url);
    return { action: "deny" };
  });

  splashReady = false;
  win.loadFile(STARTUP_PAGE).then(() => {
    if (!win || win.isDestroyed()) return;
    splashReady = true;
    win.show();
    if (startupError) showStartupFailure();
    else waitForLocalServer();
  }).catch((error) => {
    dialog.showErrorBox("Impossible d’ouvrir le logiciel", error instanceof Error ? error.message : String(error));
  });
  win.on("closed", () => {
    win = null;
    splashReady = false;
  });
}

app.whenReady().then(() => {
  // Create the database before rendering, even on a first offline launch.
  localDatabase = createLocalDatabase(app.getPath("userData"), safeStorage);
  localApi = createLocalApi();
  blockExternalRequests = Boolean(readOfflineAuth());
  const appSession = session.fromPartition("persist:conetec");
  appSession.webRequest.onBeforeRequest((details, callback) => {
    let localRequest = false;
    try {
      const requestUrl = new URL(details.url);
      localRequest = requestUrl.protocol === "file:"
        || (requestUrl.protocol === "http:" && ["127.0.0.1", "localhost"].includes(requestUrl.hostname));
    } catch {
      localRequest = false;
    }
    callback({ cancel: blockExternalRequests && !localRequest });
  });
  return startLocalServer();
}).then(() => {
  createWindow();
  app.on("activate", () => {
    if (BrowserWindow.getAllWindows().length === 0) createWindow();
  });
}).catch((error) => {
  dialog.showErrorBox("Impossible d’ouvrir le logiciel", `Vérifiez les droits d’écriture, l’espace disque et la configuration de cet ordinateur.\n${error instanceof Error ? error.message : String(error)}`);
  app.quit();
});

app.on("window-all-closed", () => {
  if (process.platform !== "darwin") app.quit();
});

app.on("before-quit", () => {
  if (localServer && !localServer.killed) localServer.kill();
});
