import React, { useState, useEffect, useCallback } from 'react'
import { useVolumeStore } from '../stores/volume-store'
import { useWbsStore } from '../stores/wbs-store'
import { useAhsStore } from '../stores/ahs-store'
import { formatCurrency } from '../lib/format'

interface VolumePageProps {
  projectId: string
}

export function VolumePage({ projectId }: VolumePageProps): React.ReactElement {
  const { items: volumes, loadByProject, upsert, loading: volLoading } = useVolumeStore()
  const { items: wbsItems, loadByProject: loadWbs } = useWbsStore()
  const { ahsList, loadByProject: loadAhs } = useAhsStore()
  const [editValues, setEditValues] = useState<Record<string, { volume: string; ahsId: string }>>({})
  const [dirty, setDirty] = useState<Set<string>>(new Set())
  const [saving, setSaving] = useState(false)

  useEffect(() => {
    loadWbs(projectId)
    loadByProject(projectId)
    loadAhs(projectId)
  }, [projectId])

  const leafItems = wbsItems.filter(i => i.type === 'item')

  useEffect(() => {
    const ev: Record<string, { volume: string; ahsId: string }> = {}
    for (const item of leafItems) {
      const vol = volumes.find(v => v.wbsItemId === item.id)
      ev[item.id] = {
        volume: vol ? String(vol.volume) : '0',
        ahsId: vol?.ahsId ?? ''
      }
    }
    setEditValues(ev)
  }, [leafItems.length, volumes.length])

  const handleVolumeChange = useCallback((wbsItemId: string, value: string) => {
    setEditValues(prev => ({ ...prev, [wbsItemId]: { ...prev[wbsItemId], volume: value } }))
    setDirty(prev => new Set(prev).add(wbsItemId))
  }, [])

  const handleAhsChange = useCallback((wbsItemId: string, ahsId: string) => {
    setEditValues(prev => ({ ...prev, [wbsItemId]: { ...prev[wbsItemId], ahsId } }))
    setDirty(prev => new Set(prev).add(wbsItemId))
  }, [])

  const handleSave = useCallback(async () => {
    setSaving(true)
    for (const wbsItemId of dirty) {
      const ev = editValues[wbsItemId]
      if (ev) {
        const item = wbsItems.find(i => i.id === wbsItemId)
        await upsert(wbsItemId, {
          volume: parseFloat(ev.volume) || 0,
          ahsId: ev.ahsId || null,
          unit: item?.unit ?? ''
        })
      }
    }
    await loadByProject(projectId)
    setDirty(new Set())
    setSaving(false)
  }, [dirty, editValues, projectId])

  const getAhsPrice = (ahsId: string): number => {
    const ahs = ahsList.find(a => a.id === ahsId)
    return ahs?.totalPrice ?? 0
  }

  const parseVolume = (val: string): number => parseFloat(val) || 0

  if (leafItems.length === 0) {
    return (
      <div className="card p-8 text-center text-gray-400 text-sm">
        Belum ada item pekerjaan. Buat WBS terlebih dahulu.
      </div>
    )
  }

  return (
    <div className="space-y-4">
      <div className="flex justify-between items-center">
        <p className="text-sm text-gray-500">Input volume untuk setiap item pekerjaan</p>
        <button
          onClick={handleSave}
          disabled={saving || dirty.size === 0}
          className="btn-primary text-xs px-4 py-1.5 disabled:opacity-50"
        >
          {saving ? 'Menyimpan...' : `Simpan (${dirty.size})`}
        </button>
      </div>

      <div className="card overflow-hidden">
        <table className="w-full">
          <thead>
            <tr className="bg-gray-50 border-b border-gray-200">
              <th className="table-header" style={{ width: '30%' }}>Pekerjaan</th>
              <th className="table-header">Volume</th>
              <th className="table-header">Satuan</th>
              <th className="table-header">AHS</th>
              <th className="table-header">Harga Satuan</th>
              <th className="table-header">Total</th>
            </tr>
          </thead>
          <tbody>
            {leafItems.map(item => {
              const ev = editValues[item.id]
              const vol = ev ? parseVolume(ev.volume) : 0
              const ahsId = ev?.ahsId ?? ''
              const ahsPrice = getAhsPrice(ahsId)
              const total = vol * ahsPrice
              const isItemDirty = dirty.has(item.id)

              return (
                <tr key={item.id} className={`border-b border-gray-100 ${isItemDirty ? 'bg-amber-50' : ''}`}>
                  <td className="table-cell">
                    <span className="text-xs text-gray-400 font-mono mr-1">{item.code}</span>
                    <span className="font-medium text-sm">{item.name}</span>
                  </td>
                  <td className="table-cell">
                    <input
                      type="number"
                      step="0.001"
                      min="0"
                      value={ev?.volume ?? '0'}
                      onChange={e => handleVolumeChange(item.id, e.target.value)}
                      className="w-24 px-2 py-1 border border-gray-300 rounded text-sm text-right font-mono"
                    />
                  </td>
                  <td className="table-cell text-sm">{item.unit}</td>
                  <td className="table-cell">
                    <select
                      value={ev?.ahsId ?? ''}
                      onChange={e => handleAhsChange(item.id, e.target.value)}
                      className="w-48 px-2 py-1 border border-gray-300 rounded text-xs"
                    >
                      <option value="">-- Pilih AHS --</option>
                      {ahsList.map(ahs => (
                        <option key={ahs.id} value={ahs.id}>{ahs.code} - {ahs.name}</option>
                      ))}
                    </select>
                  </td>
                  <td className="table-cell font-mono text-sm">{formatCurrency(ahsPrice)}</td>
                  <td className="table-cell font-mono text-sm font-semibold">{formatCurrency(total)}</td>
                </tr>
              )
            })}
          </tbody>
        </table>
      </div>
    </div>
  )
}
