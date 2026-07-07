export const projectVolumeService = {
  getByProject: (projectId: string) => window.api.projectVolume.getByProject(projectId),
  upsert: (projectId: string, data: unknown) => window.api.projectVolume.upsert(projectId, data),
  delete: (id: string) => window.api.projectVolume.delete(id)
}
