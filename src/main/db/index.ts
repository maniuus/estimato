import { DatabaseSync } from 'node:sqlite'
import { app } from 'electron'
import { join } from 'path'

export type DbType = 'app' | 'ref'

function getDbPath(type: DbType): string {
  const userData = app?.getPath?.('userData') ?? join(process.cwd(), '.data')
  return join(userData, type === 'app' ? 'estimato-app.db' : 'estimato-ref.db')
}

export function openDb(type: DbType): DatabaseSync {
  const db = new DatabaseSync(getDbPath(type))
  db.exec('PRAGMA journal_mode = WAL;')
  db.exec('PRAGMA foreign_keys = ON;')
  return db
}
