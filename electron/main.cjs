const { app, BrowserWindow, shell, Menu } = require("electron");
const path = require("path");

const PRIMARY_URL = "https://project--265340c6-f4cb-4a09-8b9b-e443b084fee4-dev.lovable.app/admin";
const FALLBACK_URL = "https://project--265340c6-f4cb-4a09-8b9b-e443b084fee4.lovable.app/admin";
const OFFLINE_PAGE = path.join(__dirname, "offline.html");

let win = null;

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
          { label: "Recharger", accelerator: "F5", click: () => load(PRIMARY_URL) },
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

  load(PRIMARY_URL);
}

function load(url, isFallback) {
  if (!win) return;
  win.loadURL(url).catch(() => {
    if (!isFallback) load(FALLBACK_URL, true);
    else win.loadFile(OFFLINE_PAGE);
  });
}

app.whenReady().then(() => {
  createWindow();
  app.on("activate", () => {
    if (BrowserWindow.getAllWindows().length === 0) createWindow();
  });
});

app.on("web-contents-created", (_e, contents) => {
  contents.on("did-fail-load", (_evt, code, _desc, failedUrl, isMainFrame) => {
    if (!isMainFrame || code === -3) return;
    if (failedUrl.startsWith(PRIMARY_URL)) load(FALLBACK_URL, true);
    else if (win) win.loadFile(OFFLINE_PAGE);
  });
});

app.on("window-all-closed", () => {
  if (process.platform !== "darwin") app.quit();
});
