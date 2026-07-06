import { dialog } from 'electron'
import { readFileSync } from 'fs'
import { AhsRepository } from '../database/repositories/ahs-repository'
import { VolumeItemRepository } from '../database/repositories/volume-repository'
import {
  MaterialRepository,
  WageRepository,
  EquipmentRepository
} from '../database/repositories/master-data-repository'
import {
  AhsComponentMaterialRepository,
  AhsComponentWageRepository,
  AhsComponentEquipmentRepository
} from '../database/repositories/ahs-repository'
import { ServiceResult, success, failure } from './base-service'
import { getDatabase, saveDatabase, disableAutoSave, enableAutoSave } from '../database/connection'

interface AhspRow {
  ahsCode: string
  pekerjaan: string
  kategori: string
  uraian: string
  kodeItem: string
  satuan: string
  koefisien: number
}

interface AhspImportResult {
  ahsCreated: number
  ahsSkipped: number
  wagesCreated: number
  materialsCreated: number
  equipmentCreated: number
}

export class AhspImportService {
  private ahsRepo = new AhsRepository()
  private materialRepo = new MaterialRepository()
  private wageRepo = new WageRepository()
  private equipmentRepo = new EquipmentRepository()
  private matCompRepo = new AhsComponentMaterialRepository()
  private wageCompRepo = new AhsComponentWageRepository()
  private equipCompRepo = new AhsComponentEquipmentRepository()

  async importFromDialog(): Promise<ServiceResult<AhspImportResult>> {
    try {
      const result = await dialog.showOpenDialog({
        title: 'Pilih file AHSP Excel',
        filters: [{ name: 'Excel Files', extensions: ['xlsx', 'xls'] }],
        properties: ['openFile']
      })

      if (result.canceled || result.filePaths.length === 0) {
        return failure('Pembatalan import')
      }

      return this.importFromFile(result.filePaths[0])
    } catch (e) {
      return failure((e as Error).message)
    }
  }

  importFromFile(filePath: string): ServiceResult<AhspImportResult> {
    const db = getDatabase()
    try {
      const rows = this.parseExcel(filePath)
      const groups = this.groupByAhs(rows)
      console.log('[Import] Parsed', rows.length, 'rows into', Object.keys(groups).length, 'AHS groups')
      const stats: AhspImportResult = {
        ahsCreated: 0,
        ahsSkipped: 0,
        wagesCreated: 0,
        materialsCreated: 0,
        equipmentCreated: 0
      }

      db.run('BEGIN TRANSACTION')
      disableAutoSave()

      for (const [ahsCode, ahsRows] of Object.entries(groups)) {
        const existing = this.ahsRepo.queryOne(
          `SELECT id FROM "Ahs" WHERE code = @code AND projectId IS NULL`,
          { code: ahsCode }
        )
        if (existing) {
          stats.ahsSkipped++
          continue
        }

        const pekerjaan = ahsRows[0].pekerjaan
        const unit = this.extractAhsUnit(pekerjaan)

        const ahs = this.ahsRepo.create({
          code: ahsCode,
          name: pekerjaan,
          unit,
          category: 'sni',
          source: 'AHSP Cipta Karya 2026',
          projectId: null
        })

        for (const row of ahsRows) {
          if (row.kategori === 'Tenaga Kerja') {
            const wageCode = row.kodeItem || ''
            let wage = this.wageRepo.queryOne(
              `SELECT id FROM "Wage" WHERE type = @type`,
              { type: row.uraian }
            )
            if (!wage) {
              wage = this.wageRepo.create({
                type: row.uraian,
                dailyWage: 0,
                unit: row.satuan || 'OH'
              })
              stats.wagesCreated++
            }

            this.wageCompRepo.create({
              ahsId: ahs.id,
              wageId: wage.id,
              coefficient: row.koefisien
            })
          } else if (row.kategori === 'Bahan') {
            let material = this.materialRepo.queryOne(
              `SELECT id FROM "Material" WHERE name = @name`,
              { name: row.uraian }
            )
            if (!material) {
              material = this.materialRepo.create({
                name: row.uraian,
                code: '',
                specification: '',
                category: 'bahan',
                unit: row.satuan || 'buah',
                unitPrice: 0,
                supplier: ''
              })
              stats.materialsCreated++
            }

            this.matCompRepo.create({
              ahsId: ahs.id,
              materialId: material.id,
              coefficient: row.koefisien
            })
          } else if (row.kategori === 'Peralatan') {
            let equipment = this.equipmentRepo.queryOne(
              `SELECT id FROM "Equipment" WHERE name = @name`,
              { name: row.uraian }
            )
            if (!equipment) {
              equipment = this.equipmentRepo.create({
                name: row.uraian,
                type: '',
                capacity: '',
                rentalPrice: 0,
                unit: row.satuan || 'hari'
              })
              stats.equipmentCreated++
            }

            this.equipCompRepo.create({
              ahsId: ahs.id,
              equipmentId: equipment.id,
              coefficient: row.koefisien
            })
          }
        }

        this.ahsRepo.recalculateTotalPrice(ahs.id)
        stats.ahsCreated++
      }

      db.run('COMMIT')
      enableAutoSave()
      saveDatabase()

      return success(stats)
    } catch (e) {
      try { db.run('ROLLBACK') } catch (_) {}
      enableAutoSave()
      return failure((e as Error).message)
    }
  }

