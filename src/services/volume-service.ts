export const volumeService = {
  getByProject: (projectId: string) => window.api.volume.getByProject(projectId),
  getByWbsItem: (wbsItemId: string) => window.api.volume.getByWbsItem(wbsItemId),
  upsert: (wbsItemId: string, data: unknown) => window.api.volume.upsert(wbsItemId, data),
  bulkUpsert: (items: unknown[]) => window.api.volume.bulkUpsert(items),
  delete: (id: string) => window.api.volume.delete(id)
}
