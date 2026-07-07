import { ProjectVolumeRepository } from '../database/repositories/project-volume-repository'
import { ProjectVolume } from '../database/repositories/types'
import { ServiceResult, success, failure } from './base-service'

export class ProjectVolumeService {
  private repo = new ProjectVolumeRepository()

  getByProject(projectId: string): ServiceResult<ProjectVolume[]> {
    try {
      return success(this.repo.getByProjectId(projectId))
    } catch (e) {
      return failure((e as Error).message)
    }
  }

  upsert(
    projectId: string,
    data: Partial<Omit<ProjectVolume, 'id' | 'createdAt' | 'updatedAt' | 'projectId'>>
  ): ServiceResult<ProjectVolume> {
    try {
      if (data.id) {
        // Update
        const updated = this.repo.update(data.id, data)
        if (!updated) {
          return failure('Volume tidak ditemukan untuk diupdate')
        }
        return success(updated)
      } else {
        // Create
        return success(this.repo.create({
          projectId,
          name: data.name || 'Volume Baru',
          unit: data.unit || '',
          value: data.value || 0,
          formula: data.formula || '',
          notes: data.notes || ''
        }))
      }
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
}
