import type { ServiceResult, Project, Material, Wage, Equipment, WbsItem, Ahs, AhsComponentMaterial, AhsComponentWage, AhsComponentEquipment, VolumeItem, RabSnapshot, AppSetting } from '../types/models'

interface ElectronApi {
  invoke(channel: string, ...args: unknown[]): Promise<unknown>

  project: {
    getAll: () => Promise<ServiceResult<Project[]>>
    getById: (id: string) => Promise<ServiceResult<Project | null>>
    create: (data: unknown) => Promise<ServiceResult<Project>>
    update: (id: string, data: unknown) => Promise<ServiceResult<Project | null>>
    delete: (id: string) => Promise<ServiceResult<boolean>>
    getByStatus: (status: string) => Promise<ServiceResult<Project[]>>
  }

  material: {
    getAll: () => Promise<ServiceResult<Material[]>>
    getById: (id: string) => Promise<ServiceResult<Material | null>>
    create: (data: unknown) => Promise<ServiceResult<Material>>
    update: (id: string, data: unknown) => Promise<ServiceResult<Material | null>>
    delete: (id: string) => Promise<ServiceResult<boolean>>
    search: (query: string) => Promise<ServiceResult<Material[]>>
  }

  wage: {
    getAll: () => Promise<ServiceResult<Wage[]>>
    getById: (id: string) => Promise<ServiceResult<Wage | null>>
    create: (data: unknown) => Promise<ServiceResult<Wage>>
    update: (id: string, data: unknown) => Promise<ServiceResult<Wage | null>>
    delete: (id: string) => Promise<ServiceResult<boolean>>
  }

  equipment: {
    getAll: () => Promise<ServiceResult<Equipment[]>>
    getById: (id: string) => Promise<ServiceResult<Equipment | null>>
    create: (data: unknown) => Promise<ServiceResult<Equipment>>
    update: (id: string, data: unknown) => Promise<ServiceResult<Equipment | null>>
    delete: (id: string) => Promise<ServiceResult<boolean>>
  }

  wbs: {
    getByProject: (projectId: string) => Promise<ServiceResult<WbsItem[]>>
    getTree: (projectId: string) => Promise<ServiceResult<WbsItem[]>>
    getById: (id: string) => Promise<ServiceResult<WbsItem | null>>
    create: (data: unknown) => Promise<ServiceResult<WbsItem>>
    update: (id: string, data: unknown) => Promise<ServiceResult<WbsItem | null>>
    delete: (id: string) => Promise<ServiceResult<boolean>>
    move: (id: string, parentId: string | null, order: number) => Promise<ServiceResult<WbsItem | null>>
  }

  ahs: {
    getAll: () => Promise<ServiceResult<Ahs[]>>
    getById: (id: string) => Promise<ServiceResult<Ahs | null>>
    create: (data: unknown) => Promise<ServiceResult<Ahs>>
    update: (id: string, data: unknown) => Promise<ServiceResult<Ahs | null>>
    delete: (id: string) => Promise<ServiceResult<boolean>>
    getByProject: (projectId: string) => Promise<ServiceResult<Ahs[]>>
    getLibrary: () => Promise<ServiceResult<Ahs[]>>
    material: {
      getByAhs: (ahsId: string, projectId?: string) => Promise<ServiceResult<AhsComponentMaterial[]>>
      create: (data: unknown) => Promise<ServiceResult<AhsComponentMaterial>>
      update: (id: string, data: unknown) => Promise<ServiceResult<AhsComponentMaterial | null>>
      delete: (id: string) => Promise<ServiceResult<boolean>>
    }
    wage: {
      getByAhs: (ahsId: string, projectId?: string) => Promise<ServiceResult<AhsComponentWage[]>>
      create: (data: unknown) => Promise<ServiceResult<AhsComponentWage>>
      update: (id: string, data: unknown) => Promise<ServiceResult<AhsComponentWage | null>>
      delete: (id: string) => Promise<ServiceResult<boolean>>
    }
    equipment: {
      getByAhs: (ahsId: string, projectId?: string) => Promise<ServiceResult<AhsComponentEquipment[]>>
      create: (data: unknown) => Promise<ServiceResult<AhsComponentEquipment>>
      update: (id: string, data: unknown) => Promise<ServiceResult<AhsComponentEquipment | null>>
      delete: (id: string) => Promise<ServiceResult<boolean>>
    }
  }

  volume: {
    getByProject: (projectId: string) => Promise<ServiceResult<VolumeItem[]>>
    getByWbsItem: (wbsItemId: string) => Promise<ServiceResult<VolumeItem | null>>
    upsert: (wbsItemId: string, data: unknown) => Promise<ServiceResult<VolumeItem>>
    bulkUpsert: (items: unknown[]) => Promise<ServiceResult<boolean>>
    delete: (id: string) => Promise<ServiceResult<boolean>>
  }

  rab: {
    calculate: (projectId: string, ppn: number, overhead: number) => Promise<ServiceResult<any>>
    saveSnapshot: (projectId: string, ppn: number, overhead: number) => Promise<ServiceResult<RabSnapshot>>
    getHistory: (projectId: string) => Promise<ServiceResult<RabSnapshot[]>>
    getLatest: (projectId: string) => Promise<ServiceResult<RabSnapshot | null>>
    exportExcel: (data: any) => Promise<ServiceResult<{ success: boolean; filePath: string }>>
    exportPdf: (projectName: string) => Promise<ServiceResult<{ success: boolean; filePath: string }>>
  }

  settings: {
    get: () => Promise<ServiceResult<AppSetting>>
    update: (data: unknown) => Promise<ServiceResult<AppSetting | null>>
    backup: () => Promise<ServiceResult<{ success: boolean; filePath: string }>>
    restore: () => Promise<ServiceResult<{ success: boolean }>>
  }

  ahsp: {
    importAhsp: () => Promise<ServiceResult<{ ahsCreated: number; ahsSkipped: number; wagesCreated: number; materialsCreated: number; equipmentCreated: number }>>
  }

  projectPrice: {
    override: (projectId: string, componentId: string, category: 'Bahan' | 'Tenaga Kerja' | 'Alat', price: number) => Promise<ServiceResult<boolean>>
    getOverrides: (projectId: string) => Promise<ServiceResult<any[]>>
    deleteOverride: (projectId: string, componentId: string) => Promise<ServiceResult<boolean>>
  }
}

declare global {
  interface Window {
    api: ElectronApi
  }
}
