const { createWindowsInstaller } = require("electron-winstaller");
const options = require("../electron-winstaller.json");

createWindowsInstaller(options).catch((error) => {
  console.error(error);
  process.exit(1);
});