import { BaseRepository } from './base-repository'
import { Material, Wage, Equipment } from './types'

export class MaterialRepository extends BaseRepository<Material> {
  protected tableName = 'Material'

  create(data: Omit<Material, 'id' | 'createdAt' | 'updatedAt'>): Material {
    const id = this.generateId()
    const now = this.now()
    this.executeInsert(
      `INSERT INTO "Material" (id, code, name, specification, category, unit, unitPrice, supplier, createdAt, updatedAt)
       VALUES (@id, @code, @name, @specification, @category, @unit, @unitPrice, @supplier, @createdAt, @updatedAt)`,
      { ...data, id, createdAt: now, updatedAt: now }
    )
    return this.getById(id)!
  }

  update(id: string, data: Partial<Omit<Material, 'id' | 'createdAt' | 'updatedAt'>>): Material | null {
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
      `UPDATE "Material" SET ${updates.join(', ')} WHERE id = @id`,
      params
    )
    return this.getById(id)
  }

  search(query: string): Material[] {
    return this.queryAll(
      `SELECT * FROM "Material" WHERE name LIKE @q OR code LIKE @q ORDER BY name`,
      { q: `%${query}%` }
    )
  }
}

export class WageRepository extends BaseRepository<Wage> {
  protected tableName = 'Wage'

  create(data: Omit<Wage, 'id' | 'createdAt' | 'updatedAt'>): Wage {
    const id = this.generateId()
    const now = this.now()
    this.executeInsert(
      `INSERT INTO "Wage" (id, type, dailyWage, unit, createdAt, updatedAt)
       VALUES (@id, @type, @dailyWage, @unit, @createdAt, @updatedAt)`,
      { ...data, id, createdAt: now, updatedAt: now }
    )
    return this.getById(id)!
  }

  update(id: string, data: Partial<Omit<Wage, 'id' | 'createdAt' | 'updatedAt'>>): Wage | null {
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
      `UPDATE "Wage" SET ${updates.join(', ')} WHERE id = @id`,
      params
    )
    return this.getById(id)
  }
}

export class EquipmentRepository extends BaseRepository<Equipment> {
  protected tableName = 'Equipment'

  create(data: Omit<Equipment, 'id' | 'createdAt' | 'updatedAt'>): Equipment {
    const id = this.generateId()
    const now = this.now()
    this.executeInsert(
      `INSERT INTO "Equipment" (id, name, type, capacity, rentalPrice, unit, createdAt, updatedAt)
       VALUES (@id, @name, @type, @capacity, @rentalPrice, @unit, @createdAt, @updatedAt)`,
      { ...data, id, createdAt: now, updatedAt: now }
    )
    return this.getById(id)!
  }

  update(id: string, data: Partial<Omit<Equipment, 'id' | 'createdAt' | 'updatedAt'>>): Equipment | null {
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
      `UPDATE "Equipment" SET ${updates.join(', ')} WHERE id = @id`,
      params
    )
    return this.getById(id)
  }
}
