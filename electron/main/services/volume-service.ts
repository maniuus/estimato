import { VolumeItemRepository } from '../database/repositories/volume-repository'
import { VolumeItem } from '../database/repositories/types'
import { ServiceResult, success, failure } from './base-service'

export class VolumeService {
  private repo = new VolumeItemRepository()

  getByProject(projectId: string): ServiceResult<VolumeItem[]> {
    try {
      return success(this.repo.getByProjectId(projectId))
    } catch (e) {
      return failure((e as Error).message)
    }
  }

  getByWbsItem(wbsItemId: string): ServiceResult<VolumeItem | null> {
    try {
      return success(this.repo.getByWbsItemId(wbsItemId))
    } catch (e) {
      return failure((e as Error).message)
    }
  }

  upsert(
    wbsItemId: string,
    data: Partial<Omit<VolumeItem, 'id' | 'createdAt' | 'updatedAt' | 'wbsItemId'>>
  ): ServiceResult<VolumeItem> {
    try {
      return success(this.repo.upsertByWbsItem(wbsItemId, data))
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

  bulkUpsert(
    items: Array<{
      wbsItemId: string
      volume?: number
      unit?: string
      ahsId?: string | null
      formula?: string
      notes?: string
    }>
  ): ServiceResult<VolumeItem[]> {
    try {
      const results: VolumeItem[] = []
      for (const item of items) {
        results.push(this.repo.upsertByWbsItem(item.wbsItemId, {
          volume: item.volume,
          unit: item.unit,
          ahsId: item.ahsId,
          formula: item.formula,
          notes: item.notes
        }))
      }
      return success(results)
    } catch (e) {
      return failure((e as Error).message)
    }
  }
}
