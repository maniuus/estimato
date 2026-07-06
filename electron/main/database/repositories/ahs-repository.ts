import { BaseRepository } from './base-repository'
import {
  Ahs,
  AhsComponentMaterial,
  AhsComponentWage,
  AhsComponentEquipment
} from './types'

export class AhsRepository extends BaseRepository<Ahs> {
  protected tableName = 'Ahs'

  create(
    data: Omit<Ahs, 'id' | 'createdAt' | 'updatedAt' | 'totalPrice'>
  ): Ahs {
    const id = this.generateId()
    const now = this.now()

    this.executeInsert(
      `INSERT INTO "Ahs" (id, code, name, unit, category, source, totalPrice, projectId, createdAt, updatedAt)
       VALUES (@id, @code, @name, @unit, @category, @source, 0, @projectId, @createdAt, @updatedAt)`,
      { ...data, id, projectId: data.projectId ?? null, createdAt: now, updatedAt: now }
    )

    return this.getById(id)!
  }

  update(
    id: string,
    data: Partial<Omit<Ahs, 'id' | 'createdAt' | 'updatedAt'>>
  ): Ahs | null {
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
      `UPDATE "Ahs" SET ${updates.join(', ')} WHERE id = @id`,
      params
    )

    return this.getById(id)
  }

  recalculateTotalPrice(id: string): Ahs | null {
    const materialTotal = this.queryOne<{ total: number }>(
      `SELECT COALESCE(SUM(totalPrice), 0) as total FROM AhsComponentMaterial WHERE ahsId = @id`,
      { id }
    )
    const wageTotal = this.queryOne<{ total: number }>(
      `SELECT COALESCE(SUM(totalPrice), 0) as total FROM AhsComponentWage WHERE ahsId = @id`,
      { id }
    )
    const equipmentTotal = this.queryOne<{ total: number }>(
      `SELECT COALESCE(SUM(totalPrice), 0) as total FROM AhsComponentEquipment WHERE ahsId = @id`,
      { id }
    )

    const total =
      (materialTotal?.total ?? 0) +
      (wageTotal?.total ?? 0) +
      (equipmentTotal?.total ?? 0)

    this.executeUpdate(
      `UPDATE "Ahs" SET totalPrice = @total, updatedAt = @now WHERE id = @id`,
      { id, total, now: this.now() }
    )

    return this.getById(id)
  }

  calculateProjectAhsPrice(ahsId: string, projectId?: string): number {
    if (!projectId) {
      const existing = this.getById(ahsId)
      return existing?.totalPrice ?? 0
    }

    const materialTotal = this.queryOne<{ total: number }>(
      `SELECT COALESCE(SUM(acm.coefficient * COALESCE(pcp.overriddenPrice, m.unitPrice)), 0) as total
       FROM AhsComponentMaterial acm
       JOIN Material m ON m.id = acm.materialId
       LEFT JOIN ProjectComponentPrice pcp ON pcp.componentId = acm.materialId AND pcp.projectId = @projectId
       WHERE acm.ahsId = @ahsId`,
      { ahsId, projectId }
    )

    const wageTotal = this.queryOne<{ total: number }>(
      `SELECT COALESCE(SUM(acw.coefficient * COALESCE(pcp.overriddenPrice, w.dailyWage)), 0) as total
       FROM AhsComponentWage acw
       JOIN Wage w ON w.id = acw.wageId
       LEFT JOIN ProjectComponentPrice pcp ON pcp.componentId = acw.wageId AND pcp.projectId = @projectId
       WHERE acw.ahsId = @ahsId`,
      { ahsId, projectId }
    )

    const equipmentTotal = this.queryOne<{ total: number }>(
      `SELECT COALESCE(SUM(ace.coefficient * COALESCE(pcp.overriddenPrice, e.rentalPrice)), 0) as total
       FROM AhsComponentEquipment ace
       JOIN Equipment e ON e.id = ace.equipmentId
       LEFT JOIN ProjectComponentPrice pcp ON pcp.componentId = ace.equipmentId AND pcp.projectId = @projectId
       WHERE ace.ahsId = @ahsId`,
      { ahsId, projectId }
    )

    return (materialTotal?.total ?? 0) + (wageTotal?.total ?? 0) + (equipmentTotal?.total ?? 0)
  }

  getByProjectId(projectId: string): Ahs[] {
    return this.queryAll(
      `SELECT * FROM "Ahs" WHERE projectId = @projectId OR projectId IS NULL ORDER BY name`,
      { projectId }
    )
  }

  getLibrary(): Ahs[] {
    return this.queryAll(
      `SELECT * FROM "Ahs" WHERE projectId IS NULL ORDER BY name`
    )
  }
}

