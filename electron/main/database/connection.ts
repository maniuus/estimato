import initSqlJs, { Database as SqlJsDatabase } from 'sql.js'
import { readFileSync, writeFileSync, existsSync, mkdirSync } from 'fs'
import { join } from 'path'
import { app } from 'electron'

let db: SqlJsDatabase | null = null

export function getDbPath(): string {
  const userDataPath = app.getPath('userData')
  const dbDir = join(userDataPath, 'data')
  if (!existsSync(dbDir)) {
    mkdirSync(dbDir, { recursive: true })
  }
  return join(dbDir, 'master-rab.sqlite')
}

export async function initDatabase(): Promise<SqlJsDatabase> {
  const SQL = await initSqlJs({
    locateFile: (file: string) => join(app.getAppPath(), 'node_modules', 'sql.js', 'dist', file)
  })
  const dbPath = getDbPath()

  if (existsSync(dbPath)) {
    const buffer = readFileSync(dbPath)
    db = new SQL.Database(buffer)
  } else {
    db = new SQL.Database()
  }

  db.run('PRAGMA journal_mode=WAL')
  db.run('PRAGMA foreign_keys=ON')

  return db
}

export function getDatabase(): SqlJsDatabase {
  if (!db) {
    throw new Error('Database not initialized. Call initDatabase() first.')
  }
  return db
}

let autoSaveEnabled = true

export function disableAutoSave(): void {
  autoSaveEnabled = false
}

export function enableAutoSave(): void {
  autoSaveEnabled = true
}

export function saveDatabase(): void {
  if (!db || !autoSaveEnabled) return
  const dbPath = getDbPath()
  const data = db.export()
  const buffer = Buffer.from(data)
  writeFileSync(dbPath, buffer)
}

export function closeDatabase(): void {
  if (db) {
    saveDatabase()
    db.close()
    db = null
  }
}
