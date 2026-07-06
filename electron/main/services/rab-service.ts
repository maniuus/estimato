import { RabSnapshotRepository } from '../database/repositories/rab-repository'
import { VolumeItemRepository } from '../database/repositories/volume-repository'
import { AhsRepository } from '../database/repositories/ahs-repository'
import { WbsItemRepository } from '../database/repositories/wbs-repository'
import { RabSnapshot } from '../database/repositories/types'
import { ServiceResult, success, failure } from './base-service'

export interface RabLineItem {
  wbsItemId: string
  wbsPath: string
  wbsCode: string
  wbsName: string
  ahsId: string | null
  ahsCode: string
  ahsName: string
  unit: string
  volume: number
  unitPrice: number
  totalPrice: number
}

export interface RabCalculation {
  lineItems: RabLineItem[]
  totalPrice: number
  ppnPercent: number
  ppnAmount: number
  overheadPercent: number
  overheadAmount: number
  grandTotal: number
}

export class RabService {
  private snapshotRepo = new RabSnapshotRepository()
  private volumeRepo = new VolumeItemRepository()
  private ahsRepo = new AhsRepository()
  private wbsRepo = new WbsItemRepository()

  calculate(projectId: string, ppnPercent: number, overheadPercent: number): ServiceResult<RabCalculation> {
    try {
      const volumes = this.volumeRepo.getByProjectId(projectId)
      const lineItems: RabLineItem[] = []

      for (const v of volumes) {
        const wbs = this.wbsRepo.getById(v.wbsItemId)
        if (!wbs || wbs.type !== 'item') continue

        let unitPrice = 0
        let ahsCode = ''
        let ahsName = ''

        if (v.ahsId) {
          const ahs = this.ahsRepo.getById(v.ahsId)
          if (ahs) {
            unitPrice = this.ahsRepo.calculateProjectAhsPrice(v.ahsId, projectId)
            ahsCode = ahs.code
            ahsName = ahs.name
          }
        }

        const total = v.volume * unitPrice
        lineItems.push({
          wbsItemId: v.wbsItemId,
          wbsPath: wbs.wbsPath,
          wbsCode: wbs.code,
          wbsName: wbs.name,
          ahsId: v.ahsId,
          ahsCode,
          ahsName,
          unit: v.unit || wbs.unit,
          volume: v.volume,
          unitPrice,
          totalPrice: total
        })
      }

      const totalPrice = lineItems.reduce((sum, item) => sum + item.totalPrice, 0)
      const ppnAmount = totalPrice * (ppnPercent / 100)
      const overheadAmount = totalPrice * (overheadPercent / 100)
      const grandTotal = totalPrice + ppnAmount + overheadAmount

      return success({
        lineItems,
        totalPrice,
        ppnPercent,
        ppnAmount,
        overheadPercent,
        overheadAmount,
        grandTotal
      })
    } catch (e) {
      return failure((e as Error).message)
    }
  }

  saveSnapshot(projectId: string, ppn: number, overhead: number): ServiceResult<RabSnapshot> {
    try {
      const calc = this.calculate(projectId, ppn, overhead)
      if (!calc.success) return failure(calc.error!)

      const snapshot = this.snapshotRepo.create({
        projectId,
        totalPrice: calc.data.totalPrice,
        ppn,
        overhead,
        grandTotal: calc.data.grandTotal,
        data: JSON.stringify(calc.data.lineItems)
      })
      return success(snapshot)
    } catch (e) {
      return failure((e as Error).message)
    }
  }

  getHistory(projectId: string): ServiceResult<RabSnapshot[]> {
    try {
      return success(this.snapshotRepo.getByProjectId(projectId))
    } catch (e) {
      return failure((e as Error).message)
    }
  }

  getLatestSnapshot(projectId: string): ServiceResult<RabSnapshot | null> {
    try {
      return success(this.snapshotRepo.getLatest(projectId))
    } catch (e) {
      return failure((e as Error).message)
    }
  }
}