export class AhsComponentMaterialRepository extends BaseRepository<AhsComponentMaterial> {
  protected tableName = 'AhsComponentMaterial'

  create(
    data: Omit<AhsComponentMaterial, 'id' | 'totalPrice'>
  ): AhsComponentMaterial {
    const id = this.generateId()
    const material = this.queryOne<{ unitPrice: number }>(
      `SELECT unitPrice FROM Material WHERE id = @materialId`,
      { materialId: data.materialId }
    )
    const unitPrice = material?.unitPrice ?? 0
    const totalPrice = data.coefficient * unitPrice

    this.executeInsert(
      `INSERT INTO "AhsComponentMaterial" (id, ahsId, materialId, coefficient, totalPrice)
       VALUES (@id, @ahsId, @materialId, @coefficient, @totalPrice)`,
      { ...data, id, totalPrice }
    )

    return this.getById(id)!
  }

  update(
    id: string,
    data: Partial<Omit<AhsComponentMaterial, 'id'>>
  ): AhsComponentMaterial | null {
    const existing = this.getById(id)
    if (!existing) return null

    const coefficient = data.coefficient ?? existing.coefficient
    const materialId = data.materialId ?? existing.materialId
    const material = this.queryOne<{ unitPrice: number }>(
      `SELECT unitPrice FROM Material WHERE id = @id`,
      { id: materialId }
    )
    const totalPrice = coefficient * (material?.unitPrice ?? 0)

    this.executeUpdate(
      `UPDATE "AhsComponentMaterial" SET coefficient = @coefficient, totalPrice = @totalPrice WHERE id = @id`,
      { id, coefficient, totalPrice }
    )

    return this.getById(id)
  }

  getByAhsId(ahsId: string, projectId?: string): AhsComponentMaterial[] {
    if (projectId) {
      return this.queryAll(
        `SELECT acm.id, acm.ahsId, acm.materialId, acm.coefficient,
                m.name as materialName, m.unit as materialUnit,
                COALESCE(pcp.overriddenPrice, m.unitPrice) as unitPrice,
                acm.coefficient * COALESCE(pcp.overriddenPrice, m.unitPrice) as totalPrice,
                CASE WHEN pcp.overriddenPrice IS NOT NULL THEN 1 ELSE 0 END as isOverridden
         FROM AhsComponentMaterial acm
         LEFT JOIN Material m ON m.id = acm.materialId
         LEFT JOIN ProjectComponentPrice pcp ON pcp.componentId = acm.materialId AND pcp.projectId = @projectId
         WHERE acm.ahsId = @ahsId`,
        { ahsId, projectId }
      )
    }
    return this.queryAll(
      `SELECT acm.*, m.name as materialName, m.unit as materialUnit, m.unitPrice, 0 as isOverridden
       FROM AhsComponentMaterial acm
       LEFT JOIN Material m ON m.id = acm.materialId
       WHERE acm.ahsId = @ahsId`,
      { ahsId }
    )
  }
}

export class AhsComponentWageRepository extends BaseRepository<AhsComponentWage> {
  protected tableName = 'AhsComponentWage'

  create(data: Omit<AhsComponentWage, 'id' | 'totalPrice'>): AhsComponentWage {
    const id = this.generateId()
    const wage = this.queryOne<{ dailyWage: number }>(
      `SELECT dailyWage FROM Wage WHERE id = @id`,
      { id: data.wageId }
    )
    const totalPrice = data.coefficient * (wage?.dailyWage ?? 0)

    this.executeInsert(
      `INSERT INTO "AhsComponentWage" (id, ahsId, wageId, coefficient, totalPrice)
       VALUES (@id, @ahsId, @wageId, @coefficient, @totalPrice)`,
      { ...data, id, totalPrice }
    )

    return this.getById(id)!
  }

  update(
    id: string,
    data: Partial<Omit<AhsComponentWage, 'id'>>
  ): AhsComponentWage | null {
    const existing = this.getById(id)
    if (!existing) return null

    const coefficient = data.coefficient ?? existing.coefficient
    const wageId = data.wageId ?? existing.wageId
    const wage = this.queryOne<{ dailyWage: number }>(
      `SELECT dailyWage FROM Wage WHERE id = @id`,
      { id: wageId }
    )
    const totalPrice = coefficient * (wage?.dailyWage ?? 0)

    this.executeUpdate(
      `UPDATE "AhsComponentWage" SET coefficient = @coefficient, totalPrice = @totalPrice WHERE id = @id`,
      { id, coefficient, totalPrice }
    )

    return this.getById(id)
  }

