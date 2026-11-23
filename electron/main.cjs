const { app, BrowserWindow, shell, Menu, ipcMain, safeStorage, dialog } = require("electron");
const { spawn } = require("child_process");
const path = require("path");
const http = require("http");
const fs = require("fs");
const crypto = require("crypto");
const { createLocalDatabase } = require("./local-db.cjs");

const LOCAL_PORT = 41731;
const LOCAL_URL = `http://127.0.0.1:${LOCAL_PORT}/admin`;
const OFFLINE_PAGE = path.join(__dirname, "offline.html");
const SERVER_ENTRY = path.join(__dirname, "local-server.mjs");

let win = null;
let localServer = null;
let localDatabase = null;

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
  // Create the database before rendering, even on a first offline launch.
  localDatabase = createLocalDatabase(app.getPath("userData"), safeStorage);
  startLocalServer();
  createWindow();
  app.on("activate", () => {
    if (BrowserWindow.getAllWindows().length === 0) createWindow();
  });
}).catch((error) => {
  dialog.showErrorBox("Impossible d’ouvrir le logiciel", `La base locale n’a pas pu être préparée. Vérifiez les droits d’écriture et l’espace disque.\n${error instanceof Error ? error.message : String(error)}`);
  app.quit();
});

app.on("window-all-closed", () => {
  if (process.platform !== "darwin") app.quit();
});

app.on("before-quit", () => {
  if (localServer && !localServer.killed) localServer.kill();
});
