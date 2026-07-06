import React, { useState, useEffect } from 'react'
import { useRabStore, type RabLineItem } from '../stores/rab-store'
import { useVolumeStore } from '../stores/volume-store'
import { useAhsStore } from '../stores/ahs-store'
import { useProjectStore } from '../stores/project-store'
import { useWbsStore } from '../stores/wbs-store'
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

export function LaporanPage({ projectId }: LaporanPageProps): React.ReactElement {
  const { calculation, calculate, latestSnapshot, loadLatest } = useRabStore()
  const { items: volumes, loadByProject: loadVolumes } = useVolumeStore()
  const { ahsList, loadLibrary } = useAhsStore()
  const { projects } = useProjectStore()
  const { items: wbsItems, loadByProject: loadWbs } = useWbsStore()

  const project = projects.find(p => p.id === projectId)
  const ppn = project?.ppn ?? 11
  const overhead = project?.overhead ?? 0

  const [previewTab, setPreviewTab] = useState<'rekap' | 'rab' | 'analisa' | 'bom'>('rekap')
  const [detailedAhsList, setDetailedAhsList] = useState<DetailedAhsData[]>([])
  const [bomItems, setBomItems] = useState<BomItem[]>([])
  const [loadingDetails, setLoadingDetails] = useState(false)
  const [exporting, setExporting] = useState(false)
  const [exportingPdf, setExportingPdf] = useState(false)

  useEffect(() => {
    loadVolumes(projectId)
    loadWbs(projectId)
    loadLibrary()
    loadLatest(projectId)
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

  // Build sequential report groups
  const categories = wbsItems.filter(i => i.type === 'group')
  categories.sort((a, b) => a.sortOrder - b.sortOrder)

  interface ReportGroup {
    category: WbsItem | null
    displayCode: string
    lineItems: RabLineItem[]
  }

  const reportGroups: ReportGroup[] = []

  categories.forEach((cat, gIndex) => {
    const displayCode = String(gIndex + 1)
    const childWbs = wbsItems.filter(i => i.type === 'item' && i.parentId === cat.id)
    childWbs.sort((a, b) => a.sortOrder - b.sortOrder)

    const childLineItems: RabLineItem[] = []
    childWbs.forEach((wbs, rIndex) => {
      const calcItem = calculation?.lineItems?.find(li => li.wbsItemId === wbs.id)
      if (calcItem) {
        childLineItems.push({
          ...calcItem,
          wbsCode: `${displayCode}.${rIndex + 1}`
        })
      }
    })

    if (childLineItems.length > 0) {
      reportGroups.push({
        category: cat,
        displayCode,
        lineItems: childLineItems
      })
    }
  })

  const uncatWbs = wbsItems.filter(i => i.type === 'item' && (i.parentId === null || i.parentId === undefined))
  uncatWbs.sort((a, b) => a.sortOrder - b.sortOrder)

  const uncatLineItems: RabLineItem[] = []
  uncatWbs.forEach((wbs, rIndex) => {
    const calcItem = calculation?.lineItems?.find(li => li.wbsItemId === wbs.id)
    if (calcItem) {
      uncatLineItems.push({
        ...calcItem,
        wbsCode: String(rIndex + 1)
      })
    }
  })

  if (uncatLineItems.length > 0) {
    reportGroups.push({
      category: null,
      displayCode: '-',
      lineItems: uncatLineItems
    })
  }

  const handleExportExcel = async () => {
    if (!project || !calculation) return
    setExporting(true)

    const result = await window.api.rab.exportExcel({
      projectName: project.name,
      location: project.location,
      year: project.year,
      ppn,
      overhead,
      lineItems: reportGroups.flatMap(g => g.lineItems), // Exports WBS grouped line items with dynamic codes
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
                  {reportGroups.map((group) => {
                    const catName = group.category ? group.category.name : 'Tanpa Kategori'
                    const catTotal = group.lineItems.reduce((sum, item) => sum + item.totalPrice, 0)
                    return (
                      <tr key={group.category ? group.category.id : 'uncategorized'}>
                        <td className="table-cell text-center font-mono text-xs">{group.category ? group.displayCode : '-'}</td>
                        <td className="table-cell font-semibold text-gray-800 uppercase text-xs tracking-wide">{catName}</td>
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
                  {reportGroups.map((group) => (
                    <React.Fragment key={group.category ? group.category.id : 'uncategorized'}>
                      {/* Category row */}
                      <tr className="bg-slate-100/60 font-bold text-slate-800 text-xs">
                        <td className="px-4 py-2 font-mono text-center">{group.category ? group.displayCode : '-'}</td>
                        <td colSpan={4} className="px-4 py-2 uppercase tracking-wider">
                          {group.category ? group.category.name : 'Tanpa Kategori'}
                        </td>
                        <td className="px-4 py-2 text-right font-mono font-bold">
                          {formatCurrency(group.lineItems.reduce((sum, item) => sum + item.totalPrice, 0))}
                        </td>
                      </tr>
                      {/* Line item rows */}
                      {group.lineItems.map((item) => (
                        <tr key={item.wbsItemId}>
                          <td className="table-cell text-center text-gray-400 font-mono text-xs">{item.wbsCode}</td>
                          <td className="table-cell font-medium text-gray-800">{item.wbsName}</td>
                          <td className="table-cell text-right font-mono">{item.volume}</td>
                          <td className="table-cell text-center text-gray-600 font-semibold">{item.unit}</td>
                          <td className="table-cell text-right font-mono text-gray-600">{formatCurrency(item.unitPrice)}</td>
                          <td className="table-cell text-right font-mono font-bold text-gray-900">{formatCurrency(item.totalPrice)}</td>
                        </tr>
                      ))}
                    </React.Fragment>
                  ))}
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
        </div>
      </div>

      {/* PRINT-ONLY COMPILATION WORKBOOK LAYOUT */}
      <div className="print-only hidden space-y-10 text-slate-800 font-sans leading-relaxed text-[9.5px]">
        {/* SECTION 1: REKAPITULASI */}
        <section className="print-page border-b border-slate-200 pb-8">
          <div className="text-center border-b-2 border-slate-900 pb-3 mb-5">
            <h1 className="text-[14px] font-extrabold tracking-widest uppercase text-slate-950">REKAPITULASI RENCANA ANGGARAN BIAYA</h1>
            <div className="text-[9px] font-medium tracking-widest text-slate-500 uppercase mt-1">
              Proyek: {project?.name} &bull; Lokasi: {project?.location} &bull; Tahun: {project?.year}
            </div>
          </div>
          <table className="w-full border-collapse border border-slate-300 text-[9.5px] font-sans">
            <thead>
              <tr className="border-b-2 border-slate-900 text-[9px] font-bold uppercase tracking-wider text-slate-950 bg-white">
                <th className="border border-slate-300 py-2 px-1.5 text-center align-middle w-16 font-bold">No</th>
                <th className="border border-slate-300 py-2 px-1.5 text-center align-middle font-bold">Kategori Pekerjaan</th>
                <th className="border border-slate-300 py-2 px-1.5 text-center align-middle w-40 font-bold">Jumlah Biaya (Rp)</th>
              </tr>
            </thead>
            <tbody>
              {reportGroups.map((group) => {
                const catName = group.category ? group.category.name : 'Tanpa Kategori'
                const catTotal = group.lineItems.reduce((sum, item) => sum + item.totalPrice, 0)
                return (
                  <tr key={group.category ? group.category.id : 'uncategorized'} className="bg-white">
                    <td className="border border-slate-300 py-1.5 px-1.5 text-center font-mono text-[9px] text-slate-500">{group.category ? group.displayCode : '-'}</td>
                    <td className="border border-slate-300 py-1.5 px-1.5 font-bold text-slate-950 uppercase text-[9px] tracking-wide">{catName}</td>
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
        </section>

        {/* SECTION 2: RAB */}
        <section className="print-page border-b border-slate-200 pb-8" style={{ pageBreakBefore: 'always' }}>
          <div className="text-center border-b-2 border-slate-900 pb-3 mb-5">
            <h1 className="text-[14px] font-extrabold tracking-widest uppercase text-slate-950">RENCANA ANGGARAN BIAYA (RAB)</h1>
            <div className="text-[9px] font-medium tracking-widest text-slate-500 uppercase mt-1">
              Proyek: {project?.name} &bull; Lokasi: {project?.location} &bull; Tahun: {project?.year}
            </div>
          </div>
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
              {reportGroups.map((group) => (
                <React.Fragment key={group.category ? group.category.id : 'uncategorized'}>
                  <tr className="bg-white font-bold text-slate-950 border-b border-slate-300">
                    <td className="border border-slate-300 py-1.5 px-1.5 text-center font-mono text-[10px]">{group.category ? group.displayCode : '-'}</td>
                    <td colSpan={4} className="border border-slate-300 py-1.5 px-1.5 uppercase text-[9px] tracking-wide">
                      {group.category ? group.category.name : 'Tanpa Kategori'}
                    </td>
                    <td className="border border-slate-300 py-1.5 px-1.5 text-right font-mono font-extrabold text-[10px]">
                      {formatCurrency(group.lineItems.reduce((sum, item) => sum + item.totalPrice, 0))}
                    </td>
                  </tr>
                  {group.lineItems.map((item) => (
                    <tr key={item.wbsItemId} className="hover:bg-slate-50/20 bg-white">
                      <td className="border border-slate-300 py-1.5 px-1.5 text-center font-mono text-[9px] text-slate-400">{item.wbsCode}</td>
                      <td className="border border-slate-300 py-1.5 px-1.5 text-slate-800 font-normal leading-tight">{item.wbsName}</td>
                      <td className="border border-slate-300 py-1.5 px-1.5 text-right font-mono">{item.volume}</td>
                      <td className="border border-slate-300 py-1.5 px-1.5 text-center font-medium text-slate-500">{item.unit}</td>
                      <td className="border border-slate-300 py-1.5 px-1.5 text-right font-mono text-slate-500">{formatCurrency(item.unitPrice)}</td>
                      <td className="border border-slate-300 py-1.5 px-1.5 text-right font-mono font-semibold text-slate-800">{formatCurrency(item.totalPrice)}</td>
                    </tr>
                  ))}
                </React.Fragment>
              ))}
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
        </section>

        {/* SECTION 2: LEMBAR ANALISA */}
        <section className="print-page page-break border-b border-slate-200 pb-8" style={{ pageBreakBefore: 'always' }}>
          <div className="text-center border-b-2 border-slate-900 pb-3 mb-5">
            <h1 className="text-[14px] font-extrabold tracking-widest uppercase text-slate-950">LEMBAR ANALISA HARGA SATUAN PEKERJAAN (AHSP)</h1>
            <div className="text-[9px] font-medium tracking-widest text-slate-500 uppercase mt-1">Proyek: {project?.name}</div>
          </div>
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
        </section>

        {/* SECTION 3: BOM */}
        <section className="print-page border-b border-slate-200 pb-8" style={{ pageBreakBefore: 'always' }}>
          <div className="text-center border-b-2 border-slate-900 pb-3 mb-5">
            <h1 className="text-[14px] font-extrabold tracking-widest uppercase text-slate-950">BILL OF MATERIAL (BOM) REKAPITULASI</h1>
            <div className="text-[9px] font-medium tracking-widest text-slate-500 uppercase mt-1">Proyek: {project?.name} &bull; Kebutuhan Kumulatif</div>
          </div>
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
        }
      `}} />
    </div>
  )
}
