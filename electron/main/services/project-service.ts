import { ProjectRepository } from '../database/repositories/project-repository'
import { WbsItemRepository } from '../database/repositories/wbs-repository'
import { Project } from '../database/repositories/types'
import { ServiceResult, success, failure } from './base-service'
import { RabService } from './rab-service'
import { dialog } from 'electron'
import fs from 'fs'
import { getDatabase } from '../database/connection'

export class ProjectService {
  private repo = new ProjectRepository()
  private rabService = new RabService()

  getAll(): ServiceResult<Project[]> {
    try {
      const projects = this.repo.getAll()
      const projectsWithTotals = projects.map(p => {
        const calcRes = this.rabService.calculate(p.id, p.ppn, p.overhead)
        const grandTotal = calcRes.success ? calcRes.data.grandTotal : 0
        return { ...p, grandTotal }
      })
      return success(projectsWithTotals)
    } catch (e) {
      return failure((e as Error).message)
    }
  }

  getById(id: string): ServiceResult<Project | null> {
    try {
      const project = this.repo.getById(id)
      if (!project) return success(null)
      const calcRes = this.rabService.calculate(project.id, project.ppn, project.overhead)
      const grandTotal = calcRes.success ? calcRes.data.grandTotal : 0
      return success({ ...project, grandTotal })
    } catch (e) {
      return failure((e as Error).message)
    }
  }

  create(data: Omit<Project, 'id' | 'createdAt' | 'updatedAt'> & { template?: string }): ServiceResult<Project> {
    try {
      const { template, ...projectData } = data
      const createdProject = this.repo.create(projectData)
      if (template && template !== 'blank') {
        this.seedTemplate(createdProject.id, template)
      }
      return success(createdProject)
    } catch (e) {
      return failure((e as Error).message)
    }
  }

  update(id: string, data: Partial<Omit<Project, 'id' | 'createdAt' | 'updatedAt'>>): ServiceResult<Project | null> {
    try {
      const updated = this.repo.update(id, data)
      if (!updated) return failure('Proyek tidak ditemukan')
      const calcRes = this.rabService.calculate(updated.id, updated.ppn, updated.overhead)
      const grandTotal = calcRes.success ? calcRes.data.grandTotal : 0
      return success({ ...updated, grandTotal })
    } catch (e) {
      return failure((e as Error).message)
    }
  }

  delete(id: string): ServiceResult<boolean> {
    try {
      return success(this.repo.delete(id))
    } catch (e) {
      return failure((e as Error).message)
    }
  }

  getByStatus(status: Project['status']): ServiceResult<Project[]> {
    try {
      const projects = this.repo.getByStatus(status)
      const projectsWithTotals = projects.map(p => {
        const calcRes = this.rabService.calculate(p.id, p.ppn, p.overhead)
        const grandTotal = calcRes.success ? calcRes.data.grandTotal : 0
        return { ...p, grandTotal }
      })
      return success(projectsWithTotals)
    } catch (e) {
      return failure((e as Error).message)
    }
  }

