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
        title: 'Ekspor Estimato ke Excel',
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

      // ── STEP 1: PRE-CALCULATE CELL REFERENCES & MAPS ──

      // Map to lookup row index of each item in 'Bill of Material' sheet
      // BOM starts at row 5 (Title 1, Project 2, Empty 3, Header 4, Items start at 5)
      const bomPriceMap = new Map<string, string>()
      data.bomItems.forEach((item, index) => {
        const rowNumber = 5 + index
        bomPriceMap.set(item.name.trim(), `='Bill of Material'!F${rowNumber}`)
      })

      // Simulate 'Analisa AHSP' row layout to map where each AHS's HSP (Harga Satuan Pekerjaan) cell falls
      const ahsRowMap = new Map<string, number>()
      let currentAnalisaRow = 4 // Sheet title 1, Project title 2, Empty 3, First block starts at 4

      data.detailedAhsList.forEach(dataItem => {
        // Row 4: Kode AHS
        // Row 5: Pekerjaan Name
        // Row 6: Table Header
        // Row 7: Tenaga Kerja Section Header
        let rowCursor = currentAnalisaRow + 4 // wages items start here

        rowCursor += dataItem.wages.length // wages items
        const subtotalWagesRow = rowCursor // subtotal wages row
        rowCursor += 1

        rowCursor += 1 // Bahan Header
        rowCursor += dataItem.materials.length // materials items
        const subtotalMaterialsRow = rowCursor // subtotal materials row
        rowCursor += 1

        rowCursor += 1 // Alat Header
        rowCursor += dataItem.equipment.length // equipment items
        const subtotalEquipmentRow = rowCursor // subtotal equipment row
        rowCursor += 1

        rowCursor += 1 // Jumlah (A+B+C)
        rowCursor += 1 // Overhead row
        const hspRow = rowCursor // HSP value row (Harga Satuan Pekerjaan)
        rowCursor += 1

        ahsRowMap.set(dataItem.ahs.code, hspRow)
        
        rowCursor += 1 // Empty separator row
        currentAnalisaRow = rowCursor
      })


      // ── STEP 2: BUILD SHEET 1: RAB PROYEK ──
      const rabRows: any[][] = [
        ['RENCANA ANGGARAN BIAYA (RAB)'],
        [`Proyek: ${data.projectName}`],
        [`Lokasi: ${data.location}`],
        [`Tahun: ${data.year}`],
        [],
        ['No', 'Kode Pekerjaan', 'Uraian Pekerjaan', 'Referensi AHS', 'Volume', 'Satuan', 'Harga Satuan (Rp)', 'Jumlah Biaya (Rp)']
      ]

      let leafIndex = 1
      data.lineItems.forEach((item, idx) => {
        const rowNumber = 7 + idx // RAB items start at Row 7 (Title 1, Project 2, Location 3, Year 4, Empty 5, Header 6, Items 7+)

        if (item.isGroup) {
          // Find all leaf children rows under this group to write SUM formula
          const descendants: number[] = []
          for (let k = idx + 1; k < data.lineItems.length; k++) {
            const childItem = data.lineItems[k]
            if (childItem.level <= item.level) break // Stop when reaching sibling or ancestor level
            if (!childItem.isGroup) {
              descendants.push(7 + k) // row number
            }
          }

          let sumFormula = '0'
          if (descendants.length > 0) {
            sumFormula = descendants.map(r => `H${r}`).join('+')
          }

          rabRows.push([
            '', // No
            item.wbsCode || '',
            '  '.repeat(item.level || 0) + (item.wbsName || ''),
            '', // AHS Code
            '', // Volume
            '', // Unit
            '', // Unit Price
            { t: 'n', f: sumFormula, z: '#,##0' } // Group Subtotal Formula
          ])
        } else {
          // Leaf item
          const hspRow = ahsRowMap.get(item.ahsCode)
          let unitPriceCell: any = item.unitPrice || 0
          
          if (hspRow) {
            // Link directly to the HSP cell in the 'Analisa AHSP' sheet
            unitPriceCell = { t: 'n', f: `'Analisa AHSP'!F${hspRow}`, z: '#,##0' }
          } else {
            unitPriceCell = { t: 'n', v: item.unitPrice || 0, z: '#,##0' }
          }

          rabRows.push([
            leafIndex++,
            item.wbsCode || '',
            '  '.repeat(item.level || 0) + (item.wbsName || ''),
            item.ahsCode || '',
            { t: 'n', v: item.volume || 0, z: '#,##0.00' }, // Volume
            item.unit || '',
            unitPriceCell, // Unit Price (formula/linked)
            { t: 'n', f: `E${rowNumber}*G${rowNumber}`, z: '#,##0' } // Cost Formula: Volume * UnitPrice
          ])
        }
      })

      const lastLineItemRow = 6 + data.lineItems.length
      const subtotalRow = lastLineItemRow + 2
      const ppnRow = subtotalRow + 1
      const overheadRow = subtotalRow + 2
      const grandTotalRow = subtotalRow + 3

      rabRows.push([])
      rabRows.push(['', '', '', '', '', '', 'Subtotal Pekerjaan', { t: 'n', f: `SUMIF(A7:A${lastLineItemRow}, ">0", H7:H${lastLineItemRow})`, z: '#,##0' }])
      rabRows.push(['', '', '', '', '', '', `PPN (${data.ppn}%)`, { t: 'n', f: `H${subtotalRow}*${data.ppn}/100`, z: '#,##0' }])
      rabRows.push(['', '', '', '', '', '', `Overhead & Profit (${data.overhead}%)`, { t: 'n', f: `H${subtotalRow}*${data.overhead}/100`, z: '#,##0' }])
      rabRows.push(['', '', '', '', '', '', 'Grand Total', { t: 'n', f: `H${subtotalRow}+H${ppnRow}+H${overheadRow}`, z: '#,##0' }])

      const wsRab = XLSX.utils.aoa_to_sheet(rabRows)
      wsRab['!cols'] = [{ wch: 6 }, { wch: 16 }, { wch: 45 }, { wch: 16 }, { wch: 12 }, { wch: 10 }, { wch: 22 }, { wch: 22 }]
      XLSX.utils.book_append_sheet(wb, wsRab, 'RAB Proyek')


      // ── STEP 3: BUILD SHEET 2: ANALISA AHSP ──
      const analisaRows: any[][] = [
        ['LEMBAR ANALISA HARGA SATUAN PEKERJAAN (AHSP)'],
        [`Proyek: ${data.projectName}`],
        [],
      ]

      let blockStartRow = 4
      data.detailedAhsList.forEach(dataItem => {
        analisaRows.push([`KODE AHS: ${dataItem.ahs.code}`])
        analisaRows.push([`Pekerjaan: ${dataItem.ahs.name} (per {ahs.unit})`])
        analisaRows.push(['No', 'Komponen', 'Satuan', 'Koefisien', 'Harga Satuan (Rp)', 'Jumlah Harga (Rp)'])
        
        // Tenaga Kerja
        analisaRows.push(['A.', 'TENAGA KERJA'])
        dataItem.wages.forEach((w: any, i: number) => {
          const r = blockStartRow + 4 + i
          const wageName = w.wageType.trim()
          const linkedPriceFormula = bomPriceMap.get(wageName)
          const priceCell = linkedPriceFormula ? { t: 'n', f: linkedPriceFormula, z: '#,##0' } : { t: 'n', v: w.dailyWage || 0, z: '#,##0' }

          analisaRows.push([
            i + 1,
            w.wageType,
            w.wageUnit,
            { t: 'n', v: w.coefficient || 0, z: '0.0000' },
            priceCell,
            { t: 'n', f: `D${r}*E${r}`, z: '#,##0' }
          ])
        })
        const subtotalWagesRow = blockStartRow + 4 + dataItem.wages.length
        analisaRows.push([
          '',
          'Subtotal Tenaga Kerja',
          '',
          '',
          '',
          dataItem.wages.length > 0 
            ? { t: 'n', f: `SUM(F${blockStartRow + 4}:F${subtotalWagesRow - 1})`, z: '#,##0' }
            : { t: 'n', v: 0, z: '#,##0' }
        ])

        // Bahan
        analisaRows.push(['B.', 'BAHAN'])
        dataItem.materials.forEach((m: any, i: number) => {
          const r = subtotalWagesRow + 2 + i
          const matName = m.materialName.trim()
          const linkedPriceFormula = bomPriceMap.get(matName)
          const priceCell = linkedPriceFormula ? { t: 'n', f: linkedPriceFormula, z: '#,##0' } : { t: 'n', v: m.unitPrice || 0, z: '#,##0' }

          analisaRows.push([
            i + 1,
            m.materialName,
            m.materialUnit,
            { t: 'n', v: m.coefficient || 0, z: '0.0000' },
            priceCell,
            { t: 'n', f: `D${r}*E${r}`, z: '#,##0' }
          ])
        })
        const subtotalMaterialsRow = subtotalWagesRow + 2 + dataItem.materials.length
        analisaRows.push([
          '',
          'Subtotal Bahan',
          '',
          '',
          '',
          dataItem.materials.length > 0 
            ? { t: 'n', f: `SUM(F${subtotalWagesRow + 2}:F${subtotalMaterialsRow - 1})`, z: '#,##0' }
            : { t: 'n', v: 0, z: '#,##0' }
        ])

        // Alat
        analisaRows.push(['C.', 'ALAT'])
        dataItem.equipment.forEach((e: any, i: number) => {
          const r = subtotalMaterialsRow + 2 + i
          const equipName = e.equipmentName.trim()
          const linkedPriceFormula = bomPriceMap.get(equipName)
          const priceCell = linkedPriceFormula ? { t: 'n', f: linkedPriceFormula, z: '#,##0' } : { t: 'n', v: e.rentalPrice || 0, z: '#,##0' }

          analisaRows.push([
            i + 1,
            e.equipmentName,
            e.equipmentUnit,
            { t: 'n', v: e.coefficient || 0, z: '0.0000' },
            priceCell,
            { t: 'n', f: `D${r}*E${r}`, z: '#,##0' }
          ])
        })
        const subtotalEquipmentRow = subtotalMaterialsRow + 2 + dataItem.equipment.length
        analisaRows.push([
          '',
          'Subtotal Alat',
          '',
          '',
          '',
          dataItem.equipment.length > 0
            ? { t: 'n', f: `SUM(F${subtotalMaterialsRow + 2}:F${subtotalEquipmentRow - 1})`, z: '#,##0' }
            : { t: 'n', v: 0, z: '#,##0' }
        ])

        // Totals
        const jumlahABC = subtotalEquipmentRow + 1
        const overheadRow = subtotalEquipmentRow + 2
        const hspRow = subtotalEquipmentRow + 3

        analisaRows.push(['', 'Jumlah (A + B + C)', '', '', '', { t: 'n', f: `F${subtotalWagesRow}+F${subtotalMaterialsRow}+F${subtotalEquipmentRow}`, z: '#,##0' }])
        analisaRows.push(['', `Overhead & Profit (${data.overhead}%)`, '', '', '', { t: 'n', f: `F${jumlahABC}*${data.overhead}/100`, z: '#,##0' }])
        analisaRows.push(['', 'Harga Satuan Pekerjaan (HSP)', '', '', '', { t: 'n', f: `F${jumlahABC}+F${overheadRow}`, z: '#,##0' }])
        
        analisaRows.push([]) // empty row separator
        blockStartRow = subtotalEquipmentRow + 5
      })

      const wsAnalisa = XLSX.utils.aoa_to_sheet(analisaRows)
      wsAnalisa['!cols'] = [{ wch: 6 }, { wch: 45 }, { wch: 10 }, { wch: 14 }, { wch: 22 }, { wch: 22 }]
      XLSX.utils.book_append_sheet(wb, wsAnalisa, 'Analisa AHSP')


      // ── STEP 4: BUILD SHEET 3: BILL OF MATERIAL (BOM) ──
      const bomRows: any[][] = [
        ['BILL OF MATERIAL (BOM)'],
        [`Proyek: ${data.projectName}`],
        [],
        ['No', 'Uraian Komponen', 'Kategori', 'Satuan', 'Total Kebutuhan', 'Harga Satuan (Rp)', 'Jumlah Biaya (Rp)']
      ]

      data.bomItems.forEach((item, index) => {
        const r = 5 + index // BOM items start at row 5
        bomRows.push([
          index + 1,
          item.name || '',
          item.category || '',
          item.unit || '',
          { t: 'n', v: item.quantity || 0, z: '#,##0.00' },
          { t: 'n', v: item.unitPrice || 0, z: '#,##0' },
          { t: 'n', f: `E${r}*F${r}`, z: '#,##0' } // Cost Formula: Quantity * UnitPrice
        ])
      })

      const lastBomRow = 4 + data.bomItems.length
      const bomTotalRow = lastBomRow + 2

      bomRows.push([])
      bomRows.push(['', '', '', '', '', 'Total Biaya Komponen', { t: 'n', f: `SUM(G5:G${lastBomRow})`, z: '#,##0' }])

      const wsBom = XLSX.utils.aoa_to_sheet(bomRows)
      wsBom['!cols'] = [{ wch: 6 }, { wch: 45 }, { wch: 15 }, { wch: 10 }, { wch: 18 }, { wch: 22 }, { wch: 22 }]
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

      // ── STEP 5: BUILD SHEET 4: BACKUP VOLUME ──
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
      wsBackup['!cols'] = [{ wch: 15 }, { wch: 45 }, { wch: 12 }, { wch: 10 }, { wch: 50 }, { wch: 25 }]
      XLSX.utils.book_append_sheet(wb, wsBackup, 'Backup Volume')

      // Write to File
      XLSX.writeFile(wb, filePath)

      return success({ success: true, filePath })
    } catch (e) {
      return failure((e as Error).message)
    }
  }
}
