import { ProjectRepository } from '../database/repositories/project-repository'
import { Project } from '../database/repositories/types'
import { ServiceResult, success, failure } from './base-service'

export class ProjectService {
  private repo = new ProjectRepository()

  getAll(): ServiceResult<Project[]> {
    try {
      return success(this.repo.getAll())
    } catch (e) {
      return failure((e as Error).message)
    }
  }

  getById(id: string): ServiceResult<Project | null> {
    try {
      return success(this.repo.getById(id))
    } catch (e) {
      return failure((e as Error).message)
    }
  }

  create(data: Omit<Project, 'id' | 'createdAt' | 'updatedAt'>): ServiceResult<Project> {
    try {
      return success(this.repo.create(data))
    } catch (e) {
      return failure((e as Error).message)
    }
  }

  update(id: string, data: Partial<Omit<Project, 'id' | 'createdAt' | 'updatedAt'>>): ServiceResult<Project | null> {
    try {
      const updated = this.repo.update(id, data)
      if (!updated) return failure('Proyek tidak ditemukan')
      return success(updated)
    } catch (e) {
      return failure((e as Error).message)
    }
  }

  delete(id: string): ServiceResult<boolean> {
    try {
      return success(this.repo.delete(id))
    } catch (e) {
      return failure((e as Error).message)
    }
  }

  getByStatus(status: Project['status']): ServiceResult<Project[]> {
    try {
      return success(this.repo.getByStatus(status))
    } catch (e) {
      return failure((e as Error).message)
    }
  }
}