  private seedTemplate(projectId: string, template: string) {
    const wbsRepo = new WbsItemRepository()
    const project = this.repo.getById(projectId)
    const numFloors = project?.floors ?? 1
    
    if (template === 'pembangunan') {
      let items: any[] = []
      
      if (numFloors > 1) {
        // Multi-floor WBS structure
        items = [
          {
            name: '1. PEKERJAAN PERSIAPAN & TANAH',
            type: 'category',
            children: [
              { name: 'Pembersihan Lahan / Site Clearing', unit: 'm²', type: 'item' },
              { name: 'Pengukuran dan Pasang Bowplank', unit: 'm¹', type: 'item' },
              { name: 'Galian Tanah Pondasi', unit: 'm³', type: 'item' },
              { name: 'Urugan Pasir bawah Pondasi', unit: 'm³', type: 'item' },
              { name: 'Pondasi Batu Kali / Belah', unit: 'm³', type: 'item' },
              { name: 'Pondasi Footplat / Cakar Ayam', unit: 'm³', type: 'item' },
              { name: 'Urugan Tanah Kembali', unit: 'm³', type: 'item' }
            ]
          }
        ]

        for (let f = 1; f <= numFloors; f++) {
          const floorItems: any[] = []
          
          // Struktur
          const strukturChildren: any[] = []
          if (f === 1) {
            strukturChildren.push({ name: 'Sloef Beton Bertulang 15/20', unit: 'm³', type: 'item' })
          }
          strukturChildren.push(
            { name: `Kolom Beton Bertulang 15/15 Lantai ${f}`, unit: 'm³', type: 'item' },
            { name: `Balok Beton Bertulang 15/20 Lantai ${f}`, unit: 'm³', type: 'item' },
            { name: `Pelat Lantai Beton Bertulang t = 12cm Lantai ${f}`, unit: 'm³', type: 'item' }
          )

          // Arsitektur
          const arsitekturChildren = [
            { name: `Pasangan Dinding Bata Ringan / Hebel t = 10cm Lantai ${f}`, unit: 'm²', type: 'item' },
            { name: `Plesteran + Acian Dinding 1pc : 4ps Lantai ${f}`, unit: 'm²', type: 'item' },
            { name: `Pekerjaan Kusen Pintu & Jendela Aluminium Lantai ${f}`, unit: 'unit', type: 'item' },
            { name: `Pemasangan Keramik Lantai 60x60 Lantai ${f}`, unit: 'm²', type: 'item' },
            { name: `Pekerjaan Plafon Gypsum t = 9mm + Rangka Hollow Lantai ${f}`, unit: 'm²', type: 'item' }
          ]

          floorItems.push(
            {
              name: `PEKERJAAN STRUKTUR (LANTAI ${f})`,
              type: 'category',
              children: strukturChildren
            },
            {
              name: `PEKERJAAN ARSITEKTUR & DINDING (LANTAI ${f})`,
              type: 'category',
              children: arsitekturChildren
            }
          )

          items.push({
            name: `${f + 1}. LANTAI ${f}`,
            type: 'category',
            children: floorItems
          })
        }

        // Add remaining global categories
        items.push(
          {
            name: `${numFloors + 2}. PEKERJAAN ATAP`,
            type: 'category',
            children: [
              { name: 'Rangka Atap Baja Ringan', unit: 'm²', type: 'item' },
              { name: 'Pemasangan Genteng Beton / Metal', unit: 'm²', type: 'item' },
              { name: 'Pemasangan Listplank GRC', unit: 'm¹', type: 'item' }
            ]
          },
          {
            name: `${numFloors + 3}. PEKERJAAN SANITASI DAN PLUMBING`,
            type: 'category',
            children: [
              { name: 'Pemasangan Kloset Duduk Standar', unit: 'unit', type: 'item' },
              { name: 'Pemasangan Pipa Air Bersih PVC 3/4"', unit: 'm¹', type: 'item' },
              { name: 'Pemasangan Pipa Air Kotor PVC 3" / 4"', unit: 'm¹', type: 'item' },
              { name: 'Pembuatan Septictank & Resapan', unit: 'unit', type: 'item' }
            ]
          },
          {
            name: `${numFloors + 4}. PEKERJAAN FINISHING & KELISTRIKAN`,
            type: 'category',
            children: [
              { name: 'Pengecatan Dinding Interior (2 lapis)', unit: 'm²', type: 'item' },
              { name: 'Pengecatan Dinding Eksterior Weatherproof', unit: 'm²', type: 'item' },
              { name: 'Instalasi Titik Lampu & Stop Kontak', unit: 'titik', type: 'item' },
              { name: 'Pemasangan Sakelar & Stop Kontak', unit: 'buah', type: 'item' }
            ]
          }
        )
      } else {
        // Original flat structure for 1 floor
        items = [
          {
            name: '1. PEKERJAAN PERSIAPAN',
            type: 'category',
            children: [
              { name: 'Pembersihan Lahan / Site Clearing', unit: 'm²', type: 'item' },
              { name: 'Pengukuran dan Pasang Bowplank', unit: 'm¹', type: 'item' },
              { name: 'Pagar Pengaman Proyek', unit: 'm¹', type: 'item' }
            ]
          },
          {
            name: '2. PEKERJAAN TANAH DAN PONDASI',
            type: 'category',
            children: [
              { name: 'Galian Tanah Pondasi', unit: 'm³', type: 'item' },
              { name: 'Urugan Pasir bawah Pondasi', unit: 'm³', type: 'item' },
              { name: 'Pondasi Batu Kali / Belah', unit: 'm³', type: 'item' },
              { name: 'Pondasi Footplat / Cakar Ayam', unit: 'm³', type: 'item' },
              { name: 'Urugan Tanah Kembali', unit: 'm³', type: 'item' }
            ]
          },
          {
            name: '3. PEKERJAAN STRUKTUR BETON',
            type: 'category',
            children: [
              { name: 'Sloef Beton Bertulang 15/20', unit: 'm³', type: 'item' },
              { name: 'Kolom Beton Bertulang 15/15', unit: 'm³', type: 'item' },
              { name: 'Balok Beton Bertulang 15/20', unit: 'm³', type: 'item' },
              { name: 'Pelat Lantai Beton Bertulang t = 12cm', unit: 'm³', type: 'item' }
            ]
          },
          {
            name: '4. PEKERJAAN DINDING DAN ARSITEKTUR',
            type: 'category',
            children: [
              { name: 'Pasangan Dinding Bata Ringan / Hebel t = 10cm', unit: 'm²', type: 'item' },
              { name: 'Plesteran + Acian Dinding 1pc : 4ps', unit: 'm²', type: 'item' },
              { name: 'Pekerjaan Kusen Pintu & Jendela Aluminium', unit: 'unit', type: 'item' },
              { name: 'Pemasangan Keramik Lantai 60x60', unit: 'm²', type: 'item' },
              { name: 'Pekerjaan Plafon Gypsum t = 9mm + Rangka Hollow', unit: 'm²', type: 'item' }
            ]
          },
          {
            name: '5. PEKERJAAN ATAP',
            type: 'category',
            children: [
              { name: 'Rangka Atap Baja Ringan', unit: 'm²', type: 'item' },
              { name: 'Pemasangan Genteng Beton / Metal', unit: 'm²', type: 'item' },
              { name: 'Pemasangan Listplank GRC', unit: 'm¹', type: 'item' }
            ]
          },
          {
            name: '6. PEKERJAAN SANITASI DAN PLUMBING',
            type: 'category',
            children: [
              { name: 'Pemasangan Kloset Duduk Standar', unit: 'unit', type: 'item' },
              { name: 'Pemasangan Pipa Air Bersih PVC 3/4"', unit: 'm¹', type: 'item' },
              { name: 'Pemasangan Pipa Air Kotor PVC 3" / 4"', unit: 'm¹', type: 'item' },
              { name: 'Pembuatan Septictank & Resapan', unit: 'unit', type: 'item' }
            ]
          },
          {
            name: '7. PEKERJAAN FINISHING & KELISTRIKAN',
            type: 'category',
            children: [
              { name: 'Pengecatan Dinding Interior (2 lapis)', unit: 'm²', type: 'item' },
              { name: 'Pengecatan Dinding Eksterior Weatherproof', unit: 'm²', type: 'item' },
              { name: 'Instalasi Titik Lampu & Stop Kontak', unit: 'titik', type: 'item' },
              { name: 'Pemasangan Sakelar & Stop Kontak', unit: 'buah', type: 'item' }
            ]
          }
        ]
      }
      
      this.insertWbsItems(projectId, null, items, wbsRepo)
    } else if (template === 'renovasi') {
      const items = [
        {
          name: '1. PEKERJAAN BONGKARAN (DEMOLITION)',
          type: 'category',
          children: [
            { name: 'Bongkaran Rangka & Penutup Atap Lama', unit: 'm²', type: 'item' },
            { name: 'Bongkaran Sekat / Dinding Lama', unit: 'm²', type: 'item' },
            { name: 'Bongkaran Lantai Keramik Lama', unit: 'm²', type: 'item' },
            { name: 'Pembersihan & Pembuangan Puing Bongkaran', unit: 'ls', type: 'item' }
          ]
        },
        {
          name: '2. PEKERJAAN PERBAIKAN STRUKTUR & DINDING',
          type: 'category',
          children: [
            { name: 'Perbaikan Dinding Retak / Lembab (Kerokan Plesteran)', unit: 'm²', type: 'item' },
            { name: 'Pemasangan Sekat Dinding Baru (Gypsum Double Sisi)', unit: 'm²', type: 'item' },
            { name: 'Plesteran + Acian Dinding Baru / Perbaikan', unit: 'm²', type: 'item' }
          ]
        },
        {
          name: '3. PEKERJAAN PASANG BARU & ARSITEKTUR',
          type: 'category',
          children: [
            { name: 'Pemasangan Kusen, Pintu & Aksesoris Baru', unit: 'unit', type: 'item' },
            { name: 'Pemasangan Plafon Gypsum Baru', unit: 'm²', type: 'item' },
            { name: 'Pemasangan Lantai Keramik / Homogeneous Tile 60x60 Baru', unit: 'm²', type: 'item' }
          ]
        },
        {
          name: '4. PEKERJAAN KELISTRIKAN & SANITASI',
          type: 'category',
          children: [
            { name: 'Perbaikan / Pemindahan Titik Kabel Kelistrikan', unit: 'titik', type: 'item' },
            { name: 'Pemasangan Wastafel & Kran Baru', unit: 'unit', type: 'item' },
            { name: 'Pemasangan Kloset Duduk Baru', unit: 'unit', type: 'item' },
            { name: 'Perbaikan Saluran Pipa & Kran Bocor', unit: 'ls', type: 'item' }
          ]
        },
        {
          name: '5. PEKERJAAN FINISHING & PENGECATAN',
          type: 'category',
          children: [
            { name: 'Pengecatan Ulang Dinding Interior (2 lapis)', unit: 'm²', type: 'item' },
            { name: 'Pengecatan Ulang Dinding Eksterior', unit: 'm²', type: 'item' },
            { name: 'Pengecatan Plafon Gypsum Baru', unit: 'm²', type: 'item' },
            { name: 'Pembersihan Akhir Area Kerja (General Cleaning)', unit: 'ls', type: 'item' }
          ]
        }
      ]

      this.insertWbsItems(projectId, null, items, wbsRepo)
    }
  }

