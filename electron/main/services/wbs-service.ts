import { WbsItemRepository } from '../database/repositories/wbs-repository'
import { VolumeItem } from '../database/repositories/types'
import { WbsItem } from '../database/repositories/types'
import { ServiceResult, success, failure } from './base-service'

export class WbsService {
  private repo = new WbsItemRepository()

  getByProjectId(projectId: string): ServiceResult<WbsItem[]> {
    try {
      return success(this.repo.getByProjectId(projectId))
    } catch (e) {
      return failure((e as Error).message)
    }
  }

  getTree(projectId: string): ServiceResult<WbsItem[]> {
    try {
      const items = this.repo.getByProjectId(projectId)
      return success(items)
    } catch (e) {
      return failure((e as Error).message)
    }
  }

  getById(id: string): ServiceResult<WbsItem | null> {
    try {
      return success(this.repo.getById(id))
    } catch (e) {
      return failure((e as Error).message)
    }
  }

  create(
    data: Omit<WbsItem, 'id' | 'createdAt' | 'updatedAt' | 'code' | 'wbsPath'>
  ): ServiceResult<WbsItem> {
    try {
      return success(this.repo.create(data))
    } catch (e) {
      return failure((e as Error).message)
    }
  }

  update(
    id: string,
    data: Partial<Omit<WbsItem, 'id' | 'createdAt' | 'updatedAt'>>
  ): ServiceResult<WbsItem | null> {
    try {
      const updated = this.repo.update(id, data)
      if (!updated) return failure('Item tidak ditemukan')
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

  moveItem(
    id: string,
    newParentId: string | null,
    newSortOrder: number
  ): ServiceResult<WbsItem | null> {
    try {
      return success(this.repo.moveItem(id, newParentId, newSortOrder))
    } catch (e) {
      return failure((e as Error).message)
    }
  }
}
