import fs from "fs/promises";
import path from "path";
import { app, BrowserWindow, protocol, ipcMain, dialog } from "electron";

declare const MAIN_WINDOW_WEBPACK_ENTRY: string;
declare const MAIN_WINDOW_PRELOAD_WEBPACK_ENTRY: string;

let mainWindow: BrowserWindow | null = null;

function mimeFromPath(filePath: string) {
  const ext = path.extname(filePath).toLowerCase();
  switch (ext) {
    case ".png":
      return "image/png";
    case ".jpg":
    case ".jpeg":
      return "image/jpeg";
    case ".webp":
      return "image/webp";
    case ".gif":
      return "image/gif";
    case ".bmp":
      return "image/bmp";
    default:
      return "application/octet-stream";
  }
}

function registerIpcHandlers() {
  ipcMain.handle("dialog:showOpenDialog", async (_e, options) => {
    return dialog.showOpenDialog(options);
  });

  ipcMain.handle("fs:readFileBase64", async (_e, filePath: string) => {
    const buf = await fs.readFile(filePath);
    return buf.toString("base64");
  });

  ipcMain.handle("fs:readImageBase64", async (_e, filePath: string) => {
    const buf = await fs.readFile(filePath);
    return {
      base64: buf.toString("base64"),
      mime: mimeFromPath(filePath),
      name: path.basename(filePath),
      path: filePath,
    };
  });
}

function createMainWindow() {
  mainWindow = new BrowserWindow({
    width: 1280,
    height: 720,
    frame: false,
    webPreferences: {
      preload: MAIN_WINDOW_PRELOAD_WEBPACK_ENTRY,
      nodeIntegration: false,
      contextIsolation: true,
      sandbox: false,
      webSecurity: false,
      enableBlinkFeatures: "WebGL2",
    },
  });

  mainWindow
    .loadURL(MAIN_WINDOW_WEBPACK_ENTRY)
    .catch((err) => console.error("Failed to load window:", err));

  ipcMain.on("window:minimize", () => mainWindow?.minimize());
  ipcMain.on("window:maximize", () => {
    if (!mainWindow) return;
    if (mainWindow.isMaximized()) mainWindow.unmaximize();
    else mainWindow.maximize();
  });
  ipcMain.on("window:close", () => mainWindow?.close());

  mainWindow.on("closed", () => {
    mainWindow = null;
  });
}

app.commandLine.appendSwitch("disable-features", "AutofillServerCommunication");
app.on("ready", () => {
  registerIpcHandlers();
  createMainWindow();
});

app.on("window-all-closed", () => {
  if (process.platform !== "darwin") app.quit();
});

protocol.registerSchemesAsPrivileged([
  {
    scheme: "http",
    privileges: { standard: true, bypassCSP: true, corsEnabled: true },
  },
  {
    scheme: "https",
    privileges: { standard: true, bypassCSP: true, corsEnabled: true },
  },
]);
