import { ProjectRepository } from '../database/repositories/project-repository'
import { WbsItemRepository } from '../database/repositories/wbs-repository'
import { Project } from '../database/repositories/types'
import { ServiceResult, success, failure } from './base-service'
import { RabService } from './rab-service'

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
}
