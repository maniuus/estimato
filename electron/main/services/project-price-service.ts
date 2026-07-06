import { ProjectComponentPriceRepository, ProjectComponentPrice } from '../database/repositories/project-price-repository'
import { ServiceResult, success, failure } from './base-service'

export class ProjectPriceService {
  private repo = new ProjectComponentPriceRepository()

  overridePrice(projectId: string, componentId: string, category: 'Bahan' | 'Tenaga Kerja' | 'Alat', price: number): ServiceResult<boolean> {
    try {
      this.repo.overridePrice(projectId, componentId, category, price)
      return success(true)
    } catch (e) {
      return failure((e as Error).message)
    }
  }

  getOverrides(projectId: string): ServiceResult<ProjectComponentPrice[]> {
    try {
      return success(this.repo.getOverridesByProject(projectId))
    } catch (e) {
      return failure((e as Error).message)
    }
  }

  deleteOverride(projectId: string, componentId: string): ServiceResult<boolean> {
    try {
      return success(this.repo.deleteOverride(projectId, componentId))
    } catch (e) {
      return failure((e as Error).message)
    }
  }
}
