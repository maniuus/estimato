import React, { useState, useEffect } from 'react'
import { useRabStore, type RabLineItem } from '../stores/rab-store'
import { useVolumeStore } from '../stores/volume-store'
import { useProjectVolumeStore } from '../stores/project-volume-store'
import { useAhsStore } from '../stores/ahs-store'
import { useProjectStore } from '../stores/project-store'
import { useWbsStore } from '../stores/wbs-store'
import { useSettingsStore } from '../stores/settings-store'
import { formatCurrency } from '../lib/format'
import type { Ahs, AhsComponentMaterial, AhsComponentWage, AhsComponentEquipment, WbsItem } from '../types/models'

interface LaporanPageProps {
  projectId: string
}

interface DetailedAhsData {
  ahs: Ahs
  materials: AhsComponentMaterial[]
  wages: AhsComponentWage[]
  equipment: AhsComponentEquipment[]
  subtotalWages: number
  subtotalMaterials: number
  subtotalEquipment: number
  totalComponents: number
  overheadAmount: number
  totalUnitPrice: number
}

interface BomItem {
  id: string
  name: string
  category: 'Bahan' | 'Tenaga Kerja' | 'Alat'
  unit: string
  quantity: number
  unitPrice: number
  totalPrice: number
}

function terbilang(nominal: number): string {
  const bil = [
    "",
    "Satu",
    "Dua",
    "Tiga",
    "Empat",
    "Lima",
    "Enam",
    "Tujuh",
    "Delapan",
    "Sembilan",
    "Sepuluh",
    "Sebelas"
  ];
  
  const num = Math.floor(nominal);
  if (num < 12) {
    return bil[num];
  } else if (num < 20) {
    return bil[num - 10] + " Belas";
  } else if (num < 100) {
    return bil[Math.floor(num / 10)] + " Puluh " + terbilang(num % 10);
  } else if (num < 200) {
    return "Seratus " + terbilang(num - 100);
  } else if (num < 1000) {
    return terbilang(Math.floor(num / 100)) + " Ratus " + terbilang(num % 100);
  } else if (num < 2000) {
    return "Seribu " + terbilang(num - 1000);
  } else if (num < 1000000) {
    return terbilang(Math.floor(num / 1000)) + " Ribu " + terbilang(num % 1000);
  } else if (num < 1000000000) {
    return terbilang(Math.floor(num / 1000000)) + " Juta " + terbilang(num % 1000000);
  } else if (num < 1000000000000) {
    return terbilang(Math.floor(num / 1000000000)) + " Milyar " + terbilang(num % 1000000000);
  } else if (num < 1000000000000000) {
    return terbilang(Math.floor(num / 1000000000000)) + " Triliun " + terbilang(num % 1000000000000);
  }
  return "";
}

function getTerbilang(amount: number): string {
  if (amount === 0) return "Nol Rupiah";
  const hasil = terbilang(amount).trim().replace(/\s+/g, " ");
  return hasil + " Rupiah";
}

export function parseFormulaToText(formulaJson: string): string {
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
            })
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

