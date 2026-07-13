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
    <div className="space-y-3.5">
      <div className="flex flex-col md:flex-row gap-3.5 items-stretch">
        <div className="card flex-1 p-3 bg-slate-50 border border-slate-200">
          <p className="text-[10px] text-gray-500 font-bold uppercase tracking-wider mb-2">Pengaturan Parameter RAB</p>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-[10px] text-gray-600 mb-0.5 font-semibold">PPN (%)</label>
              <input
                type="number"
                min="0"
                max="100"
                step="0.5"
                value={ppn}
                onChange={e => setPpn(parseFloat(e.target.value) || 0)}
                className="w-full px-2.5 py-1 border border-gray-300 rounded-lg text-xs font-mono focus:outline-none focus:ring-1 focus:ring-primary-500 bg-white"
              />
            </div>
            <div>
              <label className="block text-[10px] text-gray-600 mb-0.5 font-semibold">Overhead & Laba (%)</label>
              <input
                type="number"
                min="0"
                max="100"
                step="0.5"
                value={overhead}
                onChange={e => setOverhead(parseFloat(e.target.value) || 0)}
                className="w-full px-2.5 py-1 border border-gray-300 rounded-lg text-xs font-mono focus:outline-none focus:ring-1 focus:ring-primary-500 bg-white"
              />
            </div>
          </div>
          <div className="mt-3 flex gap-2">
            <button onClick={handleCalculate} disabled={loading} className="btn-primary text-xs px-3 py-1.5 font-bold shadow-xs">
              {loading ? 'Menghitung...' : 'Hitung RAB'}
            </button>
            {calculation && (
              <button onClick={handleSave} className="btn-primary text-xs px-3 py-1.5 bg-green-600 hover:bg-green-700 font-bold shadow-xs">
                Simpan Snapshot
              </button>
            )}
          </div>
          {saved && <p className="text-[10px] text-green-600 mt-1.5 font-semibold">✓ Snapshot berhasil disimpan!</p>}
        </div>

        {calculation && (
          <div className="card p-3 w-full md:w-80 bg-white border border-slate-200">
            <p className="text-[10px] text-gray-500 font-bold uppercase tracking-wider mb-2">Ringkasan Anggaran</p>
            <div className="space-y-1 text-xs">
              <div className="flex justify-between py-0.5">
                <span className="text-gray-500">Total Pekerjaan</span>
                <span className="font-mono font-bold text-gray-700">{formatCurrency(calculation.totalPrice)}</span>
              </div>
              <div className="flex justify-between py-0.5">
                <span className="text-gray-500">PPN ({calculation.ppnPercent}%)</span>
                <span className="font-mono text-gray-700">{formatCurrency(calculation.ppnAmount)}</span>
              </div>
              <div className="flex justify-between py-0.5">
                <span className="text-gray-500">Overhead ({calculation.overheadPercent}%)</span>
                <span className="font-mono text-gray-700">{formatCurrency(calculation.overheadAmount)}</span>
              </div>
              <hr className="border-gray-200 my-1" />
              <div className="flex justify-between font-extrabold text-primary-800 py-0.5 text-sm">
                <span>Grand Total</span>
                <span className="font-mono">{formatCurrency(calculation.grandTotal)}</span>
              </div>
            </div>
          </div>
        )}
      </div>

      {calculation && calculation.lineItems.length > 0 && (
        <div className="card overflow-hidden bg-white border border-slate-200 shadow-xs">
          <div className="overflow-x-auto">
            <table className="w-full border-collapse">
              <thead>
                <tr className="bg-gray-50 border-b border-gray-250">
                  <th className="px-2 py-1.5 text-left text-xs font-bold text-gray-500 uppercase tracking-wider">Pekerjaan</th>
                  <th className="px-2 py-1.5 text-left text-xs font-bold text-gray-500 uppercase tracking-wider">AHS</th>
                  <th className="px-2 py-1.5 text-right text-xs font-bold text-gray-500 uppercase tracking-wider w-24">Volume</th>
                  <th className="px-2 py-1.5 text-center text-xs font-bold text-gray-500 uppercase tracking-wider w-16">Satuan</th>
                  <th className="px-2 py-1.5 text-right text-xs font-bold text-gray-500 uppercase tracking-wider w-32">Harga Satuan</th>
                  <th className="px-2 py-1.5 text-right text-xs font-bold text-gray-500 uppercase tracking-wider w-36">Total</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {calculation.lineItems.map(item => (
                  <tr key={item.wbsItemId} className="hover:bg-gray-50/20 transition-colors bg-white">
                    <td className="px-2 py-1 border-b border-gray-100 text-xs">
                      <span className="text-xs text-gray-400 font-mono mr-1.5 font-bold">{item.wbsCode}</span>
                      <span className="font-semibold text-gray-800">{item.wbsName}</span>
                    </td>
                    <td className="px-2 py-1 border-b border-gray-100 text-[11px] text-gray-650 font-medium">
                      {item.ahsCode ? `${item.ahsCode} - ${item.ahsName}` : '-'}
                    </td>
                    <td className="px-2 py-1 border-b border-gray-100 text-right font-mono font-medium text-xs">{item.volume.toFixed(2)}</td>
                    <td className="px-2 py-1 border-b border-gray-100 text-center text-xs font-semibold text-gray-600">{item.unit}</td>
                    <td className="px-2 py-1 border-b border-gray-100 text-right font-mono text-xs text-gray-650">{formatCurrency(item.unitPrice)}</td>
                    <td className="px-2 py-1 border-b border-gray-100 text-right font-mono text-xs font-bold text-gray-900">{formatCurrency(item.totalPrice)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {calculation && calculation.lineItems.length === 0 && (
        <div className="card p-8 text-center text-gray-400 text-xs italic">
          Tidak ada item dengan volume &gt; 0. Isi volume terlebih dahulu pada tab Input WBS.
        </div>
      )}
    </div>
  )
}
