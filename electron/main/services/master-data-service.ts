import {
  MaterialRepository,
  WageRepository,
  EquipmentRepository
} from '../database/repositories/master-data-repository'
import { Material, Wage, Equipment } from '../database/repositories/types'
import { ServiceResult, success, failure } from './base-service'
import { getDatabase, saveDatabase } from '../database/connection'
import { AhsRepository } from '../database/repositories/ahs-repository'

export class MasterDataService {
  private materialRepo = new MaterialRepository()
  private wageRepo = new WageRepository()
  private equipmentRepo = new EquipmentRepository()
  private ahsRepo = new AhsRepository()

  // ── Material ──

  getAllMaterials(): ServiceResult<Material[]> {
    try {
      return success(this.materialRepo.getAll())
    } catch (e) {
      return failure((e as Error).message)
    }
  }

  getMaterialById(id: string): ServiceResult<Material | null> {
    try {
      return success(this.materialRepo.getById(id))
    } catch (e) {
      return failure((e as Error).message)
    }
  }

  createMaterial(data: Omit<Material, 'id' | 'createdAt' | 'updatedAt'>): ServiceResult<Material> {
    try {
      return success(this.materialRepo.create(data))
    } catch (e) {
      return failure((e as Error).message)
    }
  }

  updateMaterial(id: string, data: Partial<Omit<Material, 'id' | 'createdAt' | 'updatedAt'>>): ServiceResult<Material | null> {
    try {
      const updated = this.materialRepo.update(id, data)
      if (!updated) return failure('Material tidak ditemukan')

      if (data.unitPrice !== undefined) {
        const db = getDatabase()
        const stmt = db.prepare(`SELECT DISTINCT ahsId FROM AhsComponentMaterial WHERE materialId = ?`)
        stmt.bind([id])
        const ahsIds: string[] = []
        while (stmt.step()) {
          const row = stmt.getAsObject() as { ahsId: string }
          if (row.ahsId) ahsIds.push(row.ahsId)
        }
        stmt.free()

        if (ahsIds.length > 0) {
          const updateStmt = db.prepare(`UPDATE AhsComponentMaterial SET totalPrice = coefficient * ? WHERE materialId = ?`)
          updateStmt.run([data.unitPrice, id])
          updateStmt.free()

          for (const ahsId of ahsIds) {
            this.ahsRepo.recalculateTotalPrice(ahsId)
          }
          saveDatabase()
        }
      }

      return success(updated)
    } catch (e) {
      return failure((e as Error).message)
    }
  }

  deleteMaterial(id: string): ServiceResult<boolean> {
    try {
      return success(this.materialRepo.delete(id))
    } catch (e) {
      return failure((e as Error).message)
    }
  }

  searchMaterials(query: string): ServiceResult<Material[]> {
    try {
      return success(this.materialRepo.search(query))
    } catch (e) {
      return failure((e as Error).message)
    }
  }

  // ── Wage ──

  getAllWages(): ServiceResult<Wage[]> {
    try {
      return success(this.wageRepo.getAll())
    } catch (e) {
      return failure((e as Error).message)
    }
  }

  getWageById(id: string): ServiceResult<Wage | null> {
    try {
      return success(this.wageRepo.getById(id))
    } catch (e) {
      return failure((e as Error).message)
    }
  }

  createWage(data: Omit<Wage, 'id' | 'createdAt' | 'updatedAt'>): ServiceResult<Wage> {
    try {
      return success(this.wageRepo.create(data))
    } catch (e) {
      return failure((e as Error).message)
    }
  }

  updateWage(id: string, data: Partial<Omit<Wage, 'id' | 'createdAt' | 'updatedAt'>>): ServiceResult<Wage | null> {
    try {
      const updated = this.wageRepo.update(id, data)
      if (!updated) return failure('Upah tidak ditemukan')

      if (data.dailyWage !== undefined) {
        const db = getDatabase()
        const stmt = db.prepare(`SELECT DISTINCT ahsId FROM AhsComponentWage WHERE wageId = ?`)
        stmt.bind([id])
        const ahsIds: string[] = []
        while (stmt.step()) {
          const row = stmt.getAsObject() as { ahsId: string }
          if (row.ahsId) ahsIds.push(row.ahsId)
        }
        stmt.free()

        if (ahsIds.length > 0) {
          const updateStmt = db.prepare(`UPDATE AhsComponentWage SET totalPrice = coefficient * ? WHERE wageId = ?`)
          updateStmt.run([data.dailyWage, id])
          updateStmt.free()

          for (const ahsId of ahsIds) {
            this.ahsRepo.recalculateTotalPrice(ahsId)
          }
          saveDatabase()
        }
      }

      return success(updated)
    } catch (e) {
      return failure((e as Error).message)
    }
  }

  deleteWage(id: string): ServiceResult<boolean> {
    try {
      return success(this.wageRepo.delete(id))
    } catch (e) {
      return failure((e as Error).message)
    }
  }

  // ── Equipment ──

  getAllEquipment(): ServiceResult<Equipment[]> {
    try {
      return success(this.equipmentRepo.getAll())
    } catch (e) {
      return failure((e as Error).message)
    }
  }

  getEquipmentById(id: string): ServiceResult<Equipment | null> {
    try {
      return success(this.equipmentRepo.getById(id))
    } catch (e) {
      return failure((e as Error).message)
    }
  }

  createEquipment(data: Omit<Equipment, 'id' | 'createdAt' | 'updatedAt'>): ServiceResult<Equipment> {
    try {
      return success(this.equipmentRepo.create(data))
    } catch (e) {
      return failure((e as Error).message)
    }
  }

  updateEquipment(id: string, data: Partial<Omit<Equipment, 'id' | 'createdAt' | 'updatedAt'>>): ServiceResult<Equipment | null> {
    try {
      const updated = this.equipmentRepo.update(id, data)
      if (!updated) return failure('Alat tidak ditemukan')

      if (data.rentalPrice !== undefined) {
        const db = getDatabase()
        const stmt = db.prepare(`SELECT DISTINCT ahsId FROM AhsComponentEquipment WHERE equipmentId = ?`)
        stmt.bind([id])
        const ahsIds: string[] = []
        while (stmt.step()) {
          const row = stmt.getAsObject() as { ahsId: string }
          if (row.ahsId) ahsIds.push(row.ahsId)
        }
        stmt.free()

        if (ahsIds.length > 0) {
          const updateStmt = db.prepare(`UPDATE AhsComponentEquipment SET totalPrice = coefficient * ? WHERE equipmentId = ?`)
          updateStmt.run([data.rentalPrice, id])
          updateStmt.free()

          for (const ahsId of ahsIds) {
            this.ahsRepo.recalculateTotalPrice(ahsId)
          }
          saveDatabase()
        }
      }

      return success(updated)
    } catch (e) {
      return failure((e as Error).message)
    }
  }

  deleteEquipment(id: string): ServiceResult<boolean> {
    try {
      return success(this.equipmentRepo.delete(id))
    } catch (e) {
      return failure((e as Error).message)
    }
  }
}
