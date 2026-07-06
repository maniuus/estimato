import { createStore } from 'zustand/vanilla'
import { useStore } from 'zustand'
import type { Material, Wage, Equipment } from '../types/models'
import { materialService, wageService, equipmentService } from '../services/master-data-service'

interface MasterDataState {
  materials: Material[]
  wages: Wage[]
  equipment: Equipment[]
  loading: boolean
  error: string | null
}

interface MasterDataActions {
  loadMaterials: () => Promise<void>
  loadWages: () => Promise<void>
  loadEquipment: () => Promise<void>
  loadAll: () => Promise<void>

  createMaterial: (data: Omit<Material, 'id' | 'createdAt' | 'updatedAt'>) => Promise<boolean>
  updateMaterial: (id: string, data: Partial<Omit<Material, 'id' | 'createdAt' | 'updatedAt'>>) => Promise<boolean>
  deleteMaterial: (id: string) => Promise<boolean>

  createWage: (data: Omit<Wage, 'id' | 'createdAt' | 'updatedAt'>) => Promise<boolean>
  updateWage: (id: string, data: Partial<Omit<Wage, 'id' | 'createdAt' | 'updatedAt'>>) => Promise<boolean>
  deleteWage: (id: string) => Promise<boolean>

  createEquipment: (data: Omit<Equipment, 'id' | 'createdAt' | 'updatedAt'>) => Promise<boolean>
  updateEquipment: (id: string, data: Partial<Omit<Equipment, 'id' | 'createdAt' | 'updatedAt'>>) => Promise<boolean>
  deleteEquipment: (id: string) => Promise<boolean>
}

export type MasterDataStore = MasterDataState & MasterDataActions

const masterDataStore = createStore<MasterDataStore>((set, get) => ({
  materials: [],
  wages: [],
  equipment: [],
  loading: false,
  error: null,

  loadMaterials: async () => {
    const result = await materialService.getAll()
    if (result.success) {
      set({ materials: result.data ?? [] })
    } else {
      set({ error: result.error })
    }
  },

  loadWages: async () => {
    const result = await wageService.getAll()
    if (result.success) {
      set({ wages: result.data ?? [] })
    } else {
      set({ error: result.error })
    }
  },

  loadEquipment: async () => {
    const result = await equipmentService.getAll()
    if (result.success) {
      set({ equipment: result.data ?? [] })
    } else {
      set({ error: result.error })
    }
  },

  loadAll: async () => {
    set({ loading: true, error: null })
    await Promise.all([get().loadMaterials(), get().loadWages(), get().loadEquipment()])
    set({ loading: false })
  },

  createMaterial: async (data) => {
    const result = await materialService.create(data)
    if (result.success) {
      await get().loadMaterials()
      return true
    }
    set({ error: result.error })
    return false
  },

  updateMaterial: async (id, data) => {
    const result = await materialService.update(id, data)
    if (result.success) {
      await get().loadMaterials()
      return true
    }
    set({ error: result.error })
    return false
  },

  deleteMaterial: async (id) => {
    const result = await materialService.delete(id)
    if (result.success) {
      await get().loadMaterials()
      return true
    }
    set({ error: result.error })
    return false
  },

  createWage: async (data) => {
    const result = await wageService.create(data)
    if (result.success) {
      await get().loadWages()
      return true
    }
    set({ error: result.error })
    return false
  },

  updateWage: async (id, data) => {
    const result = await wageService.update(id, data)
    if (result.success) {
      await get().loadWages()
      return true
    }
    set({ error: result.error })
    return false
  },

  deleteWage: async (id) => {
    const result = await wageService.delete(id)
    if (result.success) {
      await get().loadWages()
      return true
    }
    set({ error: result.error })
    return false
  },

  createEquipment: async (data) => {
    const result = await equipmentService.create(data)
    if (result.success) {
      await get().loadEquipment()
      return true
    }
    set({ error: result.error })
    return false
  },

  updateEquipment: async (id, data) => {
    const result = await equipmentService.update(id, data)
    if (result.success) {
      await get().loadEquipment()
      return true
    }
    set({ error: result.error })
    return false
  },

  deleteEquipment: async (id) => {
    const result = await equipmentService.delete(id)
    if (result.success) {
      await get().loadEquipment()
      return true
    }
    set({ error: result.error })
    return false
  }
}))

export function useMasterDataStore(): MasterDataStore {
  return useStore(masterDataStore)
}
