import React, { useState } from 'react'
import type { SteelRow, SectionElement } from '../types'
import { 
  getSteelRowWeight, 
  getSingleElementWeight,
  getSteelWeightPerMeter
} from '../helpers'
import { SteelSimpleTable } from './steel/SteelSimpleTable'
import { ConcreteSectionForm } from './steel/ConcreteSectionForm'

interface SteelTabProps {
  steelRows: SteelRow[]
  setSteelRows: React.Dispatch<React.SetStateAction<SteelRow[]>>
  steelMode: 'table' | 'section'
  setSteelMode: (mode: 'table' | 'section') => void
  sectionElements: SectionElement[]
  setSectionElements: React.Dispatch<React.SetStateAction<SectionElement[]>>
  unit: string
}

export function SteelTab({
  steelRows,
  setSteelRows,
  steelMode,
  setSteelMode,
  sectionElements,
  setSectionElements,
  unit
}: SteelTabProps): React.ReactElement {
  
  const [editingElementId, setEditingElementId] = useState<string | null>(null)

  // Simple Table Handlers
  const handleAddSteelRow = () => {
    setSteelRows([
      ...steelRows,
      { id: String(Date.now()), description: '', diameter: 'Ø10', length: '', qty: '', mult: '1' }
    ])
  }

  const handleRemoveSteelRow = (id: string) => {
    setSteelRows(steelRows.filter(r => r.id !== id))
  }

  const handleSteelRowChange = (id: string, field: keyof SteelRow, value: string) => {
    setSteelRows(steelRows.map(r => r.id === id ? { ...r, [field]: value } : r))
  }

  const getSteelTotal = (): number => {
    if (steelMode === 'section') {
      return sectionElements.reduce((sum, el) => sum + getSingleElementWeight(el).totalWeight, 0)
    }
    return steelRows.reduce((sum, r) => sum + getSteelRowWeight(r), 0)
  }

  // Templates
  const applyTemplate = (type: 'latei' | 'ringbalk' | 'kolom_praktis') => {
    const id = String(Date.now())
    setEditingElementId(id)
    
    let defaultEl: SectionElement
    if (type === 'latei') {
      defaultEl = {
        id,
        name: 'Balok Latei 10x10',
        b: '100', h: '100', c: '20', length: '4', qty: '1',
        mainRebarRows: [
          { id: '1', position: 'Atas', diameter: 'Ø8', qty: '2' },
          { id: '2', position: 'Bawah', diameter: 'Ø8', qty: '2' }
        ],
        stirrupMode: 'uniform', stirrupDia: 'Ø6', stirrupSpacing: '150',
        stirrupSpacingTumpuan: '100', stirrupSpacingLapangan: '150'
      }
    } else if (type === 'ringbalk') {
      defaultEl = {
        id,
        name: 'Ring Balk 15x20',
        b: '150', h: '200', c: '25', length: '4', qty: '1',
        mainRebarRows: [
          { id: '1', position: 'Atas', diameter: 'D10', qty: '2' },
          { id: '2', position: 'Bawah', diameter: 'D10', qty: '2' }
        ],
        stirrupMode: 'uniform', stirrupDia: 'Ø8', stirrupSpacing: '150',
        stirrupSpacingTumpuan: '100', stirrupSpacingLapangan: '150'
      }
    } else {
      defaultEl = {
        id,
        name: 'Kolom Praktis 15x15',
        b: '150', h: '150', c: '20', length: '4', qty: '1',
        mainRebarRows: [
          { id: '1', position: 'Atas', diameter: 'D10', qty: '2' },
          { id: '2', position: 'Bawah', diameter: 'D10', qty: '2' }
        ],
        stirrupMode: 'uniform', stirrupDia: 'Ø8', stirrupSpacing: '150',
        stirrupSpacingTumpuan: '100', stirrupSpacingLapangan: '150'
      }
    }

    setSectionElements([...sectionElements.filter(el => el.id !== editingElementId), defaultEl])
  }

  const handleAddNewElement = () => {
    setEditingElementId(String(Date.now()))
  }

  const handleEditElement = (el: SectionElement) => {
    setEditingElementId(el.id)
  }

  const handleDeleteElement = (id: string) => {
    if (confirm('Hapus elemen rekap ini?')) {
      setSectionElements(sectionElements.filter(el => el.id !== id))
    }
  }

  const handleSaveElement = (newEl: SectionElement) => {
    if (sectionElements.some(el => el.id === newEl.id)) {
      setSectionElements(sectionElements.map(el => el.id === newEl.id ? newEl : el))
    } else {
      setSectionElements([...sectionElements, newEl])
    }
    setEditingElementId(null)
  }

  // 12m commercial bar normalization breakdown
  const getRebarBarBreakdown = (): { diameter: string, totalLength: number }[] => {
    const map: Record<string, number> = {}

    if (steelMode === 'section') {
      sectionElements.forEach(el => {
        const eqty = parseFloat(el.qty) || 0
        const len = parseFloat(el.length) || 0
        
        el.mainRebarRows.forEach(r => {
          const qty = parseFloat(r.qty) || 0
          const totalLength = qty * len * eqty
          map[r.diameter] = (map[r.diameter] || 0) + totalLength
        })

        const res = getSingleElementWeight(el)
        const stirrupTotalLength = res.stirrupCount * res.stirrupLengthM * eqty
        if (stirrupTotalLength > 0) {
          map[el.stirrupDia] = (map[el.stirrupDia] || 0) + stirrupTotalLength
        }
      })
    } else {
      steelRows.forEach(r => {
        if (!r.diameter || !r.length || !r.qty) return
        const len = parseFloat(r.length) || 0
        const qty = parseFloat(r.qty) || 0
        const mult = parseFloat(r.mult) || 1
        const totalLen = len * qty * mult
        map[r.diameter] = (map[r.diameter] || 0) + totalLen
      })
    }

    return Object.keys(map)
      .map(dia => ({ diameter: dia, totalLength: map[dia] }))
      .sort((a, b) => b.totalLength - a.totalLength)
  }

  const editingElementObj = sectionElements.find(el => el.id === editingElementId) || null

  return (
    <div className="space-y-6">
      {/* Mode Selector */}
      <div className="flex border border-slate-200 p-0.5 rounded-lg bg-slate-100/60 gap-0.5 w-fit text-xs font-sans no-print">
        <button
          type="button"
          onClick={() => setSteelMode('table')}
          className={`px-4 py-1.5 rounded-md font-bold transition-all ${
            steelMode === 'table' ? 'bg-slate-800 text-white shadow-sm' : 'text-slate-600 hover:bg-slate-100'
          }`}
        >
          📝 Tabel Komponen Manual
        </button>
        <button
          type="button"
          onClick={() => setSteelMode('section')}
          className={`px-4 py-1.5 rounded-md font-bold transition-all ${
            steelMode === 'section' ? 'bg-slate-800 text-white shadow-sm' : 'text-slate-600 hover:bg-slate-100'
          }`}
        >
          🧱 Rekap Penampang Beton (Sipil)
        </button>
      </div>

      {/* TABLE MODE */}
      {steelMode === 'table' && (
        <SteelSimpleTable
          steelRows={steelRows}
          onAddRow={handleAddSteelRow}
          onRemoveRow={handleRemoveSteelRow}
          onRowChange={handleSteelRowChange}
        />
      )}

      {/* REKAP PENAMPANG BETON (SIPIL) */}
      {steelMode === 'section' && (
        <div className="space-y-4">
          {editingElementId === null ? (
            /* Rekap List View */
            <div className="space-y-4 font-sans text-xs">
              <div className="flex justify-between items-center bg-slate-50 p-3 rounded-lg border border-slate-150">
                <div className="flex items-center gap-2">
                  <span className="font-bold text-slate-700">Template Cepat:</span>
                  <button
                    type="button"
                    onClick={() => applyTemplate('latei')}
                    className="px-2.5 py-1 bg-white hover:bg-slate-100 text-slate-700 border border-slate-200 rounded font-semibold shadow-sm"
                  >
                    + Latei 10x10
                  </button>
                  <button
                    type="button"
                    onClick={() => applyTemplate('ringbalk')}
                    className="px-2.5 py-1 bg-white hover:bg-slate-100 text-slate-700 border border-slate-200 rounded font-semibold shadow-sm"
                  >
                    + Ringbalk 15x20
                  </button>
                  <button
                    type="button"
                    onClick={() => applyTemplate('kolom_praktis')}
                    className="px-2.5 py-1 bg-white hover:bg-slate-100 text-slate-700 border border-slate-200 rounded font-semibold shadow-sm"
                  >
                    + Kolom Praktis 15x15
                  </button>
                </div>
                <button
                  type="button"
                  onClick={handleAddNewElement}
                  className="btn-primary text-xs px-3 py-1 bg-slate-800 hover:bg-slate-900 flex items-center gap-1"
                >
                  <span>+ Elemen Baru</span>
                </button>
              </div>

              {sectionElements.length === 0 ? (
                <div className="card p-8 text-center text-slate-400 italic">
                  Belum ada rekap penampang beton. Silakan buat elemen baru atau gunakan template di atas.
                </div>
              ) : (
                <div className="border border-slate-200 rounded-lg overflow-hidden bg-white shadow-sm">
                  <table className="w-full text-xs">
                    <thead>
                      <tr className="bg-slate-50 border-b border-slate-200 text-gray-500 font-semibold uppercase">
                        <th className="px-3 py-2.5 text-left">Nama Elemen</th>
                        <th className="px-3 py-2.5 text-center w-28">Dimensi (b x h)</th>
                        <th className="px-3 py-2.5 text-center w-24">Bentang L</th>
                        <th className="px-3 py-2.5 text-center w-20">Qty</th>
                        <th className="px-3 py-2.5 text-left">Tulangan Utama</th>
                        <th className="px-3 py-2.5 text-left w-36">Begel (Sengkang)</th>
                        <th className="px-3 py-2.5 text-right w-32">Total Berat</th>
                        <th className="px-3 py-2.5 text-center w-20">Aksi</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100 font-sans">
                      {sectionElements.map(el => {
                        const res = getSingleElementWeight(el)
                        const sizeText = `${el.b}x${el.h} mm`
                        const mainRebarSummaryText = el.mainRebarRows
                          .map(r => `${r.position}: ${r.qty}x${r.diameter}`)
                          .join(', ')
                        const stirrupText = el.stirrupMode === 'split'
                          ? `${el.stirrupDia} @${el.stirrupSpacingTumpuan} (t) / @${el.stirrupSpacingLapangan} (l)`
                          : `${el.stirrupDia} @${el.stirrupSpacing}`

                        return (
                          <tr key={el.id} className="hover:bg-slate-50/50">
                            <td className="py-2.5 px-3 font-semibold text-slate-800">{el.name}</td>
                            <td className="py-2.5 px-3 text-center text-slate-600 font-mono">{sizeText}</td>
                            <td className="py-2.5 px-3 text-center text-slate-600 font-mono">{el.length} m</td>
                            <td className="py-2.5 px-3 text-center text-slate-600 font-mono">{el.qty}x</td>
                            <td className="py-2.5 px-3 text-slate-500 font-medium">{mainRebarSummaryText}</td>
                            <td className="py-2.5 px-3 text-slate-500 font-medium">{stirrupText}</td>
                            <td className="py-2.5 px-3 text-right font-mono font-bold text-slate-700">{res.totalWeight.toFixed(2)} kg</td>
                            <td className="py-2.5 px-3 text-center">
                              <div className="flex items-center justify-center gap-1.5">
                                <button
                                  type="button"
                                  onClick={() => handleEditElement(el)}
                                  className="px-2 py-0.5 border border-slate-200 hover:border-slate-300 rounded font-bold text-[10px] text-slate-600 bg-slate-50 shadow-sm"
                                >
                                  Edit
                                </button>
                                <button
                                  type="button"
                                  onClick={() => handleDeleteElement(el.id)}
                                  className="p-0.5 border border-red-100 hover:border-red-200 rounded text-red-500 text-[10px] bg-red-50/50"
                                  title="Hapus"
                                >
                                  ✕
                                </button>
                              </div>
                            </td>
                          </tr>
                        )
                      })}
                    </tbody>
                  </table>
                </div>
              )}
            </div>
          ) : (
            /* Rekap Editor Form */
            <ConcreteSectionForm
              editingElement={editingElementObj}
              onSave={handleSaveElement}
              onCancel={() => setEditingElementId(null)}
              getSingleElementWeight={getSingleElementWeight}
            />
          )}
        </div>
      )}

      {/* BATCH LENGTH BREAKDOWN CARD (12m Bar Normalization) */}
      <div className="bg-slate-50/50 border border-slate-200 rounded-xl p-4 font-sans grid grid-cols-1 md:grid-cols-2 gap-4">
        <div>
          <span className="block text-xs font-bold text-slate-500 uppercase tracking-wider mb-2">Breakdown Kebutuhan Batang Besi Pasar (12m):</span>
          {getRebarBarBreakdown().length === 0 ? (
            <div className="text-[10px] text-gray-400 italic">Belum ada data resep besi.</div>
          ) : (
            <div className="space-y-1.5 max-h-36 overflow-y-auto pr-1">
              {getRebarBarBreakdown().map(b => {
                const batangs = b.totalLength / 12
                const roundedBatang = Math.ceil(batangs)
                return (
                  <div key={b.diameter} className="flex justify-between items-center text-xs bg-white px-2 py-1 rounded border border-slate-100 shadow-sm font-mono">
                    <div className="flex items-center gap-1.5">
                      <span className="font-bold text-slate-700">{b.diameter}</span>
                      <span className="text-[10px] text-gray-400">({b.totalLength.toFixed(1)} m)</span>
                    </div>
                    <div className="flex items-center gap-2">
                      <span className="text-gray-400 text-[10px]">{batangs.toFixed(2)} btg</span>
                      <span className="font-extrabold text-blue-700 text-[11px]">≈ {roundedBatang} btg (12m)</span>
                    </div>
                  </div>
                )
              })}
            </div>
          )}
        </div>

        {/* Global Total Weight display */}
        <div className="flex flex-col justify-center items-end bg-slate-50 border border-gray-200 rounded-xl px-5 py-3 shadow-inner">
          <span className="text-gray-500 font-medium text-xs mb-1">Total Berat Besi:</span>
          <span className="text-3xl font-extrabold text-primary-800 font-mono">
            {getSteelTotal().toLocaleString('id-ID', { minimumFractionDigits: 0, maximumFractionDigits: 2 })} {unit || 'kg'}
          </span>
        </div>
      </div>
    </div>
  )
}
