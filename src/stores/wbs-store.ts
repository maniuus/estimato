import { createStore } from 'zustand/vanilla'
import { useStore } from 'zustand'
import type { WbsItem } from '../types/models'
import { wbsService } from '../services/wbs-service'

interface WbsState {
  items: WbsItem[]
  selectedItem: WbsItem | null
  loading: boolean
  error: string | null
}

interface WbsActions {
  loadByProject: (projectId: string) => Promise<void>
  selectItem: (item: WbsItem | null) => void
  createItem: (data: Omit<WbsItem, 'id' | 'createdAt' | 'updatedAt' | 'code' | 'wbsPath'>) => Promise<boolean>
  updateItem: (id: string, data: Partial<Omit<WbsItem, 'id' | 'createdAt' | 'updatedAt'>>) => Promise<boolean>
  deleteItem: (id: string) => Promise<boolean>
  moveItem: (id: string, newParentId: string | null, newSortOrder: number) => Promise<boolean>
}

export type WbsStore = WbsState & WbsActions

const wbsStore = createStore<WbsStore>((set, get) => ({
  items: [],
  selectedItem: null,
  loading: false,
  error: null,

  loadByProject: async (projectId: string) => {
    set({ loading: true, error: null })
    const result = await wbsService.getByProject(projectId)
    if (result.success) {
      set({ items: result.data ?? [], loading: false })
    } else {
      set({ error: result.error ?? 'Gagal memuat WBS', loading: false })
    }
  },

  selectItem: (item) => {
    set({ selectedItem: item })
  },

  createItem: async (data) => {
    set({ loading: true, error: null })
    const result = await wbsService.create(data)
    if (result.success) {
      await get().loadByProject(data.projectId)
      return true
    } else {
      set({ error: result.error ?? 'Gagal membuat item', loading: false })
      return false
    }
  },

  updateItem: async (id, data) => {
    set({ loading: true, error: null })
    const result = await wbsService.update(id, data)
    if (result.success) {
      const projectId = get().items.find(i => i.id === id)?.projectId
      if (projectId) await get().loadByProject(projectId)
      return true
    } else {
      set({ error: result.error ?? 'Gagal mengupdate item', loading: false })
      return false
    }
  },

  deleteItem: async (id) => {
    set({ loading: true, error: null })
    const projectId = get().items.find(i => i.id === id)?.projectId
    const result = await wbsService.delete(id)
    if (result.success) {
      if (get().selectedItem?.id === id) set({ selectedItem: null })
      if (projectId) await get().loadByProject(projectId)
      return true
    } else {
      set({ error: result.error ?? 'Gagal menghapus item', loading: false })
      return false
    }
  },

  moveItem: async (id, newParentId, newSortOrder) => {
    set({ loading: true, error: null })
    const result = await wbsService.move(id, newParentId, newSortOrder)
    if (result.success) {
      const projectId = get().items.find(i => i.id === id)?.projectId
      if (projectId) await get().loadByProject(projectId)
      return true
    } else {
      set({ error: result.error ?? 'Gagal memindahkan item', loading: false })
      return false
    }
  }
}))

export function useWbsStore(): WbsStore {
  return useStore(wbsStore)
}
