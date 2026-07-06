export const settingsService = {
  get: () => window.api.settings.get(),
  update: (data: unknown) => window.api.settings.update(data),
  backup: () => window.api.settings.backup(),
  restore: () => window.api.settings.restore()
}
