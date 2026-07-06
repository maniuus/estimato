import {
  AhsRepository,
  AhsComponentMaterialRepository,
  AhsComponentWageRepository,
  AhsComponentEquipmentRepository
} from '../database/repositories/ahs-repository'
import { Ahs, AhsComponentMaterial, AhsComponentWage, AhsComponentEquipment } from '../database/repositories/types'
import { ServiceResult, success, failure } from './base-service'

export class AhsService {
  private ahsRepo = new AhsRepository()
  private materialCompRepo = new AhsComponentMaterialRepository()
  private wageCompRepo = new AhsComponentWageRepository()
  private equipmentCompRepo = new AhsComponentEquipmentRepository()

  // ── AHS ──

  getAll(): ServiceResult<Ahs[]> {
    try {
      return success(this.ahsRepo.getAll())
    } catch (e) {
      return failure((e as Error).message)
    }
  }

  getById(id: string): ServiceResult<Ahs | null> {
    try {
      return success(this.ahsRepo.getById(id))
    } catch (e) {
      return failure((e as Error).message)
    }
  }

  create(data: Omit<Ahs, 'id' | 'createdAt' | 'updatedAt' | 'totalPrice'>): ServiceResult<Ahs> {
    try {
      return success(this.ahsRepo.create(data))
    } catch (e) {
      return failure((e as Error).message)
    }
  }

  update(id: string, data: Partial<Omit<Ahs, 'id' | 'createdAt' | 'updatedAt'>>): ServiceResult<Ahs | null> {
    try {
      const updated = this.ahsRepo.update(id, data)
      if (!updated) return failure('AHS tidak ditemukan')
      return success(updated)
    } catch (e) {
      return failure((e as Error).message)
    }
  }

  delete(id: string): ServiceResult<boolean> {
    try {
      return success(this.ahsRepo.delete(id))
    } catch (e) {
      return failure((e as Error).message)
    }
  }

  getByProjectId(projectId: string): ServiceResult<Ahs[]> {
    try {
      return success(this.ahsRepo.getByProjectId(projectId))
    } catch (e) {
      return failure((e as Error).message)
    }
  }

  getLibrary(): ServiceResult<Ahs[]> {
    try {
      return success(this.ahsRepo.getLibrary())
    } catch (e) {
      return failure((e as Error).message)
    }
  }

  // ── AHS Components: Material ──

  getMaterialComponents(ahsId: string, projectId?: string): ServiceResult<AhsComponentMaterial[]> {
    try {
      return success(this.materialCompRepo.getByAhsId(ahsId, projectId))
    } catch (e) {
      return failure((e as Error).message)
    }
  }

  createMaterialComponent(data: Omit<AhsComponentMaterial, 'id'>): ServiceResult<AhsComponentMaterial> {
    try {
      const comp = this.materialCompRepo.create(data)
      this.ahsRepo.recalculateTotalPrice(data.ahsId)
      return success(comp)
    } catch (e) {
      return failure((e as Error).message)
    }
  }

  updateMaterialComponent(id: string, data: Partial<Omit<AhsComponentMaterial, 'id'>>): ServiceResult<AhsComponentMaterial | null> {
    try {
      const comp = this.materialCompRepo.getById(id)
      if (!comp) return failure('Komponen tidak ditemukan')
      const updated = this.materialCompRepo.update(id, data)
      this.ahsRepo.recalculateTotalPrice(comp.ahsId)
      return success(updated)
    } catch (e) {
      return failure((e as Error).message)
    }
  }

  deleteMaterialComponent(id: string): ServiceResult<boolean> {
    try {
      const comp = this.materialCompRepo.getById(id)
      if (comp) {
        const result = this.materialCompRepo.delete(id)
        this.ahsRepo.recalculateTotalPrice(comp.ahsId)
        return success(result)
      }
      return success(true)
    } catch (e) {
      return failure((e as Error).message)
    }
  }

  // ── AHS Components: Wage ──

  getWageComponents(ahsId: string, projectId?: string): ServiceResult<AhsComponentWage[]> {
    try {
      return success(this.wageCompRepo.getByAhsId(ahsId, projectId))
    } catch (e) {
      return failure((e as Error).message)
    }
  }

  createWageComponent(data: Omit<AhsComponentWage, 'id'>): ServiceResult<AhsComponentWage> {
    try {
      const comp = this.wageCompRepo.create(data)
      this.ahsRepo.recalculateTotalPrice(data.ahsId)
      return success(comp)
    } catch (e) {
      return failure((e as Error).message)
    }
  }

  updateWageComponent(id: string, data: Partial<Omit<AhsComponentWage, 'id'>>): ServiceResult<AhsComponentWage | null> {
    try {
      const comp = this.wageCompRepo.getById(id)
      if (!comp) return failure('Komponen tidak ditemukan')
      const updated = this.wageCompRepo.update(id, data)
      this.ahsRepo.recalculateTotalPrice(comp.ahsId)
      return success(updated)
    } catch (e) {
      return failure((e as Error).message)
    }
  }

  deleteWageComponent(id: string): ServiceResult<boolean> {
    try {
      const comp = this.wageCompRepo.getById(id)
      if (comp) {
        const result = this.wageCompRepo.delete(id)
        this.ahsRepo.recalculateTotalPrice(comp.ahsId)
        return success(result)
      }
      return success(true)
    } catch (e) {
      return failure((e as Error).message)
    }
  }

  // ── AHS Components: Equipment ──

  getEquipmentComponents(ahsId: string, projectId?: string): ServiceResult<AhsComponentEquipment[]> {
    try {
      return success(this.equipmentCompRepo.getByAhsId(ahsId, projectId))
    } catch (e) {
      return failure((e as Error).message)
    }
  }

  createEquipmentComponent(data: Omit<AhsComponentEquipment, 'id'>): ServiceResult<AhsComponentEquipment> {
    try {
      const comp = this.equipmentCompRepo.create(data)
      this.ahsRepo.recalculateTotalPrice(data.ahsId)
      return success(comp)
    } catch (e) {
      return failure((e as Error).message)
    }
  }

  updateEquipmentComponent(id: string, data: Partial<Omit<AhsComponentEquipment, 'id'>>): ServiceResult<AhsComponentEquipment | null> {
    try {
      const comp = this.equipmentCompRepo.getById(id)
      if (!comp) return failure('Komponen tidak ditemukan')
      const updated = this.equipmentCompRepo.update(id, data)
      this.ahsRepo.recalculateTotalPrice(comp.ahsId)
      return success(updated)
    } catch (e) {
      return failure((e as Error).message)
    }
  }

  deleteEquipmentComponent(id: string): ServiceResult<boolean> {
    try {
      const comp = this.equipmentCompRepo.getById(id)
      if (comp) {
        const result = this.equipmentCompRepo.delete(id)
        this.ahsRepo.recalculateTotalPrice(comp.ahsId)
        return success(result)
      }
      return success(true)
    } catch (e) {
      return failure((e as Error).message)
    }
  }
}
