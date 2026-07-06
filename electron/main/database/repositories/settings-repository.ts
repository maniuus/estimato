import { BaseRepository } from './base-repository'
import { AppSetting } from './types'

export class AppSettingRepository extends BaseRepository<AppSetting> {
  protected tableName = 'AppSetting'

  get(): AppSetting {
    const row = this.queryOne(`SELECT * FROM "AppSetting" WHERE id = 'default'`)
    return row ?? {
      id: 'default',
      companyName: '',
      companyLogo: '',
      reportHeader: '',
      ppnDefault: 11,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString()
    }
  }

  update(data: Partial<Omit<AppSetting, 'id' | 'createdAt' | 'updatedAt'>>): AppSetting {
    const existing = this.get()

    const updates: string[] = []
    const params: Record<string, unknown> = { id: 'default' }

    for (const [key, value] of Object.entries(data)) {
      if (value !== undefined) {
        updates.push(`"${key}" = @${key}`)
        params[key] = value
      }
    }

    if (updates.length === 0) return existing

    params.updatedAt = new Date().toISOString()
    updates.push('"updatedAt" = @updatedAt')

    this.executeUpdate(
      `UPDATE "AppSetting" SET ${updates.join(', ')} WHERE id = @id`,
      params
    )

    return this.get()
  }
}
