import React, { useState, useEffect, useCallback } from 'react'
import { useProjectVolumeStore } from '../stores/project-volume-store'
import { VolumeCalculatorModal } from '../components/volume-calculator-modal'
import { useRabStore } from '../stores/rab-store'
import type { ProjectVolume } from '../types/models'

interface ProjectVolumeTabProps {
  projectId: string
}

// Recursive/Iterative variable resolver for frontend
const evaluateProjectVolumes = (volumes: ProjectVolume[]): ProjectVolume[] => {
  const resolved = volumes.map(v => ({ ...v, value: v.value }))
  
  for (let iteration = 0; iteration < 5; iteration++) {
    let changed = false
    
    for (const vol of resolved) {
      if (!vol.formula) continue
      try {
        const parsed = JSON.parse(vol.formula)
        if (parsed.type === 'simple' && parsed.data) {
          const formulaStr = parsed.data.formula || ''
          if (!formulaStr) continue
          
          let expression = formulaStr
          const sortedVars = [...resolved].sort((a, b) => b.name.length - a.name.length)
          
          for (const v of sortedVars) {
            if (v.id === vol.id) continue
            const escapedName = v.name.replace(/[-\/\\^$*+?.()|[\]{}]/g, '\\$&')
            const regex = new RegExp(`\\[${escapedName}\\]`, 'g')
            if (regex.test(expression)) {
              expression = expression.replace(regex, String(v.value))
            }
          }
          
          const sanitized = expression.replace(/[^0-9+\-*/().\s]/g, '')
          if (sanitized.trim()) {
            const newValue = new Function(`return (${sanitized})`)()
            if (typeof newValue === 'number' && !isNaN(newValue) && vol.value !== newValue) {
              vol.value = newValue
              changed = true
            }
          }
        }
      } catch {
        // ignore
      }
    }
    
    if (!changed) break
  }
  
  return resolved
}

function parseFormulaToTextCompact(formulaJson: string): string {
  if (!formulaJson) return ''
  try {
    const parsed = JSON.parse(formulaJson)
    if (!parsed || !parsed.type) return String(formulaJson)
    
    if (parsed.type === 'simple') {
      return String(parsed.data || '')
    }
    if (parsed.type === 'dimensions') {
      return `Dimensi (${parsed.data?.length || 0} brs)`
    }
    if (parsed.type === 'steel') {
      return `Besi (${parsed.data?.steelMode || 'detail'})`
    }
    if (parsed.type === 'wall') {
      return `Dinding & Bukaan`
    }
    return String(parsed.type)
  } catch {
    return String(formulaJson)
  }
}

