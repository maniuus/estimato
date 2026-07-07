import React, { useState } from 'react'
import type { SteelRow, SectionElement, MainRebarRow } from '../types'
import { 
  diameterOptions, 
  parseDiameter, 
  getSteelRowWeight, 
  getSingleElementWeight,
  getSteelWeightPerMeter
} from '../helpers'
import { ConcreteSectionSvg } from './ConcreteSectionSvg'

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
  
  // Editor states for active editing element
  const [editingElementId, setEditingElementId] = useState<string | null>(null)
  const [formName, setFormName] = useState('Balok B1')
  const [formB, setFormB] = useState('200')
  const [formH, setFormH] = useState('300')
  const [formCover, setFormCover] = useState('40')
  const [formLength, setFormLength] = useState('4')
  const [formQty, setFormQty] = useState('1')
  const [formMainRebarRows, setFormMainRebarRows] = useState<MainRebarRow[]>([
    { id: '1', position: 'Atas', diameter: 'D13', qty: '2' },
    { id: '2', position: 'Bawah', diameter: 'D13', qty: '3' }
  ])
  const [formStirrupMode, setFormStirrupMode] = useState<'uniform' | 'split'>('uniform')
  const [formStirrupDia, setFormStirrupDia] = useState('Ø8')
  const [formStirrupSpacing, setFormStirrupSpacing] = useState('150')
  const [formStirrupSpacingTumpuan, setFormStirrupSpacingTumpuan] = useState('100')
  const [formStirrupSpacingLapangan, setFormStirrupSpacingLapangan] = useState('150')

  // Simple Table Mode Handlers
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

  // Section Element Templates
  const applyTemplate = (type: 'latei' | 'ringbalk' | 'kolom_praktis') => {
    setEditingElementId(String(Date.now()))
    if (type === 'latei') {
      setFormName('Balok Latei 10x10')
      setFormB('100')
      setFormH('100')
      setFormCover('20')
      setFormLength('4')
      setFormQty('1')
      setFormMainRebarRows([
        { id: '1', position: 'Atas', diameter: 'Ø8', qty: '2' },
        { id: '2', position: 'Bawah', diameter: 'Ø8', qty: '2' }
      ])
      setFormStirrupMode('uniform')
      setFormStirrupDia('Ø6')
      setFormStirrupSpacing('150')
    } else if (type === 'ringbalk') {
      setFormName('Ring Balk 15x20')
      setFormB('150')
      setFormH('200')
      setFormCover('25')
      setFormLength('4')
      setFormQty('1')
      setFormMainRebarRows([
        { id: '1', position: 'Atas', diameter: 'D10', qty: '2' },
        { id: '2', position: 'Bawah', diameter: 'D10', qty: '2' }
      ])
      setFormStirrupMode('uniform')
      setFormStirrupDia('Ø8')
      setFormStirrupSpacing('150')
    } else if (type === 'kolom_praktis') {
      setFormName('Kolom Praktis 15x15')
      setFormB('150')
      setFormH('150')
      setFormCover('20')
      setFormLength('4')
      setFormQty('1')
      setFormMainRebarRows([
        { id: '1', position: 'Atas', diameter: 'D10', qty: '2' },
        { id: '2', position: 'Bawah', diameter: 'D10', qty: '2' }
      ])
      setFormStirrupMode('uniform')
      setFormStirrupDia('Ø8')
      setFormStirrupSpacing('150')
    }
  }

  // Section Element CRUD
  const handleAddNewElement = () => {
    setEditingElementId(String(Date.now()))
    setFormName(`Elemen Beton ${sectionElements.length + 1}`)
    setFormB('200')
    setFormH('300')
    setFormCover('40')
    setFormLength('4')
    setFormQty('1')
    setFormMainRebarRows([
      { id: '1', position: 'Atas', diameter: 'D13', qty: '2' },
      { id: '2', position: 'Bawah', diameter: 'D13', qty: '3' }
    ])
    setFormStirrupMode('uniform')
    setFormStirrupDia('Ø8')
    setFormStirrupSpacing('150')
    setFormStirrupSpacingTumpuan('100')
    setFormStirrupSpacingLapangan('150')
  }

  const handleEditElement = (el: SectionElement) => {
    setEditingElementId(el.id)
    setFormName(el.name)
    setFormB(el.b)
    setFormH(el.h)
    setFormCover(el.c)
    setFormLength(el.length)
    setFormQty(el.qty)
    setFormMainRebarRows(el.mainRebarRows)
    setFormStirrupMode(el.stirrupMode)
    setFormStirrupDia(el.stirrupDia)
    setFormStirrupSpacing(el.stirrupSpacing)
    setFormStirrupSpacingTumpuan(el.stirrupSpacingTumpuan)
    setFormStirrupSpacingLapangan(el.stirrupSpacingLapangan)
  }

  const handleDeleteElement = (id: string) => {
    if (confirm('Hapus elemen rekap ini?')) {
      setSectionElements(sectionElements.filter(el => el.id !== id))
    }
  }

  const handleSaveElementToRekap = () => {
    if (!formName.trim()) {
      alert('Nama elemen tidak boleh kosong')
      return
    }

    const newEl: SectionElement = {
      id: editingElementId!,
      name: formName,
      b: formB,
      h: formH,
      c: formCover,
      length: formLength,
      qty: formQty,
      mainRebarRows: formMainRebarRows,
      stirrupMode: formStirrupMode,
      stirrupDia: formStirrupDia,
      stirrupSpacing: formStirrupSpacing,
      stirrupSpacingTumpuan: formStirrupSpacingTumpuan,
      stirrupSpacingLapangan: formStirrupSpacingLapangan
    }

    if (sectionElements.some(el => el.id === editingElementId)) {
      setSectionElements(sectionElements.map(el => el.id === editingElementId ? newEl : el))
    } else {
      setSectionElements([...sectionElements, newEl])
    }
    setEditingElementId(null)
  }

  const getSteelFormTotals = () => {
    const dummyEl: SectionElement = {
      id: 'dummy',
      name: formName,
      b: formB,
      h: formH,
      c: formCover,
      length: formLength,
      qty: formQty,
      mainRebarRows: formMainRebarRows,
      stirrupMode: formStirrupMode,
      stirrupDia: formStirrupDia,
      stirrupSpacing: formStirrupSpacing,
      stirrupSpacingTumpuan: formStirrupSpacingTumpuan,
      stirrupSpacingLapangan: formStirrupSpacingLapangan
    }
    return getSingleElementWeight(dummyEl)
  }

  const getRebarBarBreakdown = () => {
    const breakdown: Record<string, { diameter: string; totalLength: number; totalWeight: number }> = {}

    const addRecord = (dia: string, len: number, qty: number, mult: number) => {
      if (!dia) return
      const cleanDia = dia.trim()
      const weightPerMeter = getSteelWeightPerMeter(cleanDia)
      const rowLen = len * qty * mult
      const rowWeight = rowLen * weightPerMeter
      
      if (!breakdown[cleanDia]) {
        breakdown[cleanDia] = { diameter: cleanDia, totalLength: 0, totalWeight: 0 }
      }
      breakdown[cleanDia].totalLength += rowLen
      breakdown[cleanDia].totalWeight += rowWeight
    }

    if (steelMode === 'section') {
      sectionElements.forEach(el => {
        const len = parseFloat(el.length) || 0
        const eqty = parseFloat(el.qty) || 0
        if (len <= 0 || eqty <= 0) return

        // 1. Longitudinal
        el.mainRebarRows.forEach(row => {
          const qty = parseFloat(row.qty) || 0
          addRecord(row.diameter, len, qty, eqty)
        })

        // 2. Stirrups (Begel)
        const res = getSingleElementWeight(el)
        addRecord(el.stirrupDia, res.stirrupLengthM, res.stirrupCount, eqty)
      })
    } else {
      steelRows.forEach(row => {
        const len = parseFloat(row.length) || 0
        const qty = parseFloat(row.qty) || 0
        const mult = parseFloat(row.mult) || 1
        addRecord(row.diameter, len, qty, mult)
      })
    }

    return Object.values(breakdown).sort((a, b) => {
      const sizeA = parseFloat(a.diameter.replace(/[^\d.]/g, '')) || 0
      const sizeB = parseFloat(b.diameter.replace(/[^\d.]/g, '')) || 0
      return sizeB - sizeA
    })
  }

  return (
    <div className="space-y-4">
      {/* Mode Switcher */}
      <div className="flex border-b border-gray-100 bg-gray-50/50 p-1.5 rounded-lg border w-fit gap-1 text-xs">
        <button
          type="button"
          onClick={() => { setSteelMode('table'); setEditingElementId(null); }}
          className={`px-3 py-1.5 rounded font-bold transition-all ${
            steelMode === 'table' ? 'bg-slate-800 text-white shadow-sm' : 'text-slate-600 hover:bg-slate-100'
          }`}
        >
          ⛓️ Daftar Besi (Tabel Baris)
        </button>
        <button
          type="button"
          onClick={() => setSteelMode('section')}
          className={`px-3 py-1.5 rounded font-bold transition-all ${
            steelMode === 'section' ? 'bg-slate-800 text-white shadow-sm' : 'text-slate-600 hover:bg-slate-100'
          }`}
        >
          🧱 Rekap Penampang Beton (Sipil)
        </button>
      </div>

      {/* TABLE MODE */}
      {steelMode === 'table' && (
        <div className="space-y-4">
          <div className="flex justify-between items-center">
            <h4 className="font-bold text-sm text-slate-800">Daftar Kebutuhan Besi</h4>
            <button
              type="button"
              onClick={handleAddSteelRow}
              className="btn-primary text-xs px-3 py-1 bg-slate-800 hover:bg-slate-900"
            >
              + Tambah Baris
            </button>
          </div>

          <div className="border border-gray-200 rounded-lg overflow-hidden bg-white shadow-sm">
            <table className="w-full text-xs">
              <thead>
                <tr className="bg-slate-50 border-b border-gray-200 text-gray-500 font-semibold uppercase">
                  <th className="px-3 py-2.5 text-center w-12">No</th>
                  <th className="px-3 py-2.5 text-left">Deskripsi Komponen / Lokasi</th>
                  <th className="px-3 py-2.5 text-center w-24">Diameter</th>
                  <th className="px-3 py-2.5 text-right w-24">Panjang (m)</th>
                  <th className="px-3 py-2.5 text-right w-20">Jumlah (Qty)</th>
                  <th className="px-3 py-2.5 text-right w-20">Multiplier (x)</th>
                  <th className="px-3 py-2.5 text-right w-32">Total Berat (kg)</th>
                  <th className="px-2 py-2.5 text-center w-10">Aksi</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100 font-sans">
                {steelRows.map((row, idx) => {
                  const rowWeight = getSteelRowWeight(row)
                  return (
                    <tr key={row.id} className="hover:bg-slate-50/50">
                      <td className="py-2 text-center text-gray-400 font-medium">{idx + 1}</td>
                      <td className="py-2 pr-2 pl-3">
                        <input
                          type="text"
                          value={row.description}
                          onChange={e => handleSteelRowChange(row.id, 'description', e.target.value)}
                          placeholder="Contoh: Tulangan Utama Balok"
                          className="w-full px-2.5 py-1 border border-gray-200 rounded text-xs focus:ring-1 focus:ring-primary-500"
                        />
                      </td>
                      <td className="py-2 px-1 text-center">
                        <select
                          value={row.diameter}
                          onChange={e => handleSteelRowChange(row.id, 'diameter', e.target.value)}
                          className="px-1.5 py-1 border border-gray-200 rounded text-xs bg-slate-50 focus:outline-none"
                        >
                          {diameterOptions.map(opt => (
                            <option key={opt} value={opt}>{opt}</option>
                          ))}
                        </select>
                      </td>
                      <td className="py-2 px-1">
                        <input
                          type="number"
                          step="any"
                          value={row.length}
                          onChange={e => handleSteelRowChange(row.id, 'length', e.target.value)}
                          placeholder="12.00"
                          className="w-full px-2 py-1 border border-gray-200 rounded text-right font-mono text-xs"
                        />
                      </td>
                      <td className="py-2 px-1">
                        <input
                          type="number"
                          step="any"
                          value={row.qty}
                          onChange={e => handleSteelRowChange(row.id, 'qty', e.target.value)}
                          placeholder="4"
                          className="w-full px-2 py-1 border border-gray-200 rounded text-right font-mono text-xs"
                        />
                      </td>
                      <td className="py-2 px-1">
                        <input
                          type="number"
                          step="any"
                          value={row.mult}
                          onChange={e => handleSteelRowChange(row.id, 'mult', e.target.value)}
                          placeholder="1"
                          className="w-full px-2 py-1 border border-gray-200 rounded text-right font-mono text-xs"
                        />
                      </td>
                      <td className="py-2 pl-2 pr-3 text-right font-mono font-semibold text-gray-700">
                        {rowWeight.toFixed(2)}
                      </td>
                      <td className="py-2 text-center pr-2">
                        <button
                          type="button"
                          onClick={() => handleRemoveSteelRow(row.id)}
                          disabled={steelRows.length <= 1}
                          className="text-red-500 hover:text-red-700 p-1 disabled:opacity-30 rounded"
                        >
                          &times;
                        </button>
                      </td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* REKAP PENAMPANG BETON (SIPIL) */}
      {steelMode === 'section' && (
        <div className="space-y-4">
          {editingElementId === null ? (
            /* Rekap List View */
            <div className="space-y-4">
              <div className="flex justify-between items-center bg-slate-50 border border-slate-100 rounded-lg p-3">
                <div className="flex items-center gap-1.5">
                  <span className="text-xs font-bold text-slate-500 uppercase tracking-wider">Gunakan Template Penampang Instan:</span>
                  <button
                    type="button"
                    onClick={() => applyTemplate('latei')}
                    className="px-2 py-1 bg-white hover:bg-slate-100 text-slate-700 border border-slate-200 rounded text-[10px] font-bold shadow-sm"
                  >
                    Latei 10x10
                  </button>
                  <button
                    type="button"
                    onClick={() => applyTemplate('ringbalk')}
                    className="px-2 py-1 bg-white hover:bg-slate-100 text-slate-700 border border-slate-200 rounded text-[10px] font-bold shadow-sm"
                  >
                    Ring Balk 15x20
                  </button>
                  <button
                    type="button"
                    onClick={() => applyTemplate('kolom_praktis')}
                    className="px-2 py-1 bg-white hover:bg-slate-100 text-slate-700 border border-slate-200 rounded text-[10px] font-bold shadow-sm"
                  >
                    Kolom Praktis 15x15
                  </button>
                </div>

                <button
                  type="button"
                  onClick={handleAddNewElement}
                  className="px-3 py-1.5 bg-blue-600 hover:bg-blue-700 text-white rounded font-bold text-xs shadow-sm flex items-center gap-1"
                >
                  + Tambah Elemen Baru
                </button>
              </div>

              {sectionElements.length === 0 ? (
                <div className="p-8 text-center text-gray-400 italic text-xs bg-slate-50 border border-slate-100 rounded-lg">
                  Belum ada rekap elemen struktur. Klik "+ Tambah Elemen Baru" atau gunakan template di atas.
                </div>
              ) : (
                <div className="border border-slate-200 rounded-lg overflow-hidden bg-white shadow-sm">
                  <table className="w-full text-left text-xs border-collapse">
                    <thead>
                      <tr className="bg-slate-50 border-b border-slate-200 text-slate-700 font-semibold uppercase text-[10px]">
                        <th className="py-2 px-3">Nama Elemen</th>
                        <th className="py-2 px-3 text-center">Ukuran (b x h)</th>
                        <th className="py-2 px-3 text-center">Panjang (L)</th>
                        <th className="py-2 px-3 text-center">Jumlah (Qty)</th>
                        <th className="py-2 px-3">Tulangan Utama</th>
                        <th className="py-2 px-3">Sengkang (Begel)</th>
                        <th className="py-2 px-3 text-right">Total Berat (kg)</th>
                        <th className="py-2 px-3 text-center">Aksi</th>
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
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6 font-sans">
              
              {/* Form Input fields */}
              <div className="md:col-span-2 space-y-4 border border-slate-100 rounded-xl p-4 bg-white shadow-sm text-xs">
                <div className="flex justify-between items-center border-b border-slate-100 pb-2">
                  <span className="font-bold text-slate-800 text-sm">🛠️ Konfigurasi Parameter Elemen Struktur</span>
                  <div className="flex gap-1">
                    <button
                      type="button"
                      onClick={() => setEditingElementId(null)}
                      className="px-2.5 py-1 bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold rounded"
                    >
                      Batal
                    </button>
                    <button
                      type="button"
                      onClick={handleSaveElementToRekap}
                      className="px-2.5 py-1 bg-blue-600 hover:bg-blue-700 text-white font-bold rounded"
                    >
                      Simpan Elemen Ke Rekap
                    </button>
                  </div>
                </div>

                <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                  <div>
                    <label className="block font-semibold text-slate-500 uppercase tracking-wider mb-1 text-[9px]">Nama Elemen</label>
                    <input
                      type="text"
                      value={formName}
                      onChange={e => setFormName(e.target.value)}
                      placeholder="Contoh: Balok B1"
                      className="w-full px-2 py-1.5 border border-slate-200 rounded font-semibold focus:outline-none focus:border-blue-500"
                    />
                  </div>
                  <div>
                    <label className="block font-semibold text-slate-500 uppercase tracking-wider mb-1 text-[9px]">Lebar Beton b (mm)</label>
                    <input
                      type="number"
                      value={formB}
                      onChange={e => setFormB(e.target.value)}
                      className="w-full px-2 py-1.5 border border-slate-200 rounded font-semibold font-mono text-right focus:outline-none focus:border-blue-500"
                    />
                  </div>
                  <div>
                    <label className="block font-semibold text-slate-500 uppercase tracking-wider mb-1 text-[9px]">Tinggi Beton h (mm)</label>
                    <input
                      type="number"
                      value={formH}
                      onChange={e => setFormH(e.target.value)}
                      className="w-full px-2 py-1.5 border border-slate-200 rounded font-semibold font-mono text-right focus:outline-none focus:border-blue-500"
                    />
                  </div>
                  <div>
                    <label className="block font-semibold text-slate-500 uppercase tracking-wider mb-1 text-[9px]">Selimut Beton c (mm)</label>
                    <input
                      type="number"
                      value={formCover}
                      onChange={e => setFormCover(e.target.value)}
                      className="w-full px-2 py-1.5 border border-slate-200 rounded font-semibold font-mono text-right focus:outline-none focus:border-blue-500"
                    />
                  </div>
                </div>

                <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                  <div>
                    <label className="block font-semibold text-slate-500 uppercase tracking-wider mb-1 text-[9px]">Bentang L (m)</label>
                    <input
                      type="number"
                      step="any"
                      value={formLength}
                      onChange={e => setFormLength(e.target.value)}
                      className="w-full px-2 py-1.5 border border-slate-200 rounded font-semibold font-mono text-right focus:outline-none focus:border-blue-500"
                    />
                  </div>
                  <div>
                    <label className="block font-semibold text-slate-500 uppercase tracking-wider mb-1 text-[9px]">Jumlah Elemen (Qty)</label>
                    <input
                      type="number"
                      value={formQty}
                      onChange={e => setFormQty(e.target.value)}
                      className="w-full px-2 py-1.5 border border-slate-200 rounded font-semibold font-mono text-right focus:outline-none focus:border-blue-500"
                    />
                  </div>
                </div>

                {/* Main longitudinal rebar configurator */}
                <div className="space-y-2 border-t border-slate-100 pt-3">
                  <div className="flex justify-between items-center">
                    <span className="font-bold text-slate-700">1. Tulangan Utama (Longitudinal)</span>
                    <button
                      type="button"
                      onClick={() => setFormMainRebarRows([
                        ...formMainRebarRows,
                        { id: String(Date.now()), position: 'Atas', diameter: 'D13', qty: '2' }
                      ])}
                      className="px-2 py-1 bg-slate-800 text-white rounded font-bold text-[10px]"
                    >
                      + Tambah Tulangan
                    </button>
                  </div>

                  <table className="w-full">
                    <thead>
                      <tr className="text-left text-slate-400 text-[9px] uppercase tracking-wider border-b border-slate-100">
                        <th className="pb-1 w-24">Posisi</th>
                        <th className="pb-1 w-32">Diameter</th>
                        <th className="pb-1 w-24 text-right">Jumlah (Qty)</th>
                        <th className="pb-1 w-10"></th>
                      </tr>
                    </thead>
                    <tbody>
                      {formMainRebarRows.map((row, idx) => (
                        <tr key={row.id}>
                          <td className="py-1">
                            <select
                              value={row.position}
                              onChange={e => {
                                const next = [...formMainRebarRows]
                                next[idx].position = e.target.value as any
                                setFormMainRebarRows(next)
                              }}
                              className="px-1.5 py-1 border border-slate-200 rounded text-xs bg-slate-50 w-full"
                            >
                              <option value="Atas">Atas</option>
                              <option value="Bawah">Bawah</option>
                              <option value="Samping">Samping</option>
                            </select>
                          </td>
                          <td className="py-1 px-2">
                            <select
                              value={row.diameter}
                              onChange={e => {
                                const next = [...formMainRebarRows]
                                next[idx].diameter = e.target.value
                                setFormMainRebarRows(next)
                              }}
                              className="px-1.5 py-1 border border-slate-200 rounded text-xs bg-slate-50 w-full"
                            >
                              {diameterOptions.map(opt => (
                                <option key={opt} value={opt}>{opt}</option>
                              ))}
                            </select>
                          </td>
                          <td className="py-1">
                            <input
                              type="number"
                              value={row.qty}
                              onChange={e => {
                                const next = [...formMainRebarRows]
                                next[idx].qty = e.target.value
                                setFormMainRebarRows(next)
                              }}
                              className="w-full px-2 py-1 border border-slate-200 rounded font-semibold font-mono text-right text-xs"
                            />
                          </td>
                          <td className="py-1 text-center">
                            <button
                              type="button"
                              onClick={() => setFormMainRebarRows(formMainRebarRows.filter(r => r.id !== row.id))}
                              disabled={formMainRebarRows.length <= 1}
                              className="text-red-500 hover:text-red-700 disabled:opacity-30 text-base"
                            >
                              &times;
                            </button>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>

                {/* Stirrup rebar configurator */}
                <div className="space-y-3 border-t border-slate-100 pt-3">
                  <div className="flex justify-between items-center">
                    <span className="font-bold text-slate-700">2. Tulangan Begel / Sengkang (Transversal)</span>
                    
                    {/* Uniform vs Split spacing toggle */}
                    <div className="flex border border-slate-200 p-0.5 rounded bg-slate-100/50 gap-0.5 text-[10px]">
                      <button
                        type="button"
                        onClick={() => setFormStirrupMode('uniform')}
                        className={`px-2 py-0.5 rounded font-bold transition-all ${
                          formStirrupMode === 'uniform' ? 'bg-slate-700 text-white shadow-sm' : 'text-slate-600'
                        }`}
                      >
                        Seragam (Uniform)
                      </button>
                      <button
                        type="button"
                        onClick={() => setFormStirrupMode('split')}
                        className={`px-2 py-0.5 rounded font-bold transition-all ${
                          formStirrupMode === 'split' ? 'bg-slate-700 text-white shadow-sm' : 'text-slate-600'
                        }`}
                      >
                        Tumpuan & Lapangan
                      </button>
                    </div>
                  </div>

                  <div className="grid grid-cols-2 md:grid-cols-4 gap-3 bg-slate-50/50 p-2.5 rounded-lg border border-slate-100">
                    <div>
                      <label className="block font-semibold text-slate-500 uppercase tracking-wider mb-1 text-[9px]">Dia Begel</label>
                      <select
                        value={formStirrupDia}
                        onChange={e => setFormStirrupDia(e.target.value)}
                        className="px-1.5 py-1 border border-slate-200 rounded text-xs bg-white w-full"
                      >
                        {diameterOptions.filter(d => d.startsWith('Ø')).map(opt => (
                          <option key={opt} value={opt}>{opt}</option>
                        ))}
                      </select>
                    </div>

                    {formStirrupMode === 'uniform' ? (
                      <div>
                        <label className="block font-semibold text-slate-500 uppercase tracking-wider mb-1 text-[9px]">Jarak Spacing (mm)</label>
                        <input
                          type="number"
                          value={formStirrupSpacing}
                          onChange={e => setFormStirrupSpacing(e.target.value)}
                          className="w-full px-2 py-1 border border-slate-200 rounded font-semibold font-mono text-right text-xs focus:outline-none"
                        />
                      </div>
                    ) : (
                      <>
                        <div>
                          <label className="block font-semibold text-slate-500 uppercase tracking-wider mb-1 text-[9px]">Jarak Tumpuan (mm)</label>
                          <input
                            type="number"
                            value={formStirrupSpacingTumpuan}
                            onChange={e => setFormStirrupSpacingTumpuan(e.target.value)}
                            className="w-full px-2 py-1 border border-slate-200 rounded font-semibold font-mono text-right text-xs focus:outline-none"
                          />
                        </div>
                        <div>
                          <label className="block font-semibold text-slate-500 uppercase tracking-wider mb-1 text-[9px]">Jarak Lapangan (mm)</label>
                          <input
                            type="number"
                            value={formStirrupSpacingLapangan}
                            onChange={e => setFormStirrupSpacingLapangan(e.target.value)}
                            className="w-full px-2 py-1 border border-slate-200 rounded font-semibold font-mono text-right text-xs focus:outline-none"
                          />
                        </div>
                      </>
                    )}
                  </div>

                  {/* Standard civil notes */}
                  <div className="p-2.5 bg-blue-50/50 border border-blue-100 rounded-lg text-[9px] text-blue-700 leading-normal space-y-0.5">
                    <span className="font-bold block text-blue-800">💡 Informasi Standar Kait Sipil (135° Hook):</span>
                    <span>• Panjang tekukan hook sengkang dihitung otomatis: 2 x 6d ({12 * (parseDiameter(formStirrupDia).size)} mm)</span>
                    {formStirrupMode === 'split' && (
                      <span className="block">• Spacing Tumpuan dipasang di sepanjang 1/4 bentang kiri + 1/4 bentang kanan (total 1/2 L), sedangkan Lapangan dipasang di sepanjang 1/2 bentang tengah.</span>
                    )}
                  </div>
                </div>
              </div>

              {/* SVG Live Preview panel on the right */}
              <div className="space-y-4">
                <ConcreteSectionSvg
                  bVal={formB}
                  hVal={formH}
                  cVal={formCover}
                  mainRebarRows={formMainRebarRows}
                  stirrupDia={formStirrupDia}
                />

                {/* Subtotal preview card */}
                <div className="bg-slate-50 border border-slate-200 rounded-xl p-3 flex flex-col gap-1.5 shadow-inner text-xs font-sans">
                  <span className="font-bold text-slate-700 border-b border-slate-200 pb-1 mb-1">Hasil Perhitungan Elemen:</span>
                  <div className="flex justify-between">
                    <span className="text-gray-500">Tulangan Utama:</span>
                    <span className="font-mono font-semibold">{getSteelFormTotals().mainWeight.toFixed(2)} kg</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-gray-500">Besi Begel ({getSteelFormTotals().stirrupCount}x @{getSteelFormTotals().stirrupLengthM.toFixed(3)}m):</span>
                    <span className="font-mono font-semibold">{getSteelFormTotals().stirrupWeight.toFixed(2)} kg</span>
                  </div>
                  <hr className="border-slate-200" />
                  <div className="flex justify-between items-center">
                    <span className="font-bold text-slate-800">Total Berat:</span>
                    <span className="font-mono font-extrabold text-blue-700 text-sm">{getSteelFormTotals().totalWeight.toFixed(2)} kg</span>
                  </div>
                </div>
              </div>

            </div>
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
