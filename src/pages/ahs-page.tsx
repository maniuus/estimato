import React, { useState, useEffect } from 'react'
import { useAhsStore } from '../stores/ahs-store'
import { useMasterDataStore } from '../stores/master-data-store'
import { formatCurrency } from '../lib/format'
import type { Ahs } from '../types/models'

interface AhsPageProps {
  projectId?: string
}

type Mode = 'list' | 'edit'
type CompTab = 'material' | 'wage' | 'equipment'

interface AhsFormData {
  code: string
  name: string
  unit: string
  category: 'sni' | 'kustom'
  source: string
}

const emptyForm: AhsFormData = { code: '', name: '', unit: 'm³', category: 'kustom', source: '' }

export function AhsPage({ projectId }: AhsPageProps): React.ReactElement {
  const store = useAhsStore()
  const masterStore = useMasterDataStore()
  const [mode, setMode] = useState<Mode>('list')
  const [form, setForm] = useState<AhsFormData>(emptyForm)
  const [compTab, setCompTab] = useState<CompTab>('material')

  useEffect(() => {
    masterStore.loadAll()
    if (projectId) store.loadByProject(projectId)
    else store.loadAll()
  }, [projectId])

  const handleCreate = async (e: React.FormEvent): Promise<void> => {
    e.preventDefault()
    await store.createAhs({ ...form, projectId: projectId ?? null })
    setForm(emptyForm)
  }

  const handleSelect = (ahs: Ahs): void => {
    store.selectAhs(ahs)
    setMode('edit')
  }

  const handleAddMaterial = async (): Promise<void> => {
    const ahs = store.selectedAhs
    if (!ahs || masterStore.materials.length === 0) return
    const mat = masterStore.materials[0]
    await store.addMaterialComponent({
      ahsId: ahs.id,
      materialId: mat.id,
      coefficient: 0
    })
  }

  const handleAddWage = async (): Promise<void> => {
    const ahs = store.selectedAhs
    if (!ahs || masterStore.wages.length === 0) return
    const wage = masterStore.wages[0]
    await store.addWageComponent({
      ahsId: ahs.id,
      wageId: wage.id,
      coefficient: 0
    })
  }

  const handleAddEquipment = async (): Promise<void> => {
    const ahs = store.selectedAhs
    if (!ahs || masterStore.equipment.length === 0) return
    const equip = masterStore.equipment[0]
    await store.addEquipmentComponent({
      ahsId: ahs.id,
      equipmentId: equip.id,
      coefficient: 0
    })
  }

  const renderEditMode = (): React.ReactElement => {
    const ahs = store.selectedAhs
    if (!ahs) return <div className="text-gray-500">Pilih AHS</div>

    const compTabs: { id: CompTab; label: string; count: number }[] = [
      { id: 'material', label: 'Material', count: store.materialComponents.length },
      { id: 'wage', label: 'Tenaga', count: store.wageComponents.length },
      { id: 'equipment', label: 'Alat', count: store.equipmentComponents.length }
    ]

    return (
      <div className="space-y-4">
        <div className="flex items-center gap-3">
          <button onClick={() => { setMode('list'); store.selectAhs(null) }} className="text-gray-500 hover:text-gray-700">&larr; Kembali</button>
          <h3 className="font-semibold">{ahs.code} - {ahs.name}</h3>
          <span className="ml-auto text-lg font-bold font-mono text-primary-800">{formatCurrency(ahs.totalPrice)} / {ahs.unit}</span>
        </div>

        <div className="flex gap-1 bg-gray-100 p-1 rounded-lg w-fit">
          {compTabs.map(t => (
            <button
              key={t.id}
              onClick={() => setCompTab(t.id)}
              className={`px-3 py-1.5 rounded-md text-xs font-medium ${compTab === t.id ? 'bg-white shadow-sm' : 'text-gray-600'}`}
            >
              {t.label} ({t.count})
            </button>
          ))}
        </div>

        <div className="card overflow-hidden">
          <div className="p-3 border-b border-gray-200 flex justify-between items-center">
            <span className="text-sm font-medium">Komponen {compTabs.find(t => t.id === compTab)?.label}</span>
            <button
              onClick={compTab === 'material' ? handleAddMaterial : compTab === 'wage' ? handleAddWage : handleAddEquipment}
              className="btn-primary text-xs px-3 py-1.5"
            >
              + Tambah
            </button>
          </div>

          {compTab === 'material' && (
            <table className="w-full">
              <thead>
                <tr className="bg-gray-50 border-b">
                  <th className="table-header">Material</th>
                  <th className="table-header">Koefisien</th>
                  <th className="table-header">Satuan</th>
                  <th className="table-header">Harga</th>
                  <th className="table-header">Subtotal</th>
                  <th className="table-header">Aksi</th>
                </tr>
              </thead>
              <tbody>
                {store.materialComponents.map(c => (
                  <tr key={c.id} className="border-b border-gray-100">
                    <td className="table-cell">{c.materialName ?? '-'}</td>
                    <td className="table-cell font-mono">{c.coefficient}</td>
                    <td className="table-cell">{c.materialUnit ?? '-'}</td>
                    <td className="table-cell font-mono">{formatCurrency(c.unitPrice ?? 0)}</td>
                    <td className="table-cell font-mono font-medium">{formatCurrency(c.totalPrice)}</td>
                    <td className="table-cell">
                      <button onClick={() => store.deleteMaterialComponent(c.id)} className="text-red-600 hover:text-red-800 text-xs">Hapus</button>
                    </td>
                  </tr>
                ))}
                {store.materialComponents.length === 0 && (
                  <tr><td colSpan={6} className="text-center py-4 text-gray-400 text-sm">Belum ada komponen material</td></tr>
                )}
              </tbody>
            </table>
          )}

          {compTab === 'wage' && (
            <table className="w-full">
              <thead>
                <tr className="bg-gray-50 border-b">
                  <th className="table-header">Tenaga</th>
                  <th className="table-header">Koefisien</th>
                  <th className="table-header">Satuan</th>
                  <th className="table-header">Upah</th>
                  <th className="table-header">Subtotal</th>
                  <th className="table-header">Aksi</th>
                </tr>
              </thead>
              <tbody>
                {store.wageComponents.map(c => (
                  <tr key={c.id} className="border-b border-gray-100">
                    <td className="table-cell">{c.wageType ?? '-'}</td>
                    <td className="table-cell font-mono">{c.coefficient}</td>
                    <td className="table-cell">{c.wageUnit ?? '-'}</td>
                    <td className="table-cell font-mono">{formatCurrency(c.dailyWage ?? 0)}</td>
                    <td className="table-cell font-mono font-medium">{formatCurrency(c.totalPrice)}</td>
                    <td className="table-cell">
                      <button onClick={() => store.deleteWageComponent(c.id)} className="text-red-600 hover:text-red-800 text-xs">Hapus</button>
                    </td>
                  </tr>
                ))}
                {store.wageComponents.length === 0 && (
                  <tr><td colSpan={6} className="text-center py-4 text-gray-400 text-sm">Belum ada komponen tenaga</td></tr>
                )}
              </tbody>
            </table>
          )}

          {compTab === 'equipment' && (
            <table className="w-full">
              <thead>
                <tr className="bg-gray-50 border-b">
                  <th className="table-header">Alat</th>
                  <th className="table-header">Koefisien</th>
                  <th className="table-header">Satuan</th>
                  <th className="table-header">Sewa</th>
                  <th className="table-header">Subtotal</th>
                  <th className="table-header">Aksi</th>
                </tr>
              </thead>
              <tbody>
                {store.equipmentComponents.map(c => (
                  <tr key={c.id} className="border-b border-gray-100">
                    <td className="table-cell">{c.equipmentName ?? '-'}</td>
                    <td className="table-cell font-mono">{c.coefficient}</td>
                    <td className="table-cell">{c.equipmentUnit ?? '-'}</td>
                    <td className="table-cell font-mono">{formatCurrency(c.rentalPrice ?? 0)}</td>
                    <td className="table-cell font-mono font-medium">{formatCurrency(c.totalPrice)}</td>
                    <td className="table-cell">
                      <button onClick={() => store.deleteEquipmentComponent(c.id)} className="text-red-600 hover:text-red-800 text-xs">Hapus</button>
                    </td>
                  </tr>
                ))}
                {store.equipmentComponents.length === 0 && (
                  <tr><td colSpan={6} className="text-center py-4 text-gray-400 text-sm">Belum ada komponen alat</td></tr>
                )}
              </tbody>
            </table>
          )}
        </div>
      </div>
    )
  }

  const handleImportAhsp = async () => {
    const result = await window.api.ahsp.importAhsp()
    if (result.success && result.data) {
      const s = result.data
      alert(`Import berhasil!\nAHS baru: ${s.ahsCreated}\nAHS dilewati: ${s.ahsSkipped}\nUpah baru: ${s.wagesCreated}\nMaterial baru: ${s.materialsCreated}\nAlat baru: ${s.equipmentCreated}`)
      if (!projectId) store.loadAll()
    } else if (result.error !== 'Pembatalan import') {
      alert('Gagal import: ' + result.error)
    }
  }

  if (mode === 'edit') return renderEditMode()

  return (
    <div className="space-y-4">
      <div className="flex justify-between items-center">
        <h2 className="text-2xl font-bold text-gray-900">Library AHS</h2>
        {!projectId && (
          <button onClick={handleImportAhsp} className="btn-primary text-xs px-4 py-1.5 bg-green-600 hover:bg-green-700">
            Import AHSP Excel
          </button>
        )}
      </div>

      <form onSubmit={handleCreate} className="card p-4 grid grid-cols-5 gap-3">
        <input className="input-field" placeholder="Kode AHS" value={form.code} onChange={e => setForm({ ...form, code: e.target.value })} required />
        <input className="input-field col-span-2" placeholder="Nama pekerjaan" value={form.name} onChange={e => setForm({ ...form, name: e.target.value })} required />
        <input className="input-field" placeholder="Satuan" value={form.unit} onChange={e => setForm({ ...form, unit: e.target.value })} required />
        <button type="submit" className="btn-primary">+ Buat AHS Baru</button>
      </form>

      <div className="card overflow-hidden">
        <table className="w-full">
          <thead>
            <tr className="bg-gray-50 border-b">
              <th className="table-header">Kode</th>
              <th className="table-header">Nama Pekerjaan</th>
              <th className="table-header">Satuan</th>
              <th className="table-header">Kategori</th>
              <th className="table-header">Harga Satuan</th>
            </tr>
          </thead>
          <tbody>
            {!Array.isArray(store.ahsList) || store.ahsList.length === 0 ? (
              <tr><td colSpan={5} className="text-center py-8 text-gray-400">Belum ada AHS</td></tr>
            ) : (
              store.ahsList.map(ahs => (
                <tr key={ahs.id} onClick={() => handleSelect(ahs)} className="border-b border-gray-100 hover:bg-blue-50 cursor-pointer">
                  <td className="table-cell font-mono font-medium">{ahs.code}</td>
                  <td className="table-cell">{ahs.name}</td>
                  <td className="table-cell">{ahs.unit}</td>
                  <td className="table-cell">
                    <span className={`px-2 py-0.5 rounded text-xs font-medium ${ahs.category === 'sni' ? 'bg-green-100 text-green-700' : 'bg-amber-100 text-amber-700'}`}>
                      {ahs.category.toUpperCase()}
                    </span>
                  </td>
                  <td className="table-cell font-mono font-medium text-primary-800">{formatCurrency(ahs.totalPrice)}</td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>
    </div>
  )
}
