const { app, BrowserWindow, shell } = require("electron");
const { spawn } = require("child_process");

let mainWindow;

function createWindow() {

  mainWindow = new BrowserWindow({
    width: 1400,
    height: 900,
    autoHideMenuBar: true,

    webPreferences: {
      nodeIntegration: false,
      contextIsolation: true
    }
  });

  mainWindow.loadURL("http://localhost:3000");

  mainWindow.webContents.setWindowOpenHandler(({ url }) => {
    shell.openExternal(url);
    return { action: "deny" };
  });
}

app.whenReady().then(() => {

  // start backend
  spawn("node", ["server.js"], {
    shell: true,
    stdio: "inherit"
  });

  createWindow();
});