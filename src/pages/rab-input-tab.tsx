import React, { useState, useEffect, useRef } from 'react'
import { useWbsStore } from '../stores/wbs-store'
import { useVolumeStore } from '../stores/volume-store'
import { useAhsStore } from '../stores/ahs-store'
import { useRabStore } from '../stores/rab-store'
import { useProjectStore } from '../stores/project-store'
import { formatCurrency } from '../lib/format'
import type { WbsItem } from '../types/models'

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

  useEffect(() => {
    loadWbs(projectId)
    loadVolumes(projectId)
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
    const volume = volItem?.volume ?? 0

    // Get unit price and total price from backend calculations
    const calcItem = calculation?.lineItems?.find(li => li.wbsItemId === wbs.id)
    
    let unitPrice = calcItem?.unitPrice ?? 0
    let totalPrice = calcItem?.totalPrice ?? 0

    const matchedAhs = ahsList.find(a => a.id === ahsId)

    if (!calcItem && ahsId) {
      unitPrice = matchedAhs?.totalPrice ?? 0
      totalPrice = volume * unitPrice
    }

    return {
      wbsItemId: wbs.id,
      code: wbs.code,
      name: wbs.name,
      unit: wbs.unit || matchedAhs?.unit || '',
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
  // Sort categories by their logical sortOrder (creation/sorting order)
  categories.sort((a, b) => a.sortOrder - b.sortOrder)

  interface WbsGroup {
    category: WbsItem | null // null for uncategorized WBS items
    displayCode: string
    rows: RabRow[]
  }

  const groups: WbsGroup[] = []

  // Add groups under category
  categories.forEach((cat, gIndex) => {
    const childItems = wbsItems.filter(i => i.type === 'item' && i.parentId === cat.id)
    // Sort child items by their logical sortOrder
    childItems.sort((a, b) => a.sortOrder - b.sortOrder)
    
    const displayCode = String(gIndex + 1)
    const childRows = childItems.map((wbs, rIndex) => {
      const row = getRabRowForWbs(wbs)
      return {
        ...row,
        code: `${displayCode}.${rIndex + 1}` // Dynamic, sequential sub-code
      }
    })

    groups.push({
      category: cat,
      displayCode,
      rows: childRows
    })
  })

  // Add uncategorized items at the bottom
  const uncategorizedItems = wbsItems.filter(i => i.type === 'item' && (i.parentId === null || i.parentId === undefined))
  if (uncategorizedItems.length > 0) {
    uncategorizedItems.sort((a, b) => a.sortOrder - b.sortOrder)
    const uncategorizedRows = uncategorizedItems.map((wbs, rIndex) => {
      const row = getRabRowForWbs(wbs)
      return {
        ...row,
        code: String(rIndex + 1)
      }
    })
    
    groups.push({
      category: null,
      displayCode: '-',
      rows: uncategorizedRows
    })
  }

  const rows = groups.flatMap(g => g.rows)

  // ── ACTIONS ──

  // Add parent category
  const handleAddCategory = async () => {
    const nextSortOrder = categories.length > 0
      ? Math.max(...categories.map(c => c.sortOrder)) + 1
      : 1

    await createItem({
      projectId,
      parentId: null,
      name: 'Kategori Pekerjaan Baru',
      type: 'group',
      unit: '',
      sortOrder: nextSortOrder
    })
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
              + Kategori
            </button>
            <button 
              onClick={() => {
                // If there's a category, add under the first category. Otherwise, uncategorized.
                const firstCatId = categories[0]?.id || ''
                handleAddSubRow(firstCatId)
              }}
              className="btn-primary flex items-center gap-1.5 text-xs px-4 py-2"
            >
              + Pekerjaan
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
                <th className="table-header w-28">Volume</th>
                <th className="table-header w-20 text-center">Satuan</th>
                <th className="table-header w-32 text-right">Harga Satuan</th>
                <th className="table-header w-36 text-right">Jumlah Biaya</th>
                <th className="table-header w-16 text-center">Aksi</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {groups.map((group, gIndex) => {
                const cat = group.category
                return (
                  <React.Fragment key={cat ? cat.id : 'uncategorized'}>
                    {/* Category Group Header Row */}
                    <tr className="bg-slate-100/80 border-t border-b border-gray-200 font-sans">
                      <td className="px-4 py-2 font-mono text-sm font-extrabold text-slate-800 text-center">
                        {cat ? group.displayCode : '-'}
                      </td>
                      <td className="px-4 py-2 font-bold text-slate-800" colSpan={4}>
                        {cat ? (
                          <div className="flex items-center justify-between w-full">
                            <input
                              type="text"
                              value={localCategoryNames[cat.id] !== undefined ? localCategoryNames[cat.id] : cat.name}
                              onChange={e => handleCategoryLocalChange(cat.id, e.target.value)}
                              onBlur={() => handleCategorySubmit(cat.id, cat.name)}
                              onKeyDown={e => {
                                if (e.key === 'Enter') {
                                  handleCategorySubmit(cat.id, cat.name)
                                  ;(e.target as HTMLInputElement).blur()
                                }
                              }}
                              className="bg-transparent border-b border-transparent hover:border-slate-400 focus:border-primary-500 focus:bg-white px-2 py-0.5 rounded font-extrabold text-slate-800 w-96 text-sm focus:outline-none transition-all"
                            />
                            <div className="flex gap-2 text-xs no-print font-normal">
                              <button
                                onClick={() => handleAddSubRow(cat.id)}
                                className="text-primary-700 hover:text-primary-900 bg-white border border-primary-300 hover:bg-primary-50 px-2.5 py-1 rounded font-bold transition-all shadow-sm"
                              >
                                + Sub-Pekerjaan
                              </button>
                              <button
                                onClick={() => handleDeleteRow(cat.id)}
                                className="text-red-600 hover:text-red-800 bg-white border border-red-200 hover:bg-red-50 px-2.5 py-1 rounded font-bold transition-all shadow-sm"
                                title="Hapus seluruh kategori beserta sub-pekerjaannya"
                              >
                                Hapus Kategori
                              </button>
                            </div>
                          </div>
                        ) : (
                          <span className="text-gray-500 italic uppercase tracking-wider text-xs">Tanpa Kategori</span>
                        )}
                      </td>
                      <td className="px-4 py-2 text-right font-mono font-extrabold text-slate-800 text-sm">
                        {formatCurrency(group.rows.reduce((sum, r) => sum + r.totalPrice, 0))}
                      </td>
                      <td className="px-4 py-2 text-center text-gray-400">-</td>
                    </tr>

                    {/* Sub-Pekerjaan Rows under this category */}
                    {group.rows.map((row, index) => {
                      const isSearching = activeSearchId === row.wbsItemId
                      const displayVol = localVolumes[row.wbsItemId] !== undefined 
                        ? localVolumes[row.wbsItemId] 
                        : String(row.volume || '0')

                      return (
                        <tr key={row.wbsItemId} className="hover:bg-gray-50/50 transition-colors">
                          {/* Code */}
                          <td className="table-cell text-center text-gray-500 font-mono text-xs">
                            {row.code}
                          </td>

                          {/* Work Item Name & Parent Group Selector */}
                          <td className="table-cell overflow-visible">
                            <div className="flex flex-col gap-1.5 text-left relative">
                              <input
                                type="text"
                                value={localRowNames[row.wbsItemId] !== undefined ? localRowNames[row.wbsItemId] : row.name}
                                onChange={e => handleRowNameLocalChange(row.wbsItemId, e.target.value)}
                                onBlur={() => handleRowNameSubmit(row.wbsItemId, row.name)}
                                onKeyDown={e => {
                                  if (e.key === 'Enter') {
                                    handleRowNameSubmit(row.wbsItemId, row.name)
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
                                    value={row.parentId || ''}
                                    onChange={async (e) => {
                                      const newParentId = e.target.value || null
                                      await moveItem(row.wbsItemId, newParentId, 1)
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

                                {/* AHS Reference text/link */}
                                {row.ahsId ? (
                                  <div className="flex items-center gap-1 border-l border-gray-200 pl-2">
                                    <span className="text-[10px] text-gray-400 uppercase tracking-wider">AHS:</span>
                                    <span 
                                      onClick={() => {
                                        setActiveSearchId(row.wbsItemId)
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
                                      setActiveSearchId(row.wbsItemId)
                                      setSearchQuery('')
                                    }}
                                    className="text-[10px] text-red-500 hover:text-red-700 font-bold underline transition-colors"
                                  >
                                    Pilih Referensi AHS...
                                  </button>
                                )}
                              </div>

                              {/* AHS Search Dropdown Autocomplete Overlay */}
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
                                          onClick={() => handleSelectAhs(row.wbsItemId, ahs)}
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
                            <input
                              type="number"
                              step="0.001"
                              min="0"
                              value={displayVol}
                              onChange={e => handleVolumeLocalChange(row.wbsItemId, e.target.value)}
                              onBlur={() => handleVolumeSubmit(row.wbsItemId, row.volume)}
                              onKeyDown={e => {
                                if (e.key === 'Enter') {
                                  handleVolumeSubmit(row.wbsItemId, row.volume)
                                  ;(e.target as HTMLInputElement).blur()
                                }
                              }}
                              className="w-full px-2 py-1 border border-gray-300 rounded text-right font-mono text-sm focus:border-primary-500 focus:outline-none"
                            />
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
                              onClick={() => handleDeleteRow(row.wbsItemId)}
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
                    })}
                  </React.Fragment>
                )
              })}

              {rows.length === 0 && categories.length === 0 && (
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
    </div>
  )
}
