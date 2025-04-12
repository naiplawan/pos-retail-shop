interface ElectronAPI {
  getEnv: (name: string) => Promise<string>
}

declare global {
  interface Window {
    electronAPI: ElectronAPI
  }
}

export {}
