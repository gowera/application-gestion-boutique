const { app, BrowserWindow, shell, Menu, ipcMain, safeStorage } = require("electron");
const { spawn } = require("child_process");
const path = require("path");
const http = require("http");
const fs = require("fs");
const crypto = require("crypto");

const LOCAL_PORT = 41731;
const LOCAL_URL = `http://127.0.0.1:${LOCAL_PORT}/admin`;
const OFFLINE_PAGE = path.join(__dirname, "offline.html");
const SERVER_ENTRY = path.join(__dirname, "local-server.mjs");

let win = null;
let localServer = null;

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
  fs.writeFileSync(offlineAuthFile(), JSON.stringify(record), { mode: 0o600 });
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
  const age = Date.now() - new Date(profile.validatedAt).getTime();
  if (age > 7 * 24 * 60 * 60_000) return { ok: false, error: "Une connexion Internet est requise pour renouveler les droits de cet appareil." };
  record.attempts = 0; record.lockedUntil = 0;
  fs.writeFileSync(offlineAuthFile(), JSON.stringify(record), { mode: 0o600 });
  return { ok: true, profile };
});
/* ---------- Base de données locale (fichiers JSON persistants) ---------- */

function localDbDir() {
  const dir = path.join(app.getPath("userData"), "local-db");
  if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true, mode: 0o700 });
  return dir;
}

function localDbFile(key) {
  const safe = crypto.createHash("sha256").update(String(key)).digest("hex");
  return path.join(localDbDir(), `${safe}.json`);
}

function encodeRecord(key, value) {
  const payload = JSON.stringify({ key, value, at: new Date().toISOString() });
  if (safeStorage.isEncryptionAvailable()) {
    return JSON.stringify({ enc: true, data: safeStorage.encryptString(payload).toString("base64") });
  }
  return JSON.stringify({ enc: false, data: payload });
}

function decodeRecord(raw) {
  const wrapper = JSON.parse(raw);
  const payload = wrapper.enc
    ? safeStorage.decryptString(Buffer.from(wrapper.data, "base64"))
    : wrapper.data;
  return JSON.parse(payload);
}

ipcMain.handle("local-db:get", (_event, key) => {
  try {
    const file = localDbFile(key);
    if (!fs.existsSync(file)) return null;
    return decodeRecord(fs.readFileSync(file, "utf8")).value ?? null;
  } catch {
    return null;
  }
});

ipcMain.handle("local-db:set", (_event, { key, value }) => {
  try {
    const file = localDbFile(key);
    const tmp = `${file}.tmp`;
    fs.writeFileSync(tmp, encodeRecord(key, value), { mode: 0o600 });
    fs.renameSync(tmp, file);
    return { ok: true };
  } catch (error) {
    return { ok: false, error: error instanceof Error ? error.message : String(error) };
  }
});

ipcMain.handle("local-db:del", (_event, key) => {
  try { fs.rmSync(localDbFile(key), { force: true }); } catch { /* ignore */ }
  return { ok: true };
});

ipcMain.handle("local-db:keys", () => {
  try {
    return fs.readdirSync(localDbDir())
      .filter((name) => name.endsWith(".json"))
      .map((name) => {
        try { return decodeRecord(fs.readFileSync(path.join(localDbDir(), name), "utf8")).key; } catch { return null; }
      })
      .filter(Boolean);
  } catch {
    return [];
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

function startLocalServer() {
  localServer = spawn(process.execPath, [SERVER_ENTRY], {
    env: {
      ...process.env,
      ELECTRON_RUN_AS_NODE: "1",
      HOST: "127.0.0.1",
      PORT: String(LOCAL_PORT),
      NITRO_HOST: "127.0.0.1",
      NITRO_PORT: String(LOCAL_PORT),
    },
    stdio: "ignore",
    windowsHide: true,
  });
}

function waitForLocalServer(attempt = 0) {
  if (!win) return;
  const request = http.get(`http://127.0.0.1:${LOCAL_PORT}/`, (response) => {
    response.resume();
    // L'application est servie localement : aucune connexion Internet requise.
    win.loadURL(LOCAL_URL).catch(() => {
      if (attempt < 50) setTimeout(() => waitForLocalServer(attempt + 1), 300);
      else if (win) win.loadFile(OFFLINE_PAGE);
    });
  });
  request.on("error", () => {
    if (attempt < 50) setTimeout(() => waitForLocalServer(attempt + 1), 200);
    else if (win) win.loadFile(OFFLINE_PAGE);
  });
  request.setTimeout(1000, () => request.destroy());
}

function createWindow() {
  win = new BrowserWindow({
    width: 1440,
    height: 900,
    backgroundColor: "#04122e",
    title: "Gestion Stock",
    icon: path.join(__dirname, "icon.png"),
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
          { label: "Recharger", accelerator: "F5", click: () => win && win.loadURL(LOCAL_URL) },
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

  waitForLocalServer();
}

app.whenReady().then(() => {
  startLocalServer();
  createWindow();
  app.on("activate", () => {
    if (BrowserWindow.getAllWindows().length === 0) createWindow();
  });
});

app.on("window-all-closed", () => {
  if (process.platform !== "darwin") app.quit();
});

app.on("before-quit", () => {
  if (localServer && !localServer.killed) localServer.kill();
});
