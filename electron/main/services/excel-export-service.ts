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
      let leafIndex = 1
      data.lineItems.forEach((item) => {
        if (item.isGroup) {
          rabRows.push([
            '', // No
            item.wbsCode || '',
            '  '.repeat(item.level || 0) + (item.wbsName || ''),
            '', // AHS Code
            '', // Volume
            '', // Unit
            '', // Unit Price
            item.totalPrice || 0
          ])
        } else {
          subtotalRAB += item.totalPrice || 0
          rabRows.push([
            leafIndex++,
            item.wbsCode || '',
            '  '.repeat(item.level || 0) + (item.wbsName || ''),
            item.ahsCode || '',
            item.volume || 0,
            item.unit || '',
            item.unitPrice || 0,
            item.totalPrice || 0
          ])
        }
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

      // Helper function to parse formula
      const parseFormulaToText = (formulaJson: string): string => {
        if (!formulaJson) return ''
        try {
          const parsed = JSON.parse(formulaJson)
          if (!parsed || !parsed.type) return String(formulaJson)
          
          if (parsed.type === 'simple') {
            return String(parsed.data || '')
          }
          
          if (parsed.type === 'dimensions' && Array.isArray(parsed.data)) {
            return parsed.data.map((row: any, i: number) => {
              return `[Brs ${i + 1}] P: ${row.p}m x L: ${row.l}m x T: ${row.t}m x Qty: ${row.qty} = ${row.subtotal}`
            }).join('\n')
          }
          
          if ((parsed.type === 'steel' || parsed.type === 'rebar') && parsed.data) {
            const d = parsed.data
            if (d.steelMode === 'section') {
              const parseDiameter = (val: string): { size: number, type: 'polos' | 'ulir' } => {
                if (!val) return { size: 0, type: 'polos' }
                const size = parseFloat(val.replace(/[^\d.]/g, '')) || 0
                const type = val.includes('Ø') ? 'polos' : 'ulir'
                return { size, type }
              }

              const elements = d.sectionElements || []
              
              if (elements.length === 0 && d.sectionB) {
                // Fallback for old single section format
                const b = parseFloat(d.sectionB) || 200
                const h = parseFloat(d.sectionH) || 300
                const c = parseFloat(d.sectionCover) || 40
                const len = parseFloat(d.elementLength) || 0
                const eqty = parseFloat(d.elementQty) || 1
                
                let mainWeight = 0
                const mainDetails: string[] = []
                if (d.mainRebarRows && d.mainRebarRows.length > 0) {
                  d.mainRebarRows.forEach((r: any) => {
                    const { size } = parseDiameter(r.diameter)
                    const qty = parseFloat(r.qty) || 0
                    mainWeight += qty * len * (0.006165 * size * size) * eqty
                    mainDetails.push(`${r.position}: ${qty}x ${r.diameter}`)
                  });
                } else {
                  const { size: dMain } = parseDiameter(d.mainDia)
                  const qTop = parseFloat(d.mainQtyTop) || 0
                  const qBottom = parseFloat(d.mainQtyBottom) || 0
                  const mainUnitWeight = 0.006165 * dMain * dMain
                  mainWeight = (qTop + qBottom) * len * mainUnitWeight * eqty
                  mainDetails.push(`Atas ${qTop} + Bawah ${qBottom} (${d.mainDia})`)
                }

                const { size: dStirrup } = parseDiameter(d.stirrupDia)
                const stirrupLengthMm = (b > 2 * c && h > 2 * c) 
                  ? 2 * (b - 2 * c) + 2 * (h - 2 * c) + 12 * dStirrup
                  : 0
                const stirrupLengthM = stirrupLengthMm / 1000
                
                let stirrupCount = 0
                let spacingStr = ''
                if (d.stirrupMode === 'split') {
                  const sTumpuan = parseFloat(d.stirrupSpacingTumpuan) || 100
                  const sLapangan = parseFloat(d.stirrupSpacingLapangan) || 150
                  const countTumpuan = Math.floor(((len / 2) * 1000) / sTumpuan)
                  const countLapangan = Math.floor(((len / 2) * 1000) / sLapangan)
                  stirrupCount = countTumpuan + countLapangan + 1
                  spacingStr = `Tumpuan @${sTumpuan}mm, Lapangan @${sLapangan}mm`
                } else {
                  const sVal = parseFloat(d.stirrupSpacing) || 150
                  stirrupCount = sVal > 0 ? Math.floor((len * 1000) / sVal) + 1 : 0
                  spacingStr = `@${sVal}mm`
                }
                
                const stirrupUnitWeight = 0.006165 * dStirrup * dStirrup
                const stirrupWeight = stirrupCount * stirrupLengthM * stirrupUnitWeight * eqty
                const totalWeight = mainWeight + stirrupWeight

                return `Penampang ${d.sectionName || 'B1'} ${b}x${h}mm, L: ${len}m (${eqty}x)\nSelimut: ${c}mm\nUtama: [${mainDetails.join(', ')}] = ${mainWeight.toFixed(3)} kg\nBegel: ${d.stirrupDia} ${spacingStr} (${stirrupCount}x, L:${stirrupLengthM.toFixed(3)}m) = ${stirrupWeight.toFixed(3)} kg\nTotal: ${totalWeight.toFixed(3)} kg`
              }

              return elements.map((el: any, idx: number) => {
                const b = parseFloat(el.b) || 200
                const h = parseFloat(el.h) || 300
                const c = parseFloat(el.c) || 40
                const len = parseFloat(el.length) || 0
                const eqty = parseFloat(el.qty) || 1
                
                let mainWeight = 0
                const mainDetails: string[] = []
                ;(el.mainRebarRows || []).forEach((r: any) => {
                  const { size } = parseDiameter(r.diameter)
                  const qty = parseFloat(r.qty) || 0
                  mainWeight += qty * len * (0.006165 * size * size) * eqty
                  mainDetails.push(`${r.position}: ${qty}x ${r.diameter}`)
                })

                const { size: dStirrup } = parseDiameter(el.stirrupDia)
                const stirrupLengthMm = (b > 2 * c && h > 2 * c) 
                  ? 2 * (b - 2 * c) + 2 * (h - 2 * c) + 12 * dStirrup
                  : 0
                const stirrupLengthM = stirrupLengthMm / 1000
                
                let stirrupCount = 0
                let spacingStr = ''
                if (el.stirrupMode === 'split') {
                  const sTumpuan = parseFloat(el.stirrupSpacingTumpuan) || 100
                  const sLapangan = parseFloat(el.stirrupSpacingLapangan) || 150
                  const countTumpuan = Math.floor(((len / 2) * 1000) / sTumpuan)
                  const countLapangan = Math.floor(((len / 2) * 1000) / sLapangan)
                  stirrupCount = countTumpuan + countLapangan + 1
                  spacingStr = `Tumpuan @${sTumpuan}mm, Lapangan @${sLapangan}mm`
                } else {
                  const sVal = parseFloat(el.stirrupSpacing) || 150
                  stirrupCount = sVal > 0 ? Math.floor((len * 1000) / sVal) + 1 : 0
                  spacingStr = `@${sVal}mm`
                }
                
                const stirrupUnitWeight = 0.006165 * dStirrup * dStirrup
                const stirrupWeight = stirrupCount * stirrupLengthM * stirrupUnitWeight * eqty
                const totalWeight = mainWeight + stirrupWeight

                return `[Elemen ${idx + 1}] ${el.name} (${b}x${h}mm, L: ${len}m, ${eqty}x)\n  Selimut: ${c}mm\n  Utama: [${mainDetails.join(', ')}] = ${mainWeight.toFixed(3)} kg\n  Begel: ${el.stirrupDia} ${spacingStr} (${stirrupCount}x, L:${stirrupLengthM.toFixed(3)}m) = ${stirrupWeight.toFixed(3)} kg\n  Total: ${totalWeight.toFixed(3)} kg`
              }).join('\n\n')
            } else {
              const rows = d.rows || []
              return rows.map((row: any, i: number) => {
                const sizeStr = String(row.diameter || '')
                const size = parseFloat(sizeStr.replace(/[^\d.]/g, '')) || 0
                const unitWeight = 0.006165 * size * size
                const len = parseFloat(row.length) || 0
                const qty = parseFloat(row.qty) || 0
                const mult = parseFloat(row.mult) || 1
                const subtotal = unitWeight * len * qty * mult
                const desc = row.description ? `${row.description}: ` : ''
                return `[Brs ${i + 1}] ${desc}${sizeStr} x L: ${row.length}m x Qty: ${row.qty} x Mult: ${row.mult} = ${subtotal.toFixed(3)} kg`
              }).join('\n')
            }
          }
          
          if (parsed.type === 'wall' && parsed.data) {
            const d = parsed.data
            if (!d.wallRows && d.wallLength) {
              // Fallback for old single wall format
              const grossArea = (parseFloat(d.wallLength)||0) * (parseFloat(d.wallHeight)||0) * (parseFloat(d.wallMult)||1)
              const openingsStr = (d.openings || []).map((op: any) => {
                const area = (parseFloat(op.width)||0) * (parseFloat(op.height)||0) * (parseFloat(op.qty)||0)
                return `${op.name || 'Bukaan'} (Qty: ${op.qty}, ${op.width}m x ${op.height}m = -${area.toFixed(3)})`
              }).join(', ')
              const totalOpenings = (d.openings || []).reduce((sum: number, op: any) => sum + (parseFloat(op.width)||0) * (parseFloat(op.height)||0) * (parseFloat(op.qty)||0), 0)
              const netArea = grossArea - totalOpenings
              return `Gross Area: ${d.wallLength}m x ${d.wallHeight}m x ${d.wallMult} = ${grossArea.toFixed(3)} m2\nBukaan: [${openingsStr || 'tidak ada'}]\nNet Area: ${netArea.toFixed(3)} m2`
            }

            const wallsStr = (d.wallRows || []).map((w: any, i: number) => {
              const area = (parseFloat(w.length)||0) * (parseFloat(w.height)||0) * (parseFloat(w.qty)||0)
              return `[Dind ${i + 1}] P: ${w.length}m x T: ${w.height}m x Qty: ${w.qty} = ${area.toFixed(3)} m2`
            }).join('\n')
            
            const openingsStr = (d.openings || []).map((op: any) => {
              const area = (parseFloat(op.width)||0) * (parseFloat(op.height)||0) * (parseFloat(op.qty)||0)
              return `${op.name || 'Bukaan'} (Qty: ${op.qty}, ${op.width}m x ${op.height}m = -${area.toFixed(3)})`
            }).join(', ')
            
            const totalGross = (d.wallRows || []).reduce((sum: number, w: any) => sum + (parseFloat(w.length)||0) * (parseFloat(w.height)||0) * (parseFloat(w.qty)||0), 0)
            const totalOpenings = (d.openings || []).reduce((sum: number, op: any) => sum + (parseFloat(op.width)||0) * (parseFloat(op.height)||0) * (parseFloat(op.qty)||0), 0)
            const netArea = totalGross - totalOpenings

            return `Gross Area:\n${wallsStr}\nBukaan: [${openingsStr || 'tidak ada'}]\nNet Area: ${netArea.toFixed(3)} m2`
          }
          
          return String(formulaJson)
        } catch (e) {
          return String(formulaJson)
        }
      }

      // ── SHEET 4: BACKUP VOLUME ──
      const backupRows: any[][] = [
        ['BACKUP PERHITUNGAN VOLUME PEKERJAAN'],
        [`Proyek: ${data.projectName}`],
        [],
        ['Kode WBS', 'Uraian Kategori & Pekerjaan', 'Volume', 'Satuan', 'Rincian Perhitungan (Formula)', 'Catatan']
      ]

      data.lineItems.forEach((item) => {
        if (item.isGroup) {
          backupRows.push([
            item.wbsCode || '',
            '  '.repeat(item.level || 0) + (item.wbsName || ''),
            '', // Volume
            '', // Satuan
            '', // Formula
            ''  // Catatan
          ])
        } else {
          const formulaText = item.formula && item.formula.trim().startsWith('{') 
            ? parseFormulaToText(item.formula) 
            : 'Manual Input'
          
          backupRows.push([
            item.wbsCode || '',
            '  '.repeat(item.level || 0) + (item.wbsName || ''),
            item.volume || 0,
            item.unit || '',
            formulaText,
            item.notes || '-'
          ])
        }
      })

      const wsBackup = XLSX.utils.aoa_to_sheet(backupRows)
      XLSX.utils.book_append_sheet(wb, wsBackup, 'Backup Volume')

      // Write to File
      XLSX.writeFile(wb, filePath)

      return success({ success: true, filePath })
    } catch (e) {
      return failure((e as Error).message)
    }
  }
}
