const { app, BrowserWindow, ipcMain } = require("electron");

// check for updates
const { updateElectronApp } = require("update-electron-app");
updateElectronApp();

async function handleFileOpen() {
  const { canceled, filePaths } = await dialog.showOpenDialog({});
  if (!canceled) {
    return filePaths[0];
  }
}

async function createWindow() {
  const win = new BrowserWindow({
    // width: 1024,
    // height: 764,
    // fullscreen: true, // Open in full screen
    webPreferences: {
      nodeIntegration: true,
    },
    // titleBarStyle: 'hidden',
    icon: __dirname + "demo/favicon.png", // Set favicon for Electron app
  });

  // win.setMenu(null); // Remove the Electron menu

  await win.loadFile("electron/renderer.html");
}

app.whenReady().then(() => {
  ipcMain.handle("dialog:openFile", handleFileOpen);
  createWindow();
});

// Handle creating/removing shortcuts on Windows when installing/uninstalling.
if (require("electron-squirrel-startup")) {
  app.quit();
}

// Quit when all windows are closed, except on macOS. There, it's common
// for applications and their menu bar to stay active until the user quits
// explicitly with Cmd + Q.
app.on("window-all-closed", () => {
  if (process.platform !== "darwin") {
    app.quit();
  }
});

app.on("activate", () => {
  // On OS X it's common to re-create a window in the app when the
  // dock icon is clicked and there are no other windows open.
  if (BrowserWindow.getAllWindows().length === 0) {
    createWindow();
  }
});
