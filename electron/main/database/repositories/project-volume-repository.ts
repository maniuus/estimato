import { BaseRepository } from './base-repository'
import { ProjectVolume } from './types'

export class ProjectVolumeRepository extends BaseRepository<ProjectVolume> {
  protected tableName = 'ProjectVolume'

  getByProjectId(projectId: string): ProjectVolume[] {
    return this.queryAll(
      `SELECT * FROM "ProjectVolume" WHERE projectId = @projectId ORDER BY name`,
      { projectId }
    )
  }

  create(data: Omit<ProjectVolume, 'id' | 'createdAt' | 'updatedAt'>): ProjectVolume {
    const id = this.generateId()
    const now = this.now()

    this.executeInsert(
      `INSERT INTO "ProjectVolume" (id, projectId, name, unit, value, formula, notes, createdAt, updatedAt)
       VALUES (@id, @projectId, @name, @unit, @value, @formula, @notes, @createdAt, @updatedAt)`,
      {
        id,
        projectId: data.projectId,
        name: data.name,
        unit: data.unit ?? '',
        value: data.value ?? 0,
        formula: data.formula ?? '',
        notes: data.notes ?? '',
        createdAt: now,
        updatedAt: now
      }
    )

    return this.getById(id)!
  }

  update(
    id: string,
    data: Partial<Omit<ProjectVolume, 'id' | 'createdAt' | 'updatedAt' | 'projectId'>>
  ): ProjectVolume | null {
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
      `UPDATE "ProjectVolume" SET ${updates.join(', ')} WHERE id = @id`,
      params
    )

    return this.getById(id)
  }
}
