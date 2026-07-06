import { BaseRepository } from './base-repository'
import { RabSnapshot } from './types'

export class RabSnapshotRepository extends BaseRepository<RabSnapshot> {
  protected tableName = 'RabSnapshot'

  getByProjectId(projectId: string): RabSnapshot[] {
    return this.queryAll(
      `SELECT * FROM "RabSnapshot" WHERE projectId = @projectId ORDER BY calculatedAt DESC`,
      { projectId }
    )
  }

  getLatest(projectId: string): RabSnapshot | null {
    return this.queryOne(
      `SELECT * FROM "RabSnapshot" WHERE projectId = @projectId ORDER BY calculatedAt DESC LIMIT 1`,
      { projectId }
    )
  }

  create(data: Omit<RabSnapshot, 'id' | 'calculatedAt'>): RabSnapshot {
    const id = this.generateId()
    const now = new Date().toISOString()

    this.executeInsert(
      `INSERT INTO "RabSnapshot" (id, projectId, calculatedAt, totalPrice, ppn, overhead, grandTotal, data)
       VALUES (@id, @projectId, @calculatedAt, @totalPrice, @ppn, @overhead, @grandTotal, @data)`,
      {
        id,
        projectId: data.projectId,
        calculatedAt: now,
        totalPrice: data.totalPrice ?? 0,
        ppn: data.ppn ?? 0,
        overhead: data.overhead ?? 0,
        grandTotal: data.grandTotal ?? 0,
        data: data.data ?? '{}'
      }
    )

    return this.getById(id)!
  }
}
