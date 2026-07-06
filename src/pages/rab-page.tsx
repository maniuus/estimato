import React, { useState, useEffect } from 'react'
import { useRabStore } from '../stores/rab-store'
import { useProjectStore } from '../stores/project-store'
import { formatCurrency } from '../lib/format'

interface RabPageProps {
  projectId: string
}

export function RabPage({ projectId }: RabPageProps): React.ReactElement {
  const { calculation, latestSnapshot, calculate, saveSnapshot, loadLatest, loading } = useRabStore()
  const { projects } = useProjectStore()
  const project = projects.find(p => p.id === projectId)
  const [ppn, setPpn] = useState(project?.ppn ?? 11)
  const [overhead, setOverhead] = useState(project?.overhead ?? 0)
  const [saved, setSaved] = useState(false)

  useEffect(() => {
    if (project) {
      setPpn(project.ppn)
      setOverhead(project.overhead)
    }
    loadLatest(projectId)
  }, [projectId, project?.ppn, project?.overhead])

  useEffect(() => {
    if (latestSnapshot) {
      const data = JSON.parse(latestSnapshot.data)
      const totalPrice = Array.isArray(data) ? data.reduce((s: number, i: any) => s + i.totalPrice, 0) : 0
    }
  }, [latestSnapshot])

  const handleCalculate = async () => {
    setSaved(false)
    await calculate(projectId, ppn, overhead)
  }

  const handleSave = async () => {
    const ok = await saveSnapshot(projectId, ppn, overhead)
    if (ok) {
      setSaved(true)
      await loadLatest(projectId)
    }
  }

  return (
    <div className="space-y-6">
      <div className="flex gap-4">
        <div className="card flex-1 p-4">
          <p className="text-xs text-gray-500 font-medium uppercase tracking-wider mb-2">Pengaturan</p>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-xs text-gray-600 mb-1">PPN (%)</label>
              <input
                type="number"
                min="0"
                max="100"
                step="0.5"
                value={ppn}
                onChange={e => setPpn(parseFloat(e.target.value) || 0)}
                className="w-full px-3 py-1.5 border border-gray-300 rounded text-sm font-mono"
              />
            </div>
            <div>
              <label className="block text-xs text-gray-600 mb-1">Overhead & Laba (%)</label>
              <input
                type="number"
                min="0"
                max="100"
                step="0.5"
                value={overhead}
                onChange={e => setOverhead(parseFloat(e.target.value) || 0)}
                className="w-full px-3 py-1.5 border border-gray-300 rounded text-sm font-mono"
              />
            </div>
          </div>
          <div className="mt-3 flex gap-2">
            <button onClick={handleCalculate} disabled={loading} className="btn-primary text-xs px-4 py-1.5">
              {loading ? 'Menghitung...' : 'Hitung RAB'}
            </button>
            {calculation && (
              <button onClick={handleSave} className="btn-primary text-xs px-4 py-1.5 bg-green-600 hover:bg-green-700">
                Simpan Snapshot
              </button>
            )}
          </div>
          {saved && <p className="text-xs text-green-600 mt-2">Snapshot berhasil disimpan!</p>}
        </div>

        {calculation && (
          <div className="card p-4 w-72">
            <p className="text-xs text-gray-500 font-medium uppercase tracking-wider mb-3">Ringkasan</p>
            <div className="space-y-2 text-sm">
              <div className="flex justify-between">
                <span className="text-gray-500">Total Pekerjaan</span>
                <span className="font-mono font-medium">{formatCurrency(calculation.totalPrice)}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-500">PPN ({calculation.ppnPercent}%)</span>
                <span className="font-mono">{formatCurrency(calculation.ppnAmount)}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-500">Overhead ({calculation.overheadPercent}%)</span>
                <span className="font-mono">{formatCurrency(calculation.overheadAmount)}</span>
              </div>
              <hr className="border-gray-200" />
              <div className="flex justify-between font-bold text-primary-800">
                <span>Grand Total</span>
                <span className="font-mono">{formatCurrency(calculation.grandTotal)}</span>
              </div>
            </div>
          </div>
        )}
      </div>

      {calculation && calculation.lineItems.length > 0 && (
        <div className="card overflow-hidden">
          <table className="w-full">
            <thead>
              <tr className="bg-gray-50 border-b border-gray-200">
                <th className="table-header">Pekerjaan</th>
                <th className="table-header">AHS</th>
                <th className="table-header">Volume</th>
                <th className="table-header">Satuan</th>
                <th className="table-header">Harga Satuan</th>
                <th className="table-header">Total</th>
              </tr>
            </thead>
            <tbody>
              {calculation.lineItems.map(item => (
                <tr key={item.wbsItemId} className="border-b border-gray-100">
                  <td className="table-cell">
                    <span className="text-xs text-gray-400 font-mono mr-1">{item.wbsCode}</span>
                    <span className="text-sm">{item.wbsName}</span>
                  </td>
                  <td className="table-cell text-xs text-gray-600">{item.ahsCode ? `${item.ahsCode} - ${item.ahsName}` : '-'}</td>
                  <td className="table-cell font-mono text-sm">{item.volume}</td>
                  <td className="table-cell text-sm">{item.unit}</td>
                  <td className="table-cell font-mono text-sm">{formatCurrency(item.unitPrice)}</td>
                  <td className="table-cell font-mono text-sm font-semibold">{formatCurrency(item.totalPrice)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {calculation && calculation.lineItems.length === 0 && (
        <div className="card p-8 text-center text-gray-400 text-sm">
          Tidak ada item dengan volume &gt; 0. Isi volume terlebih dahulu.
        </div>
      )}
    </div>
  )
}
