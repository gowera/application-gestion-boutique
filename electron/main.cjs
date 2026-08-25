const { app, BrowserWindow, shell, Menu } = require("electron");
const { spawn } = require("child_process");
const path = require("path");
const http = require("http");

const LOCAL_PORT = 41731;
const LOCAL_URL = `http://127.0.0.1:${LOCAL_PORT}/admin`;
const OFFLINE_PAGE = path.join(__dirname, "offline.html");
const SERVER_ENTRY = path.join(__dirname, "local-server.mjs");

let win = null;
let localServer = null;

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
    win.loadURL(LOCAL_URL).catch(() => win && win.loadFile(OFFLINE_PAGE));
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
    title: "CONETEC",
    icon: path.join(__dirname, "icon.png"),
    webPreferences: {
      contextIsolation: true,
      nodeIntegration: false,
      partition: "persist:conetec",
    },
  });

  Menu.setApplicationMenu(
    Menu.buildFromTemplate([
      {
        label: "CONETEC",
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
