import { createStore } from 'zustand/vanilla'
import { useStore } from 'zustand'
import type { Project } from '../types/models'
import { projectService } from '../services/project-service'

interface ProjectState {
  projects: Project[]
  selectedProject: Project | null
  loading: boolean
  error: string | null
}

interface ProjectActions {
  loadProjects: () => Promise<void>
  selectProject: (project: Project | null) => void
  createProject: (data: Omit<Project, 'id' | 'createdAt' | 'updatedAt'> & { template?: string }) => Promise<boolean>
  updateProject: (id: string, data: Partial<Omit<Project, 'id' | 'createdAt' | 'updatedAt'>>) => Promise<boolean>
  deleteProject: (id: string) => Promise<boolean>
  exportProject: (id: string) => Promise<boolean>
  importProject: () => Promise<string | null>
}

export type ProjectStore = ProjectState & ProjectActions

const projectStore = createStore<ProjectStore>((set, get) => ({
  projects: [],
  selectedProject: null,
  loading: false,
  error: null,

  loadProjects: async () => {
    set({ loading: true, error: null })
    const result = await projectService.getAll()
    if (result.success) {
      set({ projects: result.data ?? [], loading: false })
    } else {
      set({ error: result.error ?? 'Gagal memuat proyek', loading: false })
    }
  },

  selectProject: (project) => {
    set({ selectedProject: project })
  },

  createProject: async (data) => {
    set({ loading: true, error: null })
    const result = await projectService.create(data)
    if (result.success) {
      await get().loadProjects()
      return true
    } else {
      set({ error: result.error ?? 'Gagal membuat proyek', loading: false })
      return false
    }
  },

  updateProject: async (id, data) => {
    set({ loading: true, error: null })
    const result = await projectService.update(id, data)
    if (result.success) {
      await get().loadProjects()
      if (get().selectedProject?.id === id) {
        set({ selectedProject: result.data ?? null })
      }
      return true
    } else {
      set({ error: result.error ?? 'Gagal mengupdate proyek', loading: false })
      return false
    }
  },

  deleteProject: async (id) => {
    set({ loading: true, error: null })
    const result = await projectService.delete(id)
    if (result.success) {
      if (get().selectedProject?.id === id) {
        set({ selectedProject: null })
      }
      await get().loadProjects()
      return true
    } else {
      set({ error: result.error ?? 'Gagal menghapus proyek', loading: false })
      return false
    }
  },

  exportProject: async (id) => {
    set({ loading: true, error: null })
    const result = await projectService.export(id)
    set({ loading: false })
    if (result.success) {
      return true
    } else {
      set({ error: result.error ?? 'Gagal mengekspor proyek' })
      return false
    }
  },

  importProject: async () => {
    set({ loading: true, error: null })
    const result = await projectService.import()
    if (result.success && result.data?.success) {
      await get().loadProjects()
      return result.data.projectId ?? null
    } else {
      set({ error: result.error ?? 'Gagal mengimpor proyek', loading: false })
      return null
    }
  }
}))

export function useProjectStore(): ProjectStore {
  return useStore(projectStore)
}
