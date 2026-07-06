import { AppSettingRepository } from '../database/repositories/settings-repository'
import { AppSetting } from '../database/repositories/types'
import { ServiceResult, success, failure } from './base-service'
import { getDbPath, saveDatabase, getDatabase, initDatabase } from '../database/connection'
import { dialog } from 'electron'
import { copyFileSync } from 'fs'

export class SettingsService {
  private repo = new AppSettingRepository()

  get(): ServiceResult<AppSetting> {
    try {
      return success(this.repo.get())
    } catch (e) {
      return failure((e as Error).message)
    }
  }

  update(data: Partial<Omit<AppSetting, 'id' | 'createdAt' | 'updatedAt'>>): ServiceResult<AppSetting> {
    try {
      return success(this.repo.update(data))
    } catch (e) {
      return failure((e as Error).message)
    }
  }

  async backup(): Promise<ServiceResult<string>> {
    try {
      saveDatabase()
      const dbPath = getDbPath()
      const result = await dialog.showSaveDialog({
        title: 'Backup Database',
        defaultPath: `master-rab-backup-${new Date().toISOString().slice(0, 10)}.sqlite`,
        filters: [{ name: 'SQLite Database', extensions: ['sqlite', 'db'] }]
      })

      if (result.canceled || !result.filePath) {
        return failure('Pembatalan backup')
      }

      copyFileSync(dbPath, result.filePath)
      return success(result.filePath)
    } catch (e) {
      return failure((e as Error).message)
    }
  }

  async restore(): Promise<ServiceResult<string>> {
    try {
      const result = await dialog.showOpenDialog({
        title: 'Restore Database',
        filters: [{ name: 'SQLite Database', extensions: ['sqlite', 'db'] }],
        properties: ['openFile']
      })

      if (result.canceled || result.filePaths.length === 0) {
        return failure('Pembatalan restore')
      }

      getDatabase().close()

      const sourcePath = result.filePaths[0]
      const targetPath = getDbPath()
      copyFileSync(sourcePath, targetPath)

      await initDatabase()

      return success(sourcePath)
    } catch (e) {
      return failure((e as Error).message)
    }
  }
}
