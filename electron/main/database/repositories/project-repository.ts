import { BaseRepository } from './base-repository'
import { Project } from './types'

export class ProjectRepository extends BaseRepository<Project> {
  protected tableName = 'Project'

  create(data: Omit<Project, 'id' | 'createdAt' | 'updatedAt'>): Project {
    const id = this.generateId()
    const now = this.now()
    this.executeInsert(
      `INSERT INTO "Project" (id, name, projectNumber, location, year, buildingType, buildingArea, floors, status, ppn, overhead, note, createdAt, updatedAt)
       VALUES (@id, @name, @projectNumber, @location, @year, @buildingType, @buildingArea, @floors, @status, @ppn, @overhead, @note, @createdAt, @updatedAt)`,
      { ...data, id, createdAt: now, updatedAt: now }
    )
    return this.getById(id)!
  }

  update(id: string, data: Partial<Omit<Project, 'id' | 'createdAt' | 'updatedAt'>>): Project | null {
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
      `UPDATE "Project" SET ${updates.join(', ')} WHERE id = @id`,
      params
    )

    return this.getById(id)
  }

  getByStatus(status: Project['status']): Project[] {
    return this.queryAll(
      `SELECT * FROM "Project" WHERE status = @status ORDER BY updatedAt DESC`,
      { status }
    )
  }
}
