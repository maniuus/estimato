import { dialog } from 'electron'
import { ServiceResult, success, failure } from './base-service'

export class ExcelExportService {
  async exportExcel(data: {
    projectName: string
    location: string
    year: number
    ppn: number
    overhead: number
    lineItems: any[]
    detailedAhsList: any[]
    bomItems: any[]
  }): Promise<ServiceResult<{ success: boolean; filePath: string }>> {
    try {
      const saveResult = await dialog.showSaveDialog({
        title: 'Ekspor Master RAB ke Excel',
        defaultPath: `RAB_${data.projectName.replace(/[\s/\\?%*:|"<>]/g, '_')}.xlsx`,
        filters: [{ name: 'Excel Files', extensions: ['xlsx'] }],
        properties: ['showOverwriteConfirmation']
      })

      if (saveResult.canceled || !saveResult.filePath) {
        return failure('Ekspor dibatalkan')
      }

      const filePath = saveResult.filePath
      const XLSX = require('xlsx')
      const wb = XLSX.utils.book_new()

      // ── SHEET 1: RAB ──
      const rabRows: any[][] = [
        ['RENCANA ANGGARAN BIAYA (RAB)'],
        [`Proyek: ${data.projectName}`],
        [`Lokasi: ${data.location}`],
        [`Tahun: ${data.year}`],
        [],
        ['No', 'Kode Pekerjaan', 'Uraian Pekerjaan', 'Referensi AHS', 'Volume', 'Satuan', 'Harga Satuan (Rp)', 'Jumlah Biaya (Rp)']
      ]

      let subtotalRAB = 0
      data.lineItems.forEach((item, index) => {
        subtotalRAB += item.totalPrice || 0
        rabRows.push([
          index + 1,
          item.wbsCode || '',
          item.wbsName || '',
          item.ahsCode || '',
          item.volume || 0,
          item.unit || '',
          item.unitPrice || 0,
          item.totalPrice || 0
        ])
      })

      const ppnAmount = subtotalRAB * (data.ppn / 100)
      const overheadAmount = subtotalRAB * (data.overhead / 100)
      const grandTotal = subtotalRAB + ppnAmount + overheadAmount

      rabRows.push([])
      rabRows.push(['', '', '', '', '', '', 'Subtotal Pekerjaan', subtotalRAB])
      rabRows.push(['', '', '', '', '', '', `PPN (${data.ppn}%)`, ppnAmount])
      rabRows.push(['', '', '', '', '', '', `Overhead & Profit (${data.overhead}%)`, overheadAmount])
      rabRows.push(['', '', '', '', '', '', 'Grand Total', grandTotal])

      const wsRab = XLSX.utils.aoa_to_sheet(rabRows)
      XLSX.utils.book_append_sheet(wb, wsRab, 'RAB Proyek')

      // ── SHEET 2: ANALISA AHSP ──
      const analisaRows: any[][] = [
        ['LEMBAR ANALISA HARGA SATUAN PEKERJAAN (AHSP)'],
        [`Proyek: ${data.projectName}`],
        [],
      ]

      data.detailedAhsList.forEach(dataItem => {
        analisaRows.push([`KODE AHS: ${dataItem.ahs.code}`])
        analisaRows.push([`Pekerjaan: ${dataItem.ahs.name} (per ${dataItem.ahs.unit})`])
        analisaRows.push(['No', 'Komponen', 'Satuan', 'Koefisien', 'Harga Satuan (Rp)', 'Jumlah Harga (Rp)'])
        
        analisaRows.push(['A.', 'TENAGA KERJA'])
        dataItem.wages.forEach((w: any, i: number) => {
          analisaRows.push([i + 1, w.wageType, w.wageUnit, w.coefficient, w.dailyWage, w.totalPrice])
        })
        analisaRows.push(['', 'Subtotal Tenaga Kerja', '', '', '', dataItem.subtotalWages])

        analisaRows.push(['B.', 'BAHAN'])
        dataItem.materials.forEach((m: any, i: number) => {
          analisaRows.push([i + 1, m.materialName, m.materialUnit, m.coefficient, m.unitPrice, m.totalPrice])
        })
        analisaRows.push(['', 'Subtotal Bahan', '', '', '', dataItem.subtotalMaterials])

        analisaRows.push(['C.', 'ALAT'])
        dataItem.equipment.forEach((e: any, i: number) => {
          analisaRows.push([i + 1, e.equipmentName, e.equipmentUnit, e.coefficient, e.rentalPrice, e.totalPrice])
        })
        analisaRows.push(['', 'Subtotal Alat', '', '', '', dataItem.subtotalEquipment])

        analisaRows.push(['', 'Jumlah (A + B + C)', '', '', '', dataItem.totalComponents])
        analisaRows.push(['', `Overhead & Profit (${data.overhead}%)`, '', '', '', dataItem.overheadAmount])
        analisaRows.push(['', 'Harga Satuan Pekerjaan (HSP)', '', '', '', dataItem.totalUnitPrice])
        analisaRows.push([]) // empty row separator
      })

      const wsAnalisa = XLSX.utils.aoa_to_sheet(analisaRows)
      XLSX.utils.book_append_sheet(wb, wsAnalisa, 'Analisa AHSP')

      // ── SHEET 3: BILL OF MATERIAL (BOM) ──
      const bomRows: any[][] = [
        ['BILL OF MATERIAL (BOM)'],
        [`Proyek: ${data.projectName}`],
        [],
        ['No', 'Uraian Komponen', 'Kategori', 'Satuan', 'Total Kebutuhan', 'Harga Satuan (Rp)', 'Jumlah Biaya (Rp)']
      ]

      let totalBomCost = 0
      data.bomItems.forEach((item, index) => {
        totalBomCost += item.totalPrice || 0
        bomRows.push([
          index + 1,
          item.name || '',
          item.category || '',
          item.unit || '',
          item.quantity || 0,
          item.unitPrice || 0,
          item.totalPrice || 0
        ])
      })

      bomRows.push([])
      bomRows.push(['', '', '', '', '', 'Total Biaya Komponen', totalBomCost])

      const wsBom = XLSX.utils.aoa_to_sheet(bomRows)
      XLSX.utils.book_append_sheet(wb, wsBom, 'Bill of Material')

      // Write to File
      XLSX.writeFile(wb, filePath)

      return success({ success: true, filePath })
    } catch (e) {
      return failure((e as Error).message)
    }
  }
}
