import { app } from 'electron'
import { existsSync } from 'fs'
import { join } from 'path'
import { getDatabase } from './connection'
import { AhspImportService } from '../services/ahsp-import-service'

let seeded = false

export function runSeed(): void {
  if (seeded) return

  const db = getDatabase()
  const count = db.exec(`SELECT COUNT(*) as cnt FROM "Ahs" WHERE projectId IS NULL`)
  const row = count[0]?.values?.[0]
  const existingCount = row ? Number(row[0]) : 0

  if (existingCount > 100) {
    console.log('[Seed] AHS library already has', existingCount, 'entries, skipping seed')
    seeded = true
    return
  }

  const excelPath = join(app.getAppPath(), 'AHSP_Cipta_Karya_2026.xlsx')
  if (!existsSync(excelPath)) {
    console.log('[Seed] AHSP Excel not found at:', excelPath)
    seeded = true
    return
  }

  console.log('[Seed] Importing AHSP from:', excelPath)
  const service = new AhspImportService()
  const result = service.importFromFile(excelPath)

  if (result.success) {
    const s = result.data
    console.log(`[Seed] Import complete: ${s.ahsCreated} AHS, ${s.wagesCreated} wages, ${s.materialsCreated} materials, ${s.equipmentCreated} equipment`)
  } else {
    console.error('[Seed] Import failed:', result.error)
  }

  seeded = true
}
