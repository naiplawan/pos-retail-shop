const { contextBridge, ipcRenderer } = require("electron")

// Expose environment variables to the renderer process
contextBridge.exposeInMainWorld("electronAPI", {
  getEnv: (name) => ipcRenderer.invoke("get-env", name),
})
