import { createStore } from 'zustand/vanilla'
import { useStore } from 'zustand'
import { projectVolumeService } from '../services/project-volume-service'
import type { ProjectVolume } from '../types/models'

interface ProjectVolumeState {
  items: ProjectVolume[]
  loading: boolean
  error: string | null
}

interface ProjectVolumeActions {
  loadByProject: (projectId: string) => Promise<void>
  upsert: (projectId: string, data: Partial<ProjectVolume>) => Promise<boolean>
  deleteItem: (id: string) => Promise<boolean>
}

export type ProjectVolumeStore = ProjectVolumeState & ProjectVolumeActions

const projectVolumeStore = createStore<ProjectVolumeStore>((set, get) => ({
  items: [],
  loading: false,
  error: null,

  loadByProject: async (projectId) => {
    set({ loading: true, error: null })
    const result = await projectVolumeService.getByProject(projectId)
    if (result.success) {
      set({ items: result.data ?? [], loading: false })
    } else {
      set({ error: result.error, loading: false })
    }
  },

  upsert: async (projectId, data) => {
    set({ loading: true, error: null })
    const result = await projectVolumeService.upsert(projectId, data)
    if (result.success) {
      await get().loadByProject(projectId)
      return true
    } else {
      set({ error: result.error, loading: false })
      return false
    }
  },

  deleteItem: async (id) => {
    set({ loading: true, error: null })
    const result = await projectVolumeService.delete(id)
    if (result.success) {
      const remaining = get().items.filter(i => i.id !== id)
      set({ items: remaining, loading: false })
      return true
    } else {
      set({ error: result.error, loading: false })
      return false
    }
  }
}))

export function useProjectVolumeStore(): ProjectVolumeStore {
  return useStore(projectVolumeStore)
}