  private insertWbsItems(
    projectId: string,
    parentId: string | null,
    items: any[],
    wbsRepo: WbsItemRepository
  ) {
    let order = 1
    for (const item of items) {
      const created = wbsRepo.create({
        projectId,
        parentId,
        name: item.name,
        unit: item.unit ?? '',
        type: item.type === 'category' ? 'group' : 'item',
        sortOrder: order++
      })

      if (item.children && item.children.length > 0) {
        this.insertWbsItems(projectId, created.id, item.children, wbsRepo)
      }
    }
  }

  async exportProject(projectId: string): Promise<ServiceResult<{ success: boolean; filePath: string }>> {
    try {
      const project = this.repo.getById(projectId)
      if (!project) return failure('Proyek tidak ditemukan')

      const saveResult = await dialog.showSaveDialog({
        title: 'Ekspor Proyek ke JSON',
        defaultPath: `Project_${project.name.replace(/[\s/\\?%*:|"<>]/g, '_')}.json`,
        filters: [{ name: 'JSON Files', extensions: ['json'] }],
        properties: ['showOverwriteConfirmation']
      })

      if (saveResult.canceled || !saveResult.filePath) {
        return failure('Ekspor dibatalkan')
      }

      const db = getDatabase()
      
      const queryAllRows = (sql: string, params: any[] = []) => {
        const stmt = db.prepare(sql)
        stmt.bind(params)
        const rows: any[] = []
        while (stmt.step()) {
          rows.push(stmt.getAsObject())
        }
        stmt.free()
        return rows
      }

      const wbsItems = queryAllRows('SELECT * FROM "WbsItem" WHERE projectId = ?', [projectId])
      const projectVolumes = queryAllRows('SELECT * FROM "ProjectVolume" WHERE projectId = ?', [projectId])
      const volumeItems = queryAllRows('SELECT * FROM "VolumeItem" WHERE wbsItemId IN (SELECT id FROM "WbsItem" WHERE projectId = ?)', [projectId])
      const ahsItems = queryAllRows('SELECT * FROM "Ahs" WHERE projectId = ?', [projectId])
      const ahsIdList = ahsItems.map(a => a.id)
      
      let ahsComponentMaterials: any[] = []
      let ahsComponentWages: any[] = []
      let ahsComponentEquipment: any[] = []
      
      if (ahsIdList.length > 0) {
        const placeholders = ahsIdList.map(() => '?').join(',')
        ahsComponentMaterials = queryAllRows(`SELECT * FROM "AhsComponentMaterial" WHERE ahsId IN (${placeholders})`, ahsIdList)
        ahsComponentWages = queryAllRows(`SELECT * FROM "AhsComponentWage" WHERE ahsId IN (${placeholders})`, ahsIdList)
        ahsComponentEquipment = queryAllRows(`SELECT * FROM "AhsComponentEquipment" WHERE ahsId IN (${placeholders})`, ahsIdList)
      }

      const priceOverrides = queryAllRows('SELECT * FROM "ProjectComponentPrice" WHERE projectId = ?', [projectId])

      const exportData = {
        version: '1.0.0',
        project,
        wbsItems,
        projectVolumes,
        volumeItems,
        ahsItems,
        ahsComponentMaterials,
        ahsComponentWages,
        ahsComponentEquipment,
        priceOverrides
      }

      fs.writeFileSync(saveResult.filePath, JSON.stringify(exportData, null, 2), 'utf-8')
      return success({ success: true, filePath: saveResult.filePath })
    } catch (e) {
      return failure((e as Error).message)
    }
  }