  getByAhsId(ahsId: string, projectId?: string): AhsComponentWage[] {
    if (projectId) {
      return this.queryAll(
        `SELECT acw.id, acw.ahsId, acw.wageId, acw.coefficient,
                w.type as wageType, w.unit as wageUnit,
                COALESCE(pcp.overriddenPrice, w.dailyWage) as dailyWage,
                acw.coefficient * COALESCE(pcp.overriddenPrice, w.dailyWage) as totalPrice,
                CASE WHEN pcp.overriddenPrice IS NOT NULL THEN 1 ELSE 0 END as isOverridden
         FROM AhsComponentWage acw
         LEFT JOIN Wage w ON w.id = acw.wageId
         LEFT JOIN ProjectComponentPrice pcp ON pcp.componentId = acw.wageId AND pcp.projectId = @projectId
         WHERE acw.ahsId = @ahsId`,
        { ahsId, projectId }
      )
    }
    return this.queryAll(
      `SELECT acw.*, w.type as wageType, w.dailyWage, w.unit as wageUnit, 0 as isOverridden
       FROM AhsComponentWage acw
       LEFT JOIN Wage w ON w.id = acw.wageId
       WHERE acw.ahsId = @ahsId`,
      { ahsId }
    )
  }
}

export class AhsComponentEquipmentRepository extends BaseRepository<AhsComponentEquipment> {
  protected tableName = 'AhsComponentEquipment'

  create(data: Omit<AhsComponentEquipment, 'id' | 'totalPrice'>): AhsComponentEquipment {
    const id = this.generateId()
    const equipment = this.queryOne<{ rentalPrice: number }>(
      `SELECT rentalPrice FROM Equipment WHERE id = @id`,
      { id: data.equipmentId }
    )
    const totalPrice = data.coefficient * (equipment?.rentalPrice ?? 0)

    this.executeInsert(
      `INSERT INTO "AhsComponentEquipment" (id, ahsId, equipmentId, coefficient, totalPrice)
       VALUES (@id, @ahsId, @equipmentId, @coefficient, @totalPrice)`,
      { ...data, id, totalPrice }
    )

    return this.getById(id)!
  }

  update(
    id: string,
    data: Partial<Omit<AhsComponentEquipment, 'id'>>
  ): AhsComponentEquipment | null {
    const existing = this.getById(id)
    if (!existing) return null

    const coefficient = data.coefficient ?? existing.coefficient
    const equipmentId = data.equipmentId ?? existing.equipmentId
    const equipment = this.queryOne<{ rentalPrice: number }>(
      `SELECT rentalPrice FROM Equipment WHERE id = @id`,
      { id: equipmentId }
    )
    const totalPrice = coefficient * (equipment?.rentalPrice ?? 0)

    this.executeUpdate(
      `UPDATE "AhsComponentEquipment" SET coefficient = @coefficient, totalPrice = @totalPrice WHERE id = @id`,
      { id, coefficient, totalPrice }
    )

    return this.getById(id)
  }

  getByAhsId(ahsId: string, projectId?: string): AhsComponentEquipment[] {
    if (projectId) {
      return this.queryAll(
        `SELECT ace.id, ace.ahsId, ace.equipmentId, ace.coefficient,
                e.name as equipmentName, e.unit as equipmentUnit,
                COALESCE(pcp.overriddenPrice, e.rentalPrice) as rentalPrice,
                ace.coefficient * COALESCE(pcp.overriddenPrice, e.rentalPrice) as totalPrice,
                CASE WHEN pcp.overriddenPrice IS NOT NULL THEN 1 ELSE 0 END as isOverridden
         FROM AhsComponentEquipment ace
         LEFT JOIN Equipment e ON e.id = ace.equipmentId
         LEFT JOIN ProjectComponentPrice pcp ON pcp.componentId = ace.equipmentId AND pcp.projectId = @projectId
         WHERE ace.ahsId = @ahsId`,
        { ahsId, projectId }
      )
    }
    return this.queryAll(
      `SELECT ace.*, e.name as equipmentName, e.rentalPrice, e.unit as equipmentUnit, 0 as isOverridden
       FROM AhsComponentEquipment ace
       LEFT JOIN Equipment e ON e.id = ace.equipmentId
       WHERE ace.ahsId = @ahsId`,
      { ahsId }
    )
  }
}
