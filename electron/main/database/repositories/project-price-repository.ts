import { BaseRepository } from './base-repository'

export interface ProjectComponentPrice {
  id: string
  projectId: string
  componentId: string
  category: 'Bahan' | 'Tenaga Kerja' | 'Alat'
  overriddenPrice: number
  createdAt?: string
  updatedAt?: string
}

export class ProjectComponentPriceRepository extends BaseRepository<ProjectComponentPrice> {
  protected tableName = 'ProjectComponentPrice'

  overridePrice(projectId: string, componentId: string, category: 'Bahan' | 'Tenaga Kerja' | 'Alat', price: number): void {
    const id = this.generateId()
    const now = this.now()

    this.executeInsert(
      `INSERT INTO "ProjectComponentPrice" (id, projectId, componentId, category, overriddenPrice, createdAt, updatedAt)
       VALUES (@id, @projectId, @componentId, @category, @overriddenPrice, @now, @now)
       ON CONFLICT(projectId, componentId) DO UPDATE SET
         overriddenPrice = excluded.overriddenPrice,
         updatedAt = excluded.updatedAt`,
      { id, projectId, componentId, category, overriddenPrice: price, now }
    )
  }

  getOverridesByProject(projectId: string): ProjectComponentPrice[] {
    return this.queryAll(
      `SELECT * FROM "ProjectComponentPrice" WHERE projectId = @projectId`,
      { projectId }
    )
  }

  deleteOverride(projectId: string, componentId: string): boolean {
    return this.executeDelete(
      `DELETE FROM "ProjectComponentPrice" WHERE projectId = @projectId AND componentId = @componentId`,
      { projectId, componentId }
    )
  }
}
