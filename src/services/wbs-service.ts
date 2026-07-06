export const wbsService = {
  getByProject: (projectId: string) => window.api.wbs.getByProject(projectId),
  getTree: (projectId: string) => window.api.wbs.getTree(projectId),
  getById: (id: string) => window.api.wbs.getById(id),
  create: (data: unknown) => window.api.wbs.create(data),
  update: (id: string, data: unknown) => window.api.wbs.update(id, data),
  delete: (id: string) => window.api.wbs.delete(id),
  move: (id: string, parentId: string | null, order: number) => window.api.wbs.move(id, parentId, order)
}
