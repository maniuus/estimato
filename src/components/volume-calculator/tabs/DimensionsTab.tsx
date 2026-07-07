import React from 'react'
import type { DimRow } from '../types'
import { getDimRowTotal, getDimTotal } from '../helpers'

interface DimensionsTabProps {
  dimRows: DimRow[]
  setDimRows: React.Dispatch<React.SetStateAction<DimRow[]>>
  unit: string
}

export function DimensionsTab({
  dimRows,
  setDimRows,
  unit
}: DimensionsTabProps): React.ReactElement {
  
  const handleAddRow = () => {
    setDimRows([
      ...dimRows,
      { id: String(Date.now()), description: '', length: '', width: '', height: '', qty: '1' }
    ])
  }

  const handleRemoveRow = (id: string) => {
    setDimRows(dimRows.filter(r => r.id !== id))
  }

  const handleRowChange = (id: string, field: keyof DimRow, value: string) => {
    setDimRows(dimRows.map(r => r.id === id ? { ...r, [field]: value } : r))
  }

  return (
    <div className="space-y-4">
      <div className="flex justify-between items-center">
        <h4 className="font-bold text-sm text-slate-800">Daftar Dimensi (Masing-masing baris akan dijumlahkan)</h4>
        <button
          type="button"
          onClick={handleAddRow}
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
              <th className="px-3 py-2.5 text-left">Deskripsi Bagian / Detail</th>
              <th className="px-3 py-2.5 text-right w-24">Panjang (m)</th>
              <th className="px-3 py-2.5 text-right w-24">Lebar (m)</th>
              <th className="px-3 py-2.5 text-right w-24">Tinggi (m)</th>
              <th className="px-3 py-2.5 text-right w-20">Qty</th>
              <th className="px-3 py-2.5 text-right w-32">Total (m³)</th>
              <th className="px-2 py-2.5 text-center w-10">Aksi</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-100 font-sans">
            {dimRows.map((row, idx) => {
              const rowVal = getDimRowTotal(row)
              return (
                <tr key={row.id} className="hover:bg-slate-50/50">
                  <td className="py-2 text-center text-gray-400 font-medium">{idx + 1}</td>
                  <td className="py-2 pr-2 pl-3">
                    <input
                      type="text"
                      value={row.description}
                      onChange={e => handleRowChange(row.id, 'description', e.target.value)}
                      placeholder="Contoh: Pondasi Ruang Depan"
                      className="w-full px-2.5 py-1 border border-gray-200 rounded text-xs focus:ring-1 focus:ring-primary-500"
                    />
                  </td>
                  <td className="py-2 px-1">
                    <input
                      type="number"
                      step="any"
                      value={row.length}
                      onChange={e => handleRowChange(row.id, 'length', e.target.value)}
                      placeholder="1.00"
                      className="w-full px-2 py-1 border border-gray-200 rounded text-right font-mono text-xs"
                    />
                  </td>
                  <td className="py-2 px-1">
                    <input
                      type="number"
                      step="any"
                      value={row.width}
                      onChange={e => handleRowChange(row.id, 'width', e.target.value)}
                      placeholder="1.00"
                      className="w-full px-2 py-1 border border-gray-200 rounded text-right font-mono text-xs"
                    />
                  </td>
                  <td className="py-2 px-1">
                    <input
                      type="number"
                      step="any"
                      value={row.height}
                      onChange={e => handleRowChange(row.id, 'height', e.target.value)}
                      placeholder="1.00"
                      className="w-full px-2 py-1 border border-gray-200 rounded text-right font-mono text-xs"
                    />
                  </td>
                  <td className="py-2 px-1">
                    <input
                      type="number"
                      step="any"
                      value={row.qty}
                      onChange={e => handleRowChange(row.id, 'qty', e.target.value)}
                      placeholder="1"
                      className="w-full px-2 py-1 border border-gray-200 rounded text-right font-mono text-xs"
                    />
                  </td>
                  <td className="py-2 pl-2 pr-3 text-right font-mono font-semibold text-gray-700">
                    {rowVal.toFixed(3)}
                  </td>
                  <td className="py-2 text-center pr-2">
                    <button
                      type="button"
                      onClick={() => handleRemoveRow(row.id)}
                      disabled={dimRows.length <= 1}
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

      <div className="bg-slate-50 border border-gray-200 rounded-xl p-4 flex justify-between items-center shadow-inner">
        <span className="text-gray-500 font-medium text-sm">Total Volume Dimensi:</span>
        <span className="text-2xl font-extrabold text-primary-800 font-mono">
          {getDimTotal(dimRows).toLocaleString('id-ID', { minimumFractionDigits: 0, maximumFractionDigits: 3 })} {unit || 'm³'}
        </span>
      </div>
    </div>
  )
}
