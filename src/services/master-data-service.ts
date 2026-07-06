export const materialService = {
  getAll: () => window.api.material.getAll(),
  getById: (id: string) => window.api.material.getById(id),
  create: (data: unknown) => window.api.material.create(data),
  update: (id: string, data: unknown) => window.api.material.update(id, data),
  delete: (id: string) => window.api.material.delete(id),
  search: (query: string) => window.api.material.search(query)
}

export const wageService = {
  getAll: () => window.api.wage.getAll(),
  getById: (id: string) => window.api.wage.getById(id),
  create: (data: unknown) => window.api.wage.create(data),
  update: (id: string, data: unknown) => window.api.wage.update(id, data),
  delete: (id: string) => window.api.wage.delete(id)
}

export const equipmentService = {
  getAll: () => window.api.equipment.getAll(),
  getById: (id: string) => window.api.equipment.getById(id),
  create: (data: unknown) => window.api.equipment.create(data),
  update: (id: string, data: unknown) => window.api.equipment.update(id, data),
  delete: (id: string) => window.api.equipment.delete(id)
}
