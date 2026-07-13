import React, { useState, useEffect, useRef } from 'react'
import type { WbsItem, VolumeItem, ProjectVolume } from '../../types/models'
import type { RabCalculation } from '../../stores/rab-store'
import { formatCurrency } from '../../lib/format'
import { useWbsStore } from '../../stores/wbs-store'
import { useVolumeStore } from '../../stores/volume-store'
import { useRabStore } from '../../stores/rab-store'
import { Link2, Trash2, FileText, ChevronRight, ChevronDown, Unlink } from 'lucide-react'

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

interface RabWbsRowProps {
  item: WbsItem
  level: number
  projectId: string
  ppn: number
  overhead: number
  categories: WbsItem[]
  volumes: VolumeItem[]
  projectVolumes: ProjectVolume[]
  ahsList: any[]
  calculation: RabCalculation | null
  activeWbsItemId: string | null
  onSelectWbsItem: (id: string | null) => void
  getRabRowForWbs: (wbs: WbsItem) => RabRow
  getGroupSubtotal: (path: string) => number
  onAddSubCategory: (parentId: string) => void
  onAddSubRow: (parentId: string) => void
  onDeleteRow: (id: string) => void
}

export function RabWbsRow({
  item,
  level,
  projectId,
  ppn,
  overhead,
  categories,
  volumes,
  projectVolumes,
  ahsList,
  calculation,
  activeWbsItemId,
  onSelectWbsItem,
  getRabRowForWbs,
  getGroupSubtotal,
  onAddSubCategory,
  onAddSubRow,
  onDeleteRow
}: RabWbsRowProps): React.ReactElement {
  const { updateItem, moveItem } = useWbsStore()
  const { upsert: upsertVolume, loadByProject: loadVolumes } = useVolumeStore()
  const { calculate } = useRabStore()

  // Local state for editing category name or item name
  const [localName, setLocalName] = useState(item.name)
  useEffect(() => {
    setLocalName(item.name)
  }, [item.name])

  // Local state for volume input
  const row = getRabRowForWbs(item)
  const [localVol, setLocalVol] = useState(String(row.volume || '0'))
  useEffect(() => {
    setLocalVol(String(row.volume || '0'))
  }, [row.volume])

  // Autocomplete search state for AHS reference
  const [isSearching, setIsSearching] = useState(false)
  const [searchQuery, setSearchQuery] = useState('')
  const dropdownRef = useRef<HTMLDivElement>(null)

  // Handle clicking outside autocomplete dropdown
  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setIsSearching(false)
      }
    }
    document.addEventListener('mousedown', handleClickOutside)
    return () => document.removeEventListener('mousedown', handleClickOutside)
  }, [])

  const handleNameSubmit = async () => {
    if (localName.trim() === '') {
      setLocalName(item.name)
      return
    }
    if (localName.trim() !== item.name) {
      await updateItem(item.id, { name: localName.trim() })
      calculate(projectId, ppn, overhead)
    }
  }

  const handleVolumeSubmit = async () => {
    const parsed = parseFloat(localVol) || 0
    if (parsed !== row.volume) {
      const volItem = volumes.find(v => v.wbsItemId === item.id)
      await upsertVolume(item.id, {
        volume: parsed,
        ahsId: volItem?.ahsId ?? null,
        unit: volItem?.unit ?? item.unit ?? '',
        formula: volItem?.formula ?? '',
        notes: volItem?.notes ?? '',
        projectVolumeId: volItem?.projectVolumeId ?? null
      })
      await loadVolumes(projectId)
      calculate(projectId, ppn, overhead)
    }
  }

  const handleSelectAhs = async (ahs: any) => {
    const volItem = volumes.find(v => v.wbsItemId === item.id)
    await upsertVolume(item.id, {
      volume: volItem?.volume ?? 0,
      ahsId: ahs.id,
      unit: ahs.unit || volItem?.unit || item.unit || '',
      formula: volItem?.formula ?? '',
      notes: volItem?.notes ?? '',
      projectVolumeId: volItem?.projectVolumeId ?? null
    })
    await loadVolumes(projectId)
    calculate(projectId, ppn, overhead)
    setIsSearching(false)
  }

  // Filter AHS list based on query
  const filteredAhs = (ahsList || []).filter(ahs =>
    ahs.code.toLowerCase().includes(searchQuery.toLowerCase()) ||
    ahs.name.toLowerCase().includes(searchQuery.toLowerCase())
  ).slice(0, 50)

  if (item.type === 'group') {
    const subtotal = getGroupSubtotal(item.wbsPath)
    return (
      <tr 
        className={`border-t border-b border-slate-200/50 font-sans transition-colors ${
          level === 0 
            ? 'bg-slate-100 text-slate-800 border-l-4 border-primary-600 font-extrabold shadow-sm' 
            : 'bg-slate-50/70 text-slate-700 border-l-4 border-slate-300 font-bold'
        }`}
      >
        {/* Code */}
        <td className="px-3 py-2 font-mono text-xs font-bold text-slate-500 text-center select-none">
          {item.code}
        </td>
        {/* Category Name & Actions */}
        <td className="px-3 py-2" colSpan={4}>
          <div className="flex items-center justify-between w-full" style={{ paddingLeft: `${level * 16}px` }}>
            <input
              type="text"
              value={localName}
              onChange={e => setLocalName(e.target.value)}
              onBlur={handleNameSubmit}
              onKeyDown={e => {
                if (e.key === 'Enter') {
                  handleNameSubmit()
                  ;(e.target as HTMLInputElement).blur()
                }
              }}
              className={`bg-transparent border-b border-transparent hover:border-slate-300 hover:bg-white/50 focus:border-primary-500 focus:bg-white px-2 py-0.5 rounded w-96 text-sm focus:outline-none transition-all ${
                level === 0 ? 'font-black tracking-wider uppercase text-slate-800' : 'font-bold text-slate-700'
              }`}
              placeholder={level === 0 ? "Nama Lantai / Bagian..." : "Nama Kategori Pekerjaan..."}
            />
            <div className="flex gap-2 text-[10px] no-print font-normal select-none">
              {level === 0 ? (
                <button
                  onClick={() => onAddSubCategory(item.id)}
                  className="text-slate-700 hover:text-slate-900 bg-white border border-slate-200 hover:bg-slate-50 px-2.5 py-1 rounded-md font-bold transition-all shadow-sm"
                >
                  + Kategori
                </button>
              ) : (
                <button
                  onClick={() => onAddSubRow(item.id)}
                  className="text-primary-700 hover:text-primary-900 bg-white border border-primary-150 hover:bg-primary-50 px-2.5 py-1 rounded-md font-bold transition-all shadow-sm"
                >
                  + Pekerjaan
                </button>
              )}
              <button
                onClick={() => onDeleteRow(item.id)}
                className="text-red-600 hover:text-red-800 bg-white border border-red-150 hover:bg-red-50 px-2.5 py-1 rounded-md font-bold transition-all shadow-sm"
                title="Hapus kategori dan sub-pekerjaannya"
              >
                Hapus
              </button>
            </div>
          </div>
        </td>
        {/* Subtotal */}
        <td className="px-3 py-2 text-right font-mono font-extrabold text-slate-700 text-sm">
          {formatCurrency(subtotal)}
        </td>
        <td className="px-3 py-2 text-center text-slate-400 select-none">-</td>
      </tr>
    )
  }

  const volItem = volumes.find(v => v.wbsItemId === item.id)
  const isLinked = !!volItem?.projectVolumeId
  const linkedPV = isLinked ? projectVolumes.find(pv => pv.id === volItem.projectVolumeId) : null
  const hasCalculatorBackup = volItem?.formula && volItem.formula.trim().startsWith('{')

  return (
    <tr className={`hover:bg-slate-50/40 transition-colors ${activeWbsItemId === item.id ? 'bg-primary-50/20' : ''}`}>
      {/* Code */}
      <td className="px-3 py-2.5 text-center text-slate-400 font-mono text-xs border-b border-slate-100 select-none">
        {item.code}
      </td>

      {/* Work Item Name & Parent Group Selector */}
      <td className="px-3 py-2.5 overflow-visible border-b border-slate-100">
        <div className="flex flex-col gap-1.5 text-left relative" style={{ paddingLeft: `${level * 16}px` }}>
          <input
            type="text"
            value={localName}
            onChange={e => setLocalName(e.target.value)}
            onBlur={handleNameSubmit}
            onKeyDown={e => {
              if (e.key === 'Enter') {
                handleNameSubmit()
                ;(e.target as HTMLInputElement).blur()
              }
            }}
            className="bg-transparent border-b border-transparent hover:border-slate-200 focus:border-primary-500 focus:bg-white px-2 py-0.5 rounded text-slate-700 font-bold w-full focus:outline-none transition-all text-sm"
          />

          <div className="flex items-center gap-2 mt-0.5 no-print select-none">
            {/* Category Dropdown */}
            <div className="flex items-center gap-1.5">
              <span className="text-[9px] font-bold text-slate-400 uppercase tracking-wider">Kelompok:</span>
              <select
                value={item.parentId || ''}
                onChange={async (e) => {
                  const newParentId = e.target.value || null
                  await moveItem(item.id, newParentId, 1)
                  calculate(projectId, ppn, overhead)
                }}
                className="bg-slate-50 border border-slate-200 rounded px-1.5 py-0.5 text-[10px] font-semibold text-slate-600 focus:outline-none focus:ring-1 focus:ring-primary-500"
              >
                <option value="">-- Tanpa Kategori --</option>
                {categories.map(c => (
                  <option key={c.id} value={c.id}>{c.code}. {c.name}</option>
                ))}
              </select>
            </div>

            {/* AHS Reference */}
            {row.ahsId ? (
              <div className="flex items-center gap-1.5 border-l border-slate-200 pl-2">
                <span className="text-[9px] font-bold text-slate-400 uppercase tracking-wider">AHS:</span>
                <span 
                  onClick={() => {
                    setIsSearching(true)
                    setSearchQuery(row.ahsCode)
                  }}
                  className="font-mono text-[10px] bg-primary-50 text-primary-700 border border-primary-100/50 px-1.5 py-0.5 rounded cursor-pointer hover:bg-primary-100 transition-colors font-bold"
                  title="Klik untuk mengganti referensi AHS"
                >
                  {row.ahsCode} - {row.ahsName}
                </span>
              </div>
            ) : (
              <button
                onClick={() => {
                  setIsSearching(true)
                  setSearchQuery('')
                }}
                className="text-[10px] text-red-500 hover:text-red-700 font-bold underline transition-colors border-l border-slate-200 pl-2"
              >
                Pilih Referensi AHS...
              </button>
            )}

            {/* Backup volume summary indicator */}
            {volItem?.notes && hasCalculatorBackup && (
              <div className="text-[10px] text-amber-700 bg-amber-50 border border-amber-100 rounded px-2 py-0.5 truncate max-w-xs font-sans font-semibold flex items-center gap-1" title={volItem.notes}>
                <FileText className="w-3 h-3 text-amber-500 shrink-0" />
                <span className="truncate">{volItem.notes}</span>
              </div>
            )}
          </div>

          {/* AHS Search Dropdown */}
          {isSearching && (
            <div ref={dropdownRef} className="absolute left-0 right-0 top-full mt-1.5 max-h-60 overflow-y-auto bg-white border border-slate-200 rounded-xl shadow-xl z-50">
              <input
                type="text"
                value={searchQuery}
                onChange={e => setSearchQuery(e.target.value)}
                placeholder="Cari Kode/Nama AHS..."
                className="w-full px-3.5 py-2.5 border-b border-slate-100 text-xs outline-none focus:bg-slate-50 font-sans"
                autoFocus
              />
              <div className="divide-y divide-slate-50">
                {filteredAhs.length === 0 ? (
                  <div className="p-4 text-xs text-slate-400 text-center font-medium">Tidak ditemukan referensi AHS yang cocok.</div>
                ) : (
                  filteredAhs.map(ahs => (
                    <div
                      key={ahs.id}
                      onClick={() => handleSelectAhs(ahs)}
                      className="p-3 hover:bg-primary-50/50 cursor-pointer text-xs flex flex-col gap-0.5 text-left transition-colors"
                    >
                      <span className="font-mono font-bold text-primary-700">{ahs.code} ({ahs.unit})</span>
                      <span className="text-slate-700 font-bold">{ahs.name}</span>
                      <span className="text-slate-400 font-mono text-[10px] mt-0.5">Harga Satuan: {formatCurrency(ahs.totalPrice)}</span>
                    </div>
                  ))
                )}
              </div>
            </div>
          )}
        </div>
      </td>

      {/* Volume */}
      <td className="px-3 py-2.5 border-b border-slate-100 cursor-pointer text-left" onClick={() => onSelectWbsItem(item.id)}>
        <div className="flex items-center gap-2">
          {isLinked ? (
            <div className="flex items-center gap-1.5 bg-indigo-50 border border-indigo-150 text-indigo-800 px-2 py-0.5 rounded-lg font-bold text-[10px] shadow-sm transition-colors">
              <Link2 className="w-3 h-3 text-indigo-500 shrink-0" />
              <span className="font-mono select-none" title={linkedPV?.notes || ''}>
                {(() => {
                  if (!linkedPV) return 'Volume Bersama'
                  let typeLabel = ''
                  try {
                    if (linkedPV.formula) {
                      const parsed = JSON.parse(linkedPV.formula)
                      if (parsed.type === 'structural_profile' || parsed.type === 'structural_group') {
                        typeLabel = volItem?.formula === 'besi' ? 'Besi' : 'Beton'
                      } else if (parsed.type === 'simple') {
                        typeLabel = 'Rumus'
                      }
                    }
                  } catch {}
                  return `${linkedPV.name}${typeLabel ? ` (${typeLabel})` : ''}`
                })()}
              </span>
              <span className="font-mono bg-indigo-100 text-indigo-900 px-1.5 py-0.2 rounded font-extrabold ml-1">
                {row.volume.toFixed(2)}
              </span>
              <button
                type="button"
                onClick={async (e) => {
                  e.stopPropagation()
                  await upsertVolume(item.id, {
                    volume: row.volume,
                    ahsId: volItem?.ahsId ?? null,
                    unit: volItem?.unit ?? item.unit ?? '',
                    formula: '',
                    notes: '',
                    projectVolumeId: null
                  })
                  await loadVolumes(projectId)
                  calculate(projectId, ppn, overhead)
                }}
                className="text-red-500 hover:text-red-700 font-bold ml-1 p-0.5 hover:bg-red-100 rounded-md transition-colors"
                title="Putus Tautan"
              >
                ✕
              </button>
            </div>
          ) : (
            <input
              type="number"
              step="0.001"
              min="0"
              value={localVol}
              onChange={e => setLocalVol(e.target.value)}
              onBlur={handleVolumeSubmit}
              onFocus={() => onSelectWbsItem(item.id)}
              onKeyDown={e => {
                if (e.key === 'Enter') {
                  handleVolumeSubmit()
                  ;(e.target as HTMLInputElement).blur()
                }
              }}
              className={`w-24 px-2 py-1 border rounded-lg text-right font-mono text-xs focus:outline-none transition-all ${
                activeWbsItemId === item.id 
                  ? 'border-primary-500 bg-primary-50/30 ring-2 ring-primary-500/10' 
                  : 'border-slate-200 focus:border-primary-500'
              }`}
            />
          )}
        </div>
      </td>

      {/* Unit */}
      <td className="px-3 py-2.5 text-center text-slate-500 text-xs font-bold border-b border-slate-100 select-none">
        {row.unit || '-'}
      </td>

      {/* Unit Price */}
      <td className="px-3 py-2.5 text-right font-mono text-xs font-semibold text-slate-500 border-b border-slate-100">
        {formatCurrency(row.unitPrice)}
      </td>

      {/* Total Price */}
      <td className="px-3 py-2.5 text-right font-mono text-sm font-extrabold text-slate-800 border-b border-slate-100">
        {formatCurrency(row.totalPrice)}
      </td>

      {/* Actions */}
      <td className="px-3 py-2.5 text-center border-b border-slate-100 no-print">
        <button
          onClick={() => onDeleteRow(item.id)}
          className="text-slate-400 hover:text-red-600 hover:bg-red-50 p-1.5 rounded-lg transition-all"
          title="Hapus pekerjaan ini"
        >
          <Trash2 className="w-3.5 h-3.5" />
        </button>
      </td>
    </tr>
  )
}
