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
  createProject: (data: Omit<Project, 'id' | 'createdAt' | 'updatedAt'>) => Promise<boolean>
  updateProject: (id: string, data: Partial<Omit<Project, 'id' | 'createdAt' | 'updatedAt'>>) => Promise<boolean>
  deleteProject: (id: string) => Promise<boolean>
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
  }
}))

export function useProjectStore(): ProjectStore {
  return useStore(projectStore)
}
