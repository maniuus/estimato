import React, { useState, useEffect } from 'react'
import { useVolumeStore } from '../stores/volume-store'
import { useAhsStore } from '../stores/ahs-store'
import { useProjectStore } from '../stores/project-store'
import { useRabStore } from '../stores/rab-store'
import { formatCurrency } from '../lib/format'
import type { Ahs, AhsComponentMaterial, AhsComponentWage, AhsComponentEquipment } from '../types/models'

interface AhsAnalisaTabProps {
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

export function AhsAnalisaTab({ projectId }: AhsAnalisaTabProps): React.ReactElement {
  const { items: volumes, loadByProject: loadVolumes } = useVolumeStore()
  const { ahsList, loadLibrary } = useAhsStore()
  const { projects } = useProjectStore()
  const { calculate } = useRabStore()

  const project = projects.find(p => p.id === projectId)
  const overhead = project?.overhead ?? 0

  const [detailedAhsList, setDetailedAhsList] = useState<DetailedAhsData[]>([])
  const [loading, setLoading] = useState(false)

  // Inline editing state
  const [editingCell, setEditingCell] = useState<{ id: string; category: 'Bahan' | 'Tenaga Kerja' | 'Alat'; componentId: string } | null>(null)
  const [editValue, setEditValue] = useState('')

  const fetchAllComponents = async () => {
    // Get unique ahsIds used in this project's volumes
    const uniqueAhsIds = Array.from(
      new Set(
        volumes
          .map(v => v.ahsId)
          .filter((id): id is string => id !== null && id !== '')
      )
    )

    if (uniqueAhsIds.length === 0) {
      setDetailedAhsList([])
      return
    }

    setLoading(true)
    try {
      const details: DetailedAhsData[] = await Promise.all(
        uniqueAhsIds.map(async id => {
          // Find AHS metadata
          let ahs = ahsList.find(a => a.id === id)
          if (!ahs) {
            const res = await window.api.ahs.getById(id)
            ahs = res.success ? res.data || undefined : undefined
          }

          if (!ahs) {
            throw new Error(`AHS dengan ID ${id} tidak ditemukan`)
          }

          // Fetch components with project-specific overrides
          const [matRes, wageRes, equipRes] = await Promise.all([
            window.api.ahs.material.getByAhs(id, projectId),
            window.api.ahs.wage.getByAhs(id, projectId),
            window.api.ahs.equipment.getByAhs(id, projectId)
          ])

          const materials = matRes.success ? matRes.data || [] : []
          const wages = wageRes.success ? wageRes.data || [] : []
          const equipment = equipRes.success ? equipRes.data || [] : []

          // Calculate subtotals
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
    } catch (err) {
      console.error('Error fetching AHS components:', err)
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    loadVolumes(projectId)
    loadLibrary()
  }, [projectId])

  useEffect(() => {
    if (volumes.length > 0 && ahsList.length > 0) {
      fetchAllComponents()
    } else {
      setDetailedAhsList([])
    }
  }, [volumes, ahsList, overhead])

  const startEdit = (id: string, category: 'Bahan' | 'Tenaga Kerja' | 'Alat', componentId: string, currentPrice: number) => {
    setEditingCell({ id, category, componentId })
    setEditValue(String(currentPrice || '0'))
  }

  const handlePriceSubmit = async (componentId: string, category: 'Bahan' | 'Tenaga Kerja' | 'Alat') => {
    if (!editingCell) return
    const value = editValue.trim()

    if (value === '') {
      // Reset override
      await window.api.projectPrice.deleteOverride(projectId, componentId)
    } else {
      const price = parseFloat(value) || 0
      await window.api.projectPrice.override(projectId, componentId, category, price)
    }

    setEditingCell(null)
    // Reload state
    await fetchAllComponents()
    // Recalculate RAB snaps
    if (project) {
      await calculate(projectId, project.ppn, project.overhead)
    }
  }

  if (loading && detailedAhsList.length === 0) {
    return <div className="text-center py-12 text-gray-500 text-sm">Memproses lembar analisa...</div>
  }

  if (detailedAhsList.length === 0) {
    return (
      <div className="card p-8 text-center text-gray-400 text-sm italic">
        Belum ada analisa harga satuan. Silakan pilih referensi AHS pada tab Input RAB terlebih dahulu.
      </div>
    )
  }

  return (
    <div className="space-y-4 w-full">
      <div className="flex justify-between items-center bg-slate-50 p-2.5 px-4 rounded-xl border border-slate-200 gap-3">
        <div>
          <h3 className="text-sm font-bold text-gray-800 font-sans">Lembar Analisa Harga Satuan Pekerjaan (AHSP)</h3>
          <p className="text-[10px] text-gray-500 mt-0.5">Analisis rinci untuk setiap pekerjaan konstruksi yang digunakan dalam proyek. Klik pada kolom <b>Harga Satuan (Rp)</b> untuk kustomisasi harga.</p>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        {detailedAhsList.map(({
          ahs,
          materials,
          wages,
          equipment,
          subtotalWages,
          subtotalMaterials,
          subtotalEquipment,
          totalComponents,
          overheadAmount,
          totalUnitPrice
        }) => (
          <div key={ahs.id} className="card overflow-hidden border border-gray-200 shadow-xs bg-white">
            {/* Header Banner */}
            <div className="bg-primary-900 text-white px-3 py-1.5 flex justify-between items-center">
              <div>
                <span className="font-mono text-[9px] text-primary-200 font-semibold block uppercase tracking-wider">KODE AHS: {ahs.code}</span>
                <h4 className="text-xs font-bold leading-tight">{ahs.name}</h4>
              </div>
              <div className="text-right">
                <span className="text-[9px] text-primary-200 block uppercase tracking-wider">Harga Satuan (/{ahs.unit})</span>
                <span className="text-sm font-extrabold font-mono text-amber-350">{formatCurrency(totalUnitPrice)}</span>
              </div>
            </div>

            {/* Analysis Table */}
            <table className="w-full border-collapse">
              <thead>
                <tr className="bg-gray-50 border-b border-gray-250">
                  <th className="px-2 py-1 text-center text-xs font-bold text-gray-500 uppercase tracking-wider w-12 border-b border-gray-200">No</th>
                  <th className="px-2 py-1 text-left text-xs font-bold text-gray-500 uppercase tracking-wider w-2/5 border-b border-gray-200">Uraian Komponen</th>
                  <th className="px-2 py-1 text-center text-xs font-bold text-gray-500 uppercase tracking-wider w-20 border-b border-gray-200">Satuan</th>
                  <th className="px-2 py-1 text-right text-xs font-bold text-gray-500 uppercase tracking-wider w-28 border-b border-gray-200">Koefisien</th>
                  <th className="px-2 py-1 text-right text-xs font-bold text-gray-500 uppercase tracking-wider w-36 border-b border-gray-200">Harga Satuan (Rp)</th>
                  <th className="px-2 py-1 text-right text-xs font-bold text-gray-500 uppercase tracking-wider w-40 border-b border-gray-200">Jumlah Harga (Rp)</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {/* A. TENAGA KERJA */}
                <tr className="bg-blue-50/40 font-bold">
                  <td className="px-2 py-0.5 font-mono text-xs text-blue-700">A</td>
                  <td colSpan={5} className="px-2 py-0.5 text-xs text-blue-800 uppercase tracking-wider">TENAGA KERJA</td>
                </tr>
                {wages.length === 0 ? (
                  <tr className="bg-white">
                    <td className="px-2 py-0.5 text-center text-gray-400 font-mono text-xs border-b border-gray-100">-</td>
                    <td colSpan={5} className="px-2 py-0.5 text-xs text-gray-400 italic border-b border-gray-100">Tidak ada tenaga kerja</td>
                  </tr>
                ) : (
                  wages.map((w: any, i) => {
                    const isEditing = editingCell?.id === w.id
                    return (
                      <tr key={w.id} className="hover:bg-gray-50/30 transition-colors bg-white">
                        <td className="px-2 py-0.5 text-center text-gray-400 font-mono text-xs border-b border-gray-100">{i + 1}</td>
                        <td className="px-2 py-0.5 text-gray-700 font-medium border-b border-gray-100 text-xs">{w.wageType}</td>
                        <td className="px-2 py-0.5 text-center text-gray-600 font-semibold border-b border-gray-100 text-xs">{w.wageUnit}</td>
                        <td className="px-2 py-0.5 text-right font-mono border-b border-gray-100 text-xs">{w.coefficient.toFixed(4)}</td>
                        <td 
                          className="px-2 py-0.5 text-right font-mono cursor-pointer hover:bg-amber-50 group transition-colors border-b border-gray-100 text-xs"
                          onClick={() => startEdit(w.id, 'Tenaga Kerja', w.wageId, w.dailyWage)}
                          title="Klik untuk mengubah harga proyek"
                        >
                          {isEditing ? (
                            <input
                              type="number"
                              value={editValue}
                              onChange={e => setEditValue(e.target.value)}
                              onBlur={() => handlePriceSubmit(w.wageId, 'Tenaga Kerja')}
                              onKeyDown={e => {
                                if (e.key === 'Enter') handlePriceSubmit(w.wageId, 'Tenaga Kerja')
                                if (e.key === 'Escape') setEditingCell(null)
                              }}
                              className="w-24 px-1 py-0.2 border border-primary-500 rounded text-right text-xs focus:outline-none bg-white font-mono"
                              autoFocus
                            />
                          ) : (
                            <span className={w.isOverridden ? "text-blue-600 font-bold flex items-center justify-end gap-1" : "text-gray-700 group-hover:text-primary-600 transition-colors"}>
                              {formatCurrency(w.dailyWage || 0)}
                              {w.isOverridden === 1 && <span className="text-[9px]" title="Harga kustom proyek">✏️</span>}
                            </span>
                          )}
                        </td>
                        <td className="px-2 py-0.5 text-right font-mono font-medium border-b border-gray-100 text-xs">{formatCurrency(w.totalPrice || 0)}</td>
                      </tr>
                    )
                  })
                )}
                <tr className="bg-gray-50/30 font-bold text-gray-700">
                  <td colSpan={5} className="px-2 py-0.5 text-[10px] text-right uppercase border-b border-gray-100">Subtotal Tenaga Kerja (A)</td>
                  <td className="px-2 py-0.5 text-right font-mono text-blue-800 border-b border-gray-100 text-xs">{formatCurrency(subtotalWages)}</td>
                </tr>

                {/* B. BAHAN */}
                <tr className="bg-green-50/40 font-bold">
                  <td className="px-2 py-0.5 font-mono text-xs text-green-700">B</td>
                  <td colSpan={5} className="px-2 py-0.5 text-xs text-green-800 uppercase tracking-wider">BAHAN</td>
                </tr>
                {materials.length === 0 ? (
                  <tr className="bg-white">
                    <td className="px-2 py-0.5 text-center text-gray-400 font-mono text-xs border-b border-gray-100">-</td>
                    <td colSpan={5} className="px-2 py-0.5 text-xs text-gray-400 italic border-b border-gray-100">Tidak ada bahan</td>
                  </tr>
                ) : (
                  materials.map((m: any, i) => {
                    const isEditing = editingCell?.id === m.id
                    return (
                      <tr key={m.id} className="hover:bg-gray-50/30 transition-colors bg-white">
                        <td className="px-2 py-0.5 text-center text-gray-400 font-mono text-xs border-b border-gray-100">{i + 1}</td>
                        <td className="px-2 py-0.5 text-gray-700 font-medium border-b border-gray-100 text-xs">{m.materialName}</td>
                        <td className="px-2 py-0.5 text-center text-gray-600 font-semibold border-b border-gray-100 text-xs">{m.materialUnit}</td>
                        <td className="px-2 py-0.5 text-right font-mono border-b border-gray-100 text-xs">{m.coefficient.toFixed(4)}</td>
                        <td 
                          className="px-2 py-0.5 text-right font-mono cursor-pointer hover:bg-amber-50 group transition-colors border-b border-gray-100 text-xs"
                          onClick={() => startEdit(m.id, 'Bahan', m.materialId, m.unitPrice)}
                          title="Klik untuk mengubah harga proyek"
                        >
                          {isEditing ? (
                            <input
                              type="number"
                              value={editValue}
                              onChange={e => setEditValue(e.target.value)}
                              onBlur={() => handlePriceSubmit(m.materialId, 'Bahan')}
                              onKeyDown={e => {
                                if (e.key === 'Enter') handlePriceSubmit(m.materialId, 'Bahan')
                                if (e.key === 'Escape') setEditingCell(null)
                              }}
                              className="w-24 px-1 py-0.2 border border-primary-500 rounded text-right text-xs focus:outline-none bg-white font-mono"
                              autoFocus
                            />
                          ) : (
                            <span className={m.isOverridden ? "text-blue-600 font-bold flex items-center justify-end gap-1" : "text-gray-700 group-hover:text-primary-600 transition-colors"}>
                              {formatCurrency(m.unitPrice || 0)}
                              {m.isOverridden === 1 && <span className="text-[9px]" title="Harga kustom proyek">✏️</span>}
                            </span>
                          )}
                        </td>
                        <td className="px-2 py-0.5 text-right font-mono font-medium border-b border-gray-100 text-xs">{formatCurrency(m.totalPrice || 0)}</td>
                      </tr>
                    )
                  })
                )}
                <tr className="bg-gray-50/30 font-bold text-gray-700">
                  <td colSpan={5} className="px-2 py-0.5 text-[10px] text-right uppercase border-b border-gray-100">Subtotal Bahan (B)</td>
                  <td className="px-2 py-0.5 text-right font-mono text-green-800 border-b border-gray-100 text-xs">{formatCurrency(subtotalMaterials)}</td>
                </tr>

                {/* C. ALAT */}
                <tr className="bg-amber-50/40 font-bold">
                  <td className="px-2 py-0.5 font-mono text-xs text-amber-700">C</td>
                  <td colSpan={5} className="px-2 py-0.5 text-xs text-amber-800 uppercase tracking-wider">ALAT</td>
                </tr>
                {equipment.length === 0 ? (
                  <tr className="bg-white">
                    <td className="px-2 py-0.5 text-center text-gray-400 font-mono text-xs border-b border-gray-100">-</td>
                    <td colSpan={5} className="px-2 py-0.5 text-xs text-gray-400 italic border-b border-gray-100">Tidak ada alat</td>
                  </tr>
                ) : (
                  equipment.map((e: any, i) => {
                    const isEditing = editingCell?.id === e.id
                    return (
                      <tr key={e.id} className="hover:bg-gray-50/30 transition-colors bg-white">
                        <td className="px-2 py-0.5 text-center text-gray-400 font-mono text-xs border-b border-gray-100">{i + 1}</td>
                        <td className="px-2 py-0.5 text-gray-700 font-medium border-b border-gray-100 text-xs">{e.equipmentName}</td>
                        <td className="px-2 py-0.5 text-center text-gray-600 font-semibold border-b border-gray-100 text-xs">{e.equipmentUnit}</td>
                        <td className="px-2 py-0.5 text-right font-mono border-b border-gray-100 text-xs">{e.coefficient.toFixed(4)}</td>
                        <td 
                          className="px-2 py-0.5 text-right font-mono cursor-pointer hover:bg-amber-50 group transition-colors border-b border-gray-100 text-xs"
                          onClick={() => startEdit(e.id, 'Alat', e.equipmentId, e.rentalPrice)}
                          title="Klik untuk mengubah harga proyek"
                        >
                          {isEditing ? (
                            <input
                              type="number"
                              value={editValue}
                              onChange={evt => setEditValue(evt.target.value)}
                              onBlur={() => handlePriceSubmit(e.equipmentId, 'Alat')}
                              onKeyDown={evt => {
                                if (evt.key === 'Enter') handlePriceSubmit(e.equipmentId, 'Alat')
                                if (evt.key === 'Escape') setEditingCell(null)
                              }}
                              className="w-24 px-1 py-0.2 border border-primary-500 rounded text-right text-xs focus:outline-none bg-white font-mono"
                              autoFocus
                            />
                          ) : (
                            <span className={e.isOverridden ? "text-blue-600 font-bold flex items-center justify-end gap-1" : "text-gray-700 group-hover:text-primary-600 transition-colors"}>
                              {formatCurrency(e.rentalPrice || 0)}
                              {e.isOverridden === 1 && <span className="text-[9px]" title="Harga kustom proyek">✏️</span>}
                            </span>
                          )}
                        </td>
                        <td className="px-2 py-0.5 text-right font-mono font-medium border-b border-gray-100 text-xs">{formatCurrency(e.totalPrice || 0)}</td>
                      </tr>
                    )
                  })
                )}
                <tr className="bg-gray-50/30 font-bold text-gray-700">
                  <td colSpan={5} className="px-2 py-0.5 text-[10px] text-right uppercase border-b border-gray-100">Subtotal Alat (C)</td>
                  <td className="px-2 py-0.5 text-right font-mono text-amber-800 border-b border-gray-100 text-xs">{formatCurrency(subtotalEquipment)}</td>
                </tr>

                {/* SUMMARY BLOCK */}
                <tr className="border-t border-gray-300 font-bold bg-slate-50/20">
                  <td colSpan={5} className="px-2 py-0.5 text-[10px] text-right uppercase tracking-wider border-b border-gray-100">Jumlah Harga Tenaga, Bahan dan Alat (A + B + C)</td>
                  <td className="px-2 py-0.5 text-right font-mono text-gray-900 border-b border-gray-100 text-xs">{formatCurrency(totalComponents)}</td>
                </tr>
                <tr className="font-bold text-gray-605 bg-slate-50/20">
                  <td colSpan={5} className="px-2 py-0.5 text-[10px] text-right uppercase tracking-wider border-b border-gray-100">Overhead & Profit ({overhead}%)</td>
                  <td className="px-2 py-0.5 text-right font-mono border-b border-gray-100 text-xs">{formatCurrency(overheadAmount)}</td>
                </tr>
                <tr className="bg-amber-100/35 font-extrabold text-primary-900 border-t border-primary-200">
                  <td colSpan={5} className="px-2 py-1 text-[10px] text-right uppercase tracking-wider">Harga Satuan Pekerjaan (HSP)</td>
                  <td className="px-2 py-1 text-right font-mono text-sm">{formatCurrency(totalUnitPrice)}</td>
                </tr>
              </tbody>
            </table>
          </div>
        ))}
      </div>
    </div>
  )
}
