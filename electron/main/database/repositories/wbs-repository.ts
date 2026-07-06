import { BaseRepository } from './base-repository'
import { WbsItem } from './types'

export class WbsItemRepository extends BaseRepository<WbsItem> {
  protected tableName = 'WbsItem'

  getByProjectId(projectId: string): WbsItem[] {
    return this.queryAll(
      `SELECT * FROM "WbsItem" WHERE projectId = @projectId ORDER BY wbsPath`,
      { projectId }
    )
  }

  getChildren(parentId: string): WbsItem[] {
    return this.queryAll(
      `SELECT * FROM "WbsItem" WHERE parentId = @parentId ORDER BY sortOrder`,
      { parentId }
    )
  }

  getRoots(projectId: string): WbsItem[] {
    return this.queryAll(
      `SELECT * FROM "WbsItem" WHERE projectId = @projectId AND parentId IS NULL ORDER BY sortOrder`,
      { projectId }
    )
  }

  generateCode(projectId: string, parentId: string | null): string {
    if (!parentId) {
      const roots = this.getRoots(projectId)
      const nextNumber = roots.length + 1
      return String(nextNumber)
    }

    const parent = this.getById(parentId)
    if (!parent) return '1'

    const siblings = this.getChildren(parentId)
    const nextNumber = siblings.length + 1
    return `${parent.code}.${nextNumber}`
  }

  generatePath(projectId: string, parentId: string | null, code: string): string {
    if (!parentId) return code
    const parent = this.getById(parentId)
    if (!parent) return code
    return `${parent.wbsPath}.${code.split('.').pop()}`
  }

  create(
    data: Omit<WbsItem, 'id' | 'createdAt' | 'updatedAt' | 'code' | 'wbsPath'>
  ): WbsItem {
    const id = this.generateId()
    const now = this.now()
    const code = this.generateCode(data.projectId, data.parentId ?? null)
    const wbsPath = this.generatePath(data.projectId, data.parentId ?? null, code)

    this.executeInsert(
      `INSERT INTO "WbsItem" (id, projectId, parentId, code, name, unit, type, sortOrder, wbsPath, createdAt, updatedAt)
       VALUES (@id, @projectId, @parentId, @code, @name, @unit, @type, @sortOrder, @wbsPath, @createdAt, @updatedAt)`,
      {
        id,
        projectId: data.projectId,
        parentId: data.parentId ?? null,
        code,
        name: data.name,
        unit: data.unit ?? '',
        type: data.type ?? 'item',
        sortOrder: data.sortOrder ?? 0,
        wbsPath,
        createdAt: now,
        updatedAt: now
      }
    )

    return this.getById(id)!
  }

  update(
    id: string,
    data: Partial<Omit<WbsItem, 'id' | 'createdAt' | 'updatedAt'>>
  ): WbsItem | null {
    const existing = this.getById(id)
    if (!existing) return null

    const updates: string[] = []
    const params: Record<string, unknown> = { id }

    for (const [key, value] of Object.entries(data)) {
      if (value !== undefined && key !== 'code' && key !== 'wbsPath') {
        updates.push(`"${key}" = @${key}`)
        params[key] = value
      }
    }

    if (updates.length === 0) return existing

    params.updatedAt = this.now()
    updates.push('"updatedAt" = @updatedAt')

    this.executeUpdate(
      `UPDATE "WbsItem" SET ${updates.join(', ')} WHERE id = @id`,
      params
    )

    return this.getById(id)
  }

  moveItem(
    id: string,
    newParentId: string | null,
    newSortOrder: number
  ): WbsItem | null {
    const existing = this.getById(id)
    if (!existing) return null

    const now = this.now()
    const newCode = this.generateCode(existing.projectId, newParentId)
    const newWbsPath = this.generatePath(existing.projectId, newParentId, newCode)

    this.executeUpdate(
      `UPDATE "WbsItem" SET parentId = @parentId, sortOrder = @sortOrder, code = @code, wbsPath = @wbsPath, updatedAt = @updatedAt WHERE id = @id`,
      {
        id,
        parentId: newParentId,
        sortOrder: newSortOrder,
        code: newCode,
        wbsPath: newWbsPath,
        updatedAt: now
      }
    )

    return this.getById(id)
  }

  delete(id: string): boolean {
    const children = this.getChildren(id)
    for (const child of children) {
      this.delete(child.id)
    }
    return super.delete(id)
  }
}
