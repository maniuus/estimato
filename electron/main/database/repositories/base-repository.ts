import { getDatabase, saveDatabase } from '../connection'
import { v4 as uuid } from 'uuid'

export abstract class BaseRepository<T extends { id: string }> {
  protected abstract tableName: string

  private toPositional(sql: string, params: Record<string, unknown>): { sql: string; values: any[] } {
    const keys: string[] = []
    const values: any[] = []
    const replaced = sql.replace(/@(\w+)/g, (_, key) => {
      keys.push(key)
      values.push(params[key] !== undefined ? params[key] : null)
      return '?'
    })
    return { sql: replaced, values }
  }

  getAll(): T[] {
    const db = getDatabase()
    const stmt = db.prepare(`SELECT * FROM "${this.tableName}" ORDER BY createdAt DESC`)
    const results: T[] = []
    while (stmt.step()) {
      results.push(stmt.getAsObject() as T)
    }
    stmt.free()
    return results
  }

  getById(id: string): T | null {
    const db = getDatabase()
    const stmt = db.prepare(`SELECT * FROM "${this.tableName}" WHERE id = ?`)
    stmt.bind([id])
    const hasRow = stmt.step()
    const row = hasRow ? (stmt.getAsObject() as T) : null
    stmt.free()
    return row
  }

  protected executeInsert(sql: string, params: Record<string, unknown>): void {
    const db = getDatabase()
    const { sql: s, values } = this.toPositional(sql, params)
    const stmt = db.prepare(s)
    stmt.bind(values)
    stmt.run()
    stmt.free()
    saveDatabase()
  }

  protected executeUpdate(sql: string, params: Record<string, unknown>): void {
    const db = getDatabase()
    const { sql: s, values } = this.toPositional(sql, params)
    const stmt = db.prepare(s)
    stmt.bind(values)
    stmt.run()
    stmt.free()
    saveDatabase()
  }

  protected executeDelete(sql: string, params: Record<string, unknown>): boolean {
    const db = getDatabase()
    const { sql: s, values } = this.toPositional(sql, params)
    const stmt = db.prepare(s)
    stmt.bind(values)
    stmt.run()
    stmt.free()
    saveDatabase()
    return true
  }

  protected generateId(): string {
    return uuid()
  }

  protected now(): string {
    return new Date().toISOString()
  }

  public queryAll<R = T>(sql: string, params: Record<string, unknown> = {}): R[] {
    const db = getDatabase()
    const { sql: s, values } = this.toPositional(sql, params)
    const stmt = db.prepare(s)
    stmt.bind(values)
    const results: R[] = []
    while (stmt.step()) {
      results.push(stmt.getAsObject() as unknown as R)
    }
    stmt.free()
    return results
  }

  public queryOne<R = T>(sql: string, params: Record<string, unknown> = {}): R | null {
    const db = getDatabase()
    const { sql: s, values } = this.toPositional(sql, params)
    const stmt = db.prepare(s)
    stmt.bind(values)
    const hasRow = stmt.step()
    const row = hasRow ? (stmt.getAsObject() as unknown as R) : null
    stmt.free()
    return row
  }

  delete(id: string): boolean {
    return this.executeDelete(
      `DELETE FROM "${this.tableName}" WHERE id = @id`,
      { id }
    )
  }
}
