import React, { useState, useEffect, useRef } from 'react'
import { useWbsStore } from '../stores/wbs-store'
import { useVolumeStore } from '../stores/volume-store'
import { useAhsStore } from '../stores/ahs-store'
import { useRabStore } from '../stores/rab-store'
import { useProjectStore } from '../stores/project-store'
import { useProjectVolumeStore } from '../stores/project-volume-store'
import { formatCurrency } from '../lib/format'
import type { WbsItem } from '../types/models'
import { VolumeCalculatorModal } from '../components/volume-calculator-modal'

interface RabInputTabProps {
  projectId: string
}

interface RabRow {
  wbsItemId: string
  code: string
  name: string
  unit: string
  volume: number
  ahsId: string | null
  ahsCode: string
  ahsName: string
  unitPrice: number
  totalPrice: number
  parentId: string | null
}

export function RabInputTab({ projectId }: RabInputTabProps): React.ReactElement {
  const { items: wbsItems, loadByProject: loadWbs, createItem, updateItem, deleteItem, moveItem } = useWbsStore()
  const { items: volumes, loadByProject: loadVolumes, upsert } = useVolumeStore()
  const { items: projectVolumes, loadByProject: loadProjectVolumes } = useProjectVolumeStore()
  const { ahsList, loadLibrary } = useAhsStore()
  const { calculation, calculate } = useRabStore()
  const { projects } = useProjectStore()

  const project = projects.find(p => p.id === projectId)
  const ppn = project?.ppn ?? 11
  const overhead = project?.overhead ?? 0

  // Autocomplete search state
  const [activeSearchId, setActiveSearchId] = useState<string | null>(null)
  const [searchQuery, setSearchQuery] = useState('')
  const dropdownRef = useRef<HTMLDivElement>(null)

  // Local edit states to prevent lag while typing
  const [localVolumes, setLocalVolumes] = useState<Record<string, string>>({})
  const [localCategoryNames, setLocalCategoryNames] = useState<Record<string, string>>({})
  const [localRowNames, setLocalRowNames] = useState<Record<string, string>>({})

  // Calculator Modal state
  const [calculatorOpen, setCalculatorOpen] = useState(false)
  const [selectedVolItem, setSelectedVolItem] = useState<RabRow | null>(null)

  const handleApplyCalculator = async (volume: number, formulaJson: string, notes: string, projectVolumeId?: string | null) => {
    if (!selectedVolItem) return
    const wbsItemId = selectedVolItem.wbsItemId
    const volItem = volumes.find(v => v.wbsItemId === wbsItemId)
    
    await upsert(wbsItemId, {
      volume: volume,
      ahsId: volItem?.ahsId ?? null,
      unit: volItem?.unit ?? selectedVolItem.unit ?? '',
      formula: formulaJson,
      notes: notes,
      projectVolumeId: projectVolumeId !== undefined ? projectVolumeId : (volItem?.projectVolumeId || null)
    })
    
    setLocalVolumes(prev => {
      const copy = { ...prev }
      delete copy[wbsItemId]
      return copy
    })

    await loadVolumes(projectId)
    calculate(projectId, ppn, overhead)
    setCalculatorOpen(false)
    setSelectedVolItem(null)
  }

  useEffect(() => {
    loadWbs(projectId)
    loadVolumes(projectId)
    loadProjectVolumes(projectId)
    loadLibrary()
  }, [projectId])

  // Sync calculation on WBS/Volume change
  useEffect(() => {
    calculate(projectId, ppn, overhead)
  }, [wbsItems.length, volumes.length])

  // Handle clicking outside autocomplete dropdown
  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setActiveSearchId(null)
      }
    }
    document.addEventListener('mousedown', handleClickOutside)
    return () => document.removeEventListener('mousedown', handleClickOutside)
  }, [])

  const getRabRowForWbs = (wbs: WbsItem): RabRow => {
    const volItem = volumes.find(v => v.wbsItemId === wbs.id)
    const ahsId = volItem?.ahsId ?? null
    
    // Resolve shared volume if linked
    const linkedVol = volItem?.projectVolumeId
      ? projectVolumes.find(pv => pv.id === volItem.projectVolumeId)
      : null

    const volume = linkedVol ? linkedVol.value : (volItem?.volume ?? 0)
    const matchedAhs = ahsList.find(a => a.id === ahsId)
    const unit = linkedVol ? linkedVol.unit : (wbs.unit || matchedAhs?.unit || '')

    // Get unit price and total price from backend calculations
    const calcItem = calculation?.lineItems?.find(li => li.wbsItemId === wbs.id)
    
    let unitPrice = calcItem?.unitPrice ?? 0
    let totalPrice = calcItem?.totalPrice ?? 0

    if (!calcItem && ahsId) {
      unitPrice = matchedAhs?.totalPrice ?? 0
      totalPrice = volume * unitPrice
    }

    return {
      wbsItemId: wbs.id,
      code: wbs.code,
      name: wbs.name,
      unit,
      volume,
      ahsId,
      ahsCode: matchedAhs?.code ?? '',
      ahsName: matchedAhs?.name ?? '',
      unitPrice,
      totalPrice,
      parentId: wbs.parentId
    }
  }

  // WBS Category and Item Grouping Sorter
  const categories = wbsItems.filter(i => i.type === 'group')
  categories.sort((a, b) => a.sortOrder - b.sortOrder)

  // Recursive subtotal calculation
  const getGroupSubtotal = (groupWbsPath: string) => {
    const leaves = wbsItems.filter(i => 
      i.type === 'item' && 
      (i.wbsPath === groupWbsPath || i.wbsPath.startsWith(groupWbsPath + '.'))
    )
    
    return leaves.reduce((sum, leaf) => {
      const volItem = volumes.find(v => v.wbsItemId === leaf.id)
      const linkedVol = volItem?.projectVolumeId
        ? projectVolumes.find(pv => pv.id === volItem.projectVolumeId)
        : null
      const volume = linkedVol ? linkedVol.value : (volItem?.volume ?? 0)
      const calcItem = calculation?.lineItems?.find(li => li.wbsItemId === leaf.id)
      let unitPrice = calcItem?.unitPrice ?? 0
      if (!calcItem && volItem?.ahsId) {
        const matchedAhs = ahsList.find(a => a.id === volItem.ahsId)
        unitPrice = matchedAhs?.totalPrice ?? 0
      }
      return sum + (volume * unitPrice)
    }, 0)
  }

  const leafItems = wbsItems.filter(i => i.type === 'item')
  const rows = leafItems.map(wbs => getRabRowForWbs(wbs))

  // ── ACTIONS ──

  // Add parent category
  const handleAddCategory = async () => {
    const nextSortOrder = categories.length > 0
      ? Math.max(...categories.map(c => c.sortOrder)) + 1
      : 1

    await createItem({
      projectId,
      parentId: null,
      name: 'Lantai / Bagian Baru',
      type: 'group',
      unit: '',
      sortOrder: nextSortOrder
    })
  }

  // Add sub-category under category
  const handleAddSubCategory = async (parentId: string) => {
    const siblings = wbsItems.filter(i => i.parentId === parentId && i.type === 'group')
    const nextSortOrder = siblings.length > 0
      ? Math.max(...siblings.map(s => s.sortOrder)) + 1
      : 1

    await createItem({
      projectId,
      parentId,
      name: 'Sub-Kategori Baru',
      type: 'group',
      unit: '',
      sortOrder: nextSortOrder
    })
    await loadWbs(projectId)
  }

  // Add sub-item under category
  const handleAddSubRow = async (categoryId: string) => {
    const siblings = wbsItems.filter(i => i.parentId === categoryId)
    const nextSortOrder = siblings.length > 0
      ? Math.max(...siblings.map(s => s.sortOrder)) + 1
      : 1

    const successWbs = await createItem({
      projectId,
      parentId: categoryId,
      name: 'Pekerjaan Baru',
      type: 'item',
      unit: '',
      sortOrder: nextSortOrder
    })

    if (successWbs) {
      const result = await window.api.wbs.getByProject(projectId)
      if (result.success && result.data) {
        const currentIds = new Set(wbsItems.map(i => i.id))
        const newItem = result.data.find(i => i.type === 'item' && !currentIds.has(i.id))
        
        if (newItem) {
          await upsert(newItem.id, {
            volume: 0,
            ahsId: null,
            unit: '',
            formula: '',
            notes: ''
          })
          await loadVolumes(projectId)
        }
      }
    }
  }

  // Delete Category or Sub-Row
  const handleDeleteRow = async (wbsItemId: string) => {
    const target = wbsItems.find(i => i.id === wbsItemId)
    if (!target) return

    const confirmMsg = target.type === 'group'
      ? 'Hapus kategori ini beserta seluruh sub-pekerjaan di bawahnya?'
      : 'Hapus pekerjaan ini?'

    if (confirm(confirmMsg)) {
      await deleteItem(wbsItemId)
      await loadVolumes(projectId)
      calculate(projectId, ppn, overhead)
    }
  }

  // Rename Category Inline
  const handleCategoryLocalChange = (id: string, value: string) => {
    setLocalCategoryNames(prev => ({ ...prev, [id]: value }))
  }

  const handleCategorySubmit = async (id: string, originalName: string) => {
    const localName = localCategoryNames[id]
    if (localName === undefined || localName.trim() === '') return
    if (localName.trim() === originalName) return

    await updateItem(id, { name: localName.trim() })
  }

  // Rename Row Inline
  const handleRowNameLocalChange = (id: string, value: string) => {
    setLocalRowNames(prev => ({ ...prev, [id]: value }))
  }

  const handleRowNameSubmit = async (id: string, originalName: string) => {
    const localName = localRowNames[id]
    if (localName === undefined || localName.trim() === '') return
    if (localName.trim() === originalName) return

    await updateItem(id, { name: localName.trim() })
  }

  // Edit Volume
  const handleVolumeLocalChange = (wbsItemId: string, value: string) => {
    setLocalVolumes(prev => ({ ...prev, [wbsItemId]: value }))
  }

  const handleVolumeSubmit = async (wbsItemId: string, originalValue: number) => {
    const localVal = localVolumes[wbsItemId]
    if (localVal === undefined) return

    const parsedVal = parseFloat(localVal) || 0
    if (parsedVal === originalValue) return

    const volItem = volumes.find(v => v.wbsItemId === wbsItemId)
    await upsert(wbsItemId, {
      volume: parsedVal,
      ahsId: volItem?.ahsId ?? null,
      unit: volItem?.unit ?? ''
    })

    await loadVolumes(projectId)
    calculate(projectId, ppn, overhead)
  }

  // Select AHS Link
  const handleSelectAhs = async (wbsItemId: string, selectedAhs: typeof ahsList[0]) => {
    // 1. Update WbsItem name and unit
    await updateItem(wbsItemId, {
      name: selectedAhs.name,
      unit: selectedAhs.unit
    })

    // 2. Update VolumeItem ahsId
    const volItem = volumes.find(v => v.wbsItemId === wbsItemId)
    await upsert(wbsItemId, {
      volume: volItem?.volume ?? 0,
      ahsId: selectedAhs.id,
      unit: selectedAhs.unit
    })

    setActiveSearchId(null)
    setSearchQuery('')
    await loadWbs(projectId)
    await loadVolumes(projectId)
    calculate(projectId, ppn, overhead)
  }

  // Filter AHS based on search input
  const filteredAhs = ahsList
    .filter(ahs => 
      ahs.code.toLowerCase().includes(searchQuery.toLowerCase()) ||
      ahs.name.toLowerCase().includes(searchQuery.toLowerCase())
    )
    .slice(0, 100)

  const grandTotalCalculated = calculation?.grandTotal ?? rows.reduce((s, r) => s + r.totalPrice, 0) * (1 + (ppn + overhead) / 100)

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h3 className="text-lg font-bold text-gray-900">Penyusunan RAB Utama</h3>
          <p className="text-xs text-gray-500 mt-0.5">Kelompokkan pekerjaan berdasarkan kategori konstruksi, pilih AHS referensi, dan input volume pekerjaan untuk kalkulasi otomatis.</p>
        </div>
        <div className="flex items-center gap-4">
          <div className="text-right">
            <span className="text-xs text-gray-500 block">Total RAB Proyek (Inc. PPN & OH)</span>
            <span className="text-xl font-extrabold text-primary-800 font-mono">{formatCurrency(grandTotalCalculated)}</span>
          </div>
          <div className="flex gap-2">
            <button 
              onClick={handleAddCategory}
              className="btn-primary bg-slate-800 hover:bg-slate-900 flex items-center gap-1.5 text-xs px-4 py-2"
            >
              + Tambah Lantai / Bagian
            </button>
          </div>
        </div>
      </div>

      <div className="card min-h-[550px] flex flex-col justify-between overflow-visible">
        <div className="overflow-x-auto flex-1">
          <table className="w-full border-collapse">
            <thead>
              <tr className="bg-gray-50 border-b border-gray-200">
                <th className="table-header w-16 text-center">No WBS</th>
                <th className="table-header w-2/5">Uraian Kategori & Item Pekerjaan / Referensi AHS</th>
                <th className="table-header w-36">Volume</th>
                <th className="table-header w-20 text-center">Satuan</th>
                <th className="table-header w-32 text-right">Harga Satuan</th>
                <th className="table-header w-36 text-right">Jumlah Biaya</th>
                <th className="table-header w-16 text-center">Aksi</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {wbsItems.map((item) => {
                const level = item.wbsPath ? item.wbsPath.split('.').length - 1 : 0
                
                if (item.type === 'group') {
                  const subtotal = getGroupSubtotal(item.wbsPath)
                  return (
                    <tr 
                      key={item.id} 
                      className={`border-t border-b border-gray-200 font-sans transition-colors ${
                        level === 0 
                          ? 'bg-slate-200 text-slate-900 font-extrabold shadow-sm' 
                          : 'bg-slate-100/80 text-slate-800 font-bold'
                      }`}
                    >
                      {/* Code */}
                      <td className="px-4 py-2 font-mono text-sm font-extrabold text-slate-800 text-center">
                        {item.code}
                      </td>
                      {/* Category Name & Actions */}
                      <td className="px-4 py-2" colSpan={4}>
                        <div className="flex items-center justify-between w-full" style={{ paddingLeft: `${level * 16}px` }}>
                          <input
                            type="text"
                            value={localCategoryNames[item.id] !== undefined ? localCategoryNames[item.id] : item.name}
                            onChange={e => handleCategoryLocalChange(item.id, e.target.value)}
                            onBlur={() => handleCategorySubmit(item.id, item.name)}
                            onKeyDown={e => {
                              if (e.key === 'Enter') {
                                handleCategorySubmit(item.id, item.name)
                                ;(e.target as HTMLInputElement).blur()
                              }
                            }}
                            className={`bg-transparent border-b border-transparent hover:border-slate-400 focus:border-primary-500 focus:bg-white px-2 py-0.5 rounded w-96 text-sm focus:outline-none transition-all ${
                              level === 0 ? 'font-black tracking-wider uppercase text-slate-900' : 'font-bold text-slate-800'
                            }`}
                            placeholder={level === 0 ? "Nama Lantai / Bagian..." : "Nama Kategori Pekerjaan..."}
                          />
                          <div className="flex gap-2 text-xs no-print font-normal">
                            {level === 0 ? (
                              <button
                                onClick={() => handleAddSubCategory(item.id)}
                                className="text-slate-700 hover:text-slate-900 bg-white border border-slate-300 hover:bg-slate-50 px-2.5 py-1 rounded font-bold transition-all shadow-sm"
                              >
                                + Kategori Pekerjaan
                              </button>
                            ) : (
                              <button
                                onClick={() => handleAddSubRow(item.id)}
                                className="text-primary-700 hover:text-primary-900 bg-white border border-primary-300 hover:bg-primary-50 px-2.5 py-1 rounded font-bold transition-all shadow-sm"
                              >
                                + Pekerjaan / Analisa
                              </button>
                            )}
                            <button
                              onClick={() => handleDeleteRow(item.id)}
                              className="text-red-600 hover:text-red-800 bg-white border border-red-200 hover:bg-red-50 px-2.5 py-1 rounded font-bold transition-all shadow-sm"
                              title="Hapus kategori dan sub-pekerjaannya"
                            >
                              Hapus
                            </button>
                          </div>
                        </div>
                      </td>
                      {/* Subtotal */}
                      <td className="px-4 py-2 text-right font-mono font-extrabold text-slate-800 text-sm">
                        {formatCurrency(subtotal)}
                      </td>
                      <td className="px-4 py-2 text-center text-gray-400">-</td>
                    </tr>
                  )
                } else {
                  const row = getRabRowForWbs(item)
                  const isSearching = activeSearchId === item.id
                  const displayVol = localVolumes[item.id] !== undefined 
                    ? localVolumes[item.id] 
                    : String(row.volume || '0')
                  const volItem = volumes.find(v => v.wbsItemId === item.id)
                  const hasCalculatorBackup = volItem?.formula && volItem.formula.trim().startsWith('{')

                  return (
                    <tr key={item.id} className="hover:bg-gray-50/50 transition-colors">
                      {/* Code */}
                      <td className="table-cell text-center text-gray-500 font-mono text-xs">
                        {item.code}
                      </td>

                      {/* Work Item Name & Parent Group Selector */}
                      <td className="table-cell overflow-visible">
                        <div className="flex flex-col gap-1.5 text-left relative" style={{ paddingLeft: `${level * 16}px` }}>
                          <input
                            type="text"
                            value={localRowNames[item.id] !== undefined ? localRowNames[item.id] : item.name}
                            onChange={e => handleRowNameLocalChange(item.id, e.target.value)}
                            onBlur={() => handleRowNameSubmit(item.id, item.name)}
                            onKeyDown={e => {
                              if (e.key === 'Enter') {
                                handleRowNameSubmit(item.id, item.name)
                                ;(e.target as HTMLInputElement).blur()
                              }
                            }}
                            className="bg-transparent border-b border-transparent hover:border-gray-300 focus:border-primary-500 focus:bg-white px-1.5 py-0.5 rounded text-gray-800 font-semibold w-full focus:outline-none transition-all text-sm"
                          />

                          <div className="flex items-center gap-2 mt-0.5 no-print">
                            {/* Category Dropdown */}
                            <div className="flex items-center gap-1">
                              <span className="text-[10px] text-gray-400 uppercase tracking-wider">Kelompok:</span>
                              <select
                                value={item.parentId || ''}
                                onChange={async (e) => {
                                  const newParentId = e.target.value || null
                                  await moveItem(item.id, newParentId, 1)
                                  calculate(projectId, ppn, overhead)
                                }}
                                className="bg-gray-50 border border-gray-200 rounded px-1 py-0.5 text-[10px] text-gray-600 focus:outline-none"
                              >
                                <option value="">-- Tanpa Kategori --</option>
                                {categories.map(c => (
                                  <option key={c.id} value={c.id}>{c.code}. {c.name}</option>
                                ))}
                              </select>
                            </div>

                            {/* AHS Reference */}
                            {row.ahsId ? (
                              <div className="flex items-center gap-1 border-l border-gray-200 pl-2">
                                <span className="text-[10px] text-gray-400 uppercase tracking-wider">AHS:</span>
                                <span 
                                  onClick={() => {
                                    setActiveSearchId(item.id)
                                    setSearchQuery(row.ahsCode)
                                  }}
                                  className="font-mono text-[10px] bg-primary-50 text-primary-700 px-1 py-0.5 rounded cursor-pointer hover:bg-primary-100 transition-colors"
                                  title="Klik untuk mengganti referensi AHS"
                                >
                                  {row.ahsCode} - {row.ahsName}
                                </span>
                              </div>
                            ) : (
                              <button
                                onClick={() => {
                                  setActiveSearchId(item.id)
                                  setSearchQuery('')
                                }}
                                className="text-[10px] text-red-500 hover:text-red-700 font-bold underline transition-colors"
                              >
                                Pilih Referensi AHS...
                              </button>
                            )}

                            {/* Backup volume summary indicator */}
                            {volItem?.notes && hasCalculatorBackup && (
                              <div className="text-[10px] text-amber-600 bg-amber-50 border border-amber-100 rounded px-1.5 py-0.5 truncate max-w-xs font-sans" title={volItem.notes}>
                                📝 {volItem.notes}
                              </div>
                            )}
                          </div>

                          {/* AHS Search Dropdown */}
                          {isSearching && (
                            <div ref={dropdownRef} className="absolute left-0 right-0 top-full mt-1 max-h-60 overflow-y-auto bg-white border border-gray-200 rounded-lg shadow-xl z-50">
                              <input
                                type="text"
                                value={searchQuery}
                                onChange={e => setSearchQuery(e.target.value)}
                                placeholder="Cari Kode/Nama AHS..."
                                className="w-full px-3 py-1.5 border-b border-gray-200 text-xs outline-none focus:bg-gray-50 font-sans"
                                autoFocus
                              />
                              <div className="divide-y divide-gray-50">
                                {filteredAhs.length === 0 ? (
                                  <div className="p-3 text-[11px] text-gray-500 text-center">Tidak ditemukan referensi AHS yang cocok.</div>
                                ) : (
                                  filteredAhs.map(ahs => (
                                    <div
                                      key={ahs.id}
                                      onClick={() => handleSelectAhs(item.id, ahs)}
                                      className="p-2 hover:bg-primary-50 cursor-pointer text-[11px] flex flex-col gap-0.5 text-left"
                                    >
                                      <span className="font-mono font-bold text-primary-700">{ahs.code} ({ahs.unit})</span>
                                      <span className="text-gray-700 font-medium">{ahs.name}</span>
                                      <span className="text-gray-400 font-mono">Harga: {formatCurrency(ahs.totalPrice)}</span>
                                    </div>
                                  ))
                                )}
                              </div>
                            </div>
                          )}
                        </div>
                      </td>

                      {/* Volume */}
                      <td className="table-cell">
                        <div className="flex items-center gap-1">
                          <input
                            type="number"
                            step="0.001"
                            min="0"
                            value={displayVol}
                            onChange={e => handleVolumeLocalChange(item.id, e.target.value)}
                            onBlur={() => handleVolumeSubmit(item.id, row.volume)}
                            onKeyDown={e => {
                              if (e.key === 'Enter') {
                                handleVolumeSubmit(item.id, row.volume)
                                ;(e.target as HTMLInputElement).blur()
                              }
                            }}
                            className="w-24 px-2 py-1 border border-gray-300 rounded text-right font-mono text-sm focus:border-primary-500 focus:outline-none"
                          />
                          <button
                            onClick={() => {
                              setSelectedVolItem(row)
                              setCalculatorOpen(true)
                            }}
                            className={`p-1.5 border rounded hover:bg-slate-100 text-xs shadow-sm flex items-center justify-center transition-colors flex-shrink-0 ${
                              hasCalculatorBackup 
                                ? 'bg-amber-100 border-amber-300 text-amber-700 font-bold' 
                                : 'bg-white border-gray-300 text-gray-500'
                            }`}
                            title="Buka kalkulator detail volume (Backup)"
                          >
                            🧮
                          </button>
                        </div>
                      </td>

                      {/* Unit */}
                      <td className="table-cell text-center text-gray-600 text-sm font-semibold">
                        {row.unit || '-'}
                      </td>

                      {/* Unit Price */}
                      <td className="table-cell text-right font-mono text-sm text-gray-600">
                        {formatCurrency(row.unitPrice)}
                      </td>

                      {/* Total Price */}
                      <td className="table-cell text-right font-mono text-sm font-bold text-gray-900">
                        {formatCurrency(row.totalPrice)}
                      </td>

                      {/* Actions */}
                      <td className="table-cell text-center">
                        <button
                          onClick={() => handleDeleteRow(item.id)}
                          className="text-red-500 hover:text-red-700 hover:bg-red-50 p-1.5 rounded transition-colors"
                          title="Hapus pekerjaan ini"
                        >
                          <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                          </svg>
                        </button>
                      </td>
                    </tr>
                  )
                }
              })}

              {wbsItems.length === 0 && (
                <tr>
                  <td colSpan={7} className="text-center py-12 text-gray-400 text-sm italic">
                    Belum ada item pekerjaan atau kategori di proyek ini. Klik "+ Kategori" atau "+ Pekerjaan" untuk memulai.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>

        {/* Small bottom footer inside table card */}
        {rows.length > 0 && calculation && (
          <div className="bg-gray-50 px-6 py-4 border-t border-gray-200 flex justify-end">
            <div className="w-80 space-y-1.5 text-sm">
              <div className="flex justify-between text-gray-600">
                <span>Subtotal Pekerjaan:</span>
                <span className="font-mono font-medium">{formatCurrency(calculation.totalPrice)}</span>
              </div>
              <div className="flex justify-between text-gray-600">
                <span>PPN ({ppn}%):</span>
                <span className="font-mono">{formatCurrency(calculation.ppnAmount)}</span>
              </div>
              <div className="flex justify-between text-gray-600">
                <span>Overhead & Profit ({overhead}%):</span>
                <span className="font-mono">{formatCurrency(calculation.overheadAmount)}</span>
              </div>
              <hr className="border-gray-200 my-1" />
              <div className="flex justify-between font-extrabold text-primary-800 text-base">
                <span>Grand Total RAB:</span>
                <span className="font-mono">{formatCurrency(calculation.grandTotal)}</span>
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Volume Calculator Modal overlay */}
      <VolumeCalculatorModal
        isOpen={calculatorOpen}
        onClose={() => setCalculatorOpen(false)}
        onApply={handleApplyCalculator}
        initialFormula={selectedVolItem ? (volumes.find(v => v.wbsItemId === selectedVolItem.wbsItemId)?.formula || '') : ''}
        initialNotes={selectedVolItem ? (volumes.find(v => v.wbsItemId === selectedVolItem.wbsItemId)?.notes || '') : ''}
        unit={selectedVolItem?.unit || ''}
        projectId={projectId}
        initialProjectVolumeId={selectedVolItem ? (volumes.find(v => v.wbsItemId === selectedVolItem.wbsItemId)?.projectVolumeId || null) : null}
      />
    </div>
  )
}
