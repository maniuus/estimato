import React from 'react'
import { useMasterDataStore } from '../../stores/master-data-store'
import { formatCurrency } from '../../lib/format'

interface AhsComponentsTableProps {
  compTab: 'material' | 'wage' | 'equipment'
  materialComponents: any[]
  wageComponents: any[]
  equipmentComponents: any[]
  editingId: string | null
  setEditingId: (id: string | null) => void
  editCoeff: string
  setEditCoeff: (val: string) => void
  editItemId: string
  setEditItemId: (id: string) => void
  onSaveEdit: (id: string) => Promise<void>
  onDeleteComponent: (id: string) => Promise<void>
}

export function AhsComponentsTable({
  compTab,
  materialComponents,
  wageComponents,
  equipmentComponents,
  editingId,
  setEditingId,
  editCoeff,
  setEditCoeff,
  editItemId,
  setEditItemId,
  onSaveEdit,
  onDeleteComponent
}: AhsComponentsTableProps): React.ReactElement {
  const masterStore = useMasterDataStore()

  if (compTab === 'material') {
    return (
      <div className="overflow-x-auto">
        <table className="w-full border-collapse">
          <thead>
            <tr className="bg-gray-50 border-b border-gray-250">
              <th className="px-2 py-1.5 text-left text-xs font-bold text-gray-500 uppercase tracking-wider">Material</th>
              <th className="px-2 py-1.5 text-right text-xs font-bold text-gray-500 uppercase tracking-wider w-28">Koefisien</th>
              <th className="px-2 py-1.5 text-center text-xs font-bold text-gray-500 uppercase tracking-wider w-20">Satuan</th>
              <th className="px-2 py-1.5 text-right text-xs font-bold text-gray-500 uppercase tracking-wider w-32">Harga</th>
              <th className="px-2 py-1.5 text-right text-xs font-bold text-gray-500 uppercase tracking-wider w-36">Subtotal</th>
              <th className="px-2 py-1.5 text-center text-xs font-bold text-gray-500 uppercase tracking-wider w-24">Aksi</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-100">
            {materialComponents.map(c => (
              <tr key={c.id} className="hover:bg-gray-50/30 transition-colors bg-white">
                <td className="px-2 py-1 text-xs font-semibold text-gray-800 border-b border-gray-100">
                  {editingId === c.id ? (
                    <select
                      value={editItemId}
                      onChange={e => setEditItemId(e.target.value)}
                      className="px-1.5 py-0.5 border border-blue-400 rounded text-xs bg-white w-64 focus:outline-none"
                    >
                      {masterStore.materials.map(m => (
                        <option key={m.id} value={m.id}>
                          {m.code ? `${m.code} - ` : ''}{m.name}
                        </option>
                      ))}
                    </select>
                  ) : (
                    c.materialName ?? '-'
                  )}
                </td>
                <td className="px-2 py-1 text-right font-mono text-xs border-b border-gray-100">
                  {editingId === c.id ? (
                    <input
                      type="number"
                      step="any"
                      min="0"
                      value={editCoeff}
                      onChange={e => setEditCoeff(e.target.value)}
                      className="w-20 px-1.5 py-0.5 border border-blue-400 rounded text-xs text-right font-mono focus:outline-none"
                      autoFocus
                    />
                  ) : (
                    c.coefficient
                  )}
                </td>
                <td className="px-2 py-1 text-center text-xs text-gray-600 font-semibold border-b border-gray-100">{c.materialUnit ?? '-'}</td>
                <td className="px-2 py-1 text-right font-mono text-xs text-gray-650 border-b border-gray-100">{formatCurrency(c.unitPrice ?? 0)}</td>
                <td className="px-2 py-1 text-right font-mono text-xs font-bold text-gray-900 border-b border-gray-100">{formatCurrency(c.totalPrice)}</td>
                <td className="px-2 py-1 text-center text-xs border-b border-gray-100">
                  {editingId === c.id ? (
                    <div className="flex gap-1.5 justify-center">
                      <button onClick={() => onSaveEdit(c.id)} className="text-green-600 hover:text-green-800 text-[11px] font-bold">Simpan</button>
                      <button onClick={() => setEditingId(null)} className="text-gray-500 hover:text-gray-700 text-[11px]">Batal</button>
                    </div>
                  ) : (
                    <div className="flex gap-2.5 justify-center">
                      <button 
                        onClick={() => { 
                          setEditingId(c.id)
                          setEditCoeff(c.coefficient.toString())
                          setEditItemId(c.materialId) 
                        }} 
                        className="text-blue-600 hover:text-blue-800 text-[11px] font-bold"
                      >
                        Edit
                      </button>
                      <button onClick={() => onDeleteComponent(c.id)} className="text-red-600 hover:text-red-800 text-[11px] font-bold">Hapus</button>
                    </div>
                  )}
                </td>
              </tr>
            ))}
            {materialComponents.length === 0 && (
              <tr><td colSpan={6} className="text-center py-4 text-gray-400 text-xs italic">Belum ada komponen material</td></tr>
            )}
          </tbody>
        </table>
      </div>
    )
  }

  if (compTab === 'wage') {
    return (
      <div className="overflow-x-auto">
        <table className="w-full border-collapse">
          <thead>
            <tr className="bg-gray-50 border-b border-gray-250">
              <th className="px-2 py-1.5 text-left text-xs font-bold text-gray-500 uppercase tracking-wider">Tenaga</th>
              <th className="px-2 py-1.5 text-right text-xs font-bold text-gray-500 uppercase tracking-wider w-28">Koefisien</th>
              <th className="px-2 py-1.5 text-center text-xs font-bold text-gray-500 uppercase tracking-wider w-20">Satuan</th>
              <th className="px-2 py-1.5 text-right text-xs font-bold text-gray-500 uppercase tracking-wider w-32">Upah</th>
              <th className="px-2 py-1.5 text-right text-xs font-bold text-gray-500 uppercase tracking-wider w-36">Subtotal</th>
              <th className="px-2 py-1.5 text-center text-xs font-bold text-gray-500 uppercase tracking-wider w-24">Aksi</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-100">
            {wageComponents.map(c => (
              <tr key={c.id} className="hover:bg-gray-50/30 transition-colors bg-white">
                <td className="px-2 py-1 text-xs font-semibold text-gray-800 border-b border-gray-100">
                  {editingId === c.id ? (
                    <select
                      value={editItemId}
                      onChange={e => setEditItemId(e.target.value)}
                      className="px-1.5 py-0.5 border border-blue-400 rounded text-xs bg-white w-64 focus:outline-none"
                    >
                      {masterStore.wages.map(w => (
                        <option key={w.id} value={w.id}>
                          {w.type}
                        </option>
                      ))}
                    </select>
                  ) : (
                    c.wageType ?? '-'
                  )}
                </td>
                <td className="px-2 py-1 text-right font-mono text-xs border-b border-gray-100">
                  {editingId === c.id ? (
                    <input
                      type="number"
                      step="any"
                      min="0"
                      value={editCoeff}
                      onChange={e => setEditCoeff(e.target.value)}
                      className="w-20 px-1.5 py-0.5 border border-blue-400 rounded text-xs text-right font-mono focus:outline-none"
                      autoFocus
                    />
                  ) : (
                    c.coefficient
                  )}
                </td>
                <td className="px-2 py-1 text-center text-xs text-gray-600 font-semibold border-b border-gray-100">{c.wageUnit ?? '-'}</td>
                <td className="px-2 py-1 text-right font-mono text-xs text-gray-600 border-b border-gray-100">{formatCurrency(c.dailyWage ?? 0)}</td>
                <td className="px-2 py-1 text-right font-mono text-xs font-bold text-gray-900 border-b border-gray-100">{formatCurrency(c.totalPrice)}</td>
                <td className="px-2 py-1 text-center text-xs border-b border-gray-100">
                  {editingId === c.id ? (
                    <div className="flex gap-1.5 justify-center">
                      <button onClick={() => onSaveEdit(c.id)} className="text-green-600 hover:text-green-800 text-[11px] font-bold">Simpan</button>
                      <button onClick={() => setEditingId(null)} className="text-gray-500 hover:text-gray-700 text-[11px]">Batal</button>
                    </div>
                  ) : (
                    <div className="flex gap-2.5 justify-center">
                      <button 
                        onClick={() => { 
                          setEditingId(c.id)
                          setEditCoeff(c.coefficient.toString())
                          setEditItemId(c.wageId) 
                        }} 
                        className="text-blue-600 hover:text-blue-800 text-[11px] font-bold"
                      >
                        Edit
                      </button>
                      <button onClick={() => onDeleteComponent(c.id)} className="text-red-600 hover:text-red-800 text-[11px] font-bold">Hapus</button>
                    </div>
                  )}
                </td>
              </tr>
            ))}
            {wageComponents.length === 0 && (
              <tr><td colSpan={6} className="text-center py-4 text-gray-400 text-xs italic">Belum ada komponen tenaga</td></tr>
            )}
          </tbody>
        </table>
      </div>
    )
  }

  return (
    <div className="overflow-x-auto">
      <table className="w-full border-collapse">
        <thead>
          <tr className="bg-gray-50 border-b border-gray-250">
            <th className="px-2 py-1.5 text-left text-xs font-bold text-gray-500 uppercase tracking-wider">Alat</th>
            <th className="px-2 py-1.5 text-right text-xs font-bold text-gray-500 uppercase tracking-wider w-28">Koefisien</th>
            <th className="px-2 py-1.5 text-center text-xs font-bold text-gray-500 uppercase tracking-wider w-20">Satuan</th>
            <th className="px-2 py-1.5 text-right text-xs font-bold text-gray-500 uppercase tracking-wider w-32">Sewa</th>
            <th className="px-2 py-1.5 text-right text-xs font-bold text-gray-500 uppercase tracking-wider w-36">Subtotal</th>
            <th className="px-2 py-1.5 text-center text-xs font-bold text-gray-500 uppercase tracking-wider w-24">Aksi</th>
          </tr>
        </thead>
        <tbody className="divide-y divide-gray-100">
          {equipmentComponents.map(c => (
            <tr key={c.id} className="hover:bg-gray-50/30 transition-colors bg-white">
              <td className="px-2 py-1 text-xs font-semibold text-gray-800 border-b border-gray-100">
                {editingId === c.id ? (
                  <select
                    value={editItemId}
                    onChange={e => setEditItemId(e.target.value)}
                    className="px-1.5 py-0.5 border border-blue-400 rounded text-xs bg-white w-64 focus:outline-none"
                  >
                    {masterStore.equipment.map(eq => (
                      <option key={eq.id} value={eq.id}>
                        {eq.name}
                      </option>
                    ))}
                  </select>
                ) : (
                  c.equipmentName ?? '-'
                )}
              </td>
              <td className="px-2 py-1 text-right font-mono text-xs border-b border-gray-100">
                {editingId === c.id ? (
                  <input
                    type="number"
                    step="any"
                    min="0"
                    value={editCoeff}
                    onChange={e => setEditCoeff(e.target.value)}
                    className="w-20 px-1.5 py-0.5 border border-blue-400 rounded text-xs text-right font-mono focus:outline-none"
                    autoFocus
                  />
                ) : (
                  c.coefficient
                )}
              </td>
              <td className="px-2 py-1 text-center text-xs text-gray-600 font-semibold border-b border-gray-100">{c.equipmentUnit ?? '-'}</td>
              <td className="px-2 py-1 text-right font-mono text-xs text-gray-600 border-b border-gray-100">{formatCurrency(c.rentalPrice ?? 0)}</td>
              <td className="px-2 py-1 text-right font-mono text-xs font-bold text-gray-900 border-b border-gray-100">{formatCurrency(c.totalPrice)}</td>
              <td className="px-2 py-1 text-center text-xs border-b border-gray-100">
                {editingId === c.id ? (
                  <div className="flex gap-1.5 justify-center">
                    <button onClick={() => onSaveEdit(c.id)} className="text-green-600 hover:text-green-800 text-[11px] font-bold">Simpan</button>
                    <button onClick={() => setEditingId(null)} className="text-gray-500 hover:text-gray-700 text-[11px]">Batal</button>
                  </div>
                ) : (
                  <div className="flex gap-2.5 justify-center">
                    <button 
                      onClick={() => { 
                        setEditingId(c.id)
                        setEditCoeff(c.coefficient.toString())
                        setEditItemId(c.equipmentId) 
                      }} 
                      className="text-blue-600 hover:text-blue-800 text-[11px] font-bold"
                    >
                      Edit
                    </button>
                    <button onClick={() => onDeleteComponent(c.id)} className="text-red-655 hover:text-red-800 text-[11px] font-bold">Hapus</button>
                  </div>
                )}
              </td>
            </tr>
          ))}
          {equipmentComponents.length === 0 && (
            <tr><td colSpan={6} className="text-center py-4 text-gray-400 text-xs italic">Belum ada komponen alat</td></tr>
          )}
        </tbody>
      </table>
    </div>
  )
}
