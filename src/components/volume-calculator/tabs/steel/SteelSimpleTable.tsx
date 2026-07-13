import React from 'react'
import type { SteelRow } from '../../types'
import { diameterOptions, getSteelRowWeight } from '../../helpers'

interface SteelSimpleTableProps {
  steelRows: SteelRow[]
  onAddRow: () => void
  onRemoveRow: (id: string) => void
  onRowChange: (id: string, field: keyof SteelRow, value: string) => void
}

export function SteelSimpleTable({
  steelRows,
  onAddRow,
  onRemoveRow,
  onRowChange
}: SteelSimpleTableProps): React.ReactElement {
  return (
    <div className="space-y-4">
      <div className="flex justify-between items-center">
        <h4 className="font-bold text-sm text-slate-800">Daftar Kebutuhan Besi</h4>
        <button
          type="button"
          onClick={onAddRow}
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
                      onChange={e => onRowChange(row.id, 'description', e.target.value)}
                      placeholder="Contoh: Tulangan Utama Balok"
                      className="w-full px-2.5 py-1 border border-gray-200 rounded text-xs focus:ring-1 focus:ring-primary-500"
                    />
                  </td>
                  <td className="py-2 px-1 text-center">
                    <select
                      value={row.diameter}
                      onChange={e => onRowChange(row.id, 'diameter', e.target.value)}
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
                      onChange={e => onRowChange(row.id, 'length', e.target.value)}
                      placeholder="12.00"
                      className="w-full px-2 py-1 border border-gray-200 rounded text-right font-mono text-xs"
                    />
                  </td>
                  <td className="py-2 px-1">
                    <input
                      type="number"
                      step="any"
                      value={row.qty}
                      onChange={e => onRowChange(row.id, 'qty', e.target.value)}
                      placeholder="4"
                      className="w-full px-2 py-1 border border-gray-200 rounded text-right font-mono text-xs"
                    />
                  </td>
                  <td className="py-2 px-1">
                    <input
                      type="number"
                      step="any"
                      value={row.mult}
                      onChange={e => onRowChange(row.id, 'mult', e.target.value)}
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
                      onClick={() => onRemoveRow(row.id)}
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
  )
}
