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
    return <div className="text-center py-12 text-gray-500">Memproses Bill of Material (BOM)...</div>
  }

  if (bomItems.length === 0) {
    return (
      <div className="card p-8 text-center text-gray-400 text-sm italic">
        Belum ada Bill of Material. Pastikan Anda sudah menginput pekerjaan dengan volume &gt; 0 pada tab Input RAB.
      </div>
    )
  }

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h3 className="text-lg font-bold text-gray-900 font-sans">Bill of Material (BOM) Dinamis</h3>
          <p className="text-xs text-gray-500 mt-0.5">Rangkuman total kebutuhan riil material, upah tenaga, dan peralatan dari seluruh pekerjaan proyek. Klik pada kolom <b>Harga Satuan</b> untuk mengubah harga khusus proyek.</p>
        </div>
        <div className="flex items-center gap-3">
          <label className="text-xs text-gray-600 font-medium">Filter Kategori:</label>
          <select 
            value={categoryFilter} 
            onChange={e => setCategoryFilter(e.target.value)}
            className="input-field py-1 px-3 text-xs w-36"
          >
            <option value="all">Semua Kategori</option>
            <option value="Bahan">Bahan</option>
            <option value="Tenaga Kerja">Tenaga Kerja</option>
            <option value="Alat">Alat</option>
          </select>
        </div>
      </div>

      <div className="card min-h-[550px] flex flex-col justify-between overflow-hidden">
        <div className="overflow-x-auto flex-1">
          <table className="w-full text-sm">
            <thead>
              <tr className="bg-gray-50 border-b border-gray-200">
                <th className="table-header w-12 text-center">No</th>
                <th className="table-header w-2/5 text-left">Uraian Komponen</th>
                <th className="table-header w-32 text-left">Kategori</th>
                <th className="table-header w-24 text-center">Satuan</th>
                <th className="table-header w-36 text-right">Total Kebutuhan</th>
                <th className="table-header w-36 text-right">Harga Satuan</th>
                <th className="table-header w-40 text-right">Jumlah Biaya</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {filteredBom.map((item, index) => {
                const isEditing = editingCellId === item.id
                return (
                  <tr key={item.id} className="hover:bg-gray-50/50 transition-colors">
                    <td className="table-cell text-center text-gray-400 font-mono text-xs">{index + 1}</td>
                    <td className="table-cell font-medium text-gray-800">{item.name}</td>
                    <td className="table-cell text-left">
                      <span className={`px-2 py-0.5 rounded text-[10px] font-bold ${
                        item.category === 'Bahan' 
                          ? 'bg-green-100 text-green-700' 
                          : item.category === 'Tenaga Kerja'
                          ? 'bg-blue-100 text-blue-700'
                          : 'bg-amber-100 text-amber-700'
                      }`}>
                        {item.category}
                      </span>
                    </td>
                    <td className="table-cell text-center text-gray-600 font-semibold">{item.unit}</td>
                    <td className="table-cell text-right font-mono font-medium">{item.quantity.toFixed(4)}</td>
                    <td 
                      className="table-cell text-right font-mono cursor-pointer hover:bg-amber-50 group transition-colors"
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
                          className="w-28 px-1.5 py-0.5 border border-primary-500 rounded text-right text-xs focus:outline-none"
                          autoFocus
                        />
                      ) : (
                        <span className={item.isOverridden ? "text-blue-600 font-bold flex items-center justify-end gap-1" : "text-gray-600 group-hover:text-primary-600 transition-colors"}>
                          {formatCurrency(item.unitPrice)}
                          {item.isOverridden === 1 && <span className="text-[10px]" title="Harga kustom proyek">✏️</span>}
                        </span>
                      )}
                    </td>
                    <td className="table-cell text-right font-mono font-bold text-gray-900">{formatCurrency(item.totalPrice)}</td>
                  </tr>
                )
              })}
            </tbody>
          </table>
        </div>

        {/* Footer */}
        <div className="bg-gray-50 px-6 py-4 border-t border-gray-200 flex justify-between items-center">
          <span className="text-xs text-gray-500 italic">Total Baris Komponen: {filteredBom.length} item</span>
          <div className="text-right">
            <span className="text-xs text-gray-500 font-medium mr-2">Total Biaya Komponen:</span>
            <span className="text-base font-extrabold text-primary-800 font-mono">{formatCurrency(grandTotalBOM)}</span>
          </div>
        </div>
      </div>
    </div>
  )
}