export function ProjectVolumeTab({ projectId }: ProjectVolumeTabProps): React.ReactElement {
  const { items: volumes, loadByProject, upsert, deleteItem } = useProjectVolumeStore()
  const { calculate } = useRabStore()
  
  // Local edit states
  const [localNames, setLocalNames] = useState<Record<string, string>>({})
  const [localUnits, setLocalUnits] = useState<Record<string, string>>({})
  const [localNotes, setLocalNotes] = useState<Record<string, string>>({})
  const [localValues, setLocalValues] = useState<Record<string, string>>({})
  const [dirtyIds, setDirtyIds] = useState<Set<string>>(new Set())
  const [saving, setSaving] = useState(false)

  // Calculator modal state
  const [calculatorOpen, setCalculatorOpen] = useState(false)
  const [selectedVolume, setSelectedVolume] = useState<ProjectVolume | null>(null)

  useEffect(() => {
    loadByProject(projectId)
  }, [projectId])

  // Initialize/sync local inputs when store items change
  useEffect(() => {
    const names: Record<string, string> = {}
    const units: Record<string, string> = {}
    const notes: Record<string, string> = {}
    const values: Record<string, string> = {}

    volumes.forEach(v => {
      if (!dirtyIds.has(v.id)) {
        names[v.id] = v.name
        units[v.id] = v.unit
        notes[v.id] = v.notes
        values[v.id] = String(v.value)
      } else {
        names[v.id] = localNames[v.id] ?? v.name
        units[v.id] = localUnits[v.id] ?? v.unit
        notes[v.id] = localNotes[v.id] ?? v.notes
        values[v.id] = localValues[v.id] ?? String(v.value)
      }
    })

    setLocalNames(names)
    setLocalUnits(units)
    setLocalNotes(notes)
    setLocalValues(values)
  }, [volumes, dirtyIds])

  // Compute the transient resolved volumes based on current local inputs (for real-time variable updates)
  const getTransientResolvedVolumes = useCallback((): ProjectVolume[] => {
    const merged = volumes.map(vol => {
      const name = localNames[vol.id] !== undefined ? localNames[vol.id] : vol.name
      const unit = localUnits[vol.id] !== undefined ? localUnits[vol.id] : vol.unit
      const notes = localNotes[vol.id] !== undefined ? localNotes[vol.id] : vol.notes
      const value = localValues[vol.id] !== undefined ? (parseFloat(localValues[vol.id]) || 0) : vol.value
      
      return {
        ...vol,
        name,
        unit,
        notes,
        value
      }
    })
    return evaluateProjectVolumes(merged)
  }, [volumes, localNames, localUnits, localNotes, localValues])

  const resolvedVolumes = getTransientResolvedVolumes()

  const handleFieldChange = (id: string, field: 'name' | 'unit' | 'notes' | 'value', val: string) => {
    setDirtyIds(prev => new Set(prev).add(id))
    if (field === 'name') setLocalNames(prev => ({ ...prev, [id]: val }))
    if (field === 'unit') setLocalUnits(prev => ({ ...prev, [id]: val }))
    if (field === 'notes') setLocalNotes(prev => ({ ...prev, [id]: val }))
    if (field === 'value') setLocalValues(prev => ({ ...prev, [id]: val }))
  }

  const handleSave = async () => {
    setSaving(true)
    
    // Save updated values in order to resolve dependencies properly
    // Resolved volumes holds the resolved calculated values
    for (const id of dirtyIds) {
      const name = localNames[id]
      const unit = localUnits[id]
      const notes = localNotes[id]
      
      const resolved = resolvedVolumes.find(rv => rv.id === id)
      const value = resolved ? resolved.value : (parseFloat(localValues[id]) || 0)
      
      const original = volumes.find(v => v.id === id)
      if (original) {
        await upsert(projectId, {
          id,
          name,
          unit,
          notes,
          value,
          formula: original.formula
        })
      }
    }
    
    setDirtyIds(new Set())
    setSaving(false)
    await loadByProject(projectId)
    calculate(projectId, 11, 0)
  }

  const handleAddVolume = async () => {
    const success = await upsert(projectId, {
      name: `Volume ${volumes.length + 1}`,
      unit: 'm3',
      value: 0,
      notes: '',
      formula: ''
    })
    if (success) {
      await loadByProject(projectId)
    }
  }

  const handleDelete = async (id: string) => {
    if (confirm('Hapus volume bersama ini? Item RAB yang terhubung akan dialihkan ke input manual.')) {
      await deleteItem(id)
      await loadByProject(projectId)
    }
  }

  const handleApplyCalculator = useCallback(async (volume: number, formulaJson: string, notes: string) => {
    if (!selectedVolume) return

    await upsert(projectId, {
      id: selectedVolume.id,
      name: localNames[selectedVolume.id] || selectedVolume.name,
      unit: localUnits[selectedVolume.id] || selectedVolume.unit,
      notes: notes || localNotes[selectedVolume.id] || selectedVolume.notes,
      value: volume,
      formula: formulaJson
    })

    setCalculatorOpen(false)
    setSelectedVolume(null)
    await loadByProject(projectId)
    calculate(projectId, 11, 0)
  }, [selectedVolume, localNames, localUnits, localNotes, projectId, upsert, loadByProject, calculate])

  return (
    <div className="space-y-4 font-sans">
      <div className="flex justify-between items-center bg-white p-4 rounded-xl border border-gray-200 shadow-sm">
        <div>
          <h3 className="font-bold text-slate-800 text-sm">Daftar Volume Bersama (Shared Volumes)</h3>
          <p className="text-xs text-gray-500 mt-0.5">Definisikan volume master yang dapat dibagikan dan dijadikan sebagai variabel perhitungan.</p>
        </div>
        <div className="flex gap-2">
          <button
            onClick={handleAddVolume}
            className="btn-secondary text-xs px-3 py-1.5"
          >
            + Tambah Volume
          </button>
          <button
            onClick={handleSave}
            disabled={saving || dirtyIds.size === 0}
            className="btn-primary text-xs px-4 py-1.5 disabled:opacity-50"
          >
            {saving ? 'Saving...' : `Simpan Perubahan (${dirtyIds.size})`}
          </button>
        </div>
      </div>

      {resolvedVolumes.length === 0 ? (
        <div className="card p-12 text-center text-gray-400 italic">
          Belum ada volume bersama. Klik "+ Tambah Volume" untuk memulai.
        </div>
      ) : (
        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6 2xl:grid-cols-8 gap-2.5">
          {resolvedVolumes.map(vol => {
            const isDirty = dirtyIds.has(vol.id)
            const hasFormula = vol.formula && vol.formula.trim().startsWith('{')

            return (
              <div 
                key={vol.id} 
                className={`card relative p-3 flex flex-col justify-between aspect-square hover:shadow-md transition-all border bg-white rounded-lg ${
                  isDirty 
                    ? 'border-amber-300 bg-amber-50/10 shadow-sm' 
                    : hasFormula 
                      ? 'border-blue-200 bg-blue-50/5' 
                      : 'border-slate-200'
                }`}
              >
                {/* Header: Name and Unit */}
                <div className="flex items-center justify-between gap-1.5 w-full min-w-0">
                  <input
                    type="text"
                    value={localNames[vol.id] ?? ''}
                    onChange={e => handleFieldChange(vol.id, 'name', e.target.value)}
                    placeholder="Nama Volume"
                    className="flex-1 min-w-0 bg-transparent border-b border-transparent hover:border-slate-200 focus:border-primary-500 font-bold text-slate-800 text-xs focus:outline-none truncate"
                  />
                  <input
                    type="text"
                    value={localUnits[vol.id] ?? ''}
                    onChange={e => handleFieldChange(vol.id, 'unit', e.target.value)}
                    placeholder="satuan"
                    className="w-10 text-center bg-slate-50 border border-slate-100 rounded text-[9px] font-semibold text-slate-600 focus:outline-none focus:bg-white focus:border-slate-300 flex-shrink-0"
                  />
                </div>

                {/* Body: Value, Calculator & Delete */}
                <div className="flex items-center justify-between mt-2.5">
                  <div className="flex items-baseline gap-0.5">
                    {hasFormula ? (
                      <span 
                        className="text-sm font-bold font-mono text-blue-700 bg-blue-50 px-1.5 py-0.5 rounded border border-blue-100 block max-w-[80px] truncate"
                        title={vol.value.toString()}
                      >
                        {vol.value.toLocaleString('id-ID', { minimumFractionDigits: 0, maximumFractionDigits: 3 })}
                      </span>
                    ) : (
                      <input
                        type="number"
                        step="any"
                        value={localValues[vol.id] ?? '0'}
                        onChange={e => handleFieldChange(vol.id, 'value', e.target.value)}
                        className="w-16 px-1.5 py-0.5 border border-slate-200 rounded text-xs font-bold font-mono text-slate-800 text-right focus:outline-none focus:ring-1 focus:ring-primary-500"
                      />
                    )}
                    <span className="text-[9px] text-gray-400 font-semibold lowercase tracking-wider">{localUnits[vol.id]}</span>
                  </div>

                  <div className="flex gap-0.5 no-print">
                    <button
                      onClick={() => {
                        setSelectedVolume(vol)
                        setCalculatorOpen(true)
                      }}
                      className={`p-1 border rounded hover:bg-slate-100 text-[10px] shadow-sm flex items-center justify-center transition-colors flex-shrink-0 ${
                        hasFormula 
                          ? 'bg-amber-100 border-amber-300 text-amber-700 font-bold' 
                          : 'bg-white border-gray-300 text-gray-500'
                      }`}
                      title="Buka kalkulator detail volume (Backup)"
                    >
                      🧮
                    </button>
                    <button
                      onClick={() => handleDelete(vol.id)}
                      className="p-1 border border-red-100 rounded hover:bg-red-50 text-red-500 hover:text-red-700 text-[10px] shadow-sm flex items-center justify-center transition-colors flex-shrink-0"
                      title="Hapus volume bersama ini"
                    >
                      ✕
                    </button>
                  </div>
                </div>

                {/* Formula display if exists */}
                {hasFormula && (
                  <div className="mt-1.5 text-[8px] text-blue-600 bg-blue-50/50 p-1 rounded border border-blue-100/50 flex items-center justify-between">
                    <span className="truncate max-w-[100px] font-mono leading-none" title={vol.notes || vol.formula}>
                      fx: {parseFormulaToTextCompact(vol.formula)}
                    </span>
                    <button
                      type="button"
                      onClick={async () => {
                        if (confirm('Lepas rumus dan ubah ke input manual? Nilai volume saat ini akan tetap dipertahankan.')) {
                          setDirtyIds(prev => new Set(prev).add(vol.id))
                          await upsert(projectId, {
                            id: vol.id,
                            name: localNames[vol.id] || vol.name,
                            unit: localUnits[vol.id] || vol.unit,
                            notes: localNotes[vol.id] || vol.notes,
                            value: vol.value,
                            formula: ''
                          })
                          await loadByProject(projectId)
                        }
                      }}
                      className="text-red-500 hover:text-red-700 font-bold ml-1"
                      title="Hapus formula (Jadikan Input Manual)"
                    >
                      ✕
                    </button>
                  </div>
                )}

                {/* Footer: Notes */}
                <input
                  type="text"
                  value={localNotes[vol.id] ?? ''}
                  onChange={e => handleFieldChange(vol.id, 'notes', e.target.value)}
                  placeholder="Tambah catatan..."
                  className="mt-2 w-full px-1.5 py-0.5 text-[9px] text-slate-500 bg-slate-50 border border-slate-100 hover:border-slate-200 rounded focus:outline-none focus:bg-white focus:border-slate-300"
                />
              </div>
            )
          })}
        </div>
      )}

      <VolumeCalculatorModal
        isOpen={calculatorOpen}
        onClose={() => setCalculatorOpen(false)}
        onApply={handleApplyCalculator}
        initialFormula={selectedVolume ? selectedVolume.formula : ''}
        initialNotes={selectedVolume ? selectedVolume.notes : ''}
        unit={selectedVolume ? (localUnits[selectedVolume.id] || selectedVolume.unit) : ''}
        projectVolumes={resolvedVolumes}
      />
    </div>
  )
}