  async importProject(): Promise<ServiceResult<{ success: boolean; projectId?: string }>> {
    try {
      const openResult = await dialog.showOpenDialog({
        title: 'Impor Proyek dari JSON',
        filters: [{ name: 'JSON Files', extensions: ['json'] }],
        properties: ['openFile']
      })

      if (openResult.canceled || openResult.filePaths.length === 0) {
        return failure('Impor dibatalkan')
      }

      const fileContent = fs.readFileSync(openResult.filePaths[0], 'utf-8')
      const importData = JSON.parse(fileContent)

      if (!importData || !importData.project || !importData.version) {
        return failure('Format file JSON proyek tidak valid')
      }

      const db = getDatabase()
      const { v4: uuid } = require('uuid')

      const newProjectId = uuid()
      const now = new Date().toISOString()

      const p = importData.project
      db.run(
        `INSERT INTO "Project" (id, name, projectNumber, location, year, buildingType, buildingArea, floors, status, ppn, overhead, note, companyName, companyLogo, reportHeader, ownerName, ownerParaf, createdAt, updatedAt)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
        [
          newProjectId,
          p.name + ' (Import)',
          p.projectNumber || '',
          p.location || '',
          p.year || 2026,
          p.buildingType || '',
          p.buildingArea || 0,
          p.floors || 0,
          p.status || 'draft',
          p.ppn || 11,
          p.overhead || 0,
          p.note || '',
          p.companyName || '',
          p.companyLogo || '',
          p.reportHeader || '',
          p.ownerName || '',
          p.ownerParaf || '',
          now,
          now
        ]
      )

      const wbsIdMap = new Map<string, string>()
      const projectVolIdMap = new Map<string, string>()
      const ahsIdMap = new Map<string, string>()

      const projectVolumes = importData.projectVolumes || []
      for (const pv of projectVolumes) {
        const newPvId = uuid()
        projectVolIdMap.set(pv.id, newPvId)
        db.run(
          `INSERT INTO "ProjectVolume" (id, projectId, name, unit, value, formula, notes, createdAt, updatedAt)
           VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`,
          [newPvId, newProjectId, pv.name, pv.unit || '', pv.value || 0, pv.formula || '', pv.notes || '', now, now]
        )
      }

      const ahsItems = importData.ahsItems || []
      for (const ahs of ahsItems) {
        const newAhsId = uuid()
        ahsIdMap.set(ahs.id, newAhsId)
        db.run(
          `INSERT INTO "Ahs" (id, code, name, unit, category, source, totalPrice, projectId, createdAt, updatedAt)
           VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
          [newAhsId, ahs.code, ahs.name, ahs.unit, ahs.category || 'kustom', ahs.source || '', ahs.totalPrice || 0, newProjectId, now, now]
        )
      }

      const ahsComponentMaterials = importData.ahsComponentMaterials || []
      for (const comp of ahsComponentMaterials) {
        const newCompId = uuid()
        const newAhsId = ahsIdMap.get(comp.ahsId)
        if (newAhsId) {
          db.run(
            `INSERT INTO "AhsComponentMaterial" (id, ahsId, materialId, coefficient, totalPrice)
             VALUES (?, ?, ?, ?, ?)`,
            [newCompId, newAhsId, comp.materialId, comp.coefficient || 0, comp.totalPrice || 0]
          )
        }
      }

      const ahsComponentWages = importData.ahsComponentWages || []
      for (const comp of ahsComponentWages) {
        const newCompId = uuid()
        const newAhsId = ahsIdMap.get(comp.ahsId)
        if (newAhsId) {
          db.run(
            `INSERT INTO "AhsComponentWage" (id, ahsId, wageId, coefficient, totalPrice)
             VALUES (?, ?, ?, ?, ?)`,
            [newCompId, newAhsId, comp.wageId, comp.coefficient || 0, comp.totalPrice || 0]
          )
        }
      }

      const ahsComponentEquipment = importData.ahsComponentEquipment || []
      for (const comp of ahsComponentEquipment) {
        const newCompId = uuid()
        const newAhsId = ahsIdMap.get(comp.ahsId)
        if (newAhsId) {
          db.run(
            `INSERT INTO "AhsComponentEquipment" (id, ahsId, equipmentId, coefficient, totalPrice)
             VALUES (?, ?, ?, ?, ?)`,
            [newCompId, newAhsId, comp.equipmentId, comp.coefficient || 0, comp.totalPrice || 0]
          )
        }
      }

      const wbsItems = importData.wbsItems || []
      const sortedWbsItems = [...wbsItems].sort((a, b) => (a.wbsPath.split('.').length) - (b.wbsPath.split('.').length))

      for (const item of sortedWbsItems) {
        const newWbsId = uuid()
        wbsIdMap.set(item.id, newWbsId)
        const newParentId = item.parentId ? wbsIdMap.get(item.parentId) : null
        
        db.run(
          `INSERT INTO "WbsItem" (id, projectId, parentId, code, name, unit, type, sortOrder, wbsPath, createdAt, updatedAt)
           VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
          [
            newWbsId,
            newProjectId,
            newParentId || null,
            item.code,
            item.name,
            item.unit || '',
            item.type || 'item',
            item.sortOrder || 0,
            item.wbsPath,
            now,
            now
          ]
        )
      }

      const volumeItems = importData.volumeItems || []
      for (const vol of volumeItems) {
        const newVolId = uuid()
        const newWbsItemId = wbsIdMap.get(vol.wbsItemId)
        if (newWbsItemId) {
          const newProjectVolumeId = vol.projectVolumeId ? projectVolIdMap.get(vol.projectVolumeId) : null
          const newAhsId = vol.ahsId ? ahsIdMap.get(vol.ahsId) : null
          
          db.run(
            `INSERT INTO "VolumeItem" (id, wbsItemId, ahsId, volume, unit, formula, notes, projectVolumeId, createdAt, updatedAt)
             VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
            [
              newVolId,
              newWbsItemId,
              newAhsId || vol.ahsId || null,
              vol.volume || 0,
              vol.unit || '',
              vol.formula || '',
              vol.notes || '',
              newProjectVolumeId || null,
              now,
              now
            ]
          )
        }
      }

      const priceOverrides = importData.priceOverrides || []
      for (const po of priceOverrides) {
        const newPoId = uuid()
        db.run(
          `INSERT INTO "ProjectComponentPrice" (id, projectId, componentId, category, overriddenPrice, createdAt, updatedAt)
           VALUES (?, ?, ?, ?, ?, ?, ?)`,
          [newPoId, newProjectId, po.componentId, po.category, po.overriddenPrice || 0, now, now]
        )
      }

      const saveDatabase = require('../connection').saveDatabase
      saveDatabase()

      return success({ success: true, projectId: newProjectId })
    } catch (e) {
      return failure((e as Error).message)
    }
  }
}

