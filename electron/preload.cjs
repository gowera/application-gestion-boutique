const { contextBridge, ipcRenderer } = require("electron");

contextBridge.exposeInMainWorld("conetecDesktop", {
  isDesktop: true,
  getAppVersion: () => ipcRenderer.invoke("app:version"),
  listPrinters: () => ipcRenderer.invoke("printers:list"),
  checkForUpdates: () => ipcRenderer.invoke("app:update-check"),
  openRelease: (url) => ipcRenderer.invoke("app:open-release", url),
  hasOfflinePin: () => ipcRenderer.invoke("offline-auth:has-pin"),
  isLocalOnly: () => ipcRenderer.invoke("offline-auth:is-local-only"),
  configureOfflinePin: (pin, profile) => ipcRenderer.invoke("offline-auth:configure", { pin, profile }),
  unlockOffline: (pin) => ipcRenderer.invoke("offline-auth:unlock", { pin }),
  localRequest: (request) => ipcRenderer.invoke("local-api:request", request),
  protectLocalData: (value) => ipcRenderer.invoke("local-data:protect", value),
  unprotectLocalData: (value) => ipcRenderer.invoke("local-data:unprotect", value),
  dbGet: (key) => ipcRenderer.invoke("local-db:get", key),
  dbSet: (key, value) => ipcRenderer.invoke("local-db:set", { key, value }),
  dbDel: (key) => ipcRenderer.invoke("local-db:del", key),
  dbKeys: () => ipcRenderer.invoke("local-db:keys"),
});
