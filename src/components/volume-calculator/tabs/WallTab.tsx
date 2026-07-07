import React from 'react'
import type { WallRow, OpeningRow } from '../types'
import { 
  getWallRowArea, 
  getWallGrossArea, 
  getOpeningArea, 
  getWallTotalOpenings, 
  getWallNetArea 
} from '../helpers'

interface WallTabProps {
  wallRows: WallRow[]
  setWallRows: React.Dispatch<React.SetStateAction<WallRow[]>>
  openings: OpeningRow[]
  setOpenings: React.Dispatch<React.SetStateAction<OpeningRow[]>>
  unit: string
}

export function WallTab({
  wallRows,
  setWallRows,
  openings,
  setOpenings,
  unit
}: WallTabProps): React.ReactElement {

  const handleAddWallRow = () => {
    setWallRows([
      ...wallRows,
      { id: String(Date.now()), description: '', length: '', height: '', qty: '1' }
    ])
  }

  const handleRemoveWallRow = (id: string) => {
    setWallRows(wallRows.filter(r => r.id !== id))
  }

  const handleWallRowChange = (id: string, field: keyof WallRow, value: string) => {
    setWallRows(wallRows.map(r => r.id === id ? { ...r, [field]: value } : r))
  }

  const handleAddOpening = () => {
    setOpenings([
      ...openings,
      { id: String(Date.now()), name: '', width: '', height: '', qty: '1' }
    ])
  }

  const handleRemoveOpening = (id: string) => {
    setOpenings(openings.filter(o => o.id !== id))
  }

  const handleOpeningChange = (id: string, field: keyof OpeningRow, value: string) => {
    setOpenings(openings.map(o => o.id === id ? { ...o, [field]: value } : o))
  }

  return (
    <div className="space-y-6 font-sans">
      
      {/* 1. Dinding List */}
      <div className="space-y-3">
        <div className="flex justify-between items-center">
          <h4 className="font-bold text-sm text-slate-800">1. Daftar Bidang Dinding</h4>
          <button
            type="button"
            onClick={handleAddWallRow}
            className="btn-primary text-xs px-3 py-1 bg-slate-800 hover:bg-slate-900"
          >
            + Tambah Dinding
          </button>
        </div>

        <div className="border border-gray-200 rounded-lg overflow-hidden bg-white shadow-sm">
          <table className="w-full text-xs">
            <thead>
              <tr className="bg-slate-50 border-b border-gray-200 text-gray-500 font-semibold uppercase">
                <th className="px-3 py-2 text-center w-12">No</th>
                <th className="px-3 py-2 text-left">Deskripsi Dinding / Posisi</th>
                <th className="px-3 py-2 text-right w-32">Panjang (m)</th>
                <th className="px-3 py-2 text-right w-32">Tinggi (m)</th>
                <th className="px-3 py-2 text-right w-24">Jumlah (Qty)</th>
                <th className="px-3 py-2 text-right w-32">Total Luas (m²)</th>
                <th className="px-2 py-2 text-center w-10">Aksi</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {wallRows.map((row, idx) => {
                const rowArea = getWallRowArea(row)
                return (
                  <tr key={row.id} className="hover:bg-slate-50/50">
                    <td className="py-2 text-center text-gray-400 font-medium">{idx + 1}</td>
                    <td className="py-2 pr-2 pl-3">
                      <input
                        type="text"
                        value={row.description}
                        onChange={e => handleWallRowChange(row.id, 'description', e.target.value)}
                        placeholder="Contoh: Dinding Utama"
                        className="w-full px-2.5 py-1 border border-gray-200 rounded text-xs focus:ring-1 focus:ring-primary-500"
                      />
                    </td>
                    <td className="py-2 px-1">
                      <input
                        type="number"
                        step="any"
                        value={row.length}
                        onChange={e => handleWallRowChange(row.id, 'length', e.target.value)}
                        placeholder="4.0"
                        className="w-full px-2 py-1 border border-gray-200 rounded text-right font-mono text-xs"
                      />
                    </td>
                    <td className="py-2 px-1">
                      <input
                        type="number"
                        step="any"
                        value={row.height}
                        onChange={e => handleWallRowChange(row.id, 'height', e.target.value)}
                        placeholder="3.0"
                        className="w-full px-2 py-1 border border-gray-200 rounded text-right font-mono text-xs"
                      />
                    </td>
                    <td className="py-2 px-1">
                      <input
                        type="number"
                        step="any"
                        value={row.qty}
                        onChange={e => handleWallRowChange(row.id, 'qty', e.target.value)}
                        placeholder="1"
                        className="w-full px-2 py-1 border border-gray-200 rounded text-right font-mono text-xs"
                      />
                    </td>
                    <td className="py-2 pl-2 pr-3 text-right font-mono font-semibold text-gray-700">
                      {rowArea.toFixed(3)}
                    </td>
                    <td className="py-2 text-center pr-2">
                      <button
                        type="button"
                        onClick={() => handleRemoveWallRow(row.id)}
                        disabled={wallRows.length <= 1}
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

      {/* 2. Bukaan List (Deductions) */}
      <div className="space-y-3">
        <div className="flex justify-between items-center">
          <h4 className="font-bold text-sm text-slate-800">2. Daftar Bukaan Dinding (Mengurangi Luas Dinding)</h4>
          <button
            type="button"
            onClick={handleAddOpening}
            className="btn-primary text-xs px-3 py-1 bg-slate-800 hover:bg-slate-900"
          >
            + Tambah Bukaan
          </button>
        </div>

        <div className="border border-gray-200 rounded-lg overflow-hidden bg-white shadow-sm">
          <table className="w-full text-xs">
            <thead>
              <tr className="bg-slate-50 border-b border-gray-200 text-gray-500 font-semibold uppercase">
                <th className="px-3 py-2 text-left">Nama Bukaan</th>
                <th className="px-3 py-2 text-right w-32">Lebar Bukaan (m)</th>
                <th className="px-3 py-2 text-right w-32">Tinggi Bukaan (m)</th>
                <th className="px-3 py-2 text-right w-24">Jumlah (Qty)</th>
                <th className="px-3 py-2 text-right w-32">Total Luas Bukaan (m²)</th>
                <th className="px-2 py-2 text-center w-10">Aksi</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {openings.map((op, idx) => {
                const opArea = getOpeningArea(op)
                return (
                  <tr key={op.id}>
                    <td className="py-2 pr-2 pl-3">
                      <input
                        type="text"
                        value={op.name}
                        onChange={e => handleOpeningChange(op.id, 'name', e.target.value)}
                        placeholder="Contoh: Pintu P1"
                        className="w-full px-2.5 py-1 border border-gray-200 rounded text-xs focus:ring-1 focus:ring-primary-500"
                      />
                    </td>
                    <td className="py-2 px-1">
                      <input
                        type="number"
                        step="any"
                        value={op.width}
                        onChange={e => handleOpeningChange(op.id, 'width', e.target.value)}
                        placeholder="0.9"
                        className="w-full px-2 py-1 border border-gray-200 rounded text-right font-mono text-xs"
                      />
                    </td>
                    <td className="py-2 px-1">
                      <input
                        type="number"
                        step="any"
                        value={op.height}
                        onChange={e => handleOpeningChange(op.id, 'height', e.target.value)}
                        placeholder="2.1"
                        className="w-full px-2 py-1 border border-gray-200 rounded text-right font-mono text-xs"
                      />
                    </td>
                    <td className="py-2 px-1">
                      <input
                        type="number"
                        step="any"
                        value={op.qty}
                        onChange={e => handleOpeningChange(op.id, 'qty', e.target.value)}
                        placeholder="1"
                        className="w-full px-2 py-1 border border-gray-200 rounded text-right font-mono text-xs"
                      />
                    </td>
                    <td className="py-2 pl-2 text-right font-mono font-semibold text-red-500 pr-3">
                      -{opArea.toFixed(3)}
                    </td>
                    <td className="py-2 text-center pr-2">
                      <button
                        type="button"
                        onClick={() => handleRemoveOpening(op.id)}
                        className="text-red-500 hover:text-red-700 p-1 rounded"
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

      {/* 3. Total Bersih Display */}
      <div className="bg-slate-50 border border-gray-200 rounded-xl p-4 flex flex-col gap-2 shadow-inner">
        <div className="flex justify-between text-xs text-gray-500 font-medium">
          <span>Luas Kotor Dinding:</span>
          <span className="font-mono">{getWallGrossArea(wallRows).toFixed(3)} m²</span>
        </div>
        <div className="flex justify-between text-xs text-red-500 font-medium">
          <span>Total Pengurangan (Bukaan):</span>
          <span className="font-mono">-{getWallTotalOpenings(openings).toFixed(3)} m²</span>
        </div>
        <hr className="border-gray-200" />
        <div className="flex justify-between items-center pt-1">
          <span className="text-gray-700 font-bold text-sm">Luas Bersih Akhir:</span>
          <span className="text-2xl font-extrabold text-primary-800 font-mono">
            {getWallNetArea(wallRows, openings).toLocaleString('id-ID', { minimumFractionDigits: 0, maximumFractionDigits: 3 })} {unit || 'm²'}
          </span>
        </div>
      </div>

    </div>
  )
}
