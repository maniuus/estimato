import { ipcMain, dialog, BrowserWindow } from 'electron'
import fs from 'fs'
import { ProjectService } from '../services/project-service'
import { MasterDataService } from '../services/master-data-service'
import { WbsService } from '../services/wbs-service'
import { AhsService } from '../services/ahs-service'
import { VolumeService } from '../services/volume-service'
import { RabService } from '../services/rab-service'
import { SettingsService } from '../services/settings-service'
import { AhspImportService } from '../services/ahsp-import-service'
import { ExcelExportService } from '../services/excel-export-service'
import { ProjectPriceService } from '../services/project-price-service'
import { IPC_CHANNELS } from './channels'

export function registerIpcHandlers(): void {
  const projectService = new ProjectService()
  const masterDataService = new MasterDataService()
  const wbsService = new WbsService()
  const ahsService = new AhsService()
  const volumeService = new VolumeService()
  const rabService = new RabService()
  const settingsService = new SettingsService()
  const ahspImportService = new AhspImportService()
  const excelExportService = new ExcelExportService()
  const projectPriceService = new ProjectPriceService()

  ipcMain.handle(IPC_CHANNELS.PROJECT_GET_ALL, () => projectService.getAll())
  ipcMain.handle(IPC_CHANNELS.PROJECT_GET_BY_ID, (_e, id: string) => projectService.getById(id))
  ipcMain.handle(IPC_CHANNELS.PROJECT_CREATE, (_e, data) => projectService.create(data))
  ipcMain.handle(IPC_CHANNELS.PROJECT_UPDATE, (_e, id: string, data) => projectService.update(id, data))
  ipcMain.handle(IPC_CHANNELS.PROJECT_DELETE, (_e, id: string) => projectService.delete(id))
  ipcMain.handle(IPC_CHANNELS.PROJECT_GET_BY_STATUS, (_e, status: string) => projectService.getByStatus(status as 'draft' | 'active' | 'completed' | 'archived'))

  ipcMain.handle(IPC_CHANNELS.MATERIAL_GET_ALL, () => masterDataService.getAllMaterials())
  ipcMain.handle(IPC_CHANNELS.MATERIAL_GET_BY_ID, (_e, id: string) => masterDataService.getMaterialById(id))
  ipcMain.handle(IPC_CHANNELS.MATERIAL_CREATE, (_e, data) => masterDataService.createMaterial(data))
  ipcMain.handle(IPC_CHANNELS.MATERIAL_UPDATE, (_e, id: string, data) => masterDataService.updateMaterial(id, data))
  ipcMain.handle(IPC_CHANNELS.MATERIAL_DELETE, (_e, id: string) => masterDataService.deleteMaterial(id))
  ipcMain.handle(IPC_CHANNELS.MATERIAL_SEARCH, (_e, query: string) => masterDataService.searchMaterials(query))

  ipcMain.handle(IPC_CHANNELS.WAGE_GET_ALL, () => masterDataService.getAllWages())
  ipcMain.handle(IPC_CHANNELS.WAGE_GET_BY_ID, (_e, id: string) => masterDataService.getWageById(id))
  ipcMain.handle(IPC_CHANNELS.WAGE_CREATE, (_e, data) => masterDataService.createWage(data))
  ipcMain.handle(IPC_CHANNELS.WAGE_UPDATE, (_e, id: string, data) => masterDataService.updateWage(id, data))
  ipcMain.handle(IPC_CHANNELS.WAGE_DELETE, (_e, id: string) => masterDataService.deleteWage(id))

  ipcMain.handle(IPC_CHANNELS.EQUIPMENT_GET_ALL, () => masterDataService.getAllEquipment())
  ipcMain.handle(IPC_CHANNELS.EQUIPMENT_GET_BY_ID, (_e, id: string) => masterDataService.getEquipmentById(id))
  ipcMain.handle(IPC_CHANNELS.EQUIPMENT_CREATE, (_e, data) => masterDataService.createEquipment(data))
  ipcMain.handle(IPC_CHANNELS.EQUIPMENT_UPDATE, (_e, id: string, data) => masterDataService.updateEquipment(id, data))
  ipcMain.handle(IPC_CHANNELS.EQUIPMENT_DELETE, (_e, id: string) => masterDataService.deleteEquipment(id))

  ipcMain.handle(IPC_CHANNELS.WBS_GET_BY_PROJECT, (_e, projectId: string) => wbsService.getByProjectId(projectId))
  ipcMain.handle(IPC_CHANNELS.WBS_GET_TREE, (_e, projectId: string) => wbsService.getTree(projectId))
  ipcMain.handle(IPC_CHANNELS.WBS_GET_BY_ID, (_e, id: string) => wbsService.getById(id))
  ipcMain.handle(IPC_CHANNELS.WBS_CREATE, (_e, data) => wbsService.create(data))
  ipcMain.handle(IPC_CHANNELS.WBS_UPDATE, (_e, id: string, data) => wbsService.update(id, data))
  ipcMain.handle(IPC_CHANNELS.WBS_DELETE, (_e, id: string) => wbsService.delete(id))
  ipcMain.handle(IPC_CHANNELS.WBS_MOVE, (_e, id: string, parentId: string | null, order: number) => wbsService.moveItem(id, parentId, order))

  ipcMain.handle(IPC_CHANNELS.AHS_GET_ALL, () => ahsService.getAll())
  ipcMain.handle(IPC_CHANNELS.AHS_GET_BY_ID, (_e, id: string) => ahsService.getById(id))
  ipcMain.handle(IPC_CHANNELS.AHS_CREATE, (_e, data) => ahsService.create(data))
  ipcMain.handle(IPC_CHANNELS.AHS_UPDATE, (_e, id: string, data) => ahsService.update(id, data))
  ipcMain.handle(IPC_CHANNELS.AHS_DELETE, (_e, id: string) => ahsService.delete(id))
  ipcMain.handle(IPC_CHANNELS.AHS_GET_BY_PROJECT, (_e, projectId: string) => ahsService.getByProjectId(projectId))
  ipcMain.handle(IPC_CHANNELS.AHS_GET_LIBRARY, () => ahsService.getLibrary())

  ipcMain.handle(IPC_CHANNELS.AHS_MATERIAL_GET, (_e, ahsId: string, projectId?: string) => ahsService.getMaterialComponents(ahsId, projectId))
  ipcMain.handle(IPC_CHANNELS.AHS_MATERIAL_CREATE, (_e, data) => ahsService.createMaterialComponent(data))
  ipcMain.handle(IPC_CHANNELS.AHS_MATERIAL_UPDATE, (_e, id: string, data) => ahsService.updateMaterialComponent(id, data))
  ipcMain.handle(IPC_CHANNELS.AHS_MATERIAL_DELETE, (_e, id: string) => ahsService.deleteMaterialComponent(id))

  ipcMain.handle(IPC_CHANNELS.AHS_WAGE_GET, (_e, ahsId: string, projectId?: string) => ahsService.getWageComponents(ahsId, projectId))
  ipcMain.handle(IPC_CHANNELS.AHS_WAGE_CREATE, (_e, data) => ahsService.createWageComponent(data))
  ipcMain.handle(IPC_CHANNELS.AHS_WAGE_UPDATE, (_e, id: string, data) => ahsService.updateWageComponent(id, data))
  ipcMain.handle(IPC_CHANNELS.AHS_WAGE_DELETE, (_e, id: string) => ahsService.deleteWageComponent(id))

  ipcMain.handle(IPC_CHANNELS.AHS_EQUIPMENT_GET, (_e, ahsId: string, projectId?: string) => ahsService.getEquipmentComponents(ahsId, projectId))
  ipcMain.handle(IPC_CHANNELS.AHS_EQUIPMENT_CREATE, (_e, data) => ahsService.createEquipmentComponent(data))
  ipcMain.handle(IPC_CHANNELS.AHS_EQUIPMENT_UPDATE, (_e, id: string, data) => ahsService.updateEquipmentComponent(id, data))
  ipcMain.handle(IPC_CHANNELS.AHS_EQUIPMENT_DELETE, (_e, id: string) => ahsService.deleteEquipmentComponent(id))

  // Volume
  ipcMain.handle(IPC_CHANNELS.VOLUME_GET_BY_PROJECT, (_e, projectId: string) => volumeService.getByProject(projectId))
  ipcMain.handle(IPC_CHANNELS.VOLUME_GET_BY_WBS_ITEM, (_e, wbsItemId: string) => volumeService.getByWbsItem(wbsItemId))
  ipcMain.handle(IPC_CHANNELS.VOLUME_UPSERT, (_e, wbsItemId: string, data) => volumeService.upsert(wbsItemId, data))
  ipcMain.handle(IPC_CHANNELS.VOLUME_BULK_UPSERT, (_e, items: unknown[]) => volumeService.bulkUpsert(items as any))
  ipcMain.handle(IPC_CHANNELS.VOLUME_DELETE, (_e, id: string) => volumeService.delete(id))

  // RAB
  ipcMain.handle(IPC_CHANNELS.RAB_CALCULATE, (_e, projectId: string, ppn: number, overhead: number) => rabService.calculate(projectId, ppn, overhead))
  ipcMain.handle(IPC_CHANNELS.RAB_SAVE_SNAPSHOT, (_e, projectId: string, ppn: number, overhead: number) => rabService.saveSnapshot(projectId, ppn, overhead))
  ipcMain.handle(IPC_CHANNELS.RAB_GET_HISTORY, (_e, projectId: string) => rabService.getHistory(projectId))
  ipcMain.handle(IPC_CHANNELS.RAB_GET_LATEST, (_e, projectId: string) => rabService.getLatestSnapshot(projectId))
  ipcMain.handle(IPC_CHANNELS.RAB_EXPORT_EXCEL, (_e, data) => excelExportService.exportExcel(data))
  ipcMain.handle(IPC_CHANNELS.RAB_EXPORT_PDF, async (_e, projectName: string) => {
    try {
      const win = BrowserWindow.getFocusedWindow()
      if (!win) {
        return { success: false, error: 'Tidak ada jendela aktif' }
      }

      const { filePath } = await dialog.showSaveDialog(win, {
        title: 'Ekspor Laporan PDF',
        defaultPath: `Laporan_RAB_${projectName.replace(/[^a-zA-Z0-9]/g, '_')}.pdf`,
        filters: [{ name: 'PDF Files', extensions: ['pdf'] }]
      })

      if (!filePath) {
        return { success: false, error: 'Ekspor dibatalkan oleh pengguna' }
      }

      const pdfData = await win.webContents.printToPDF({
        printBackground: true,
        margins: {
          marginType: 'default'
        },
        pageSize: 'A4',
        landscape: false
      })

      await fs.promises.writeFile(filePath, pdfData)
      return { success: true, data: { filePath } }
    } catch (e) {
      return { success: false, error: (e as Error).message }
    }
  })

  // Settings
  ipcMain.handle(IPC_CHANNELS.SETTINGS_GET, () => settingsService.get())
  ipcMain.handle(IPC_CHANNELS.SETTINGS_UPDATE, (_e, data) => settingsService.update(data))
  ipcMain.handle(IPC_CHANNELS.SETTINGS_BACKUP, () => settingsService.backup())
  ipcMain.handle(IPC_CHANNELS.SETTINGS_RESTORE, () => settingsService.restore())

  // AHSP Import
  ipcMain.handle(IPC_CHANNELS.AHSP_IMPORT, () => ahspImportService.importFromDialog())

  // Project Price Overrides
  ipcMain.handle(IPC_CHANNELS.PROJECT_PRICE_OVERRIDE, (_e, projectId: string, componentId: string, category: 'Bahan' | 'Tenaga Kerja' | 'Alat', price: number) => projectPriceService.overridePrice(projectId, componentId, category, price))
  ipcMain.handle(IPC_CHANNELS.PROJECT_PRICE_GET_OVERRIDES, (_e, projectId: string) => projectPriceService.getOverrides(projectId))
  ipcMain.handle(IPC_CHANNELS.PROJECT_PRICE_DELETE_OVERRIDE, (_e, projectId: string, componentId: string) => projectPriceService.deleteOverride(projectId, componentId))
}
