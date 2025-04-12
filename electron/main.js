const { app, BrowserWindow, ipcMain } = require("electron")
const path = require("path")
const isDev = require("electron-is-dev")
const { autoUpdater } = require("electron-updater")

// Environment variables
process.env.SUPABASE_URL = "https://gotbldxyecgshpavgkzn.supabase.co"
process.env.SUPABASE_ANON_KEY =
  "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImdvdGJsZHh5ZWNnc2hwYXZna3puIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NDQ0MjAyNzAsImV4cCI6MjA1OTk5NjI3MH0.mvIuoNHU3WobqoLTfOiv2R9SbsVKm3QyXTEa3Z0uqpg"

let mainWindow

function createWindow() {
  mainWindow = new BrowserWindow({
    width: 1200,
    height: 800,
    webPreferences: {
      nodeIntegration: true,
      contextIsolation: false,
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

// Handle IPC messages from renderer
ipcMain.handle("get-env", (event, name) => {
  return process.env[name]
})
