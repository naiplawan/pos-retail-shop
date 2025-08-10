const { app, BrowserWindow, ipcMain } = require("electron")
const path = require("path")
const isDev = require("electron-is-dev")
const { autoUpdater } = require("electron-updater")

// Environment variables - load from .env files
require('dotenv').config()

let mainWindow

function createWindow() {
  mainWindow = new BrowserWindow({
    width: 1200,
    height: 800,
    webPreferences: {
      nodeIntegration: false,
      contextIsolation: true,
      enableRemoteModule: false,
      webSecurity: true,
      preload: path.join(__dirname, "preload.js"),
    },
  })

  // Load the app
  const startUrl = isDev ? "http://localhost:3000" : `file://${path.join(__dirname, "../out/index.html")}`

  mainWindow.loadURL(startUrl)

  // Open DevTools in development
  if (isDev) {
    mainWindow.webContents.openDevTools()
  }

  mainWindow.on("closed", () => {
    mainWindow = null
  })

  // Check for updates
  if (!isDev) {
    autoUpdater.checkForUpdatesAndNotify()
  }
}

app.whenReady().then(createWindow)

app.on("window-all-closed", () => {
  if (process.platform !== "darwin") {
    app.quit()
  }
})

app.on("activate", () => {
  if (mainWindow === null) {
    createWindow()
  }
})

// Handle IPC messages from renderer with validation
const ALLOWED_ENV_VARS = ['NODE_ENV', 'APP_VERSION']

ipcMain.handle("get-env", (event, name) => {
  // Only allow access to specific environment variables
  if (!ALLOWED_ENV_VARS.includes(name)) {
    console.warn(`Unauthorized attempt to access environment variable: ${name}`)
    return null
  }
  return process.env[name]
})

// Add memory optimization for production
if (!isDev) {
  app.commandLine.appendSwitch('--max-old-space-size', '4096')
  app.commandLine.appendSwitch('--enable-gpu-rasterization')
  
  // Enable garbage collection every 30 seconds
  setInterval(() => {
    if (global.gc) {
      global.gc()
    }
  }, 30000)
}
