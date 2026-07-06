import { createStore } from 'zustand/vanilla'
import { useStore } from 'zustand'
import { settingsService } from '../services/settings-service'
import type { AppSetting } from '../types/models'

interface SettingsState {
  settings: AppSetting | null
  loading: boolean
  error: string | null
}

interface SettingsActions {
  load: () => Promise<void>
  update: (data: Partial<Omit<AppSetting, 'id' | 'createdAt' | 'updatedAt'>>) => Promise<boolean>
  backup: () => Promise<string | null>
  restore: () => Promise<string | null>
}

export type SettingsStore = SettingsState & SettingsActions

const settingsStore = createStore<SettingsStore>((set) => ({
  settings: null,
  loading: false,
  error: null,

  load: async () => {
    set({ loading: true, error: null })
    const result = await settingsService.get()
    if (result.success) {
      set({ settings: result.data!, loading: false })
    } else {
      set({ error: result.error, loading: false })
    }
  },

  update: async (data) => {
    const result = await settingsService.update(data)
    if (result.success) {
      set({ settings: result.data! })
      return true
    }
    set({ error: result.error })
    return false
  },

  backup: async () => {
    const result = await settingsService.backup()
    if (result.success && result.data) return result.data.filePath
    set({ error: result.error })
    return null
  },

  restore: async () => {
    const result = await settingsService.restore()
    if (result.success) {
      set({ settings: null })
      return 'success'
    }
    set({ error: result.error })
    return null
  },
}))

export function useSettingsStore(): SettingsStore {
  return useStore(settingsStore)
}
