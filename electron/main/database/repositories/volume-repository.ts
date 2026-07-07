import { BaseRepository } from './base-repository'
import { VolumeItem } from './types'

export class VolumeItemRepository extends BaseRepository<VolumeItem> {
  protected tableName = 'VolumeItem'

  getByWbsItemId(wbsItemId: string): VolumeItem | null {
    return this.queryOne(
      `SELECT * FROM "VolumeItem" WHERE wbsItemId = @wbsItemId`,
      { wbsItemId }
    )
  }

  getByProjectId(projectId: string): VolumeItem[] {
    return this.queryAll(
      `SELECT v.* FROM "VolumeItem" v
       INNER JOIN "WbsItem" w ON w.id = v.wbsItemId
       WHERE w.projectId = @projectId
       ORDER BY w.wbsPath`,
      { projectId }
    )
  }

  create(data: Omit<VolumeItem, 'id' | 'createdAt' | 'updatedAt'>): VolumeItem {
    const id = this.generateId()
    const now = this.now()

    this.executeInsert(
      `INSERT INTO "VolumeItem" (id, wbsItemId, ahsId, volume, unit, formula, notes, projectVolumeId, createdAt, updatedAt)
       VALUES (@id, @wbsItemId, @ahsId, @volume, @unit, @formula, @notes, @projectVolumeId, @createdAt, @updatedAt)`,
      {
        id,
        wbsItemId: data.wbsItemId,
        ahsId: data.ahsId ?? null,
        volume: data.volume ?? 0,
        unit: data.unit ?? '',
        formula: data.formula ?? '',
        notes: data.notes ?? '',
        projectVolumeId: data.projectVolumeId ?? null,
        createdAt: now,
        updatedAt: now
      }
    )

    return this.getById(id)!
  }

  update(
    id: string,
    data: Partial<Omit<VolumeItem, 'id' | 'createdAt' | 'updatedAt'>>
  ): VolumeItem | null {
    const existing = this.getById(id)
    if (!existing) return null

    const updates: string[] = []
    const params: Record<string, unknown> = { id }

    for (const [key, value] of Object.entries(data)) {
      if (value !== undefined) {
        updates.push(`"${key}" = @${key}`)
        params[key] = value
      }
    }

    if (updates.length === 0) return existing

    params.updatedAt = this.now()
    updates.push('"updatedAt" = @updatedAt')

    this.executeUpdate(
      `UPDATE "VolumeItem" SET ${updates.join(', ')} WHERE id = @id`,
      params
    )

    return this.getById(id)
  }

  upsertByWbsItem(
    wbsItemId: string,
    data: Partial<Omit<VolumeItem, 'id' | 'createdAt' | 'updatedAt' | 'wbsItemId'>>
  ): VolumeItem {
    const existing = this.getByWbsItemId(wbsItemId)
    if (existing) {
      return this.update(existing.id, data)!
    }
    return this.create({
      wbsItemId,
      ahsId: data.ahsId ?? null,
      volume: data.volume ?? 0,
      unit: data.unit ?? '',
      formula: data.formula ?? '',
      notes: data.notes ?? '',
      projectVolumeId: data.projectVolumeId ?? null
    })
  }
}
