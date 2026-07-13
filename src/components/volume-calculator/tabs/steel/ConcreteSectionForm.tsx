import React, { useState, useEffect } from 'react'
import type { SectionElement, MainRebarRow } from '../../types'
import { diameterOptions, parseDiameter } from '../../helpers'
import { ConcreteSectionSvg } from '../ConcreteSectionSvg'

interface ConcreteSectionFormProps {
  editingElement: SectionElement | null
  onSave: (element: SectionElement) => void
  onCancel: () => void
  getSingleElementWeight: (el: SectionElement) => {
    mainWeight: number
    stirrupCount: number
    stirrupLengthM: number
    stirrupWeight: number
    totalWeight: number
  }
}

export function ConcreteSectionForm({
  editingElement,
  onSave,
  onCancel,
  getSingleElementWeight
}: ConcreteSectionFormProps): React.ReactElement {
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

  useEffect(() => {
    if (editingElement) {
      setFormName(editingElement.name)
      setFormB(editingElement.b)
      setFormH(editingElement.h)
      setFormCover(editingElement.c)
      setFormLength(editingElement.length)
      setFormQty(editingElement.qty)
      setFormMainRebarRows(editingElement.mainRebarRows)
      setFormStirrupMode(editingElement.stirrupMode)
      setFormStirrupDia(editingElement.stirrupDia)
      setFormStirrupSpacing(editingElement.stirrupSpacing)
      setFormStirrupSpacingTumpuan(editingElement.stirrupSpacingTumpuan)
      setFormStirrupSpacingLapangan(editingElement.stirrupSpacingLapangan)
    }
  }, [editingElement])

  const handleSave = () => {
    if (!formName.trim()) {
      alert('Nama elemen tidak boleh kosong')
      return
    }

    onSave({
      id: editingElement?.id || String(Date.now()),
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
    })
  }

  // Calculate totals based on active form state
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

  const totals = getSteelFormTotals()

  return (
    <div className="grid grid-cols-1 md:grid-cols-3 gap-6 font-sans">
      {/* Form Input fields */}
      <div className="md:col-span-2 space-y-4 border border-slate-100 rounded-xl p-4 bg-white shadow-sm text-xs">
        <div className="flex justify-between items-center border-b border-slate-100 pb-2">
          <span className="font-bold text-slate-800 text-sm">🛠️ Konfigurasi Parameter Elemen Struktur</span>
          <div className="flex gap-1">
            <button
              type="button"
              onClick={onCancel}
              className="px-2.5 py-1 bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold rounded"
            >
              Batal
            </button>
            <button
              type="button"
              onClick={handleSave}
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
            <label className="block font-semibold text-slate-500 uppercase tracking-wider mb-1 text-[9px]">Lebar b (mm)</label>
            <input
              type="number"
              value={formB}
              onChange={e => setFormB(e.target.value)}
              className="w-full px-2 py-1.5 border border-slate-200 rounded font-semibold font-mono text-right focus:outline-none focus:border-blue-500"
            />
          </div>
          <div>
            <label className="block font-semibold text-slate-500 uppercase tracking-wider mb-1 text-[9px]">Tinggi h (mm)</label>
            <input
              type="number"
              value={formH}
              onChange={e => setFormH(e.target.value)}
              className="w-full px-2 py-1.5 border border-slate-200 rounded font-semibold font-mono text-right focus:outline-none focus:border-blue-500"
            />
          </div>
          <div>
            <label className="block font-semibold text-slate-500 uppercase tracking-wider mb-1 text-[9px]">Selimut c (mm)</label>
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
            <label className="block font-semibold text-slate-500 uppercase tracking-wider mb-1 text-[9px]">Jumlah (Qty)</label>
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
              <span className="block">• Spacing Tumpuan dipasang di sepanjang 1/4 bentang L di ujung-ujung, Lapangan di 1/2 bentang tengah.</span>
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
            <span className="font-mono font-semibold">{totals.mainWeight.toFixed(2)} kg</span>
          </div>
          <div className="flex justify-between">
            <span className="text-gray-500">Besi Begel ({totals.stirrupCount}x @{totals.stirrupLengthM.toFixed(3)}m):</span>
            <span className="font-mono font-semibold">{totals.stirrupWeight.toFixed(2)} kg</span>
          </div>
          <hr className="border-slate-200" />
          <div className="flex justify-between items-center">
            <span className="font-bold text-slate-800">Total Berat:</span>
            <span className="font-mono font-extrabold text-blue-700 text-sm">{totals.totalWeight.toFixed(2)} kg</span>
          </div>
        </div>
      </div>
    </div>
  )
}
