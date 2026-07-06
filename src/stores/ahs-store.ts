import { createStore } from 'zustand/vanilla'
import { useStore } from 'zustand'
import type { Ahs, AhsComponentMaterial, AhsComponentWage, AhsComponentEquipment } from '../types/models'
import { ahsService } from '../services/ahs-service'

interface AhsState {
  ahsList: Ahs[]
  selectedAhs: Ahs | null
  materialComponents: AhsComponentMaterial[]
  wageComponents: AhsComponentWage[]
  equipmentComponents: AhsComponentEquipment[]
  loading: boolean
  error: string | null
}

interface AhsActions {
  loadAll: () => Promise<void>
  loadByProject: (projectId: string) => Promise<void>
  loadLibrary: () => Promise<void>
  selectAhs: (ahs: Ahs | null) => void
  createAhs: (data: Omit<Ahs, 'id' | 'createdAt' | 'updatedAt' | 'totalPrice'>) => Promise<boolean>
  updateAhs: (id: string, data: Partial<Omit<Ahs, 'id' | 'createdAt' | 'updatedAt'>>) => Promise<boolean>
  deleteAhs: (id: string) => Promise<boolean>

  loadComponents: (ahsId: string) => Promise<void>
  addMaterialComponent: (data: Omit<AhsComponentMaterial, 'id' | 'totalPrice'>) => Promise<boolean>
  updateMaterialComponent: (id: string, data: Partial<Omit<AhsComponentMaterial, 'id'>>) => Promise<boolean>
  deleteMaterialComponent: (id: string) => Promise<boolean>

  addWageComponent: (data: Omit<AhsComponentWage, 'id' | 'totalPrice'>) => Promise<boolean>
  updateWageComponent: (id: string, data: Partial<Omit<AhsComponentWage, 'id'>>) => Promise<boolean>
  deleteWageComponent: (id: string) => Promise<boolean>

  addEquipmentComponent: (data: Omit<AhsComponentEquipment, 'id' | 'totalPrice'>) => Promise<boolean>
  updateEquipmentComponent: (id: string, data: Partial<Omit<AhsComponentEquipment, 'id'>>) => Promise<boolean>
  deleteEquipmentComponent: (id: string) => Promise<boolean>
}

export type AhsStore = AhsState & AhsActions

const ahsStore = createStore<AhsStore>((set, get) => ({
  ahsList: [],
  selectedAhs: null,
  materialComponents: [],
  wageComponents: [],
  equipmentComponents: [],
  loading: false,
  error: null,

  loadAll: async () => {
    set({ loading: true, error: null })
    const result = await ahsService.getAll()
    if (result.success) set({ ahsList: result.data ?? [], loading: false })
    else set({ error: result.error, loading: false })
  },

  loadByProject: async (projectId) => {
    set({ loading: true, error: null })
    const result = await ahsService.getByProject(projectId)
    if (result.success) set({ ahsList: result.data ?? [], loading: false })
    else set({ error: result.error, loading: false })
  },

  loadLibrary: async () => {
    set({ loading: true, error: null })
    const result = await ahsService.getLibrary()
    if (result.success) set({ ahsList: result.data ?? [], loading: false })
    else set({ error: result.error, loading: false })
  },

  selectAhs: (ahs) => {
    set({ selectedAhs: ahs })
    if (ahs) get().loadComponents(ahs.id)
    else set({ materialComponents: [], wageComponents: [], equipmentComponents: [] })
  },

  createAhs: async (data) => {
    const result = await ahsService.create(data)
    if (result.success) {
      const projectId = data.projectId
      if (projectId) await get().loadByProject(projectId)
      else await get().loadAll()
      return true
    }
    set({ error: result.error })
    return false
  },

  updateAhs: async (id, data) => {
    const result = await ahsService.update(id, data)
    if (result.success) {
      if (get().selectedAhs?.id === id) set({ selectedAhs: result.data ?? null })
      const projectId = result.data?.projectId
      if (projectId) await get().loadByProject(projectId)
      else await get().loadAll()
      return true
    }
    set({ error: result.error })
    return false
  },

  deleteAhs: async (id) => {
    const result = await ahsService.delete(id)
    if (result.success) {
      if (get().selectedAhs?.id === id) set({ selectedAhs: null, materialComponents: [], wageComponents: [], equipmentComponents: [] })
      await get().loadAll()
      return true
    }
    set({ error: result.error })
    return false
  },

  loadComponents: async (ahsId) => {
    const [mat, wage, equip] = await Promise.all([
      ahsService.material.getByAhs(ahsId),
      ahsService.wage.getByAhs(ahsId),
      ahsService.equipment.getByAhs(ahsId)
    ])
    set({
      materialComponents: mat.success ? (mat.data ?? []) : [],
      wageComponents: wage.success ? (wage.data ?? []) : [],
      equipmentComponents: equip.success ? (equip.data ?? []) : []
    })
  },

  addMaterialComponent: async (data) => {
    const result = await ahsService.material.create(data)
    if (result.success) {
      await get().loadComponents(data.ahsId)
      return true
    }
    set({ error: result.error })
    return false
  },

  updateMaterialComponent: async (id, data) => {
    const result = await ahsService.material.update(id, data)
    if (result.success) {
      const comp = get().materialComponents.find(c => c.id === id)
      if (comp) await get().loadComponents(comp.ahsId)
      return true
    }
    set({ error: result.error })
    return false
  },

  deleteMaterialComponent: async (id) => {
    const comp = get().materialComponents.find(c => c.id === id)
    const result = await ahsService.material.delete(id)
    if (result.success) {
      if (comp) await get().loadComponents(comp.ahsId)
      return true
    }
    set({ error: result.error })
    return false
  },

  addWageComponent: async (data) => {
    const result = await ahsService.wage.create(data)
    if (result.success) {
      await get().loadComponents(data.ahsId)
      return true
    }
    set({ error: result.error })
    return false
  },

  updateWageComponent: async (id, data) => {
    const result = await ahsService.wage.update(id, data)
    if (result.success) {
      const comp = get().wageComponents.find(c => c.id === id)
      if (comp) await get().loadComponents(comp.ahsId)
      return true
    }
    set({ error: result.error })
    return false
  },

  deleteWageComponent: async (id) => {
    const comp = get().wageComponents.find(c => c.id === id)
    const result = await ahsService.wage.delete(id)
    if (result.success) {
      if (comp) await get().loadComponents(comp.ahsId)
      return true
    }
    set({ error: result.error })
    return false
  },

  addEquipmentComponent: async (data) => {
    const result = await ahsService.equipment.create(data)
    if (result.success) {
      await get().loadComponents(data.ahsId)
      return true
    }
    set({ error: result.error })
    return false
  },

  updateEquipmentComponent: async (id, data) => {
    const result = await ahsService.equipment.update(id, data)
    if (result.success) {
      const comp = get().equipmentComponents.find(c => c.id === id)
      if (comp) await get().loadComponents(comp.ahsId)
      return true
    }
    set({ error: result.error })
    return false
  },

  deleteEquipmentComponent: async (id) => {
    const comp = get().equipmentComponents.find(c => c.id === id)
    const result = await ahsService.equipment.delete(id)
    if (result.success) {
      if (comp) await get().loadComponents(comp.ahsId)
      return true
    }
    set({ error: result.error })
    return false
  }
}))

export function useAhsStore(): AhsStore {
  return useStore(ahsStore)
}