export function LaporanPage({ projectId }: LaporanPageProps): React.ReactElement {
  const { calculation, calculate, latestSnapshot, loadLatest } = useRabStore()
  const { items: volumes, loadByProject: loadVolumes } = useVolumeStore()
  const { ahsList, loadLibrary } = useAhsStore()
  const { projects } = useProjectStore()
  const { items: wbsItems, loadByProject: loadWbs } = useWbsStore()
  const { settings, load: loadSettings } = useSettingsStore()

  const project = projects.find(p => p.id === projectId)
  const ppn = project?.ppn ?? 11
  const overhead = project?.overhead ?? 0

  const [previewTab, setPreviewTab] = useState<'rekap' | 'rab' | 'analisa' | 'bom' | 'backup' | 'analisis_kurvas'>('rekap')
  const [detailedAhsList, setDetailedAhsList] = useState<DetailedAhsData[]>([])
  const [bomItems, setBomItems] = useState<BomItem[]>([])
  const [loadingDetails, setLoadingDetails] = useState(false)
  const [exporting, setExporting] = useState(false)
  const [exportingPdf, setExportingPdf] = useState(false)

  const { items: projectVolumes, loadByProject: loadProjectVolumes } = useProjectVolumeStore()

  useEffect(() => {
    loadVolumes(projectId)
    loadWbs(projectId)
    loadProjectVolumes(projectId)
    loadLibrary()
    loadLatest(projectId)
    loadSettings()
  }, [projectId])

  // Load detailed analysis and BOM components
  useEffect(() => {
    const processReportsData = async () => {
      const activeVolumes = volumes.filter(v => v.volume > 0 && v.ahsId)
      if (activeVolumes.length === 0) {
        setDetailedAhsList([])
        setBomItems([])
        return
      }

      setLoadingDetails(true)
      try {
        const uniqueAhsIds = Array.from(new Set(activeVolumes.map(v => v.ahsId!)))
        
        // 1. Load AHS Details
        const details: DetailedAhsData[] = await Promise.all(
          uniqueAhsIds.map(async id => {
            let ahs = ahsList.find(a => a.id === id)
            if (!ahs) {
              const res = await window.api.ahs.getById(id)
              ahs = res.success ? res.data || undefined : undefined
            }
            if (!ahs) throw new Error(`AHS ${id} not found`)

            const [matRes, wageRes, equipRes] = await Promise.all([
              window.api.ahs.material.getByAhs(id, projectId),
              window.api.ahs.wage.getByAhs(id, projectId),
              window.api.ahs.equipment.getByAhs(id, projectId)
            ])

            const materials = matRes.success ? matRes.data || [] : []
            const wages = wageRes.success ? wageRes.data || [] : []
            const equipment = equipRes.success ? equipRes.data || [] : []

            const subtotalMaterials = materials.reduce((sum, item) => sum + (item.totalPrice || 0), 0)
            const subtotalWages = wages.reduce((sum, item) => sum + (item.totalPrice || 0), 0)
            const subtotalEquipment = equipment.reduce((sum, item) => sum + (item.totalPrice || 0), 0)
            const totalComponents = subtotalMaterials + subtotalWages + subtotalEquipment
            const overheadAmount = totalComponents * (overhead / 100)
            const totalUnitPrice = totalComponents + overheadAmount

            return {
              ahs,
              materials,
              wages,
              equipment,
              subtotalMaterials,
              subtotalWages,
              subtotalEquipment,
              totalComponents,
              overheadAmount,
              totalUnitPrice
            }
          })
        )
        setDetailedAhsList(details)

        // 2. Load BOM details
        const materialMap: Record<string, BomItem> = {}
        const wageMap: Record<string, BomItem> = {}
        const equipmentMap: Record<string, BomItem> = {}

        details.forEach(dataItem => {
          // Find matching volumes for this AHS
          const relatedVolumes = activeVolumes.filter(v => v.ahsId === dataItem.ahs.id)
          const totalVol = relatedVolumes.reduce((s, v) => s + v.volume, 0)

          dataItem.materials.forEach(item => {
            const reqQty = item.coefficient * totalVol
            const mId = item.materialId
            if (materialMap[mId]) {
              materialMap[mId].quantity += reqQty
              materialMap[mId].totalPrice = materialMap[mId].quantity * materialMap[mId].unitPrice
            } else {
              materialMap[mId] = {
                id: mId,
                name: item.materialName || 'Bahan',
                category: 'Bahan',
                unit: item.materialUnit || 'buah',
                quantity: reqQty,
                unitPrice: item.unitPrice || 0,
                totalPrice: reqQty * (item.unitPrice || 0)
              }
            }
          })

          dataItem.wages.forEach(item => {
            const reqQty = item.coefficient * totalVol
            const wId = item.wageId
            if (wageMap[wId]) {
              wageMap[wId].quantity += reqQty
              wageMap[wId].totalPrice = wageMap[wId].quantity * wageMap[wId].unitPrice
            } else {
              wageMap[wId] = {
                id: wId,
                name: item.wageType || 'Tenaga',
                category: 'Tenaga Kerja',
                unit: item.wageUnit || 'OH',
                quantity: reqQty,
                unitPrice: item.dailyWage || 0,
                totalPrice: reqQty * (item.dailyWage || 0)
              }
            }
          })

          dataItem.equipment.forEach(item => {
            const reqQty = item.coefficient * totalVol
            const eId = item.equipmentId
            if (equipmentMap[eId]) {
              equipmentMap[eId].quantity += reqQty
              equipmentMap[eId].totalPrice = equipmentMap[eId].quantity * equipmentMap[eId].unitPrice
            } else {
              equipmentMap[eId] = {
                id: eId,
                name: item.equipmentName || 'Alat',
                category: 'Alat',
                unit: item.equipmentUnit || 'hari',
                quantity: reqQty,
                unitPrice: item.rentalPrice || 0,
                totalPrice: reqQty * (item.rentalPrice || 0)
              }
            }
          })
        })

        setBomItems([
          ...Object.values(wageMap),
          ...Object.values(materialMap),
          ...Object.values(equipmentMap)
        ].sort((a, b) => a.category.localeCompare(b.category) || a.name.localeCompare(b.name)))
      } catch (err) {
        console.error('Error generating report datasets:', err)
      } finally {
        setLoadingDetails(false)
      }
    }

    if (volumes.length > 0 && ahsList.length > 0) {
      processReportsData()
    }
  }, [volumes, ahsList, overhead])

  // Recursive subtotal calculation
  const getGroupSubtotal = (groupWbsPath: string) => {
    const leaves = wbsItems.filter(i => 
      i.type === 'item' && 
      (i.wbsPath === groupWbsPath || i.wbsPath.startsWith(groupWbsPath + '.'))
    )
    
    return leaves.reduce((sum, leaf) => {
      const volItem = volumes.find(v => v.wbsItemId === leaf.id)
      const volume = volItem?.volume ?? 0
      const calcItem = calculation?.lineItems?.find(li => li.wbsItemId === leaf.id)
      let unitPrice = calcItem?.unitPrice ?? 0
      if (!calcItem && volItem?.ahsId) {
        const matchedAhs = ahsList.find(a => a.id === volItem.ahsId)
        unitPrice = matchedAhs?.totalPrice ?? 0
      }
      return sum + (volume * unitPrice)
    }, 0)
  }

  // Rekapitulasi categories (roots only)
  const rekapCategories = wbsItems.filter(i => i.type === 'group' && !i.parentId)
  rekapCategories.sort((a, b) => a.sortOrder - b.sortOrder)

  // ── S-CURVE STATES & HELPERS ──
  const [durationWeeks, setDurationWeeks] = useState(12)
  const [categorySchedules, setCategorySchedules] = useState<Record<string, { startWeek: number, endWeek: number }>>({})

  // Initialize schedules if empty
  useEffect(() => {
    if (rekapCategories.length > 0) {
      setCategorySchedules(prev => {
        const next = { ...prev }
        let changed = false
        rekapCategories.forEach((cat, index) => {
          if (!next[cat.id]) {
            // Distribute default weeks sequentially with overlap
            const start = Math.floor((index / rekapCategories.length) * (durationWeeks - 1)) + 1
            const duration = Math.max(2, Math.floor(durationWeeks / rekapCategories.length) + 1)
            const end = Math.min(durationWeeks, start + duration - 1)
            next[cat.id] = { startWeek: start, endWeek: end }
            changed = true
          }
        })
        if (changed) return next
        return prev
      })
    }
  }, [rekapCategories, durationWeeks])

  // Scale schedules when duration changes
  const handleDurationChange = (newWeeks: number) => {
    const oldWeeks = durationWeeks
    setDurationWeeks(newWeeks)
    setCategorySchedules(prev => {
      const next = { ...prev }
      Object.keys(next).forEach(id => {
        const { startWeek, endWeek } = next[id]
        const newStart = Math.max(1, Math.min(newWeeks, Math.round((startWeek / oldWeeks) * newWeeks)))
        const newEnd = Math.max(newStart, Math.min(newWeeks, Math.round((endWeek / oldWeeks) * newWeeks)))
        next[id] = { startWeek: newStart, endWeek: newEnd }
      })
      return next
    })
  }

  // Calculate schedules
  const calculateSCurveData = () => {
    const totalBasePrice = totalPrice || 1 // Avoid divide-by-zero
    const weeklyProgress = Array(durationWeeks).fill(0)
    
    // Calculate weight of each category and distribute
    rekapCategories.forEach(cat => {
      const catTotal = getGroupSubtotal(cat.wbsPath)
      const weight = (catTotal / totalBasePrice) * 100
      
      const sched = categorySchedules[cat.id] || { startWeek: 1, endWeek: Math.min(durationWeeks, 3) }
      const start = Math.max(1, Math.min(durationWeeks, sched.startWeek))
      const end = Math.max(start, Math.min(durationWeeks, sched.endWeek))
      const activeWeeks = end - start + 1
      const weeklyShare = weight / activeWeeks
      
      for (let w = start; w <= end; w++) {
        weeklyProgress[w - 1] += weeklyShare
      }
    })

    // Calculate cumulative progress
    const cumulativeProgress: number[] = []
    let sum = 0
    for (let w = 0; w < durationWeeks; w++) {
      sum += weeklyProgress[w]
      cumulativeProgress.push(Math.min(100, sum))
    }

    return { weeklyProgress, cumulativeProgress }
  }

  const handleExportExcel = async () => {
    if (!project || !calculation) return
    setExporting(true)

    const exportLineItems = wbsItems.map(item => {
      const isGroup = item.type === 'group'
      const subtotal = isGroup ? getGroupSubtotal(item.wbsPath) : 0
      const volItem = !isGroup ? volumes.find(v => v.wbsItemId === item.id) : null
      const volume = volItem?.volume ?? 0
      const unit = volItem?.unit || item.unit
      
      const calcItem = !isGroup ? calculation?.lineItems?.find(li => li.wbsItemId === item.id) : null
      let unitPrice = calcItem?.unitPrice ?? 0
      if (!isGroup && !calcItem && volItem?.ahsId) {
        const matchedAhs = ahsList.find(a => a.id === volItem.ahsId)
        unitPrice = matchedAhs?.totalPrice ?? 0
      }
      const totalPrice = isGroup ? subtotal : (volume * unitPrice)

      return {
        id: item.id,
        isGroup,
        level: item.wbsPath ? item.wbsPath.split('.').length - 1 : 0,
        wbsCode: item.code,
        wbsName: item.name,
        ahsCode: calcItem?.ahsCode ?? (volItem?.ahsId ? (ahsList.find(a => a.id === volItem.ahsId)?.code ?? '') : ''),
        volume: isGroup ? 0 : volume,
        unit: isGroup ? '' : (unit || ''),
        unitPrice: isGroup ? 0 : unitPrice,
        totalPrice
      }
    })

    const result = await window.api.rab.exportExcel({
      projectName: project.name,
      location: project.location,
      year: project.year,
      ppn,
      overhead,
      lineItems: exportLineItems,
      detailedAhsList,
      bomItems
    })

    setExporting(false)
    if (result.success) {
      alert(`Laporan berhasil diekspor ke:\n${result.data?.filePath}`)
    } else {
      alert(`Gagal mengekspor laporan: ${result.error}`)
    }
  }

  const handleExportPdf = async () => {
    if (!project) return
    setExportingPdf(true)
    try {
      const result = await window.api.rab.exportPdf(project.name)
      if (result.success) {
        alert(`Laporan PDF berhasil diekspor ke:\n${result.data?.filePath}`)
      } else if (result.error !== 'Ekspor dibatalkan oleh pengguna') {
        alert(`Gagal mengekspor PDF: ${result.error}`)
      }
    } catch (err) {
      console.error('Error exporting PDF:', err)
      alert(`Terjadi kesalahan: ${(err as Error).message}`)
    } finally {
      setExportingPdf(false)
    }
  }

  const handlePrint = () => {
    window.print()
  }

  if (!calculation || calculation.lineItems.length === 0) {
    return (
      <div className="card p-8 text-center text-gray-400 text-sm italic">
        Belum ada laporan yang dapat ditampilkan. Silakan buat pekerjaan dan isi volume pada tab Input RAB terlebih dahulu.
      </div>
    )
  }

  const totalPrice = calculation.totalPrice
  const ppnAmount = calculation.ppnAmount
  const overheadAmount = calculation.overheadAmount
  const grandTotal = calculation.grandTotal
  const roundedGrandTotal = Math.round(grandTotal / 1000) * 1000

  const activeCompanyLogo = project?.companyLogo || settings?.companyLogo || ''
  const activeCompanyName = project?.companyName || settings?.companyName || ''
  const activeReportHeader = project?.reportHeader || settings?.reportHeader || ''
  const activeOwnerName = project?.ownerName || settings?.ownerName || ''
  const activeOwnerParaf = project?.ownerParaf || settings?.ownerParaf || ''

  const renderPrintHeader = (title: string) => {
    return (
      <div className="mb-4 text-[9.5px] font-sans bg-white no-break-inside text-slate-950 w-full">
        {/* ROW 1: Logo and Company Info / Document Title */}
        <div className="flex items-center justify-between pb-1.5">
          {/* Logo Perusahaan */}
          <div className="w-[80px] p-1 flex items-center justify-start bg-white">
            {activeCompanyLogo ? (
              <img 
                src={activeCompanyLogo} 
                alt="Logo" 
                className="max-h-[48px] max-w-[80px] object-contain"
              />
            ) : (
              <div className="text-[8px] font-bold text-slate-300 uppercase leading-tight">
                {activeCompanyName || 'LOGO'}
              </div>
            )}
          </div>

          {/* Nama Perusahaan & Judul Laporan */}
          <div className="flex-1 p-1 flex flex-col justify-center items-center text-center bg-white leading-tight">
            <div className="font-extrabold text-[12px] text-slate-950 uppercase tracking-wide">
              {activeCompanyName || 'CV. KARYA MANDIRI'}
            </div>
            <div className="text-[7.5px] text-slate-500 font-semibold uppercase tracking-wider mb-0.5">
              {activeReportHeader || 'KONSULTAN PERENCANA / KONTRAKTOR'}
            </div>
            <div className="font-black text-[12.5px] text-slate-950 uppercase tracking-wider">
              {title}
            </div>
          </div>

          {/* Spacer to keep center alignment perfect */}
          <div className="w-[80px] p-1"></div>
        </div>

        {/* Thick line separator typical of Kop Surat */}
        <div className="border-b-[1.5px] border-slate-900 mb-2.5 w-full"></div>

        {/* ROW 2: Project Details (Stacked - Left Aligned) */}
        <div className="pb-2 flex flex-col items-start justify-center text-[9px] w-full space-y-0.5 leading-normal pl-1">
          <div>
            <span className="font-bold text-slate-400 uppercase mr-1">Proyek:</span> 
            <span className="font-bold text-slate-900 uppercase">{project?.name}</span>
          </div>
          <div>
            <span className="font-bold text-slate-400 uppercase mr-1">Lokasi:</span> 
            <span className="font-bold text-slate-900 uppercase">{project?.location}</span>
          </div>
          <div>
            <span className="font-bold text-slate-400 uppercase mr-1">Tahun:</span> 
            <span className="font-bold text-slate-900">{project?.year}</span>
          </div>
        </div>
      </div>
    )
  }

  const renderPrintFooter = () => {
    return (
      <div 
        className="mt-6 flex justify-end text-[9px] font-sans bg-white"
        style={{ 
          pageBreakInside: 'avoid', 
          breakInside: 'avoid',
          pageBreakBefore: 'avoid',
          breakBefore: 'avoid'
        }}
      >
        <div className="w-[200px] text-center flex flex-col items-center p-2">
          <div className="text-slate-500">Setuju &amp; Disahkan Oleh:</div>
          <div className="font-bold uppercase mt-0.5 text-slate-900">Owner / Pemilik Proyek</div>
          <div className="h-[50px] flex items-center justify-center my-1">
            {activeOwnerParaf ? (
              <img 
                src={activeOwnerParaf} 
                alt="Paraf Owner" 
                className="max-h-[48px] max-w-[120px] object-contain"
              />
            ) : (
              <div className="text-[7.5px] text-slate-350 italic">Tanda Tangan / Paraf</div>
            )}
          </div>
          <div className="font-bold underline uppercase text-slate-950 truncate w-full">
            {activeOwnerName || '...........................'}
          </div>
        </div>
      </div>
    )
  }

  const renderAnalisisKurvaS = (isPrint: boolean = false) => {
    const { weeklyProgress, cumulativeProgress } = calculateSCurveData()
    const maxWeeklyProgVal = Math.max(...weeklyProgress, 10)
    const leftYAxisMax = Math.ceil(maxWeeklyProgVal / 5) * 5
    
    // Chart dimensions
    const svgWidth = isPrint ? 680 : 780
    const svgHeight = isPrint ? 240 : 320
    const padLeft = 50
    const padRight = 50
    const padTop = 30
    const padBottom = 35
    
    const plotWidth = svgWidth - padLeft - padRight
    const plotHeight = svgHeight - padTop - padBottom

    // Smooth path generator function (Catmull-Rom to Cubic Bezier)
    const getSmoothPath = (pts: { x: number, y: number }[], closedBottomY?: number) => {
      if (pts.length === 0) return { linePath: '', areaPath: '' }
      
      let linePathStr = `M ${pts[0].x} ${pts[0].y}`
      const tension = 0.15
      
      for (let i = 0; i < pts.length - 1; i++) {
        const p0 = pts[i - 1] || pts[i]
        const p1 = pts[i]
        const p2 = pts[i + 1]
        const p3 = pts[i + 2] || p2
        
        const cp1x = p1.x + (p2.x - p0.x) * tension
        const cp1y = p1.y + (p2.y - p0.y) * tension
        
        const cp2x = p2.x - (p3.x - p1.x) * tension
        const cp2y = p2.y - (p3.y - p1.y) * tension
        
        linePathStr += ` C ${cp1x} ${cp1y}, ${cp2x} ${cp2y}, ${p2.x} ${p2.y}`
      }
      
      let areaPathStr = linePathStr
      if (closedBottomY !== undefined) {
        areaPathStr += ` L ${pts[pts.length - 1].x} ${closedBottomY} L ${pts[0].x} ${closedBottomY} Z`
      }
      
      return { linePath: linePathStr, areaPath: areaPathStr }
    }

    // Build the array of coordinate points for spline calculation
    const points = [
      { x: padLeft, y: padTop + plotHeight } // Week 0 (0%)
    ]
    
    cumulativeProgress.forEach((pct, w) => {
      points.push({
        x: padLeft + (w + 0.5) * (plotWidth / durationWeeks),
        y: padTop + plotHeight - (pct / 100) * plotHeight
      })
    })
    
    // Add end point at the very right of the chart (100% progress)
    points.push({
      x: padLeft + plotWidth,
      y: padTop + plotHeight - (cumulativeProgress[durationWeeks - 1] / 100) * plotHeight
    })
    
    const { linePath, areaPath } = getSmoothPath(points, padTop + plotHeight)

    if (isPrint) {
      return (
        <div className="space-y-4 text-[9.5px]">
          {/* Table of Weights and Schedules */}
          <div className="space-y-2">
            <div className="font-bold text-slate-950 uppercase text-[9.5px] tracking-wide border-b border-slate-900 pb-1">
              I. TABEL BOBOT PEKERJAAN & JADWAL RENCANA PELAKSANAAN
            </div>
            <table className="w-full border-collapse border border-slate-300 text-[9.5px] font-sans">
              <thead>
                <tr className="border-b border-slate-900 font-bold uppercase text-slate-950 bg-slate-50">
                  <th className="border border-slate-300 py-1.5 px-1 text-center w-10">No</th>
                  <th className="border border-slate-300 py-1.5 px-1.5 text-left">Kategori Pekerjaan</th>
                  <th className="border border-slate-300 py-1.5 px-1.5 text-right w-40">Biaya Total (Rp)</th>
                  <th className="border border-slate-300 py-1.5 px-1.5 text-center w-24">Bobot Pekerjaan (%)</th>
                  <th className="border border-slate-300 py-1.5 px-1.5 text-center w-36">Jadwal Rencana Kerja</th>
                </tr>
              </thead>
              <tbody>
                {rekapCategories.map((cat, index) => {
                  const cost = getGroupSubtotal(cat.wbsPath)
                  const weight = totalPrice > 0 ? (cost / totalPrice) * 100 : 0
                  const sched = categorySchedules[cat.id] || { startWeek: 1, endWeek: 3 }
                  return (
                    <tr key={cat.id} className="bg-white">
                      <td className="border border-slate-300 py-1 px-1 text-center font-mono text-[9px] text-slate-500">{index + 1}</td>
                      <td className="border border-slate-300 py-1 px-1.5 font-bold text-slate-950 uppercase text-[9px]">{cat.name}</td>
                      <td className="border border-slate-300 py-1 px-1.5 text-right font-mono text-[9.5px]">{formatCurrency(cost)}</td>
                      <td className="border border-slate-300 py-1 px-1.5 text-center font-mono font-bold text-[9.5px] text-slate-900">{weight.toFixed(2)}%</td>
                      <td className="border border-slate-300 py-1 px-1.5 text-center font-bold text-primary-900 text-[9.5px]">Minggu {sched.startWeek} - {sched.endWeek}</td>
                    </tr>
                  )
                })}
                <tr className="font-bold border-t border-slate-900 bg-white">
                  <td colSpan={2} className="border border-slate-300 py-1.5 px-1.5 text-right uppercase text-[8.5px] tracking-wider text-slate-400">Jumlah Total Pekerjaan (RAB Utama):</td>
                  <td className="border border-slate-300 py-1.5 px-1.5 text-right font-mono text-[9.5px] text-slate-800">{formatCurrency(totalPrice)}</td>
                  <td className="border border-slate-300 py-1.5 px-1.5 text-center font-mono text-[9.5px] text-slate-900">100.00%</td>
                  <td className="border border-slate-300 py-1.5 px-1.5 text-center text-slate-400 font-normal">-</td>
                </tr>
              </tbody>
            </table>
          </div>

          {/* S-Curve Chart (Printed version) */}
          <div className="space-y-2" style={{ pageBreakInside: 'avoid' }}>
            <div className="font-bold text-slate-950 uppercase text-[9.5px] tracking-wide border-b border-slate-900 pb-1">
              II. GRAFIK RENCANA PROGRESS JADWAL PELAKSANAAN (KURVA S)
            </div>
            
            {/* Legend info in print */}
            <div className="flex justify-end gap-6 text-[8px] font-bold text-slate-950 py-0.5">
              <span className="flex items-center gap-1">
                <span className="w-2.5 h-2.5 bg-blue-500 opacity-60 rounded-sm inline-block"></span> Rencana Progress Mingguan (%)
              </span>
              <span className="flex items-center gap-1">
                <span className="w-3.5 h-0.5 bg-amber-600 inline-block relative top-[-1px]"></span>
                <span className="w-1.5 h-1.5 bg-amber-600 rounded-full inline-block relative left-[-7px]"></span> Rencana Progress Kumulatif (Kurva-S, %)
              </span>
            </div>

            <div className="flex justify-center border border-slate-300 p-2 rounded bg-white">
              <svg width={svgWidth} height={svgHeight} className="font-sans">
                <defs>
                  <linearGradient id="scurve-gradient-print" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="0%" stopColor="#f59e0b" stopOpacity="0.2" />
                    <stop offset="100%" stopColor="#f59e0b" stopOpacity="0" />
                  </linearGradient>
                </defs>

                {/* Horizontal Grid lines and Axis Ticks */}
                {Array.from({ length: 5 }).map((_, i) => {
                  const yVal = padTop + (plotHeight * i) / 4
                  const cumPct = 100 - i * 25
                  const weekPct = (leftYAxisMax * (4 - i)) / 4
                  return (
                    <g key={i}>
                      <line 
                        x1={padLeft} 
                        y1={yVal} 
                        x2={padLeft + plotWidth} 
                        y2={yVal} 
                        stroke="#e2e8f0" 
                        strokeWidth="0.75" 
                      />
                      <text 
                        x={padLeft - 8} 
                        y={yVal + 3} 
                        textAnchor="end" 
                        className="text-[8px] fill-slate-600 font-mono font-semibold"
                      >
                        {weekPct.toFixed(1)}%
                      </text>
                      <text 
                        x={padLeft + plotWidth + 8} 
                        y={yVal + 3} 
                        textAnchor="start" 
                        className="text-[8px] fill-amber-700 font-mono font-bold"
                      >
                        {cumPct}%
                      </text>
                    </g>
                  )
                })}

                {/* Vertical Grid Lines and X axis Labels */}
                {Array.from({ length: durationWeeks }).map((_, w) => {
                  const xVal = padLeft + (w + 0.5) * (plotWidth / durationWeeks)
                  const xLineVal = padLeft + (w + 1) * (plotWidth / durationWeeks)
                  return (
                    <g key={w}>
                      {w < durationWeeks - 1 && (
                        <line 
                          x1={xLineVal} 
                          y1={padTop} 
                          x2={xLineVal} 
                          y2={padTop + plotHeight} 
                          stroke="#cbd5e1" 
                          strokeWidth="0.5" 
                          strokeDasharray="2,2"
                        />
                      )}
                      <text 
                        x={xVal} 
                        y={padTop + plotHeight + 12} 
                        textAnchor="middle" 
                        className="text-[8px] fill-slate-700 font-bold font-mono"
                      >
                        M{w + 1}
                      </text>
                    </g>
                  )
                })}

                {/* Weekly Progress Bars */}
                {weeklyProgress.map((prog, w) => {
                  const xCenter = padLeft + (w + 0.5) * (plotWidth / durationWeeks)
                  const barWidth = Math.max(8, (plotWidth / durationWeeks) * 0.45)
                  const barHeight = (prog / leftYAxisMax) * plotHeight
                  const yVal = padTop + plotHeight - barHeight
                  
                  return (
                    <g key={w}>
                      <rect
                        x={xCenter - barWidth / 2}
                        y={yVal}
                        width={barWidth}
                        height={Math.max(0, barHeight)}
                        fill="#3b82f6"
                        rx="1"
                        className="opacity-60"
                      />
                      {prog > 0 && (
                        <text
                          x={xCenter}
                          y={Math.max(padTop + 8, yVal - 3)}
                          textAnchor="middle"
                          className="text-[7px] fill-blue-800 font-mono font-bold"
                        >
                          {prog.toFixed(1)}%
                        </text>
                      )}
                    </g>
                  )
                })}

                {/* Cumulative S-Curve Area under line */}
                <path d={areaPath.replace(/scurve-gradient/g, 'scurve-gradient-print')} fill="url(#scurve-gradient-print)" />

                {/* Cumulative S-Curve Line */}
                <path
                  d={linePath}
                  fill="none"
                  stroke="#d97706"
                  strokeWidth="2.5"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                />

                {/* S-Curve Circle Nodes and percentage text always visible in print */}
                {cumulativeProgress.map((pct, w) => {
                  const xVal = padLeft + (w + 0.5) * (plotWidth / durationWeeks)
                  const yVal = padTop + plotHeight - (pct / 100) * plotHeight
                  return (
                    <g key={w}>
                      <circle
                        cx={xVal}
                        cy={yVal}
                        r="3.5"
                        fill="#d97706"
                        stroke="#ffffff"
                        strokeWidth="1.5"
                      />
                      <text
                        x={xVal}
                        y={yVal - 6}
                        textAnchor="middle"
                        className="text-[7.5px] fill-amber-900 font-mono font-extrabold"
                      >
                        {pct.toFixed(0)}%
                      </text>
                    </g>
                  )
                })}
              </svg>
            </div>
            <div className="text-[7px] text-slate-400 italic text-center leading-none mt-1">
              Keterangan Sumbu: Sumbu Kiri = Rencana Progress Mingguan (%), Sumbu Kanan = Rencana Progress Kumulatif (%)
            </div>
          </div>
        </div>
      )
    }

    return (
      <div className="space-y-6">
        <div className="text-center border-b border-gray-100 pb-4">
          <h2 className="text-xl font-bold text-gray-900 tracking-wide font-sans">ANALISIS BOBOT PEKERJAAN & KURVA S JADWAL RENCANA</h2>
          <p className="text-sm text-gray-600 mt-1">{project?.name} &bull; {project?.location}</p>
        </div>

        {/* Duration select controls */}
        <div className="flex flex-wrap items-center gap-4 bg-slate-50 p-4 rounded-xl border border-slate-100 no-print text-sm">
          <div className="flex items-center gap-2">
            <span className="font-bold text-slate-700">Durasi Pelaksanaan Proyek:</span>
            <select 
              value={durationWeeks} 
              onChange={e => handleDurationChange(Number(e.target.value))}
              className="bg-white border border-gray-300 rounded px-2 py-1 font-bold text-primary-800 focus:outline-none"
            >
              <option value={4}>4 Minggu (1 Bulan)</option>
              <option value={8}>8 Minggu (2 Bulan)</option>
              <option value={12}>12 Minggu (3 Bulan)</option>
              <option value={16}>16 Minggu (4 Bulan)</option>
              <option value={20}>20 Minggu (5 Bulan)</option>
              <option value={24}>24 Minggu (6 Bulan)</option>
            </select>
          </div>
          <div className="text-xs text-gray-500 italic">
            * Ubah jadwal mulai dan selesai untuk masing-masing kategori di tabel bawah untuk memperbarui kurva-S secara otomatis.
          </div>
        </div>

        {/* Grid Split: Table on Left/Top, Weights Bar Chart on Right */}
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
          {/* Left Column: Schedule Setup Table */}
          <div className="lg:col-span-7 space-y-4">
            <h3 className="font-bold text-gray-800 text-sm border-l-4 border-primary-600 pl-2">
              Pengaturan Jadwal Pelaksanaan & Bobot
            </h3>
            <table className="w-full text-xs border border-gray-100 rounded-lg overflow-hidden">
              <thead>
                <tr className="bg-slate-50 border-b border-gray-200">
                  <th className="table-header py-2 px-1 w-10 text-center font-bold">No</th>
                  <th className="table-header py-2 px-2 text-left font-bold">Kategori Pekerjaan</th>
                  <th className="table-header py-2 px-2 text-right w-28 font-bold">Jumlah Biaya</th>
                  <th className="table-header py-2 px-2 text-center w-16 font-bold">Bobot (%)</th>
                  <th className="table-header py-2 px-2 text-center w-40 font-bold no-print">Jadwal Minggu</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {rekapCategories.map((cat, index) => {
                  const cost = getGroupSubtotal(cat.wbsPath)
                  const weight = totalPrice > 0 ? (cost / totalPrice) * 100 : 0
                  const sched = categorySchedules[cat.id] || { startWeek: 1, endWeek: 3 }
                  
                  return (
                    <tr key={cat.id} className="hover:bg-slate-50/50">
                      <td className="py-2.5 px-1.5 text-center font-mono font-semibold text-slate-400">{index + 1}</td>
                      <td className="py-2.5 px-2 font-bold text-slate-800 uppercase tracking-wide">{cat.name}</td>
                      <td className="py-2.5 px-2 text-right font-mono font-semibold text-slate-700">{formatCurrency(cost)}</td>
                      <td className="py-2.5 px-2 text-center font-mono font-bold text-slate-900">{weight.toFixed(2)}%</td>
                      <td className="py-2.5 px-2 no-print">
                        <div className="flex items-center justify-center gap-1.5">
                          <select
                            value={sched.startWeek}
                            onChange={e => {
                              const start = Number(e.target.value)
                              const end = Math.max(start, sched.endWeek)
                              setCategorySchedules(prev => ({
                                ...prev,
                                [cat.id]: { startWeek: start, endWeek: end }
                              }))
                            }}
                            className="bg-white border border-gray-200 rounded px-1.5 py-0.5 text-xs text-slate-700"
                          >
                            {Array.from({ length: durationWeeks }).map((_, w) => (
                              <option key={w + 1} value={w + 1}>M{w + 1}</option>
                            ))}
                          </select>
                          <span className="text-gray-400">s/d</span>
                          <select
                            value={sched.endWeek}
                            onChange={e => {
                              const end = Number(e.target.value)
                              const start = Math.min(end, sched.startWeek)
                              setCategorySchedules(prev => ({
                                ...prev,
                                [cat.id]: { startWeek: start, endWeek: end }
                              }))
                            }}
                            className="bg-white border border-gray-200 rounded px-1.5 py-0.5 text-xs text-slate-700"
                          >
                            {Array.from({ length: durationWeeks }).map((_, w) => (
                              <option key={w + 1} value={w + 1} disabled={w + 1 < sched.startWeek}>M{w + 1}</option>
                            ))}
                          </select>
                        </div>
                      </td>
                    </tr>
                  )
                })}
                <tr className="font-extrabold bg-slate-50 text-slate-900 border-t border-gray-200">
                  <td colSpan={2} className="py-2.5 px-2 text-right uppercase">Total Konstruksi (RAB Utama):</td>
                  <td className="py-2.5 px-2 text-right font-mono">{formatCurrency(totalPrice)}</td>
                  <td className="py-2.5 px-2 text-center font-mono">100.00%</td>
                  <td className="py-2.5 px-2 no-print"></td>
                </tr>
              </tbody>
            </table>
          </div>

          {/* Right Column: Weights Horizontal Bar Charts */}
          <div className="lg:col-span-5 space-y-4">
            <h3 className="font-bold text-gray-800 text-sm border-l-4 border-teal-600 pl-2">
              Visualisasi Bobot Kategori Pekerjaan
            </h3>
            <div className="border border-slate-100 rounded-xl p-4 bg-slate-50/30 space-y-3.5 max-h-[300px] overflow-y-auto">
              {rekapCategories.map((cat, index) => {
                const cost = getGroupSubtotal(cat.wbsPath)
                const weight = totalPrice > 0 ? (cost / totalPrice) * 100 : 0
                const colors = ['bg-blue-600', 'bg-teal-600', 'bg-indigo-600', 'bg-violet-600', 'bg-amber-600', 'bg-emerald-600', 'bg-cyan-600']
                const barColor = colors[index % colors.length]
                
                return (
                  <div key={cat.id} className="space-y-1">
                    <div className="flex justify-between text-[11px] font-bold text-slate-700 leading-none">
                      <span className="truncate max-w-[60%]">{cat.name}</span>
                      <span className="font-mono text-slate-900">{weight.toFixed(2)}% ({formatCurrency(cost)})</span>
                    </div>
                    <div className="w-full bg-gray-200/70 rounded-full h-2 overflow-hidden shadow-inner">
                      <div className={`${barColor} h-full rounded-full transition-all duration-500`} style={{ width: `${weight}%` }} />
                    </div>
                  </div>
                )
              })}
            </div>
          </div>
        </div>

        {/* S-Curve Chart Section */}
        <div className="space-y-3 pt-2">
          <div className="flex justify-between items-center">
            <h3 className="font-bold text-gray-800 text-sm border-l-4 border-amber-600 pl-2">
              Grafik Rencana Kemajuan Pekerjaan (Kurva-S)
            </h3>
            <div className="flex gap-4 text-xs font-semibold">
              <span className="flex items-center gap-1.5 text-blue-700">
                <span className="w-3 h-3 bg-blue-500 opacity-70 rounded-sm inline-block"></span> Rencana Mingguan (%)
              </span>
              <span className="flex items-center gap-1.5 text-amber-700">
                <span className="w-4 h-0.5 bg-amber-600 inline-block relative top-[-1px]"></span>
                <span className="w-1.5 h-1.5 bg-amber-600 rounded-full inline-block relative left-[-9px]"></span> Rencana Kumulatif (Kurva-S, %)
              </span>
            </div>
          </div>

          {/* SVG Chart Container */}
          <div className="border border-gray-200 rounded-xl p-4 bg-white flex justify-center shadow-inner overflow-x-auto">
            <svg width={svgWidth} height={svgHeight} className="font-sans">
              <defs>
                <linearGradient id="scurve-gradient" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="0%" stopColor="#f59e0b" stopOpacity="0.3" />
                  <stop offset="100%" stopColor="#f59e0b" stopOpacity="0" />
                </linearGradient>
              </defs>

              {/* Horizontal Grid lines and Axis Ticks */}
              {Array.from({ length: 5 }).map((_, i) => {
                const yVal = padTop + (plotHeight * i) / 4
                const cumPct = 100 - i * 25
                const weekPct = (leftYAxisMax * (4 - i)) / 4
                return (
                  <g key={i}>
                    <line 
                      x1={padLeft} 
                      y1={yVal} 
                      x2={padLeft + plotWidth} 
                      y2={yVal} 
                      stroke="#f1f5f9" 
                      strokeWidth="1" 
                    />
                    {/* Left axis (weekly) */}
                    <text 
                      x={padLeft - 10} 
                      y={yVal + 3.5} 
                      textAnchor="end" 
                      className="text-[10px] fill-slate-400 font-mono font-bold"
                    >
                      {weekPct.toFixed(1)}%
                    </text>
                    {/* Right axis (cumulative) */}
                    <text 
                      x={padLeft + plotWidth + 10} 
                      y={yVal + 3.5} 
                      textAnchor="start" 
                      className="text-[10px] fill-amber-600 font-mono font-bold"
                    >
                      {cumPct}%
                    </text>
                  </g>
                )
              })}

              {/* Vertical Grid Lines and X axis Labels */}
              {Array.from({ length: durationWeeks }).map((_, w) => {
                const xVal = padLeft + (w + 0.5) * (plotWidth / durationWeeks)
                const xLineVal = padLeft + (w + 1) * (plotWidth / durationWeeks)
                return (
                  <g key={w}>
                    {w < durationWeeks - 1 && (
                      <line 
                        x1={xLineVal} 
                        y1={padTop} 
                        x2={xLineVal} 
                        y2={padTop + plotHeight} 
                        stroke="#f8fafc" 
                        strokeWidth="1" 
                        strokeDasharray="3,3"
                      />
                    )}
                    <text 
                      x={xVal} 
                      y={padTop + plotHeight + 16} 
                      textAnchor="middle" 
                      className="text-[10px] fill-slate-500 font-extrabold font-mono"
                    >
                      M{w + 1}
                    </text>
                  </g>
                )
              })}

              {/* Weekly Progress Bars */}
              {weeklyProgress.map((prog, w) => {
                const xCenter = padLeft + (w + 0.5) * (plotWidth / durationWeeks)
                const barWidth = Math.max(12, (plotWidth / durationWeeks) * 0.45)
                const barHeight = (prog / leftYAxisMax) * plotHeight
                const yVal = padTop + plotHeight - barHeight
                
                return (
                  <g key={w} className="group">
                    <rect
                      x={xCenter - barWidth / 2}
                      y={yVal}
                      width={barWidth}
                      height={Math.max(0, barHeight)}
                      fill="#3b82f6"
                      rx="1.5"
                      className="opacity-70 group-hover:opacity-90 transition-opacity"
                    />
                    <text
                      x={xCenter}
                      y={Math.max(padTop + 10, yVal - 4)}
                      textAnchor="middle"
                      className="text-[9px] fill-blue-700 font-mono font-bold opacity-0 group-hover:opacity-100 transition-opacity"
                    >
                      {prog > 0 ? `${prog.toFixed(1)}%` : ''}
                    </text>
                  </g>
                )
              })}

              {/* Cumulative S-Curve Area under line */}
              <path d={areaPath} fill="url(#scurve-gradient)" />

              {/* Cumulative S-Curve Line */}
              <path
                d={linePath}
                fill="none"
                stroke="#d97706"
                strokeWidth="3.5"
                strokeLinecap="round"
                strokeLinejoin="round"
              />

              {/* S-Curve Circle Nodes */}
              {cumulativeProgress.map((pct, w) => {
                const xVal = padLeft + (w + 0.5) * (plotWidth / durationWeeks)
                const yVal = padTop + plotHeight - (pct / 100) * plotHeight
                return (
                  <g key={w} className="group cursor-pointer">
                    <circle
                      cx={xVal}
                      cy={yVal}
                      r="4.5"
                      fill="#d97706"
                      stroke="#ffffff"
                      strokeWidth="2.5"
                      className="group-hover:scale-125 transition-transform"
                    />
                    <text
                      x={xVal}
                      y={yVal - 8}
                      textAnchor="middle"
                      className="text-[9.5px] fill-amber-950 font-mono font-black bg-amber-50/90 px-1.5 py-0.5 border border-amber-200 rounded shadow-sm pointer-events-none"
                    >
                      {pct.toFixed(1)}%
                    </text>
                  </g>
                )
              })}
            </svg>
          </div>
          <div className="flex justify-between items-center text-[11px] text-gray-500 italic px-2">
            <span>* Arahkan kursor ke titik kurva untuk melihat persentase kumulatif mingguan.</span>
            <span className="font-semibold text-amber-700">M1 s/d M{durationWeeks} menyatakan Minggu Pelaksanaan</span>
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      {/* Action Header */}
      <div className="flex justify-between items-center bg-white p-4 rounded-xl border border-gray-200 shadow-sm no-print">
        <div>
          <span className="text-xs text-gray-500 font-semibold block uppercase tracking-wider">MODUL EXPORT & CETAK</span>
          <h3 className="text-base font-bold text-gray-800">Cetak Laporan Lengkap atau Ekspor Excel</h3>
        </div>
        <div className="flex gap-2">
          <button 
            onClick={handlePrint} 
            className="btn-primary text-xs px-4 py-2 flex items-center gap-1.5"
          >
            <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 17h2a2 2 0 002-2v-4a2 2 0 00-2-2H5a2 2 0 00-2 2v4a2 2 0 002 2h2m2 4h10a2 2 0 002-2v-3a2 2 0 00-2-2H9a2 2 0 00-2 2v3a2 2 0 002 2zm5-17v2m0 0v2m0-2h2m-2 0H8" />
            </svg>
            Cetak PDF (Dialog Sistem)
          </button>
          <button 
            onClick={handleExportPdf}
            disabled={exportingPdf}
            className="btn-primary text-xs px-4 py-2 bg-red-600 hover:bg-red-700 disabled:opacity-50 flex items-center gap-1.5"
          >
            <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 10v6m0 0l-3-3m3 3l3-3m2 8H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
            </svg>
            {exportingPdf ? 'Mengekspor...' : 'Ekspor File PDF (.pdf)'}
          </button>
          <button 
            onClick={handleExportExcel} 
            disabled={exporting}
            className="btn-primary text-xs px-4 py-2 bg-green-600 hover:bg-green-700 disabled:opacity-50 flex items-center gap-1.5"
          >
            <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" />
            </svg>
            {exporting ? 'Mengekspor...' : 'Ekspor Multi-Tab Excel (.xlsx)'}
          </button>
        </div>
      </div>

      {/* Screen Preview Tabs */}
      <div className="space-y-4 no-print">
        <div className="flex gap-1 border-b border-gray-200">
          <button 
            onClick={() => setPreviewTab('rekap')}
            className={`px-4 py-2 border-b-2 text-sm font-semibold transition-all ${
              previewTab === 'rekap' ? 'border-primary-800 text-primary-800' : 'border-transparent text-gray-500 hover:text-gray-700'
            }`}
          >
            Preview Rekapitulasi
          </button>
          <button 
            onClick={() => setPreviewTab('rab')}
            className={`px-4 py-2 border-b-2 text-sm font-semibold transition-all ${
              previewTab === 'rab' ? 'border-primary-800 text-primary-800' : 'border-transparent text-gray-500 hover:text-gray-700'
            }`}
          >
            Preview RAB Proyek
          </button>
          <button 
            onClick={() => setPreviewTab('analisa')}
            className={`px-4 py-2 border-b-2 text-sm font-semibold transition-all ${
              previewTab === 'analisa' ? 'border-primary-800 text-primary-800' : 'border-transparent text-gray-500 hover:text-gray-700'
            }`}
          >
            Preview Lembar Analisa
          </button>
          <button 
            onClick={() => setPreviewTab('bom')}
            className={`px-4 py-2 border-b-2 text-sm font-semibold transition-all ${
              previewTab === 'bom' ? 'border-primary-800 text-primary-800' : 'border-transparent text-gray-500 hover:text-gray-700'
            }`}
          >
            Preview Bill of Material
          </button>
          <button 
            onClick={() => setPreviewTab('backup')}
            className={`px-4 py-2 border-b-2 text-sm font-semibold transition-all ${
              previewTab === 'backup' ? 'border-primary-800 text-primary-800' : 'border-transparent text-gray-500 hover:text-gray-700'
            }`}
          >
            Preview Backup Volume
          </button>
          <button 
            onClick={() => setPreviewTab('analisis_kurvas')}
            className={`px-4 py-2 border-b-2 text-sm font-semibold transition-all ${
              previewTab === 'analisis_kurvas' ? 'border-primary-800 text-primary-800' : 'border-transparent text-gray-500 hover:text-gray-700'
            }`}
          >
            📊 Analisis & Kurva S
          </button>
        </div>

        {/* Tab Previews */}
        <div className="bg-white rounded-xl border border-gray-200 shadow-sm overflow-hidden p-6">
          {previewTab === 'rekap' && (
            <div className="space-y-4">
              <div className="text-center border-b border-gray-100 pb-4">
                <h2 className="text-xl font-bold text-gray-900 tracking-wide font-sans">REKAPITULASI RENCANA ANGGARAN BIAYA</h2>
                <p className="text-sm text-gray-600 mt-1">{project?.name} &bull; {project?.location}</p>
              </div>
              <table className="w-full text-sm">
                <thead>
                  <tr className="bg-gray-50 border-b border-gray-200">
                    <th className="table-header w-16 text-center">No</th>
                    <th className="table-header text-left">Kategori Pekerjaan</th>
                    <th className="table-header w-48 text-right">Jumlah Biaya</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-100">
                  {rekapCategories.map((cat, index) => {
                    const catTotal = getGroupSubtotal(cat.wbsPath)
                    return (
                      <tr key={cat.id}>
                        <td className="table-cell text-center font-mono text-xs">{index + 1}</td>
                        <td className="table-cell font-semibold text-gray-800 uppercase text-xs tracking-wide">{cat.name}</td>
                        <td className="table-cell text-right font-mono font-bold text-gray-900">{formatCurrency(catTotal)}</td>
                      </tr>
                    )
                  })}
                </tbody>
              </table>
              <div className="border-t border-gray-200 pt-4 space-y-4">
                <div className="flex justify-end">
                  <div className="w-80 space-y-1 text-sm font-sans">
                    <div className="flex justify-between text-gray-500">
                      <span>Subtotal Pekerjaan:</span>
                      <span className="font-mono font-medium">{formatCurrency(totalPrice)}</span>
                    </div>
                    <div className="flex justify-between text-gray-500">
                      <span>PPN ({ppn}%):</span>
                      <span className="font-mono">{formatCurrency(ppnAmount)}</span>
                    </div>
                    <div className="flex justify-between text-gray-500">
                      <span>Overhead ({overhead}%):</span>
                      <span className="font-mono">{formatCurrency(overheadAmount)}</span>
                    </div>
                    <div className="flex justify-between text-gray-500">
                      <span>Grand Total RAB:</span>
                      <span className="font-mono">{formatCurrency(grandTotal)}</span>
                    </div>
                    <div className="flex justify-between text-gray-400 text-xs">
                      <span>Pembulatan:</span>
                      <span className="font-mono">{formatCurrency(roundedGrandTotal - grandTotal)}</span>
                    </div>
                    <hr className="border-gray-200 my-1" />
                    <div className="flex justify-between font-extrabold text-primary-800 text-base">
                      <span>Grand Total Dibulatkan:</span>
                      <span className="font-mono">{formatCurrency(roundedGrandTotal)}</span>
                    </div>
                  </div>
                </div>

                {/* Spelled-out (Terbilang) Note */}
                <div className="bg-slate-50 border border-slate-200 rounded-lg p-3 text-sm">
                  <span className="font-bold text-slate-800 uppercase text-xs tracking-wider">Terbilang:</span>{" "}
                  <span className="italic font-semibold text-primary-800 capitalize ml-1">
                    {getTerbilang(roundedGrandTotal)}
                  </span>
                </div>
              </div>
            </div>
          )}

          {previewTab === 'rab' && (
            <div className="space-y-4">
              <div className="text-center border-b border-gray-100 pb-4">
                <h2 className="text-xl font-bold text-gray-900 tracking-wide font-sans">RENCANA ANGGARAN BIAYA (RAB)</h2>
                <p className="text-sm text-gray-600 mt-1">{project?.name} &bull; {project?.location}</p>
              </div>
              <table className="w-full text-sm">
                <thead>
                  <tr className="bg-gray-50 border-b border-gray-200">
                    <th className="table-header w-16 text-center">No WBS</th>
                    <th className="table-header">Uraian Kategori & Pekerjaan</th>
                    <th className="table-header w-24 text-right">Volume</th>
                    <th className="table-header w-20 text-center">Satuan</th>
                    <th className="table-header w-36 text-right">Harga Satuan</th>
                    <th className="table-header w-40 text-right">Jumlah Biaya</th>
                  </tr>
                </thead>
                 <tbody className="divide-y divide-gray-100">
                  {wbsItems.map((item) => {
                    const level = item.wbsPath ? item.wbsPath.split('.').length - 1 : 0
                    
                    if (item.type === 'group') {
                      const subtotal = getGroupSubtotal(item.wbsPath)
                      return (
                        <tr key={item.id} className="bg-slate-100/60 font-bold text-slate-800 text-xs">
                          <td className="px-4 py-2 font-mono text-center">{item.code}</td>
                          <td colSpan={4} className="px-4 py-2 uppercase tracking-wider" style={{ paddingLeft: `${level * 16}px` }}>
                            {item.name}
                          </td>
                          <td className="px-4 py-2 text-right font-mono font-bold">
                            {formatCurrency(subtotal)}
                          </td>
                        </tr>
                      )
                    } else {
                      const calcItem = calculation?.lineItems?.find(li => li.wbsItemId === item.id)
                      const volItem = volumes.find(v => v.wbsItemId === item.id)
                      const volume = volItem?.volume ?? 0
                      const unit = volItem?.unit || item.unit
                      let unitPrice = calcItem?.unitPrice ?? 0
                      if (!calcItem && volItem?.ahsId) {
                        const matchedAhs = ahsList.find(a => a.id === volItem.ahsId)
                        unitPrice = matchedAhs?.totalPrice ?? 0
                      }
                      const total = volume * unitPrice

                      return (
                        <tr key={item.id}>
                          <td className="table-cell text-center text-gray-400 font-mono text-xs">{item.code}</td>
                          <td className="table-cell font-medium text-gray-800" style={{ paddingLeft: `${level * 16}px` }}>{item.name}</td>
                          <td className="table-cell text-right font-mono">{volume}</td>
                          <td className="table-cell text-center text-gray-600 font-semibold">{unit || '-'}</td>
                          <td className="table-cell text-right font-mono text-gray-600">{formatCurrency(unitPrice)}</td>
                          <td className="table-cell text-right font-mono font-bold text-gray-900">{formatCurrency(total)}</td>
                        </tr>
                      )
                    }
                  })}
                </tbody>
              </table>
              <div className="border-t border-gray-200 pt-4 space-y-4">
                <div className="flex justify-end">
                  <div className="w-80 space-y-1 text-sm font-sans">
                    <div className="flex justify-between text-gray-500">
                      <span>Total Pekerjaan:</span>
                      <span className="font-mono font-medium">{formatCurrency(totalPrice)}</span>
                    </div>
                    <div className="flex justify-between text-gray-500">
                      <span>PPN ({ppn}%):</span>
                      <span className="font-mono">{formatCurrency(ppnAmount)}</span>
                    </div>
                    <div className="flex justify-between text-gray-500">
                      <span>Overhead ({overhead}%):</span>
                      <span className="font-mono">{formatCurrency(overheadAmount)}</span>
                    </div>
                    <div className="flex justify-between text-gray-500">
                      <span>Grand Total RAB:</span>
                      <span className="font-mono">{formatCurrency(grandTotal)}</span>
                    </div>
                    <div className="flex justify-between text-gray-400 text-xs">
                      <span>Pembulatan:</span>
                      <span className="font-mono">{formatCurrency(roundedGrandTotal - grandTotal)}</span>
                    </div>
                    <hr className="border-gray-200 my-1" />
                    <div className="flex justify-between font-extrabold text-primary-800 text-base">
                      <span>Grand Total Dibulatkan:</span>
                      <span className="font-mono">{formatCurrency(roundedGrandTotal)}</span>
                    </div>
                  </div>
                </div>

                {/* Spelled-out (Terbilang) Note */}
                <div className="bg-slate-50 border border-slate-200 rounded-lg p-3 text-sm">
                  <span className="font-bold text-slate-800 uppercase text-xs tracking-wider">Terbilang:</span>{" "}
                  <span className="italic font-semibold text-primary-800 capitalize ml-1">
                    {getTerbilang(roundedGrandTotal)}
                  </span>
                </div>
              </div>
            </div>
          )}

          {previewTab === 'analisa' && (
            <div className="space-y-6">
              {detailedAhsList.map(data => (
                <div key={data.ahs.id} className="border border-gray-100 rounded-lg p-4 bg-gray-50/50">
                  <h4 className="font-bold text-gray-800 font-sans border-b border-gray-200 pb-2 mb-3">
                    {data.ahs.code} - {data.ahs.name} (per {data.ahs.unit})
                  </h4>
                  <table className="w-full text-xs bg-white border border-gray-200 rounded">
                    <thead>
                      <tr className="bg-gray-100 text-gray-600">
                        <th className="p-2 text-left w-12">No</th>
                        <th className="p-2 text-left">Uraian</th>
                        <th className="p-2 text-center w-16">Satuan</th>
                        <th className="p-2 text-right w-24">Koefisien</th>
                        <th className="p-2 text-right w-32">Harga Satuan</th>
                        <th className="p-2 text-right w-36">Jumlah Harga</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-gray-100 font-sans">
                      {/* Labor */}
                      {data.wages.map((w, i) => (
                        <tr key={w.id}>
                          <td className="p-2 text-center text-gray-400 font-mono">{i + 1}</td>
                          <td className="p-2 text-gray-700 font-medium">{w.wageType} (Tenaga Kerja)</td>
                          <td className="p-2 text-center">{w.wageUnit}</td>
                          <td className="p-2 text-right font-mono">{w.coefficient}</td>
                          <td className="p-2 text-right font-mono">{formatCurrency(w.dailyWage || 0)}</td>
                          <td className="p-2 text-right font-mono font-medium">{formatCurrency(w.totalPrice || 0)}</td>
                        </tr>
                      ))}
                      {/* Materials */}
                      {data.materials.map((m, i) => (
                        <tr key={m.id}>
                          <td className="p-2 text-center text-gray-400 font-mono">{i + 1}</td>
                          <td className="p-2 text-gray-700 font-medium">{m.materialName} (Bahan)</td>
                          <td className="p-2 text-center">{m.materialUnit}</td>
                          <td className="p-2 text-right font-mono">{m.coefficient}</td>
                          <td className="p-2 text-right font-mono">{formatCurrency(m.unitPrice || 0)}</td>
                          <td className="p-2 text-right font-mono font-medium">{formatCurrency(m.totalPrice || 0)}</td>
                        </tr>
                      ))}
                      {/* Equipment */}
                      {data.equipment.map((e, i) => (
                        <tr key={e.id}>
                          <td className="p-2 text-center text-gray-400 font-mono">{i + 1}</td>
                          <td className="p-2 text-gray-700 font-medium">{e.equipmentName} (Alat)</td>
                          <td className="p-2 text-center">{e.equipmentUnit}</td>
                          <td className="p-2 text-right font-mono">{e.coefficient}</td>
                          <td className="p-2 text-right font-mono">{formatCurrency(e.rentalPrice || 0)}</td>
                          <td className="p-2 text-right font-mono font-medium">{formatCurrency(e.totalPrice || 0)}</td>
                        </tr>
                      ))}
                      <tr className="font-bold bg-gray-50 text-gray-800">
                        <td colSpan={5} className="p-2 text-right uppercase">Subtotal Pekerjaan:</td>
                        <td className="p-2 text-right font-mono">{formatCurrency(data.totalComponents)}</td>
                      </tr>
                      <tr className="font-bold bg-gray-50 text-gray-800 border-t border-gray-200">
                        <td colSpan={5} className="p-2 text-right uppercase">Overhead & Profit ({overhead}%):</td>
                        <td className="p-2 text-right font-mono">{formatCurrency(data.overheadAmount)}</td>
                      </tr>
                      <tr className="font-bold bg-amber-50 text-primary-900 border-t-2 border-primary-300">
                        <td colSpan={5} className="p-2 text-right uppercase">Harga Satuan Pekerjaan (HSP):</td>
                        <td className="p-2 text-right font-mono">{formatCurrency(data.totalUnitPrice)}</td>
                      </tr>
                    </tbody>
                  </table>
                </div>
              ))}
            </div>
          )}

          {previewTab === 'bom' && (
            <div className="space-y-4">
              <table className="w-full text-sm">
                <thead>
                  <tr className="bg-gray-50 border-b border-gray-200">
                    <th className="table-header w-12 text-center">No</th>
                    <th className="table-header">Uraian Komponen</th>
                    <th className="table-header w-24 text-center">Satuan</th>
                    <th className="table-header w-36 text-right">Total Kebutuhan</th>
                    <th className="table-header w-36 text-right">Harga Satuan</th>
                    <th className="table-header w-40 text-right">Jumlah Biaya</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-100">
                  {(['Bahan', 'Tenaga Kerja', 'Alat'] as const).map((cat, catIdx) => {
                    const items = bomItems.filter(item => item.category === cat)
                    if (items.length === 0) return null
                    const catSubtotal = items.reduce((s, i) => s + i.totalPrice, 0)
                    const letterCode = String.fromCharCode(65 + catIdx)

                    return (
                      <React.Fragment key={cat}>
                        {/* Category Row Divider */}
                        <tr className="bg-slate-100/60 font-bold text-slate-800 text-xs">
                          <td className="px-4 py-2 text-center font-mono">{letterCode}</td>
                          <td colSpan={5} className="px-4 py-2 uppercase tracking-wider">
                            {cat === 'Alat' ? 'Peralatan / Alat' : cat}
                          </td>
                        </tr>
                        {/* Line items */}
                        {items.map((item, idx) => (
                          <tr key={item.id} className="hover:bg-gray-50/50">
                            <td className="table-cell text-center text-gray-400 font-mono text-xs">{idx + 1}</td>
                            <td className="table-cell font-medium text-gray-800">{item.name}</td>
                            <td className="table-cell text-center text-gray-600 font-semibold">{item.unit}</td>
                            <td className="table-cell text-right font-mono">{item.quantity.toFixed(4)}</td>
                            <td className="table-cell text-right font-mono text-gray-600">{formatCurrency(item.unitPrice)}</td>
                            <td className="table-cell text-right font-mono font-bold text-gray-900">{formatCurrency(item.totalPrice)}</td>
                          </tr>
                        ))}
                        {/* Subtotal Row */}
                        <tr className="bg-slate-50/30 font-semibold text-xs border-b border-gray-200">
                          <td colSpan={5} className="px-4 py-2 text-right text-gray-500 uppercase text-[10px]">
                            Subtotal {cat === 'Alat' ? 'Peralatan' : cat}:
                          </td>
                          <td className="px-4 py-2 text-right font-mono font-bold text-gray-800">
                            {formatCurrency(catSubtotal)}
                          </td>
                        </tr>
                      </React.Fragment>
                    )
                  })}
                </tbody>
              </table>
              <div className="bg-gray-50 px-6 py-4 border-t border-gray-200 flex justify-end">
                <div className="w-80 space-y-1 text-sm font-sans flex justify-between font-extrabold text-primary-800">
                  <span>Total Biaya Seluruh Komponen:</span>
                  <span className="font-mono">{formatCurrency(bomItems.reduce((s, i) => s + i.totalPrice, 0))}</span>
                </div>
              </div>
            </div>
          )}

          {previewTab === 'backup' && (
            <div className="space-y-4">
              <div className="text-center border-b border-gray-100 pb-4">
                <h2 className="text-xl font-bold text-gray-900 tracking-wide font-sans">DAFTAR BACKUP PERHITUNGAN VOLUME</h2>
                <p className="text-sm text-gray-600 mt-1">{project?.name} &bull; {project?.location}</p>
              </div>
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="bg-gray-50 border-b border-gray-200">
                      <th className="table-header w-20 text-center">No WBS</th>
                      <th className="table-header text-left w-1/4">Uraian Pekerjaan</th>
                      <th className="table-header w-24 text-right">Volume</th>
                      <th className="table-header w-20 text-center">Satuan</th>
                      <th className="table-header text-left">Rincian Perhitungan (Formula)</th>
                      <th className="table-header text-left w-1/4">Catatan / Keterangan</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-100">
                    {wbsItems.map((item) => {
                      const level = item.wbsPath ? item.wbsPath.split('.').length - 1 : 0
                      
                      if (item.type === 'group') {
                        return (
                          <tr key={item.id} className="bg-slate-50/80 font-bold text-slate-800 text-xs">
                            <td className="px-4 py-2 font-mono text-center">{item.code}</td>
                            <td colSpan={5} className="px-4 py-2 uppercase tracking-wide" style={{ paddingLeft: `${level * 16}px` }}>
                              {item.name}
                            </td>
                          </tr>
                        )
                      }

                      const volItem = volumes.find(v => v.wbsItemId === item.id)
                      const linkedVol = volItem?.projectVolumeId 
                        ? projectVolumes.find(pv => pv.id === volItem.projectVolumeId) 
                        : null

                      const volume = linkedVol ? linkedVol.value : (volItem?.volume ?? 0)
                      const unit = linkedVol ? linkedVol.unit : (volItem?.unit || item.unit)
                      
                      const formulaSrc = linkedVol ? linkedVol.formula : (volItem?.formula || '')
                      const notesText = linkedVol ? linkedVol.notes : (volItem?.notes || '-')
                      
                      const hasBackup = formulaSrc && formulaSrc.trim().startsWith('{')
                      const formulaText = hasBackup ? parseFormulaToText(formulaSrc) : (linkedVol ? `Dihubungkan ke Volume: ${linkedVol.name}` : 'Manual Input')

                      return (
                        <tr key={item.id} className="hover:bg-gray-50/50">
                          <td className="table-cell text-center text-gray-400 font-mono text-xs">{item.code}</td>
                          <td className="table-cell font-medium text-gray-800" style={{ paddingLeft: `${level * 16}px` }}>{item.name}</td>
                          <td className="table-cell text-right font-mono font-semibold">{volume}</td>
                          <td className="table-cell text-center text-gray-600 font-semibold">{unit || '-'}</td>
                          <td className="table-cell font-mono text-xs text-gray-700 whitespace-pre-line leading-relaxed">
                            {hasBackup ? (
                              <span className="text-amber-700 bg-amber-50/50 border border-amber-100 rounded px-1.5 py-0.5 inline-block font-sans mt-0.5">
                                {formulaText}
                              </span>
                            ) : (
                              <span className="text-gray-400 italic font-sans">{formulaText}</span>
                            )}
                          </td>
                          <td className="table-cell text-gray-600 text-xs whitespace-pre-line">{notesText}</td>
                        </tr>
                      )
                    })}
                  </tbody>
                </table>
              </div>
            </div>
          )}

          {previewTab === 'analisis_kurvas' && renderAnalisisKurvaS(false)}
        </div>
      </div>

      {/* PRINT-ONLY COMPILATION WORKBOOK LAYOUT */}
      <div className="print-only hidden space-y-10 text-slate-800 font-sans leading-relaxed text-[9.5px]">
        {/* SECTION 1: REKAPITULASI */}
        <section className="print-page border-b border-slate-200 pb-8">
          {renderPrintHeader("REKAPITULASI RENCANA ANGGARAN BIAYA")}
          <table className="w-full border-collapse border border-slate-300 text-[9.5px] font-sans">
            <thead>
              <tr className="border-b-2 border-slate-900 text-[9px] font-bold uppercase tracking-wider text-slate-950 bg-white">
                <th className="border border-slate-300 py-2 px-1.5 text-center align-middle w-16 font-bold">No</th>
                <th className="border border-slate-300 py-2 px-1.5 text-center align-middle font-bold">Kategori Pekerjaan</th>
                <th className="border border-slate-300 py-2 px-1.5 text-center align-middle w-40 font-bold">Jumlah Biaya (Rp)</th>
              </tr>
            </thead>
            <tbody>
              {rekapCategories.map((cat, index) => {
                const catTotal = getGroupSubtotal(cat.wbsPath)
                return (
                  <tr key={cat.id} className="bg-white">
                    <td className="border border-slate-300 py-1.5 px-1.5 text-center font-mono text-[9px] text-slate-500">{index + 1}</td>
                    <td className="border border-slate-300 py-1.5 px-1.5 font-bold text-slate-950 uppercase text-[9px] tracking-wide">{cat.name}</td>
                    <td className="border border-slate-300 py-1.5 px-1.5 text-right font-mono font-semibold text-slate-800 text-[9.5px]">{formatCurrency(catTotal)}</td>
                  </tr>
                )
              })}
            <tr className="font-semibold border-t border-slate-300 bg-white">
                <td colSpan={2} className="border border-slate-300 py-1.5 px-1.5 text-right uppercase text-[8.5px] tracking-wider text-slate-400">Jumlah Subtotal Pekerjaan:</td>
                <td className="border border-slate-300 py-1.5 px-1.5 text-right font-mono text-slate-700 text-[9.5px]">{formatCurrency(totalPrice)}</td>
              </tr>
              <tr className="font-semibold bg-white">
                <td colSpan={2} className="border border-slate-300 py-1.5 px-1.5 text-right uppercase text-[8.5px] tracking-wider text-slate-400">PPN ({ppn}%):</td>
                <td className="border border-slate-300 py-1.5 px-1.5 text-right font-mono text-slate-700 text-[9.5px]">{formatCurrency(ppnAmount)}</td>
              </tr>
              <tr className="font-semibold bg-white">
                <td colSpan={2} className="border border-slate-300 py-1.5 px-1.5 text-right uppercase text-[8.5px] tracking-wider text-slate-400">Overhead & Profit ({overhead}%):</td>
                <td className="border border-slate-300 py-1.5 px-1.5 text-right font-mono text-slate-700 text-[9.5px]">{formatCurrency(overheadAmount)}</td>
              </tr>
              <tr className="font-semibold bg-white">
                <td colSpan={2} className="border border-slate-300 py-1.5 px-1.5 text-right uppercase text-[8.5px] tracking-wider text-slate-400">Grand Total RAB:</td>
                <td className="border border-slate-300 py-1.5 px-1.5 text-right font-mono text-slate-700 text-[9.5px]">{formatCurrency(grandTotal)}</td>
              </tr>
              <tr className="font-semibold bg-white">
                <td colSpan={2} className="border border-slate-300 py-1.5 px-1.5 text-right uppercase text-[8.5px] tracking-wider text-slate-400">Pembulatan:</td>
                <td className="border border-slate-300 py-1.5 px-1.5 text-right font-mono text-slate-700 text-[9.5px]">{formatCurrency(roundedGrandTotal - grandTotal)}</td>
              </tr>
              <tr className="font-bold bg-white border-t border-slate-900 border-b-double border-b-[3px] border-b-slate-950">
                <td colSpan={2} className="border border-slate-300 py-2 px-1.5 text-right uppercase tracking-wider text-[9px] text-slate-950">Grand Total Dibulatkan:</td>
                <td className="border border-slate-300 py-2 px-1.5 text-right font-mono text-slate-950 font-extrabold text-[11px]">{formatCurrency(roundedGrandTotal)}</td>
              </tr>
              <tr className="bg-white">
                <td colSpan={3} className="border border-slate-300 py-2 px-2.5 text-left font-sans text-[9px]">
                  <span className="font-bold text-slate-950 uppercase tracking-wider text-[8px]">Terbilang:</span>{" "}
                  <span className="italic font-semibold text-slate-950 capitalize ml-1">{getTerbilang(roundedGrandTotal)}</span>
                </td>
              </tr>
            </tbody>
          </table>
          {renderPrintFooter()}
        </section>

        {/* SECTION 2: RAB */}
        <section className="print-page border-b border-slate-200 pb-8" style={{ pageBreakBefore: 'always' }}>
          {renderPrintHeader("RENCANA ANGGARAN BIAYA (RAB)")}
          <table className="w-full border-collapse border border-slate-300 text-[9.5px] font-sans">
            <thead>
              <tr className="border-b-2 border-slate-900 text-[9px] font-bold uppercase tracking-wider text-slate-950 bg-white">
                <th className="border border-slate-300 py-2 px-1.5 text-center align-middle w-14 font-bold">No WBS</th>
                <th className="border border-slate-300 py-2 px-1.5 text-center align-middle font-bold">Uraian Kategori & Pekerjaan</th>
                <th className="border border-slate-300 py-2 px-1.5 text-center align-middle w-20 font-bold">Volume</th>
                <th className="border border-slate-300 py-2 px-1.5 text-center align-middle w-16 font-bold">Satuan</th>
                <th className="border border-slate-300 py-2 px-1.5 text-center align-middle w-28 font-bold">Harga Satuan (Rp)</th>
                <th className="border border-slate-300 py-2 px-1.5 text-center align-middle w-32 font-bold">Jumlah Biaya (Rp)</th>
              </tr>
            </thead>
            <tbody>
              {wbsItems.map((item) => {
                const level = item.wbsPath ? item.wbsPath.split('.').length - 1 : 0
                
                if (item.type === 'group') {
                  const subtotal = getGroupSubtotal(item.wbsPath)
                  return (
                    <tr key={item.id} className="bg-slate-50 font-bold text-slate-950 border-b border-slate-300">
                      <td className="border border-slate-300 py-1.5 px-1.5 text-center font-mono text-[9px]">{item.code}</td>
                      <td colSpan={4} className="border border-slate-300 py-1.5 px-1.5 uppercase text-[9px] tracking-wide" style={{ paddingLeft: `${6 + level * 12}px` }}>
                        {item.name}
                      </td>
                      <td className="border border-slate-300 py-1.5 px-1.5 text-right font-mono font-extrabold text-[9.5px]">
                        {formatCurrency(subtotal)}
                      </td>
                    </tr>
                  )
                } else {
                  const calcItem = calculation?.lineItems?.find(li => li.wbsItemId === item.id)
                  const volItem = volumes.find(v => v.wbsItemId === item.id)
                  const volume = volItem?.volume ?? 0
                  const unit = volItem?.unit || item.unit
                  let unitPrice = calcItem?.unitPrice ?? 0
                  if (!calcItem && volItem?.ahsId) {
                    const matchedAhs = ahsList.find(a => a.id === volItem.ahsId)
                    unitPrice = matchedAhs?.totalPrice ?? 0
                  }
                  const total = volume * unitPrice

                  return (
                    <tr key={item.id} className="hover:bg-slate-50/20 bg-white">
                      <td className="border border-slate-300 py-1.5 px-1.5 text-center font-mono text-[9px] text-slate-400">{item.code}</td>
                      <td className="border border-slate-300 py-1.5 px-1.5 text-slate-800 font-normal leading-tight" style={{ paddingLeft: `${6 + level * 12}px` }}>{item.name}</td>
                      <td className="border border-slate-300 py-1.5 px-1.5 text-right font-mono">{volume}</td>
                      <td className="border border-slate-300 py-1.5 px-1.5 text-center font-medium text-slate-500">{unit || '-'}</td>
                      <td className="border border-slate-300 py-1.5 px-1.5 text-right font-mono text-slate-500">{formatCurrency(unitPrice)}</td>
                      <td className="border border-slate-300 py-1.5 px-1.5 text-right font-mono font-semibold text-slate-800">{formatCurrency(total)}</td>
                    </tr>
                  )
                }
              })}
              <tr className="font-semibold border-t border-slate-300 bg-white">
                <td colSpan={5} className="border border-slate-300 py-1.5 px-1.5 text-right uppercase text-[8.5px] tracking-wider text-slate-400">Subtotal Pekerjaan:</td>
                <td className="border border-slate-300 py-1.5 px-1.5 text-right font-mono text-slate-700 text-[9.5px]">{formatCurrency(totalPrice)}</td>
              </tr>
              <tr className="font-semibold bg-white">
                <td colSpan={5} className="border border-slate-300 py-1.5 px-1.5 text-right uppercase text-[8.5px] tracking-wider text-slate-400">PPN ({ppn}%):</td>
                <td className="border border-slate-300 py-1.5 px-1.5 text-right font-mono text-slate-700 text-[9.5px]">{formatCurrency(ppnAmount)}</td>
              </tr>
              <tr className="font-semibold bg-white">
                <td colSpan={5} className="border border-slate-300 py-1.5 px-1.5 text-right uppercase text-[8.5px] tracking-wider text-slate-400">Overhead & Profit ({overhead}%):</td>
                <td className="border border-slate-300 py-1.5 px-1.5 text-right font-mono text-slate-700 text-[9.5px]">{formatCurrency(overheadAmount)}</td>
              </tr>
              <tr className="font-semibold bg-white">
                <td colSpan={5} className="border border-slate-300 py-1.5 px-1.5 text-right uppercase text-[8.5px] tracking-wider text-slate-400">Grand Total RAB:</td>
                <td className="border border-slate-300 py-1.5 px-1.5 text-right font-mono text-slate-700 text-[9.5px]">{formatCurrency(grandTotal)}</td>
              </tr>
              <tr className="font-semibold bg-white">
                <td colSpan={5} className="border border-slate-300 py-1.5 px-1.5 text-right uppercase text-[8.5px] tracking-wider text-slate-400">Pembulatan:</td>
                <td className="border border-slate-300 py-1.5 px-1.5 text-right font-mono text-slate-700 text-[9.5px]">{formatCurrency(roundedGrandTotal - grandTotal)}</td>
              </tr>
              <tr className="font-bold bg-white border-t border-slate-900 border-b-double border-b-[3px] border-b-slate-950">
                <td colSpan={5} className="border border-slate-300 py-2 px-1.5 text-right uppercase tracking-wider text-[9px] text-slate-950">Grand Total Dibulatkan:</td>
                <td className="border border-slate-300 py-2 px-1.5 text-right font-mono text-slate-950 font-extrabold text-[11px]">{formatCurrency(roundedGrandTotal)}</td>
              </tr>
              <tr className="bg-white">
                <td colSpan={6} className="border border-slate-300 py-2 px-2.5 text-left font-sans text-[9px]">
                  <span className="font-bold text-slate-950 uppercase tracking-wider text-[8px]">Terbilang:</span>{" "}
                  <span className="italic font-semibold text-slate-950 capitalize ml-1">{getTerbilang(roundedGrandTotal)}</span>
                </td>
              </tr>
            </tbody>
          </table>
          {renderPrintFooter()}
        </section>

        {/* SECTION 3: ANALISIS BOBOT PEKERJAAN & JADWAL KURVA S */}
        <section className="print-page border-b border-slate-200 pb-8" style={{ pageBreakBefore: 'always' }}>
          {renderPrintHeader("ANALISIS BOBOT PEKERJAAN & KURVA S JADWAL RENCANA")}
          {renderAnalisisKurvaS(true)}
          {renderPrintFooter()}
        </section>

        {/* SECTION 4: LEMBAR ANALISA */}
        <section className="print-page page-break border-b border-slate-200 pb-8" style={{ pageBreakBefore: 'always' }}>
          {renderPrintHeader("LEMBAR ANALISA HARGA SATUAN PEKERJAAN (AHSP)")}
          <div className="space-y-6">
            {detailedAhsList.map(data => (
              <div key={data.ahs.id} className="border border-slate-300 p-3 rounded bg-white page-break-inside-avoid">
                <h3 className="font-bold border-b-2 border-slate-900 pb-1.5 mb-2 text-slate-950 text-[10.5px] uppercase tracking-wide">
                  Kode AHSP: {data.ahs.code} &bull; Pekerjaan: {data.ahs.name} (per {data.ahs.unit})
                </h3>
                <table className="w-full border-collapse border border-slate-300 text-[9px]">
                  <thead>
                    <tr className="border-b border-slate-400 text-slate-950 text-[8.5px] font-bold uppercase tracking-wider bg-white">
                      <th className="border border-slate-300 py-1.5 px-1 text-center align-middle w-8 font-bold">No</th>
                      <th className="border border-slate-300 py-1.5 px-1 text-center align-middle font-bold">Komponen Analisa</th>
                      <th className="border border-slate-300 py-1.5 px-1 text-center align-middle w-14 font-bold">Satuan</th>
                      <th className="border border-slate-300 py-1.5 px-1 text-center align-middle w-16 font-bold">Koefisien</th>
                      <th className="border border-slate-300 py-1.5 px-1 text-center align-middle w-24 font-bold">Harga Satuan (Rp)</th>
                      <th className="border border-slate-300 py-1.5 px-1 text-center align-middle w-28 font-bold">Jumlah Harga (Rp)</th>
                    </tr>
                  </thead>
                  <tbody>
                    {/* Wages */}
                    {data.wages.length > 0 && (
                      <>
                        <tr>
                          <td className="border border-slate-300 py-1 px-1 text-center font-bold text-slate-400 text-[9px]">A</td>
                          <td colSpan={5} className="border border-slate-300 py-1 px-1 font-bold bg-white uppercase text-[8.5px] text-slate-500 tracking-wider">Tenaga Kerja</td>
                        </tr>
                        {data.wages.map((w, i) => (
                          <tr key={w.id} className="bg-white">
                            <td className="border border-slate-300 py-1 px-1 text-center font-mono text-slate-400">{i + 1}</td>
                            <td className="border border-slate-300 py-1 px-1 text-slate-700 font-normal">{w.wageType}</td>
                            <td className="border border-slate-300 py-1 px-1 text-center text-slate-500">{w.wageUnit}</td>
                            <td className="border border-slate-300 py-1 px-1 text-right font-mono">{w.coefficient.toFixed(4)}</td>
                            <td className="border border-slate-300 py-1 px-1 text-right font-mono text-slate-500">{formatCurrency(w.dailyWage || 0)}</td>
                            <td className="border border-slate-300 py-1 px-1 text-right font-mono text-slate-750 font-medium">{formatCurrency(w.totalPrice || 0)}</td>
                          </tr>
                        ))}
                        <tr className="font-semibold bg-white border-b border-slate-200">
                          <td colSpan={5} className="border border-slate-300 py-1 px-1 text-right text-slate-400 text-[8.5px]">Subtotal Tenaga Kerja (A):</td>
                          <td className="border border-slate-300 py-1 px-1 text-right font-mono text-slate-700">{formatCurrency(data.subtotalWages)}</td>
                        </tr>
                      </>
                    )}

                    {/* Materials */}
                    {data.materials.length > 0 && (
                      <>
                        <tr>
                          <td className="border border-slate-300 py-1 px-1 text-center font-bold text-slate-400 text-[9px]">B</td>
                          <td colSpan={5} className="border border-slate-300 py-1 px-1 font-bold bg-white uppercase text-[8.5px] text-slate-500 tracking-wider">Bahan</td>
                        </tr>
                        {data.materials.map((m, i) => (
                          <tr key={m.id} className="bg-white">
                            <td className="border border-slate-300 py-1 px-1 text-center font-mono text-slate-400">{i + 1}</td>
                            <td className="border border-slate-300 py-1 px-1 text-slate-700 font-normal">{m.materialName}</td>
                            <td className="border border-slate-300 py-1 px-1 text-center text-slate-500">{m.materialUnit}</td>
                            <td className="border border-slate-300 py-1 px-1 text-right font-mono">{m.coefficient.toFixed(4)}</td>
                            <td className="border border-slate-300 py-1 px-1 text-right font-mono text-slate-500">{formatCurrency(m.unitPrice || 0)}</td>
                            <td className="border border-slate-300 py-1 px-1 text-right font-mono text-slate-750 font-medium">{formatCurrency(m.totalPrice || 0)}</td>
                          </tr>
                        ))}
                        <tr className="font-semibold bg-white border-b border-slate-200">
                          <td colSpan={5} className="border border-slate-300 py-1 px-1 text-right text-slate-400 text-[8.5px]">Subtotal Bahan (B):</td>
                          <td className="border border-slate-300 py-1 px-1 text-right font-mono text-slate-700">{formatCurrency(data.subtotalMaterials)}</td>
                        </tr>
                      </>
                    )}

                    {/* Tools */}
                    {data.equipment.length > 0 && (
                      <>
                        <tr>
                          <td className="border border-slate-300 py-1 px-1 text-center font-bold text-slate-400 text-[9px]">C</td>
                          <td colSpan={5} className="border border-slate-300 py-1 px-1 font-bold bg-white uppercase text-[8.5px] text-slate-500 tracking-wider">Peralatan</td>
                        </tr>
                        {data.equipment.map((e, i) => (
                          <tr key={e.id} className="bg-white">
                            <td className="border border-slate-300 py-1 px-1 text-center font-mono text-slate-400">{i + 1}</td>
                            <td className="border border-slate-300 py-1 px-1 text-slate-700 font-normal">{e.equipmentName}</td>
                            <td className="border border-slate-300 py-1 px-1 text-center text-slate-500">{e.equipmentUnit}</td>
                            <td className="border border-slate-300 py-1 px-1 text-right font-mono">{e.coefficient.toFixed(4)}</td>
                            <td className="border border-slate-300 py-1 px-1 text-right font-mono text-slate-500">{formatCurrency(e.rentalPrice || 0)}</td>
                            <td className="border border-slate-300 py-1 px-1 text-right font-mono text-slate-750 font-medium">{formatCurrency(e.totalPrice || 0)}</td>
                          </tr>
                        ))}
                        <tr className="font-semibold bg-white border-b border-slate-200">
                          <td colSpan={5} className="border border-slate-300 py-1 px-1 text-right text-slate-400 text-[8.5px]">Subtotal Alat (C):</td>
                          <td className="border border-slate-300 py-1 px-1 text-right font-mono text-slate-700">{formatCurrency(data.subtotalEquipment)}</td>
                        </tr>
                      </>
                    )}

                    {/* Total breakdown */}
                    <tr className="font-semibold border-t border-slate-300 bg-white text-slate-700">
                      <td colSpan={5} className="border border-slate-300 py-1 px-1 text-right uppercase text-[8.5px]">Jumlah Biaya Komponen (A + B + C):</td>
                      <td className="border border-slate-300 py-1 px-1 text-right font-mono">{formatCurrency(data.totalComponents)}</td>
                    </tr>
                    <tr className="font-semibold bg-white text-slate-700">
                      <td colSpan={5} className="border border-slate-300 py-1 px-1 text-right uppercase text-[8.5px]">Overhead & Profit ({overhead}%):</td>
                      <td className="border border-slate-300 py-1 px-1 text-right font-mono">{formatCurrency(data.overheadAmount)}</td>
                    </tr>
                    <tr className="font-bold bg-white text-slate-950 border-t border-slate-900 border-b-double border-b-[3px] border-b-slate-950">
                      <td colSpan={5} className="border border-slate-300 py-1.5 px-1 text-right uppercase text-[8.5px] tracking-wider text-slate-950">Harga Satuan Pekerjaan (HSP):</td>
                      <td className="border border-slate-300 py-1.5 px-1 text-right font-mono text-[10px] font-extrabold text-slate-950">{formatCurrency(data.totalUnitPrice)}</td>
                    </tr>
                  </tbody>
                </table>
              </div>
            ))}
          </div>
          {renderPrintFooter()}
        </section>

        {/* SECTION 3: BOM */}
        <section className="print-page border-b border-slate-200 pb-8" style={{ pageBreakBefore: 'always' }}>
          {renderPrintHeader("BILL OF MATERIAL (BOM) REKAPITULASI")}
          <table className="w-full border-collapse border border-slate-300 text-[9.5px] font-sans">
            <thead>
              <tr className="border-b-2 border-slate-900 text-[9px] font-bold uppercase tracking-wider text-slate-950 bg-white">
                <th className="border border-slate-300 py-2 px-1.5 text-center align-middle w-10 font-bold">No</th>
                <th className="border border-slate-300 py-2 px-1.5 text-center align-middle font-bold">Deskripsi Komponen</th>
                <th className="border border-slate-300 py-2 px-1.5 text-center align-middle w-16 font-bold">Satuan</th>
                <th className="border border-slate-300 py-2 px-1.5 text-center align-middle w-28 font-bold">Total Kebutuhan</th>
                <th className="border border-slate-300 py-2 px-1.5 text-center align-middle w-32 font-bold">Harga Satuan (Rp)</th>
                <th className="border border-slate-300 py-2 px-1.5 text-center align-middle w-36 font-bold">Jumlah Biaya (Rp)</th>
              </tr>
            </thead>
            <tbody>
              {(['Bahan', 'Tenaga Kerja', 'Alat'] as const).map((cat, catIdx) => {
                const items = bomItems.filter(item => item.category === cat)
                if (items.length === 0) return null
                const catSubtotal = items.reduce((s, i) => s + i.totalPrice, 0)
                const letterCode = String.fromCharCode(65 + catIdx)

                return (
                  <React.Fragment key={cat}>
                    {/* Category Divider Header Row */}
                    <tr className="bg-white font-bold text-slate-950 border-b border-slate-300">
                      <td className="border border-slate-300 py-1.5 px-1.5 text-center font-mono text-[10px]">{letterCode}</td>
                      <td colSpan={5} className="border border-slate-300 py-1.5 px-1.5 uppercase text-[9px] tracking-wide">
                        {cat === 'Alat' ? 'Peralatan / Alat' : cat}
                      </td>
                    </tr>
                    {/* Line items for this category */}
                    {items.map((item, idx) => (
                      <tr key={item.id} className="bg-white">
                        <td className="border border-slate-300 py-1.5 px-1.5 text-center font-mono text-[9px] text-slate-400">{idx + 1}</td>
                        <td className="border border-slate-300 py-1.5 px-1.5 text-slate-800 font-normal leading-tight">{item.name}</td>
                        <td className="border border-slate-300 py-1.5 px-1.5 text-center font-medium text-slate-500">{item.unit}</td>
                        <td className="border border-slate-300 py-1.5 px-1.5 text-right font-mono">{item.quantity.toFixed(4)}</td>
                        <td className="border border-slate-300 py-1.5 px-1.5 text-right font-mono text-slate-500">{formatCurrency(item.unitPrice)}</td>
                        <td className="border border-slate-300 py-1.5 px-1.5 text-right font-mono font-semibold text-slate-800">{formatCurrency(item.totalPrice)}</td>
                      </tr>
                    ))}
                    {/* Subtotal Row */}
                    <tr className="font-semibold bg-white border-b border-slate-200">
                      <td colSpan={5} className="border border-slate-300 py-1.5 px-1.5 text-right uppercase text-[8.5px] tracking-wider text-slate-400">
                        Subtotal {cat === 'Alat' ? 'Peralatan' : cat}:
                      </td>
                      <td className="border border-slate-300 py-1.5 px-1.5 text-right font-mono text-slate-700 text-[9.5px]">
                        {formatCurrency(catSubtotal)}
                      </td>
                    </tr>
                  </React.Fragment>
                )
              })}
              {/* Grand Total */}
              <tr className="font-bold bg-white border-t border-slate-900 border-b-double border-b-[3px] border-b-slate-950">
                <td colSpan={5} className="border border-slate-300 py-2 px-1.5 text-right uppercase tracking-wider text-[9px] text-slate-700">Total Biaya Seluruh Komponen:</td>
                <td className="border border-slate-300 py-2 px-1.5 text-right font-mono text-slate-950 font-extrabold text-[11px]">{formatCurrency(bomItems.reduce((s, i) => s + i.totalPrice, 0))}</td>
              </tr>
            </tbody>
          </table>
          {renderPrintFooter()}
        </section>

        {/* SECTION 4: BACKUP VOLUME */}
        <section className="print-page pb-8" style={{ pageBreakBefore: 'always' }}>
          {renderPrintHeader("BACKUP PERHITUNGAN VOLUME PEKERJAAN")}
          <table className="w-full border-collapse border border-slate-300 text-[9.5px] font-sans">
            <thead>
              <tr className="border-b-2 border-slate-900 text-[9px] font-bold uppercase tracking-wider text-slate-950 bg-white">
                <th className="border border-slate-300 py-2 px-1.5 text-center align-middle w-14 font-bold">No WBS</th>
                <th className="border border-slate-300 py-2 px-1.5 text-center align-middle font-bold w-1/4">Uraian Kategori & Pekerjaan</th>
                <th className="border border-slate-300 py-2 px-1.5 text-center align-middle w-16 font-bold">Volume</th>
                <th className="border border-slate-300 py-2 px-1.5 text-center align-middle w-14 font-bold">Satuan</th>
                <th className="border border-slate-300 py-2 px-1.5 text-center align-middle font-bold">Rincian Perhitungan (Formula)</th>
                <th className="border border-slate-300 py-2 px-1.5 text-center align-middle font-bold w-1/4">Catatan</th>
              </tr>
            </thead>
            <tbody>
              {wbsItems.map((item) => {
                const level = item.wbsPath ? item.wbsPath.split('.').length - 1 : 0
                
                if (item.type === 'group') {
                  return (
                    <tr key={item.id} className="bg-slate-50 font-bold text-slate-950 border-b border-slate-300">
                      <td className="border border-slate-300 py-1.5 px-1.5 text-center font-mono text-[9px]">{item.code}</td>
                      <td colSpan={5} className="border border-slate-300 py-1.5 px-1.5 uppercase text-[9px] tracking-wide" style={{ paddingLeft: `${6 + level * 12}px` }}>
                        {item.name}
                      </td>
                    </tr>
                  )
                }

                const volItem = volumes.find(v => v.wbsItemId === item.id)
                const linkedVol = volItem?.projectVolumeId 
                  ? projectVolumes.find(pv => pv.id === volItem.projectVolumeId) 
                  : null

                const volume = linkedVol ? linkedVol.value : (volItem?.volume ?? 0)
                const unit = linkedVol ? linkedVol.unit : (volItem?.unit || item.unit)
                
                const formulaSrc = linkedVol ? linkedVol.formula : (volItem?.formula || '')
                const notesText = linkedVol ? linkedVol.notes : (volItem?.notes || '-')
                
                const hasBackup = formulaSrc && formulaSrc.trim().startsWith('{')
                const formulaText = hasBackup ? parseFormulaToText(formulaSrc) : (linkedVol ? `Dihubungkan ke Volume: ${linkedVol.name}` : 'Manual Input')

                return (
                  <tr key={item.id} className="bg-white">
                    <td className="border border-slate-300 py-1.5 px-1.5 text-center font-mono text-[9px] text-slate-400">{item.code}</td>
                    <td className="border border-slate-300 py-1.5 px-1.5 text-slate-800 font-normal leading-tight" style={{ paddingLeft: `${6 + level * 12}px` }}>{item.name}</td>
                    <td className="border border-slate-300 py-1.5 px-1.5 text-right font-mono">{volume}</td>
                    <td className="border border-slate-300 py-1.5 px-1.5 text-center font-medium text-slate-500">{unit || '-'}</td>
                    <td className="border border-slate-300 py-1.5 px-1.5 text-left font-mono text-[8.5px] whitespace-pre-line leading-normal">
                      {formulaText}
                    </td>
                    <td className="border border-slate-300 py-1.5 px-1.5 text-left text-slate-600 text-[8.5px] whitespace-pre-line">{notesText}</td>
                  </tr>
                )
              })}
            </tbody>
          </table>
          {renderPrintFooter()}
        </section>
      </div>

      {/* Global CSS styles for Print styling */}
      <style dangerouslySetInnerHTML={{__html: `
        @media print {
          body {
            background-color: white !important;
            color: #0f172a !important;
            padding: 0 !important;
            margin: 0 !important;
          }
          .no-print {
            display: none !important;
          }
          .print-only {
            display: block !important;
          }
          /* Custom layout overrides for print */
          .card {
            border: none !important;
            box-shadow: none !important;
            padding: 0 !important;
            margin: 0 !important;
          }
          /* Force all table cells and rows to have a solid white background only */
          table, thead, tbody, tr, th, td {
            background-color: white !important;
            background: white !important;
          }
          /* Force compact padding and height on all tables during print */
          table th, table td {
            padding-top: 3px !important;
            padding-bottom: 3px !important;
            line-height: 1.15 !important;
          }
        }
      `}} />
    </div>
  )
}
