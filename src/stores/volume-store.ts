import { createStore } from 'zustand/vanilla'
import { useStore } from 'zustand'
import { volumeService } from '../services/volume-service'
import type { VolumeItem } from '../types/models'

interface VolumeState {
  items: VolumeItem[]
  loading: boolean
  error: string | null
}

interface VolumeActions {
  loadByProject: (projectId: string) => Promise<void>
  upsert: (wbsItemId: string, data: Partial<Omit<VolumeItem, 'id' | 'createdAt' | 'updatedAt' | 'wbsItemId'>>) => Promise<boolean>
  bulkUpsert: (items: Array<{ wbsItemId: string; volume?: number; unit?: string; ahsId?: string | null; projectVolumeId?: string | null; formula?: string; notes?: string }>) => Promise<boolean>
}

export type VolumeStore = VolumeState & VolumeActions

const volumeStore = createStore<VolumeStore>((set) => ({
  items: [],
  loading: false,
  error: null,

  loadByProject: async (projectId) => {
    set({ loading: true, error: null })
    const result = await volumeService.getByProject(projectId)
    if (result.success) {
      set({ items: result.data ?? [], loading: false })
    } else {
      set({ error: result.error, loading: false })
    }
  },

  upsert: async (wbsItemId, data) => {
    const result = await volumeService.upsert(wbsItemId, data)
    if (result.success) return true
    set({ error: result.error })
    return false
  },

  bulkUpsert: async (items) => {
    const result = await volumeService.bulkUpsert(items)
    if (result.success) return true
    set({ error: result.error })
    return false
  }
}))

export function useVolumeStore(): VolumeStore {
  return useStore(volumeStore)
}
