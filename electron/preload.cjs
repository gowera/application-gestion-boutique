const { contextBridge, ipcRenderer } = require("electron");

contextBridge.exposeInMainWorld("conetecDesktop", {
  isDesktop: true,
  hasOfflinePin: () => ipcRenderer.invoke("offline-auth:has-pin"),
  configureOfflinePin: (pin, profile) => ipcRenderer.invoke("offline-auth:configure", { pin, profile }),
  unlockOffline: (pin) => ipcRenderer.invoke("offline-auth:unlock", { pin }),
  protectLocalData: (value) => ipcRenderer.invoke("local-data:protect", value),
  unprotectLocalData: (value) => ipcRenderer.invoke("local-data:unprotect", value),
});