export const ahsService = {
  getAll: () => window.api.ahs.getAll(),
  getById: (id: string) => window.api.ahs.getById(id),
  create: (data: unknown) => window.api.ahs.create(data),
  update: (id: string, data: unknown) => window.api.ahs.update(id, data),
  delete: (id: string) => window.api.ahs.delete(id),
  getByProject: (projectId: string) => window.api.ahs.getByProject(projectId),
  getLibrary: () => window.api.ahs.getLibrary(),
  duplicate: (id: string) => window.api.ahs.duplicate(id),

  material: {
    getByAhs: (ahsId: string) => window.api.ahs.material.getByAhs(ahsId),
    create: (data: unknown) => window.api.ahs.material.create(data),
    update: (id: string, data: unknown) => window.api.ahs.material.update(id, data),
    delete: (id: string) => window.api.ahs.material.delete(id)
  },

  wage: {
    getByAhs: (ahsId: string) => window.api.ahs.wage.getByAhs(ahsId),
    create: (data: unknown) => window.api.ahs.wage.create(data),
    update: (id: string, data: unknown) => window.api.ahs.wage.update(id, data),
    delete: (id: string) => window.api.ahs.wage.delete(id)
  },

  equipment: {
    getByAhs: (ahsId: string) => window.api.ahs.equipment.getByAhs(ahsId),
    create: (data: unknown) => window.api.ahs.equipment.create(data),
    update: (id: string, data: unknown) => window.api.ahs.equipment.update(id, data),
    delete: (id: string) => window.api.ahs.equipment.delete(id)
  }
}
