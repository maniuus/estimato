import React, { useState, useEffect } from 'react'
import { useVolumeStore } from '../stores/volume-store'
import { useAhsStore } from '../stores/ahs-store'
import { useProjectStore } from '../stores/project-store'
import { useRabStore } from '../stores/rab-store'
import { formatCurrency } from '../lib/format'

interface BomTabProps {
  projectId: string
}

interface BomItem {
  id: string
  name: string
  category: 'Bahan' | 'Tenaga Kerja' | 'Alat'
  unit: string
  quantity: number
  unitPrice: number
  totalPrice: number
  isOverridden?: number
}

export function BomTab({ projectId }: BomTabProps): React.ReactElement {
  const { items: volumes, loadByProject: loadVolumes } = useVolumeStore()
  const { ahsList, loadLibrary } = useAhsStore()
  const { projects } = useProjectStore()
  const { calculate } = useRabStore()

  const project = projects.find(p => p.id === projectId)
  const ppn = project?.ppn ?? 11
  const overhead = project?.overhead ?? 0

  const [bomItems, setBomItems] = useState<BomItem[]>([])
  const [loading, setLoading] = useState(false)
  const [categoryFilter, setCategoryFilter] = useState<string>('all')

  // Editing state
  const [editingCellId, setEditingCellId] = useState<string | null>(null)
  const [editValue, setEditValue] = useState('')

  const calculateBOM = async () => {
    // Find active volumes (volume > 0 and has ahsId)
    const activeVolumes = volumes.filter(v => v.volume > 0 && v.ahsId)
    if (activeVolumes.length === 0) {
      setBomItems([])
      return
    }

    setLoading(true)
    try {
      const materialMap: Record<string, BomItem> = {}
      const wageMap: Record<string, BomItem> = {}
      const equipmentMap: Record<string, BomItem> = {}

      await Promise.all(
        activeVolumes.map(async v => {
          const ahsId = v.ahsId!
          const volume = v.volume

          // Fetch components for this AHS with project overrides
          const [matRes, wageRes, equipRes] = await Promise.all([
            window.api.ahs.material.getByAhs(ahsId, projectId),
            window.api.ahs.wage.getByAhs(ahsId, projectId),
            window.api.ahs.equipment.getByAhs(ahsId, projectId)
          ])

          const materials = matRes.success ? matRes.data || [] : []
          const wages = wageRes.success ? wageRes.data || [] : []
          const equipment = equipRes.success ? equipRes.data || [] : []

          // 1. Accumulate Materials
          materials.forEach(item => {
            const reqQty = item.coefficient * volume
            const matId = item.materialId
            const isOverriddenVal = (item as any).isOverridden || 0

            if (materialMap[matId]) {
              materialMap[matId].quantity += reqQty
              materialMap[matId].totalPrice = materialMap[matId].quantity * materialMap[matId].unitPrice
            } else {
              materialMap[matId] = {
                id: matId,
                name: item.materialName || 'Bahan',
                category: 'Bahan',
                unit: item.materialUnit || 'buah',
                quantity: reqQty,
                unitPrice: item.unitPrice || 0,
                totalPrice: reqQty * (item.unitPrice || 0),
                isOverridden: isOverriddenVal
              }
            }
          })

          // 2. Accumulate Wages (Labor)
          wages.forEach(item => {
            const reqQty = item.coefficient * volume
            const wId = item.wageId
            const isOverriddenVal = (item as any).isOverridden || 0

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
                totalPrice: reqQty * (item.dailyWage || 0),
                isOverridden: isOverriddenVal
              }
            }
          })

          // 3. Accumulate Equipment (Tools)
          equipment.forEach(item => {
            const reqQty = item.coefficient * volume
            const equipId = item.equipmentId
            const isOverriddenVal = (item as any).isOverridden || 0

            if (equipmentMap[equipId]) {
              equipmentMap[equipId].quantity += reqQty
              equipmentMap[equipId].totalPrice = equipmentMap[equipId].quantity * equipmentMap[equipId].unitPrice
            } else {
              equipmentMap[equipId] = {
                id: equipId,
                name: item.equipmentName || 'Alat',
                category: 'Alat',
                unit: item.equipmentUnit || 'hari',
                quantity: reqQty,
                unitPrice: item.rentalPrice || 0,
                totalPrice: reqQty * (item.rentalPrice || 0),
                isOverridden: isOverriddenVal
              }
            }
          })
        })
      )

      // Combine maps
      const combined = [
        ...Object.values(wageMap),
        ...Object.values(materialMap),
        ...Object.values(equipmentMap)
      ]

      setBomItems(combined)
    } catch (err) {
      console.error('Error generating BOM:', err)
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
      calculateBOM()
    } else {
      setBomItems([])
    }
  }, [volumes, ahsList])

  const startEdit = (itemId: string, currentPrice: number) => {
    setEditingCellId(itemId)
    setEditValue(String(currentPrice || '0'))
  }

  const handlePriceSubmit = async (item: BomItem) => {
    if (!editingCellId) return
    const value = editValue.trim()

    let category: 'Bahan' | 'Tenaga Kerja' | 'Alat' = 'Bahan'
    if (item.category === 'Tenaga Kerja') category = 'Tenaga Kerja'
    else if (item.category === 'Alat') category = 'Alat'

    if (value === '') {
      // Reset override
      await window.api.projectPrice.deleteOverride(projectId, item.id)
    } else {
      const price = parseFloat(value) || 0
      await window.api.projectPrice.override(projectId, item.id, category, price)
    }

    setEditingCellId(null)
    // Reload BOM data
    await calculateBOM()
    // Recalculate RAB
    if (project) {
      await calculate(projectId, ppn, overhead)
    }
  }

  // Filter & Sort BOM
  const filteredBom = bomItems
    .filter(item => {
      if (categoryFilter === 'all') return true
      return item.category === categoryFilter
    })
    .sort((a, b) => {
      // Sort by category first, then by name
      if (a.category !== b.category) {
        return a.category.localeCompare(b.category)
      }
      return a.name.localeCompare(b.name)
    })

  const grandTotalBOM = filteredBom.reduce((sum, item) => sum + item.totalPrice, 0)

  if (loading && bomItems.length === 0) {
    return <div className="text-center py-12 text-gray-500 text-sm">Memproses Bill of Material (BOM)...</div>
  }

  if (bomItems.length === 0) {
    return (
      <div className="card p-8 text-center text-gray-400 text-sm italic">
        Belum ada Bill of Material. Pastikan Anda sudah menginput pekerjaan dengan volume &gt; 0 pada tab Input RAB.
      </div>
    )
  }

  return (
    <div className="space-y-3.5">
      <div className="flex justify-between items-center bg-slate-50 p-2.5 px-4 rounded-xl border border-slate-200 gap-3">
        <div>
          <h3 className="text-sm font-bold text-gray-800 font-sans">Bill of Material (BOM) Dinamis</h3>
          <p className="text-[10px] text-gray-500 mt-0.5">Rangkuman total kebutuhan riil material, upah tenaga, dan peralatan dari seluruh pekerjaan proyek. Klik kolom <b>Harga Satuan</b> untuk kustomisasi harga.</p>
        </div>
        <div className="flex items-center gap-2">
          <label className="text-[10px] text-gray-600 font-bold uppercase tracking-wider">Filter:</label>
          <select 
            value={categoryFilter} 
            onChange={e => setCategoryFilter(e.target.value)}
            className="input-field py-0.5 px-2 text-[11px] w-32 border border-slate-250 bg-white rounded-lg focus:outline-none"
          >
            <option value="all">Semua Kategori</option>
            <option value="Bahan">Bahan</option>
            <option value="Tenaga Kerja">Tenaga Kerja</option>
            <option value="Alat">Alat</option>
          </select>
        </div>
      </div>

      <div className="card overflow-hidden bg-white">
        <div className="overflow-x-auto">
          <table className="w-full border-collapse">
            <thead>
              <tr className="bg-gray-50 border-b border-gray-250">
                <th className="px-2 py-1.5 text-center text-xs font-bold text-gray-500 uppercase tracking-wider w-12">No</th>
                <th className="px-2 py-1.5 text-left text-xs font-bold text-gray-500 uppercase tracking-wider w-2/5">Uraian Komponen</th>
                <th className="px-2 py-1.5 text-left text-xs font-bold text-gray-500 uppercase tracking-wider w-32">Kategori</th>
                <th className="px-2 py-1.5 text-center text-xs font-bold text-gray-500 uppercase tracking-wider w-24">Satuan</th>
                <th className="px-2 py-1.5 text-right text-xs font-bold text-gray-500 uppercase tracking-wider w-36">Total Kebutuhan</th>
                <th className="px-2 py-1.5 text-right text-xs font-bold text-gray-500 uppercase tracking-wider w-36">Harga Satuan</th>
                <th className="px-2 py-1.5 text-right text-xs font-bold text-gray-500 uppercase tracking-wider w-40">Jumlah Biaya</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {filteredBom.map((item, index) => {
                const isEditing = editingCellId === item.id
                return (
                  <tr key={item.id} className="hover:bg-gray-50/30 transition-colors">
                    <td className="px-2 py-1 text-center text-gray-400 font-mono text-xs border-b border-gray-100">{index + 1}</td>
                    <td className="px-2 py-1 font-semibold text-gray-800 border-b border-gray-100 text-xs">{item.name}</td>
                    <td className="px-2 py-1 text-left border-b border-gray-100">
                      <span className={`px-1.5 py-0.2 rounded text-[9px] font-bold ${
                        item.category === 'Bahan' 
                          ? 'bg-green-100 text-green-700' 
                          : item.category === 'Tenaga Kerja'
                          ? 'bg-blue-100 text-blue-700'
                          : 'bg-amber-100 text-amber-700'
                      }`}>
                        {item.category}
                      </span>
                    </td>
                    <td className="px-2 py-1 text-center text-gray-600 font-semibold border-b border-gray-100 text-xs">{item.unit}</td>
                    <td className="px-2 py-1 text-right font-mono font-medium border-b border-gray-100 text-xs">{item.quantity.toFixed(4)}</td>
                    <td 
                      className="px-2 py-1 text-right font-mono cursor-pointer hover:bg-amber-50 group transition-colors border-b border-gray-100 text-xs"
                      onClick={() => startEdit(item.id, item.unitPrice)}
                      title="Klik untuk mengubah harga proyek"
                    >
                      {isEditing ? (
                        <input
                          type="number"
                          value={editValue}
                          onChange={evt => setEditValue(evt.target.value)}
                          onBlur={() => handlePriceSubmit(item)}
                          onKeyDown={evt => {
                            if (evt.key === 'Enter') handlePriceSubmit(item)
                            if (evt.key === 'Escape') setEditingCellId(null)
                          }}
                          className="w-24 px-1 py-0.2 border border-primary-500 rounded text-right text-xs focus:outline-none bg-white font-mono"
                          autoFocus
                        />
                      ) : (
                        <span className={item.isOverridden ? "text-blue-600 font-bold flex items-center justify-end gap-1" : "text-gray-600 group-hover:text-primary-600 transition-colors"}>
                          {formatCurrency(item.unitPrice)}
                          {item.isOverridden === 1 && <span className="text-[9px]" title="Harga kustom proyek">✏️</span>}
                        </span>
                      )}
                    </td>
                    <td className="px-2 py-1 text-right font-mono font-bold text-gray-900 border-b border-gray-100 text-xs">{formatCurrency(item.totalPrice)}</td>
                  </tr>
                )
              })}
            </tbody>
          </table>
        </div>

        {/* Footer */}
        <div className="bg-gray-50 px-4 py-2 border-t border-gray-200 flex justify-between items-center shadow-xs">
          <span className="text-[10px] text-gray-500 italic">Total Baris Komponen: {filteredBom.length} item</span>
          <div className="text-right">
            <span className="text-[10px] text-gray-500 font-medium mr-2">Total Biaya Komponen:</span>
            <span className="text-sm font-extrabold text-primary-800 font-mono">{formatCurrency(grandTotalBOM)}</span>
          </div>
        </div>
      </div>
    </div>
  )
}
