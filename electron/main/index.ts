import { app, BrowserWindow } from 'electron'
import { join } from 'path'
import { initDatabase, closeDatabase } from './database/connection'
import { runMigrations } from './database/migrate'
import { runSeed } from './database/seed'
import { registerIpcHandlers } from './ipc/handlers'
import { initTelemetry } from './services/telemetry'

let mainWindow: BrowserWindow | null = null

async function createWindow(): Promise<void> {
  mainWindow = new BrowserWindow({
    width: 1280,
    height: 800,
    minWidth: 1024,
    minHeight: 600,
    title: 'Master RAB Konstruksi',
    webPreferences: {
      preload: join(__dirname, '../preload/index.js'),
      contextIsolation: true,
      nodeIntegration: false,
      sandbox: false
    }
  })

  mainWindow.on('closed', () => {
    mainWindow = null
  })

  mainWindow.webContents.on('did-fail-load', (_e, code, desc) => {
    console.error('[MasterRAB] Failed to load:', code, desc)
  })

  mainWindow.webContents.on('console-message', (_e, level, msg) => {
    console.log(`[Renderer:${level}] ${msg}`)
  })

  if (process.env.ELECTRON_RENDERER_URL) {
    console.log('[MasterRAB] Loading dev URL:', process.env.ELECTRON_RENDERER_URL)
    mainWindow.loadURL(process.env.ELECTRON_RENDERER_URL)
  } else {
    const prodPath = join(__dirname, '../renderer/index.html')
    console.log('[MasterRAB] Loading production file:', prodPath)
    mainWindow.loadFile(prodPath)
  }

  mainWindow.webContents.openDevTools()
}

app.whenReady().then(async () => {
  try {
    initTelemetry()
    console.log('[MasterRAB] Initializing database...')
    await initDatabase()
    console.log('[MasterRAB] Running migrations...')
    runMigrations()
    console.log('[MasterRAB] Running seed...')
    runSeed()
    console.log('[MasterRAB] Registering IPC handlers...')
    registerIpcHandlers()
    console.log('[MasterRAB] Creating window...')
    await createWindow()
    console.log('[MasterRAB] App ready!')
  } catch (err) {
    console.error('[MasterRAB] Fatal error:', err)
  }
})

app.on('window-all-closed', () => {
  closeDatabase()
  if (process.platform !== 'darwin') {
    app.quit()
  }
})

app.on('before-quit', () => {
  closeDatabase()
})
