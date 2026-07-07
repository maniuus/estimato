import { contextBridge, ipcRenderer } from 'electron'
import { IPC_CHANNELS } from '../main/ipc/channels'

const api = {
  invoke(channel: string, ...args: unknown[]): Promise<unknown> {
    return ipcRenderer.invoke(channel, ...args)
  },

  project: {
    getAll: () => ipcRenderer.invoke(IPC_CHANNELS.PROJECT_GET_ALL),
    getById: (id: string) => ipcRenderer.invoke(IPC_CHANNELS.PROJECT_GET_BY_ID, id),
    create: (data: unknown) => ipcRenderer.invoke(IPC_CHANNELS.PROJECT_CREATE, data),
    update: (id: string, data: unknown) => ipcRenderer.invoke(IPC_CHANNELS.PROJECT_UPDATE, id, data),
    delete: (id: string) => ipcRenderer.invoke(IPC_CHANNELS.PROJECT_DELETE, id),
    getByStatus: (status: string) => ipcRenderer.invoke(IPC_CHANNELS.PROJECT_GET_BY_STATUS, status)
  },

  material: {
    getAll: () => ipcRenderer.invoke(IPC_CHANNELS.MATERIAL_GET_ALL),
    getById: (id: string) => ipcRenderer.invoke(IPC_CHANNELS.MATERIAL_GET_BY_ID, id),
    create: (data: unknown) => ipcRenderer.invoke(IPC_CHANNELS.MATERIAL_CREATE, data),
    update: (id: string, data: unknown) => ipcRenderer.invoke(IPC_CHANNELS.MATERIAL_UPDATE, id, data),
    delete: (id: string) => ipcRenderer.invoke(IPC_CHANNELS.MATERIAL_DELETE, id),
    search: (query: string) => ipcRenderer.invoke(IPC_CHANNELS.MATERIAL_SEARCH, query)
  },

  wage: {
    getAll: () => ipcRenderer.invoke(IPC_CHANNELS.WAGE_GET_ALL),
    getById: (id: string) => ipcRenderer.invoke(IPC_CHANNELS.WAGE_GET_BY_ID, id),
    create: (data: unknown) => ipcRenderer.invoke(IPC_CHANNELS.WAGE_CREATE, data),
    update: (id: string, data: unknown) => ipcRenderer.invoke(IPC_CHANNELS.WAGE_UPDATE, id, data),
    delete: (id: string) => ipcRenderer.invoke(IPC_CHANNELS.WAGE_DELETE, id)
  },

  equipment: {
    getAll: () => ipcRenderer.invoke(IPC_CHANNELS.EQUIPMENT_GET_ALL),
    getById: (id: string) => ipcRenderer.invoke(IPC_CHANNELS.EQUIPMENT_GET_BY_ID, id),
    create: (data: unknown) => ipcRenderer.invoke(IPC_CHANNELS.EQUIPMENT_CREATE, data),
    update: (id: string, data: unknown) => ipcRenderer.invoke(IPC_CHANNELS.EQUIPMENT_UPDATE, id, data),
    delete: (id: string) => ipcRenderer.invoke(IPC_CHANNELS.EQUIPMENT_DELETE, id)
  },

  wbs: {
    getByProject: (projectId: string) => ipcRenderer.invoke(IPC_CHANNELS.WBS_GET_BY_PROJECT, projectId),
    getTree: (projectId: string) => ipcRenderer.invoke(IPC_CHANNELS.WBS_GET_TREE, projectId),
    getById: (id: string) => ipcRenderer.invoke(IPC_CHANNELS.WBS_GET_BY_ID, id),
    create: (data: unknown) => ipcRenderer.invoke(IPC_CHANNELS.WBS_CREATE, data),
    update: (id: string, data: unknown) => ipcRenderer.invoke(IPC_CHANNELS.WBS_UPDATE, id, data),
    delete: (id: string) => ipcRenderer.invoke(IPC_CHANNELS.WBS_DELETE, id),
    move: (id: string, parentId: string | null, order: number) =>
      ipcRenderer.invoke(IPC_CHANNELS.WBS_MOVE, id, parentId, order)
  },

  ahs: {
    getAll: () => ipcRenderer.invoke(IPC_CHANNELS.AHS_GET_ALL),
    getById: (id: string) => ipcRenderer.invoke(IPC_CHANNELS.AHS_GET_BY_ID, id),
    create: (data: unknown) => ipcRenderer.invoke(IPC_CHANNELS.AHS_CREATE, data),
    update: (id: string, data: unknown) => ipcRenderer.invoke(IPC_CHANNELS.AHS_UPDATE, id, data),
    delete: (id: string) => ipcRenderer.invoke(IPC_CHANNELS.AHS_DELETE, id),
    getByProject: (projectId: string) => ipcRenderer.invoke(IPC_CHANNELS.AHS_GET_BY_PROJECT, projectId),
    getLibrary: () => ipcRenderer.invoke(IPC_CHANNELS.AHS_GET_LIBRARY),
    duplicate: (id: string) => ipcRenderer.invoke(IPC_CHANNELS.AHS_DUPLICATE, id),

    material: {
      getByAhs: (ahsId: string, projectId?: string) => ipcRenderer.invoke(IPC_CHANNELS.AHS_MATERIAL_GET, ahsId, projectId),
      create: (data: unknown) => ipcRenderer.invoke(IPC_CHANNELS.AHS_MATERIAL_CREATE, data),
      update: (id: string, data: unknown) => ipcRenderer.invoke(IPC_CHANNELS.AHS_MATERIAL_UPDATE, id, data),
      delete: (id: string) => ipcRenderer.invoke(IPC_CHANNELS.AHS_MATERIAL_DELETE, id)
    },

    wage: {
      getByAhs: (ahsId: string, projectId?: string) => ipcRenderer.invoke(IPC_CHANNELS.AHS_WAGE_GET, ahsId, projectId),
      create: (data: unknown) => ipcRenderer.invoke(IPC_CHANNELS.AHS_WAGE_CREATE, data),
      update: (id: string, data: unknown) => ipcRenderer.invoke(IPC_CHANNELS.AHS_WAGE_UPDATE, id, data),
      delete: (id: string) => ipcRenderer.invoke(IPC_CHANNELS.AHS_WAGE_DELETE, id)
    },

    equipment: {
      getByAhs: (ahsId: string, projectId?: string) => ipcRenderer.invoke(IPC_CHANNELS.AHS_EQUIPMENT_GET, ahsId, projectId),
      create: (data: unknown) => ipcRenderer.invoke(IPC_CHANNELS.AHS_EQUIPMENT_CREATE, data),
      update: (id: string, data: unknown) => ipcRenderer.invoke(IPC_CHANNELS.AHS_EQUIPMENT_UPDATE, id, data),
      delete: (id: string) => ipcRenderer.invoke(IPC_CHANNELS.AHS_EQUIPMENT_DELETE, id)
    }
  },

  volume: {
    getByProject: (projectId: string) => ipcRenderer.invoke(IPC_CHANNELS.VOLUME_GET_BY_PROJECT, projectId),
    getByWbsItem: (wbsItemId: string) => ipcRenderer.invoke(IPC_CHANNELS.VOLUME_GET_BY_WBS_ITEM, wbsItemId),
    upsert: (wbsItemId: string, data: unknown) => ipcRenderer.invoke(IPC_CHANNELS.VOLUME_UPSERT, wbsItemId, data),
    bulkUpsert: (items: unknown[]) => ipcRenderer.invoke(IPC_CHANNELS.VOLUME_BULK_UPSERT, items),
    delete: (id: string) => ipcRenderer.invoke(IPC_CHANNELS.VOLUME_DELETE, id)
  },

  projectVolume: {
    getByProject: (projectId: string) => ipcRenderer.invoke(IPC_CHANNELS.PROJECT_VOLUME_GET_BY_PROJECT, projectId),
    upsert: (projectId: string, data: unknown) => ipcRenderer.invoke(IPC_CHANNELS.PROJECT_VOLUME_UPSERT, projectId, data),
    delete: (id: string) => ipcRenderer.invoke(IPC_CHANNELS.PROJECT_VOLUME_DELETE, id)
  },

  rab: {
    calculate: (projectId: string, ppn: number, overhead: number) => ipcRenderer.invoke(IPC_CHANNELS.RAB_CALCULATE, projectId, ppn, overhead),
    saveSnapshot: (projectId: string, ppn: number, overhead: number) => ipcRenderer.invoke(IPC_CHANNELS.RAB_SAVE_SNAPSHOT, projectId, ppn, overhead),
    getHistory: (projectId: string) => ipcRenderer.invoke(IPC_CHANNELS.RAB_GET_HISTORY, projectId),
    getLatest: (projectId: string) => ipcRenderer.invoke(IPC_CHANNELS.RAB_GET_LATEST, projectId),
    exportExcel: (data: any) => ipcRenderer.invoke(IPC_CHANNELS.RAB_EXPORT_EXCEL, data),
    exportPdf: (projectName: string) => ipcRenderer.invoke(IPC_CHANNELS.RAB_EXPORT_PDF, projectName)
  },

  settings: {
    get: () => ipcRenderer.invoke(IPC_CHANNELS.SETTINGS_GET),
    update: (data: unknown) => ipcRenderer.invoke(IPC_CHANNELS.SETTINGS_UPDATE, data),
    backup: () => ipcRenderer.invoke(IPC_CHANNELS.SETTINGS_BACKUP),
    restore: () => ipcRenderer.invoke(IPC_CHANNELS.SETTINGS_RESTORE)
  },

  ahsp: {
    importAhsp: () => ipcRenderer.invoke(IPC_CHANNELS.AHSP_IMPORT)
  },
 
  projectPrice: {
    override: (projectId: string, componentId: string, category: 'Bahan' | 'Tenaga Kerja' | 'Alat', price: number) => ipcRenderer.invoke(IPC_CHANNELS.PROJECT_PRICE_OVERRIDE, projectId, componentId, category, price),
    getOverrides: (projectId: string) => ipcRenderer.invoke(IPC_CHANNELS.PROJECT_PRICE_GET_OVERRIDES, projectId),
    deleteOverride: (projectId: string, componentId: string) => ipcRenderer.invoke(IPC_CHANNELS.PROJECT_PRICE_DELETE_OVERRIDE, projectId, componentId)
  }
}

contextBridge.exposeInMainWorld('api', api)

export type ElectronApi = typeof api