  private parseExcel(filePath: string): AhspRow[] {
    const XLSX = require('xlsx')
    const wb = XLSX.readFile(filePath)
    const ws = wb.Sheets['Master_Database']
    const json: any[][] = XLSX.utils.sheet_to_json(ws, { header: 1 })

    const rows: AhspRow[] = []
    let currentAhsCode = ''
    let currentPekerjaan = ''

    for (let i = 1; i < json.length; i++) {
      const raw = json[i]
      if (!raw || raw.length < 7) continue

      const ahsCode = String(raw[0] || '').trim()
      const pekerjaan = String(raw[1] || '').trim()
      const kategori = String(raw[2] || '').trim()
      const uraian = String(raw[3] || '').trim()
      const kodeItem = raw[4] ? String(raw[4]).trim() : ''
      const satuan = String(raw[5] || '').trim()
      const koefisien = parseFloat(String(raw[6] || '0').replace(',', '.'))

      if (ahsCode && pekerjaan) {
        currentAhsCode = ahsCode
        currentPekerjaan = pekerjaan
      }

      if (!kategori || !uraian || isNaN(koefisien)) continue

      rows.push({
        ahsCode: currentAhsCode,
        pekerjaan: currentPekerjaan,
        kategori,
        uraian,
        kodeItem,
        satuan,
        koefisien
      })
    }

    return rows
  }

  private groupByAhs(rows: AhspRow[]): Record<string, AhspRow[]> {
    const groups: Record<string, AhspRow[]> = {}
    for (const row of rows) {
      if (!groups[row.ahsCode]) groups[row.ahsCode] = []
      groups[row.ahsCode].push(row)
    }
    return groups
  }

  private extractAhsUnit(pekerjaan: string): string {
    if (!pekerjaan) return "m'"
    const normalized = pekerjaan.toLowerCase()
    const units = ['m2', 'm3', 'm’', "m'", 'm', 'buah', 'bh', 'kg', 'unit', 'hari', 'set', 'titik', 'tunggul', 'batang', 'ha', 'kali']
    
    for (const u of units) {
      const escapedUnit = u.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')
      const regex = new RegExp(`(?:^|\\s|\\b)1\\s*${escapedUnit}(?:\\b|\\s|$)`, 'i')
      if (regex.test(pekerjaan)) {
        if (u === 'm’' || u === "m'") return "m'"
        return u
      }
    }

    if (normalized.includes("per-m'") || normalized.includes("per m'")) return "m'"
    
    if (normalized.includes(" m3")) return "m3"
    if (normalized.includes(" m2")) return "m2"
    if (normalized.includes(" m'")) return "m'"
    if (normalized.includes(" kg")) return "kg"
    if (normalized.includes(" buah")) return "buah"
    if (normalized.includes(" unit")) return "unit"

    return "m'"
  }
}
