import type { Project } from '../types/models'

export const projectService = {
  getAll: () => window.api.project.getAll(),
  getById: (id: string) => window.api.project.getById(id),
  create: (data: Omit<Project, 'id' | 'createdAt' | 'updatedAt'>) => window.api.project.create(data),
  update: (id: string, data: Partial<Omit<Project, 'id' | 'createdAt' | 'updatedAt'>>) =>
    window.api.project.update(id, data),
  delete: (id: string) => window.api.project.delete(id),
  getByStatus: (status: Project['status']) => window.api.project.getByStatus(status)
}
