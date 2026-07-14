import React, { useState, useEffect } from 'react'
import { useMasterDataStore } from '../stores/master-data-store'
import { formatCurrency } from '../lib/format'
import { Package, HardHat, Wrench, Plus, Edit, Trash2 } from 'lucide-react'

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
  const [searchQuery, setSearchQuery] = useState('')
  const [currentPage, setCurrentPage] = useState(1)
  const itemsPerPage = 50

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
    if (confirm('Apakah Anda yakin ingin menghapus item ini?')) {
      if (tab === 'materials') await store.deleteMaterial(id)
      else if (tab === 'wages') await store.deleteWage(id)
      else if (tab === 'equipment') await store.deleteEquipment(id)
    }
  }

  const filteredMaterials = (store.materials || []).filter(m =>
    m.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
    (m.category && m.category.toLowerCase().includes(searchQuery.toLowerCase())) ||
    (m.code && m.code.toLowerCase().includes(searchQuery.toLowerCase()))
  )

  const filteredWages = (store.wages || []).filter(w =>
    w.type.toLowerCase().includes(searchQuery.toLowerCase())
  )

  const filteredEquipment = (store.equipment || []).filter(e =>
    e.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
    (e.type && e.type.toLowerCase().includes(searchQuery.toLowerCase()))
  )

  const getFilteredCount = () => {
    if (tab === 'materials') return filteredMaterials.length
    if (tab === 'wages') return filteredWages.length
    return filteredEquipment.length
  }

  const totalItems = getFilteredCount()
  const totalPages = Math.ceil(totalItems / itemsPerPage) || 1
  const activePageNumber = Math.min(currentPage, totalPages)
  const startIndex = (activePageNumber - 1) * itemsPerPage

  const paginatedMaterials = filteredMaterials.slice(startIndex, startIndex + itemsPerPage)
  const paginatedWages = filteredWages.slice(startIndex, startIndex + itemsPerPage)
  const paginatedEquipment = filteredEquipment.slice(startIndex, startIndex + itemsPerPage)

  const tabs: { id: TabType; label: string; count: number; icon: React.ComponentType<{ className?: string }> }[] = [
    { id: 'materials', label: 'Material', count: store.materials.length, icon: Package },
    { id: 'wages', label: 'Upah Tenaga', count: store.wages.length, icon: HardHat },
    { id: 'equipment', label: 'Alat', count: store.equipment.length, icon: Wrench }
  ]

  const renderForm = (): React.ReactElement => (
    <div className="card p-6 mb-6 bg-white border border-[#EAEAEA]">
      <h4 className="text-xs font-bold mb-4 uppercase text-[#111111] tracking-wider flex items-center gap-1.5">
        <Plus className="w-3.5 h-3.5 text-[#787774]" />
        <span>{editingId ? 'Edit' : 'Tambah'} {tabs.find(t => t.id === tab)?.label}</span>
      </h4>
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        {tab === 'materials' && (
          <>
            <input className="input-field" placeholder="Nama material" value={form.name} onChange={e => setForm({ ...form, name: e.target.value })} />
            <input className="input-field" placeholder="Kode material" value={form.code} onChange={e => setForm({ ...form, code: e.target.value })} />
            <input className="input-field" placeholder="Spesifikasi" value={form.specification} onChange={e => setForm({ ...form, specification: e.target.value })} />
            <input className="input-field" placeholder="Kategori" value={form.category} onChange={e => setForm({ ...form, category: e.target.value })} />
            <input className="input-field" placeholder="Satuan (m³, kg, dll)" value={form.unit} onChange={e => setForm({ ...form, unit: e.target.value })} />
            <input className="input-field font-mono" type="number" placeholder="Harga satuan" value={form.unitPrice} onChange={e => setForm({ ...form, unitPrice: e.target.value })} />
            <input className="input-field md:col-span-3" placeholder="Supplier / Penyuplai" value={form.supplier} onChange={e => setForm({ ...form, supplier: e.target.value })} />
          </>
        )}
        {tab === 'wages' && (
          <>
            <input className="input-field" placeholder="Jenis tenaga (Tukang Batu, Kepala Tukang, Pekerja)" value={form.type} onChange={e => setForm({ ...form, type: e.target.value })} />
            <input className="input-field font-mono" type="number" placeholder="Upah per hari" value={form.dailyWage} onChange={e => setForm({ ...form, dailyWage: e.target.value })} />
          </>
        )}
        {tab === 'equipment' && (
          <>
            <input className="input-field" placeholder="Nama alat" value={form.name} onChange={e => setForm({ ...form, name: e.target.value })} />
            <input className="input-field" placeholder="Tipe" value={form.type} onChange={e => setForm({ ...form, type: e.target.value })} />
            <input className="input-field" placeholder="Kapasitas" value={form.capacity} onChange={e => setForm({ ...form, capacity: e.target.value })} />
            <input className="input-field font-mono" type="number" placeholder="Harga sewa per hari" value={form.rentalPrice} onChange={e => setForm({ ...form, rentalPrice: e.target.value })} />
          </>
        )}
      </div>
      <div className="flex gap-2 mt-5">
        <button onClick={handleSubmit} className="btn-primary text-xs px-4 py-2">Simpan</button>
        <button onClick={resetForm} className="btn-secondary text-xs px-4 py-2">Batal</button>
      </div>
    </div>
  )
 
  return (
    <div className="space-y-6">
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center border-b border-[#EAEAEA] pb-5 gap-4">
        <div className="flex items-center gap-3">
          <div>
            <h2 className="text-2xl font-bold text-[#111111] tracking-tight">Master Data Library</h2>
            <p className="text-xs text-[#787774] mt-1 font-sans">Basis data global untuk referensi material, upah tenaga kerja, dan penyewaan alat.</p>
          </div>
        </div>
        <div className="flex gap-1.5 bg-[#EAEAEA]/30 p-1 rounded-md w-fit border border-[#EAEAEA]">
          {tabs.map(t => {
            const isSelected = tab === t.id
            return (
              <button
                key={t.id}
                onClick={() => { setTab(t.id); resetForm(); setSearchQuery(''); setCurrentPage(1) }}
                className={`flex items-center gap-1.5 px-3 py-1.5 rounded-sm text-xs font-bold tracking-wide transition-all duration-150 ${
                  isSelected
                    ? 'bg-[#111111] text-white shadow-xs'
                    : 'text-[#787774] hover:text-[#111111]'
                }`}
              >
                <span>{t.label}</span>
                <span className={`text-[9px] px-1.5 py-0.2 rounded font-mono ${isSelected ? 'bg-white/20 text-white' : 'bg-black/5 text-[#787774]'}`}>{t.count}</span>
              </button>
            )
          })}
        </div>
      </div>

      {showForm && renderForm()}

      <div className="card overflow-hidden bg-white border border-[#EAEAEA]">
        {tab === 'materials' && (
          <>
            <div className="px-5 py-4 border-b border-[#EAEAEA] flex flex-col sm:flex-row justify-between items-center bg-[#F7F6F3]/30 gap-3">
              <span className="text-xs font-bold text-[#111111] uppercase tracking-wider">Daftar Material</span>
              <div className="flex items-center gap-2.5 w-full sm:w-auto">
                <input
                  type="text"
                  placeholder="Cari material..."
                  value={searchQuery}
                  onChange={e => { setSearchQuery(e.target.value); setCurrentPage(1) }}
                  className="input-field max-w-xs text-xs px-3 py-1.5 bg-white"
                />
                <button onClick={() => setShowForm(true)} className="btn-primary text-xs px-3 py-1.5 flex items-center gap-1 shrink-0">
                  <Plus className="w-3.5 h-3.5" />
                  <span>Tambah Material</span>
                </button>
              </div>
            </div>
            <div className="overflow-x-auto">
              <table className="w-full border-collapse">
                <thead>
                  <tr className="border-b border-slate-100 bg-slate-50/50">
                    <th className="table-header">Nama</th>
                    <th className="table-header w-40">Kategori</th>
                    <th className="table-header text-center w-24">Satuan</th>
                    <th className="table-header text-right w-36">Harga</th>
                    <th className="table-header text-center w-32">Aksi</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 bg-white">
                  {Array.isArray(paginatedMaterials) && paginatedMaterials.length === 0 ? (
                    <tr>
                      <td colSpan={5} className="text-center py-12 text-slate-400 font-medium italic text-sm">
                        Belum ada data material. Silakan tambah data material baru.
                      </td>
                    </tr>
                  ) : (
                    paginatedMaterials.map(m => (
                      <tr key={m.id} className="hover:bg-slate-50/50 transition-colors group">
                        <td className="table-cell font-bold text-slate-800">{m.name}</td>
                        <td className="table-cell text-slate-500 font-medium">{m.category}</td>
                        <td className="table-cell text-center text-slate-500 font-semibold">{m.unit}</td>
                        <td className="table-cell text-right font-mono font-bold text-slate-700">{formatCurrency(m.unitPrice)}</td>
                        <td className="table-cell text-center select-none">
                          <button onClick={() => handleEdit(m, item => ({ ...emptyForm, name: item.name, code: item.code, specification: item.specification, category: item.category, unit: item.unit, unitPrice: String(item.unitPrice), supplier: item.supplier }))} className="text-primary-600 hover:text-primary-800 font-bold mr-3.5 text-xs inline-flex items-center gap-0.5">
                            <Edit className="w-3 h-3" />
                            <span>Edit</span>
                          </button>
                          <button onClick={() => handleDelete(m.id)} className="text-red-600 hover:text-red-800 font-bold text-xs inline-flex items-center gap-0.5">
                            <Trash2 className="w-3 h-3" />
                            <span>Hapus</span>
                          </button>
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          </>
        )}

        {tab === 'wages' && (
          <>
            <div className="px-5 py-4 border-b border-[#EAEAEA] flex flex-col sm:flex-row justify-between items-center bg-[#F7F6F3]/30 gap-3">
              <span className="text-xs font-bold text-[#111111] uppercase tracking-wider">Daftar Upah Tenaga Kerja</span>
              <div className="flex items-center gap-2.5 w-full sm:w-auto">
                <input
                  type="text"
                  placeholder="Cari upah..."
                  value={searchQuery}
                  onChange={e => { setSearchQuery(e.target.value); setCurrentPage(1) }}
                  className="input-field max-w-xs text-xs px-3 py-1.5 bg-white"
                />
                <button onClick={() => setShowForm(true)} className="btn-primary text-xs px-3 py-1.5 flex items-center gap-1 shrink-0">
                  <Plus className="w-3.5 h-3.5" />
                  <span>Tambah Tenaga Kerja</span>
                </button>
              </div>
            </div>
            <div className="overflow-x-auto">
              <table className="w-full border-collapse">
                <thead>
                  <tr className="border-b border-slate-100 bg-slate-50/50">
                    <th className="table-header">Jenis Tenaga Kerja</th>
                    <th className="table-header text-right w-40">Upah / Hari</th>
                    <th className="table-header text-center w-24">Satuan</th>
                    <th className="table-header text-center w-32">Aksi</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 bg-white">
                  {Array.isArray(paginatedWages) && paginatedWages.length === 0 ? (
                    <tr>
                      <td colSpan={4} className="text-center py-12 text-slate-400 font-medium italic text-sm">
                        Belum ada data tenaga kerja. Silakan tambah data baru.
                      </td>
                    </tr>
                  ) : (
                    paginatedWages.map(w => (
                      <tr key={w.id} className="hover:bg-slate-50/50 transition-colors group">
                        <td className="table-cell font-bold text-slate-800">{w.type}</td>
                        <td className="table-cell text-right font-mono font-bold text-slate-700">{formatCurrency(w.dailyWage)}</td>
                        <td className="table-cell text-center text-slate-500 font-bold">{w.unit}</td>
                        <td className="table-cell text-center select-none">
                          <button onClick={() => handleEdit(w, item => ({ ...emptyForm, type: item.type, dailyWage: String(item.dailyWage) }))} className="text-primary-600 hover:text-primary-800 font-bold mr-3.5 text-xs inline-flex items-center gap-0.5">
                            <Edit className="w-3 h-3" />
                            <span>Edit</span>
                          </button>
                          <button onClick={() => handleDelete(w.id)} className="text-red-600 hover:text-red-800 font-bold text-xs inline-flex items-center gap-0.5">
                            <Trash2 className="w-3 h-3" />
                            <span>Hapus</span>
                          </button>
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          </>
        )}

        {tab === 'equipment' && (
          <>
            <div className="px-5 py-4 border-b border-[#EAEAEA] flex flex-col sm:flex-row justify-between items-center bg-[#F7F6F3]/30 gap-3">
              <span className="text-xs font-bold text-[#111111] uppercase tracking-wider">Daftar Alat</span>
              <div className="flex items-center gap-2.5 w-full sm:w-auto">
                <input
                  type="text"
                  placeholder="Cari alat..."
                  value={searchQuery}
                  onChange={e => { setSearchQuery(e.target.value); setCurrentPage(1) }}
                  className="input-field max-w-xs text-xs px-3 py-1.5 bg-white"
                />
                <button onClick={() => setShowForm(true)} className="btn-primary text-xs px-3 py-1.5 flex items-center gap-1 shrink-0">
                  <Plus className="w-3.5 h-3.5" />
                  <span>Tambah Alat</span>
                </button>
              </div>
            </div>
            <div className="overflow-x-auto">
              <table className="w-full border-collapse">
                <thead>
                  <tr className="border-b border-slate-100 bg-slate-50/50">
                    <th className="table-header">Nama Alat</th>
                    <th className="table-header w-40">Tipe</th>
                    <th className="table-header w-32">Kapasitas</th>
                    <th className="table-header text-right w-36">Sewa / Hari</th>
                    <th className="table-header text-center w-32">Aksi</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 bg-white">
                  {Array.isArray(paginatedEquipment) && paginatedEquipment.length === 0 ? (
                    <tr>
                      <td colSpan={5} className="text-center py-12 text-slate-400 font-medium italic text-sm">
                        Belum ada data alat. Silakan tambah data baru.
                      </td>
                    </tr>
                  ) : (
                    paginatedEquipment.map(e => (
                      <tr key={e.id} className="hover:bg-slate-50/50 transition-colors group">
                        <td className="table-cell font-bold text-slate-800">{e.name}</td>
                        <td className="table-cell text-slate-500 font-medium">{e.type}</td>
                        <td className="table-cell text-slate-500 font-medium">{e.capacity}</td>
                        <td className="table-cell text-right font-mono font-bold text-slate-700">{formatCurrency(e.rentalPrice)}</td>
                        <td className="table-cell text-center select-none">
                          <button onClick={() => handleEdit(e, item => ({ ...emptyForm, name: item.name, type: item.type, capacity: item.capacity, rentalPrice: String(item.rentalPrice) }))} className="text-primary-600 hover:text-primary-800 font-bold mr-3.5 text-xs inline-flex items-center gap-0.5">
                            <Edit className="w-3 h-3" />
                            <span>Edit</span>
                          </button>
                          <button onClick={() => handleDelete(e.id)} className="text-red-600 hover:text-red-800 font-bold text-xs inline-flex items-center gap-0.5">
                            <Trash2 className="w-3 h-3" />
                            <span>Hapus</span>
                          </button>
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          </>
        )}

        {/* Unified Pagination Footer */}
        <div className="px-5 py-3 border-t border-[#EAEAEA] flex items-center justify-between text-xs text-[#787774] font-medium bg-[#F7F6F3]/10">
          <div>
            Menampilkan {totalItems > 0 ? startIndex + 1 : 0} - {Math.min(startIndex + itemsPerPage, totalItems)} dari {totalItems} item
          </div>
          {totalPages > 1 && (
            <div className="flex items-center gap-2">
              <button
                disabled={activePageNumber === 1}
                onClick={() => setCurrentPage(prev => Math.max(prev - 1, 1))}
                className="btn-secondary text-[11px] px-2.5 py-1 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                Sebelumnya
              </button>
              <span className="font-semibold text-[#111111] font-mono">
                {activePageNumber} / {totalPages}
              </span>
              <button
                disabled={activePageNumber === totalPages}
                onClick={() => setCurrentPage(prev => Math.min(prev + 1, totalPages))}
                className="btn-secondary text-[11px] px-2.5 py-1 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                Berikutnya
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
