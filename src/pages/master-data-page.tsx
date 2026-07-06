import React, { useState, useEffect } from 'react'
import { useMasterDataStore } from '../stores/master-data-store'
import { formatCurrency } from '../lib/format'

type TabType = 'materials' | 'wages' | 'equipment'

interface FormData {
  name: string
  code: string
  specification: string
  category: string
  unit: string
  unitPrice: string
  supplier: string
  type: string
  dailyWage: string
  capacity: string
  rentalPrice: string
}

const emptyForm: FormData = {
  name: '', code: '', specification: '', category: '',
  unit: 'buah', unitPrice: '0', supplier: '',
  type: '', dailyWage: '0', capacity: '', rentalPrice: '0'
}

export function MasterDataPage(): React.ReactElement {
  const [tab, setTab] = useState<TabType>('materials')
  const [showForm, setShowForm] = useState(false)
  const [editingId, setEditingId] = useState<string | null>(null)
  const [form, setForm] = useState<FormData>(emptyForm)

  const store = useMasterDataStore()

  useEffect(() => {
    store.loadAll()
  }, [])

  const resetForm = (): void => {
    setForm(emptyForm)
    setEditingId(null)
    setShowForm(false)
  }

  const handleEdit = <T extends { id: string }>(item: T, mapToForm: (item: T) => FormData): void => {
    setForm(mapToForm(item))
    setEditingId(item.id)
    setShowForm(true)
  }

  const handleSubmit = async (): Promise<void> => {
    if (tab === 'materials') {
      const data = {
        name: form.name,
        code: form.code,
        specification: form.specification,
        category: form.category,
        unit: form.unit,
        unitPrice: Number(form.unitPrice),
        supplier: form.supplier
      }
      if (editingId) {
        await store.updateMaterial(editingId, data)
      } else {
        await store.createMaterial(data)
      }
    } else if (tab === 'wages') {
      const data = { type: form.type, dailyWage: Number(form.dailyWage), unit: 'OH' }
      if (editingId) {
        await store.updateWage(editingId, data)
      } else {
        await store.createWage(data)
      }
    } else if (tab === 'equipment') {
      const data = {
        name: form.name,
        type: form.type,
        capacity: form.capacity,
        rentalPrice: Number(form.rentalPrice),
        unit: 'hari'
      }
      if (editingId) {
        await store.updateEquipment(editingId, data)
      } else {
        await store.createEquipment(data)
      }
    }
    resetForm()
  }

  const handleDelete = async (id: string): Promise<void> => {
    if (tab === 'materials') await store.deleteMaterial(id)
    else if (tab === 'wages') await store.deleteWage(id)
    else if (tab === 'equipment') await store.deleteEquipment(id)
  }

  const tabs: { id: TabType; label: string; count: number }[] = [
    { id: 'materials', label: 'Material', count: store.materials.length },
    { id: 'wages', label: 'Upah Tenaga', count: store.wages.length },
    { id: 'equipment', label: 'Alat', count: store.equipment.length }
  ]

  const renderForm = (): React.ReactElement => (
    <div className="card p-4 mb-4">
      <h4 className="font-semibold mb-3">{editingId ? 'Edit' : 'Tambah'} {tabs.find(t => t.id === tab)?.label}</h4>
      <div className="grid grid-cols-3 gap-3">
        {tab === 'materials' && (
          <>
            <input className="input-field" placeholder="Nama material" value={form.name} onChange={e => setForm({ ...form, name: e.target.value })} />
            <input className="input-field" placeholder="Kode" value={form.code} onChange={e => setForm({ ...form, code: e.target.value })} />
            <input className="input-field" placeholder="Spesifikasi" value={form.specification} onChange={e => setForm({ ...form, specification: e.target.value })} />
            <input className="input-field" placeholder="Kategori" value={form.category} onChange={e => setForm({ ...form, category: e.target.value })} />
            <input className="input-field" placeholder="Satuan" value={form.unit} onChange={e => setForm({ ...form, unit: e.target.value })} />
            <input className="input-field" type="number" placeholder="Harga satuan" value={form.unitPrice} onChange={e => setForm({ ...form, unitPrice: e.target.value })} />
            <input className="input-field" placeholder="Supplier" value={form.supplier} onChange={e => setForm({ ...form, supplier: e.target.value })} />
          </>
        )}
        {tab === 'wages' && (
          <>
            <input className="input-field" placeholder="Jenis tenaga (Tukang Batu, dll)" value={form.type} onChange={e => setForm({ ...form, type: e.target.value })} />
            <input className="input-field" type="number" placeholder="Upah/hari" value={form.dailyWage} onChange={e => setForm({ ...form, dailyWage: e.target.value })} />
          </>
        )}
        {tab === 'equipment' && (
          <>
            <input className="input-field" placeholder="Nama alat" value={form.name} onChange={e => setForm({ ...form, name: e.target.value })} />
            <input className="input-field" placeholder="Tipe" value={form.type} onChange={e => setForm({ ...form, type: e.target.value })} />
            <input className="input-field" placeholder="Kapasitas" value={form.capacity} onChange={e => setForm({ ...form, capacity: e.target.value })} />
            <input className="input-field" type="number" placeholder="Sewa/hari" value={form.rentalPrice} onChange={e => setForm({ ...form, rentalPrice: e.target.value })} />
          </>
        )}
      </div>
      <div className="flex gap-2 mt-3">
        <button onClick={handleSubmit} className="btn-primary">Simpan</button>
        <button onClick={resetForm} className="btn-secondary">Batal</button>
      </div>
    </div>
  )

  return (
    <div className="space-y-6">
      <h2 className="text-2xl font-bold text-gray-900">Master Data</h2>

      <div className="flex gap-1 bg-gray-100 p-1 rounded-lg w-fit">
        {tabs.map(t => (
          <button
            key={t.id}
            onClick={() => { setTab(t.id); resetForm() }}
            className={`px-4 py-2 rounded-md text-sm font-medium transition-colors ${tab === t.id ? 'bg-white shadow-sm text-primary-800' : 'text-gray-600 hover:text-gray-900'}`}
          >
            {t.label} ({t.count})
          </button>
        ))}
      </div>

      {showForm && renderForm()}

      <div className="card overflow-hidden">
        {tab === 'materials' && (
          <>
            <div className="p-3 border-b border-gray-200 flex justify-between items-center">
              <span className="text-sm font-medium text-gray-700">Daftar Material</span>
              <button onClick={() => setShowForm(true)} className="btn-primary text-xs px-3 py-1.5">+ Tambah</button>
            </div>
            <table className="w-full">
              <thead>
                <tr className="bg-gray-50 border-b border-gray-200">
                  <th className="table-header">Nama</th>
                  <th className="table-header">Kategori</th>
                  <th className="table-header">Satuan</th>
                  <th className="table-header">Harga</th>
                  <th className="table-header">Aksi</th>
                </tr>
              </thead>
              <tbody>
                {Array.isArray(store.materials) && store.materials.map(m => (
                  <tr key={m.id} className="border-b border-gray-100">
                    <td className="table-cell font-medium">{m.name}</td>
                    <td className="table-cell">{m.category}</td>
                    <td className="table-cell">{m.unit}</td>
                    <td className="table-cell font-mono">{formatCurrency(m.unitPrice)}</td>
                    <td className="table-cell">
                      <button onClick={() => handleEdit(m, item => ({ ...emptyForm, name: item.name, code: item.code, specification: item.specification, category: item.category, unit: item.unit, unitPrice: String(item.unitPrice), supplier: item.supplier }))} className="text-blue-600 hover:text-blue-800 text-xs mr-2">Edit</button>
                      <button onClick={() => handleDelete(m.id)} className="text-red-600 hover:text-red-800 text-xs">Hapus</button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </>
        )}

        {tab === 'wages' && (
          <>
            <div className="p-3 border-b border-gray-200 flex justify-between items-center">
              <span className="text-sm font-medium text-gray-700">Daftar Upah Tenaga</span>
              <button onClick={() => setShowForm(true)} className="btn-primary text-xs px-3 py-1.5">+ Tambah</button>
            </div>
            <table className="w-full">
              <thead>
                <tr className="bg-gray-50 border-b border-gray-200">
                  <th className="table-header">Jenis</th>
                  <th className="table-header">Upah/hari</th>
                  <th className="table-header">Satuan</th>
                  <th className="table-header">Aksi</th>
                </tr>
              </thead>
              <tbody>
                {Array.isArray(store.wages) && store.wages.map(w => (
                  <tr key={w.id} className="border-b border-gray-100">
                    <td className="table-cell font-medium">{w.type}</td>
                    <td className="table-cell font-mono">{formatCurrency(w.dailyWage)}</td>
                    <td className="table-cell">{w.unit}</td>
                    <td className="table-cell">
                      <button onClick={() => handleEdit(w, item => ({ ...emptyForm, type: item.type, dailyWage: String(item.dailyWage) }))} className="text-blue-600 hover:text-blue-800 text-xs mr-2">Edit</button>
                      <button onClick={() => handleDelete(w.id)} className="text-red-600 hover:text-red-800 text-xs">Hapus</button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </>
        )}

        {tab === 'equipment' && (
          <>
            <div className="p-3 border-b border-gray-200 flex justify-between items-center">
              <span className="text-sm font-medium text-gray-700">Daftar Alat</span>
              <button onClick={() => setShowForm(true)} className="btn-primary text-xs px-3 py-1.5">+ Tambah</button>
            </div>
            <table className="w-full">
              <thead>
                <tr className="bg-gray-50 border-b border-gray-200">
                  <th className="table-header">Nama</th>
                  <th className="table-header">Tipe</th>
                  <th className="table-header">Kapasitas</th>
                  <th className="table-header">Sewa/hari</th>
                  <th className="table-header">Aksi</th>
                </tr>
              </thead>
              <tbody>
                {Array.isArray(store.equipment) && store.equipment.map(e => (
                  <tr key={e.id} className="border-b border-gray-100">
                    <td className="table-cell font-medium">{e.name}</td>
                    <td className="table-cell">{e.type}</td>
                    <td className="table-cell">{e.capacity}</td>
                    <td className="table-cell font-mono">{formatCurrency(e.rentalPrice)}</td>
                    <td className="table-cell">
                      <button onClick={() => handleEdit(e, item => ({ ...emptyForm, name: item.name, type: item.type, capacity: item.capacity, rentalPrice: String(item.rentalPrice) }))} className="text-blue-600 hover:text-blue-800 text-xs mr-2">Edit</button>
                      <button onClick={() => handleDelete(e.id)} className="text-red-600 hover:text-red-800 text-xs">Hapus</button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </>
        )}
      </div>
    </div>
  )
}
