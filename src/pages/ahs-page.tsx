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

  const [editingId, setEditingId] = useState<string | null>(null)
  const [editCoeff, setEditCoeff] = useState<string>('')
  const [editItemId, setEditItemId] = useState<string>('')

  // Adding state for component
  const [selectedItemId, setSelectedItemId] = useState<string>('')
  const [newCoeff, setNewCoeff] = useState<string>('0')
  const [filterQuery, setFilterQuery] = useState<string>('')

  // Local state for editing AHS details
  const [localCode, setLocalCode] = useState('')
  const [localName, setLocalName] = useState('')
  const [localUnit, setLocalUnit] = useState('')

  // Library AHS search state
  const [ahsSearchQuery, setAhsSearchQuery] = useState('')

  useEffect(() => {
    masterStore.loadAll()
    if (projectId) store.loadByProject(projectId)
    else store.loadAll()
  }, [projectId])

  useEffect(() => {
    if (store.selectedAhs) {
      setLocalCode(store.selectedAhs.code)
      setLocalName(store.selectedAhs.name)
      setLocalUnit(store.selectedAhs.unit)
    }
  }, [store.selectedAhs?.id])

  const handleUpdateAhsDetails = async () => {
    const ahs = store.selectedAhs
    if (!ahs) return
    if (!localCode.trim() || !localName.trim() || !localUnit.trim()) return
    await store.updateAhs(ahs.id, {
      code: localCode.trim(),
      name: localName.trim(),
      unit: localUnit.trim()
    })
  }

  // Quick create state
  const [showQuickCreate, setShowQuickCreate] = useState(false)
  const [quickForm, setQuickForm] = useState({
    code: '',
    name: '',
    specification: '',
    category: '',
    unit: 'buah',
    unitPrice: '0',
    supplier: '',
    type: '',
    dailyWage: '0',
    capacity: '',
    rentalPrice: '0'
  })

  // Custom non-blocking dialog state
  const [dialog, setDialog] = useState<{
    show: boolean
    title: string
    message: string
    isConfirm: boolean
    onConfirm?: () => void
    onCancel?: () => void
  } | null>(null)

  const showAlert = (message: string, title = 'Informasi') => {
    setDialog({
      show: true,
      title,
      message,
      isConfirm: false
    })
  }

  const showConfirm = (message: string, onConfirm: () => void, title = 'Konfirmasi') => {
    setDialog({
      show: true,
      title,
      message,
      isConfirm: true,
      onConfirm
    })
  }

  const handleQuickCreateSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    let newId = ''
    if (compTab === 'material') {
      const res = await window.api.material.create({
        name: quickForm.name.trim(),
        code: quickForm.code.trim(),
        specification: quickForm.specification.trim(),
        category: quickForm.category.trim(),
        unit: quickForm.unit.trim(),
        unitPrice: parseFloat(quickForm.unitPrice) || 0,
        supplier: quickForm.supplier.trim()
      })
      if (res.success && res.data) {
        newId = res.data.id
      } else {
        showAlert('Gagal membuat material: ' + res.error, 'Error')
        return
      }
    } else if (compTab === 'wage') {
      const res = await window.api.wage.create({
        type: quickForm.type.trim(),
        dailyWage: parseFloat(quickForm.dailyWage) || 0,
        unit: 'OH'
      })
      if (res.success && res.data) {
        newId = res.data.id
      } else {
        showAlert('Gagal membuat tenaga kerja: ' + res.error, 'Error')
        return
      }
    } else if (compTab === 'equipment') {
      const res = await window.api.equipment.create({
        name: quickForm.name.trim(),
        type: quickForm.type.trim(),
        capacity: quickForm.capacity.trim(),
        rentalPrice: parseFloat(quickForm.rentalPrice) || 0,
        unit: 'hari'
      })
      if (res.success && res.data) {
        newId = res.data.id
      } else {
        showAlert('Gagal membuat peralatan: ' + res.error, 'Error')
        return
      }
    }

    await masterStore.loadAll()

    if (editingId) {
      setEditItemId(newId)
    } else {
      setSelectedItemId(newId)
    }

    setQuickForm({
      code: '',
      name: '',
      specification: '',
      category: '',
      unit: 'buah',
      unitPrice: '0',
      supplier: '',
      type: '',
      dailyWage: '0',
      capacity: '',
      rentalPrice: '0'
    })
    setShowQuickCreate(false)
  }

  // Filter master items based on search input
  const filteredMaterials = masterStore.materials.filter(m =>
    m.name.toLowerCase().includes(filterQuery.toLowerCase()) ||
    m.code.toLowerCase().includes(filterQuery.toLowerCase())
  )

  const filteredWages = masterStore.wages.filter(w =>
    w.type.toLowerCase().includes(filterQuery.toLowerCase())
  )

  const filteredEquipment = masterStore.equipment.filter(e =>
    e.name.toLowerCase().includes(filterQuery.toLowerCase()) ||
    (e.type && e.type.toLowerCase().includes(filterQuery.toLowerCase()))
  )

  // Clear states when tab changes
  useEffect(() => {
    setEditingId(null)
    setEditCoeff('')
    setNewCoeff('0')
    setFilterQuery('')
  }, [compTab])

  // Automatically select the first filtered item when tab, filter, or items change
  useEffect(() => {
    if (compTab === 'material') {
      setSelectedItemId(filteredMaterials[0]?.id || '')
    } else if (compTab === 'wage') {
      setSelectedItemId(filteredWages[0]?.id || '')
    } else if (compTab === 'equipment') {
      setSelectedItemId(filteredEquipment[0]?.id || '')
    } else {
      setSelectedItemId('')
    }
  }, [compTab, filterQuery, masterStore.materials, masterStore.wages, masterStore.equipment])

  const handleCreate = async (e: React.FormEvent): Promise<void> => {
    e.preventDefault()
    await store.createAhs({ ...form, projectId: projectId ?? null })
    setForm(emptyForm)
  }

  const handleSelect = (ahs: Ahs): void => {
    store.selectAhs(ahs)
    setMode('edit')
  }

  const handleAddComponent = async (e: React.FormEvent): Promise<void> => {
    e.preventDefault()
    const ahs = store.selectedAhs
    if (!ahs || !selectedItemId) return

    const coeffVal = parseFloat(newCoeff) || 0
    if (compTab === 'material') {
      await store.addMaterialComponent({
        ahsId: ahs.id,
        materialId: selectedItemId,
        coefficient: coeffVal
      })
    } else if (compTab === 'wage') {
      await store.addWageComponent({
        ahsId: ahs.id,
        wageId: selectedItemId,
        coefficient: coeffVal
      })
    } else if (compTab === 'equipment') {
      await store.addEquipmentComponent({
        ahsId: ahs.id,
        equipmentId: selectedItemId,
        coefficient: coeffVal
      })
    }
    
    // Refresh selected Ahs to get new total price
    const updatedRes = await window.api.ahs.getById(ahs.id)
    if (updatedRes.success && updatedRes.data) {
      store.selectAhs(updatedRes.data)
    }
    
    setNewCoeff('0')
  }

  const handleSaveEdit = async (id: string): Promise<void> => {
    const ahs = store.selectedAhs
    if (!ahs) return
    const coeffVal = parseFloat(editCoeff) || 0

    if (compTab === 'material') {
      await store.updateMaterialComponent(id, { materialId: editItemId, coefficient: coeffVal })
    } else if (compTab === 'wage') {
      await store.updateWageComponent(id, { wageId: editItemId, coefficient: coeffVal })
    } else if (compTab === 'equipment') {
      await store.updateEquipmentComponent(id, { equipmentId: editItemId, coefficient: coeffVal })
    }

    // Refresh selected Ahs to get new total price
    const updatedRes = await window.api.ahs.getById(ahs.id)
    if (updatedRes.success && updatedRes.data) {
      store.selectAhs(updatedRes.data)
    }

    setEditingId(null)
  }

  const handleDeleteComponent = async (id: string): Promise<void> => {
    const ahs = store.selectedAhs
    if (!ahs) return

    if (compTab === 'material') {
      await store.deleteMaterialComponent(id)
    } else if (compTab === 'wage') {
      await store.deleteWageComponent(id)
    } else if (compTab === 'equipment') {
      await store.deleteEquipmentComponent(id)
    }

    // Refresh selected Ahs to get new total price
    const updatedRes = await window.api.ahs.getById(ahs.id)
    if (updatedRes.success && updatedRes.data) {
      store.selectAhs(updatedRes.data)
    }
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
        {/* Header with Navigation & Duplicate Button */}
        <div className="flex items-center justify-between border-b border-gray-200 pb-3 no-print">
          <div className="flex items-center gap-3">
            <button 
              onClick={() => { setMode('list'); store.selectAhs(null) }} 
              className="text-gray-500 hover:text-gray-700 text-sm font-semibold flex items-center gap-1"
            >
              &larr; Kembali ke Daftar
            </button>
            <span className="text-gray-300">|</span>
            <span className="text-xs font-semibold bg-blue-100 text-blue-700 px-2 py-0.5 rounded uppercase font-mono">
              Mode Edit
            </span>
          </div>

          <div className="flex items-center gap-3">
            <button
              onClick={() => {
                showConfirm(
                  'Duplikat analisa ini untuk membuat analisa kustom baru?',
                  async () => {
                    const ok = await store.duplicateAhs(ahs.id)
                    if (ok) {
                      showAlert('Analisa berhasil diduplikat! Anda sekarang mengedit analisa kustom baru.', 'Sukses')
                    } else {
                      showAlert('Gagal menduplikat analisa', 'Error')
                    }
                  }
                )
              }}
              className="btn-primary text-xs px-3.5 py-1.5 bg-amber-600 hover:bg-amber-700 flex items-center gap-1.5 font-bold shadow-sm transition-all"
            >
              <span>📂 Duplikat Analisa</span>
            </button>
          </div>
        </div>

        {/* Editable AHS Details Panel */}
        <div className="card p-4 bg-white border border-gray-200 space-y-3">
          <div className="flex justify-between items-center border-b border-gray-100 pb-2">
            <h4 className="text-xs font-bold text-gray-700 uppercase tracking-wider">Detail Informasi Analisa</h4>
            <span className="text-base font-bold font-mono text-primary-800">
              Total Harga Satuan: {formatCurrency(ahs.totalPrice)} / {ahs.unit}
            </span>
          </div>
          <div className="grid grid-cols-4 gap-3 items-end">
            <div>
              <label className="block text-xs font-medium text-gray-600 mb-1">Kode AHS</label>
              <input
                type="text"
                value={localCode}
                onChange={e => setLocalCode(e.target.value)}
                onBlur={handleUpdateAhsDetails}
                className="w-full px-3 py-1.5 border border-gray-300 rounded text-sm font-mono focus:border-primary-500 focus:outline-none focus:ring-1 focus:ring-primary-500"
              />
            </div>
            <div className="col-span-2">
              <label className="block text-xs font-medium text-gray-600 mb-1">Nama Pekerjaan</label>
              <input
                type="text"
                value={localName}
                onChange={e => setLocalName(e.target.value)}
                onBlur={handleUpdateAhsDetails}
                className="w-full px-3 py-1.5 border border-gray-300 rounded text-sm font-sans focus:border-primary-500 focus:outline-none focus:ring-1 focus:ring-primary-500"
              />
            </div>
            <div>
              <label className="block text-xs font-medium text-gray-600 mb-1">Satuan</label>
              <input
                type="text"
                value={localUnit}
                onChange={e => setLocalUnit(e.target.value)}
                onBlur={handleUpdateAhsDetails}
                className="w-full px-3 py-1.5 border border-gray-300 rounded text-sm font-sans focus:border-primary-500 focus:outline-none focus:ring-1 focus:ring-primary-500"
              />
            </div>
          </div>
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

        {/* Tambah Komponen Form */}
        <div className="card p-4 bg-gray-50 border border-gray-200">
          <h4 className="text-xs font-semibold text-gray-700 uppercase tracking-wider mb-2">
            Tambah Komponen {compTab === 'material' ? 'Material' : compTab === 'wage' ? 'Tenaga Kerja' : 'Alat'} Kustom
          </h4>
          <form onSubmit={handleAddComponent} className="flex gap-3 items-end">
            <div className="w-64">
              <label className="block text-xs text-gray-600 mb-1">Cari / Filter</label>
              <input
                type="text"
                placeholder={`Cari ${compTab === 'material' ? 'material' : compTab === 'wage' ? 'tenaga' : 'alat'}...`}
                value={filterQuery}
                onChange={e => setFilterQuery(e.target.value)}
                className="w-full px-3 py-1.5 border border-gray-300 rounded text-sm bg-white"
              />
            </div>
            <div className="flex-1">
              <label className="block text-xs text-gray-600 mb-1 flex justify-between items-center">
                <span>Pilih {compTab === 'material' ? 'Material' : compTab === 'wage' ? 'Tenaga' : 'Alat'} ({compTab === 'material' ? filteredMaterials.length : compTab === 'wage' ? filteredWages.length : filteredEquipment.length} pilihan)</span>
                <button
                  type="button"
                  onClick={() => setShowQuickCreate(true)}
                  className="text-primary-600 hover:text-primary-800 text-[10px] font-bold underline cursor-pointer"
                >
                  + Baru
                </button>
              </label>
              <select
                value={selectedItemId}
                onChange={e => setSelectedItemId(e.target.value)}
                className="w-full px-3 py-1.5 border border-gray-300 rounded text-sm bg-white"
                required
              >
                <option value="" disabled>-- Pilih --</option>
                {compTab === 'material' && filteredMaterials.map(m => (
                  <option key={m.id} value={m.id}>
                    {m.code ? `${m.code} - ` : ''}{m.name} ({formatCurrency(m.unitPrice)}/{m.unit})
                  </option>
                ))}
                {compTab === 'wage' && filteredWages.map(w => (
                  <option key={w.id} value={w.id}>
                    {w.type} ({formatCurrency(w.dailyWage)}/{w.unit})
                  </option>
                ))}
                {compTab === 'equipment' && filteredEquipment.map(e => (
                  <option key={e.id} value={e.id}>
                    {e.name} ({formatCurrency(e.rentalPrice)}/{e.unit})
                  </option>
                ))}
              </select>
            </div>
            <div className="w-32">
              <label className="block text-xs text-gray-600 mb-1">Koefisien</label>
              <input
                type="number"
                step="any"
                min="0"
                value={newCoeff}
                onChange={e => setNewCoeff(e.target.value)}
                className="w-full px-3 py-1.5 border border-gray-300 rounded text-sm font-mono text-right"
                required
              />
            </div>
            <button type="submit" className="btn-primary text-xs px-4 py-2 h-[34px]">
              + Tambah
            </button>
          </form>
        </div>

        <div className="card overflow-hidden">
          <div className="p-3 border-b border-gray-200">
            <span className="text-sm font-medium">Daftar Komponen {compTabs.find(t => t.id === compTab)?.label}</span>
          </div>

          {compTab === 'material' && (
            <table className="w-full">
              <thead>
                <tr className="bg-gray-50 border-b">
                  <th className="table-header">Material</th>
                  <th className="table-header text-right">Koefisien</th>
                  <th className="table-header">Satuan</th>
                  <th className="table-header text-right">Harga</th>
                  <th className="table-header text-right">Subtotal</th>
                  <th className="table-header">Aksi</th>
                </tr>
              </thead>
              <tbody>
                {store.materialComponents.map(c => (
                  <tr key={c.id} className="border-b border-gray-100">
                    <td className="table-cell">
                      {editingId === c.id ? (
                        <select
                          value={editItemId}
                          onChange={e => setEditItemId(e.target.value)}
                          className="px-2 py-1 border border-blue-400 rounded text-sm bg-white w-64"
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
                    <td className="table-cell text-right font-mono">
                      {editingId === c.id ? (
                        <input
                          type="number"
                          step="any"
                          min="0"
                          value={editCoeff}
                          onChange={e => setEditCoeff(e.target.value)}
                          className="w-24 px-2 py-1 border border-blue-400 rounded text-sm text-right font-mono"
                          autoFocus
                        />
                      ) : (
                        c.coefficient
                      )}
                    </td>
                    <td className="table-cell">{c.materialUnit ?? '-'}</td>
                    <td className="table-cell text-right font-mono">{formatCurrency(c.unitPrice ?? 0)}</td>
                    <td className="table-cell text-right font-mono font-medium">{formatCurrency(c.totalPrice)}</td>
                    <td className="table-cell">
                      {editingId === c.id ? (
                        <div className="flex gap-2">
                          <button onClick={() => handleSaveEdit(c.id)} className="text-green-600 hover:text-green-800 text-xs font-semibold">Simpan</button>
                          <button onClick={() => setEditingId(null)} className="text-gray-500 hover:text-gray-700 text-xs">Batal</button>
                        </div>
                      ) : (
                        <div className="flex gap-2">
                          <button onClick={() => { setEditingId(c.id); setEditCoeff(c.coefficient.toString()); setEditItemId(c.materialId) }} className="text-blue-600 hover:text-blue-800 text-xs">Edit</button>
                          <button onClick={() => handleDeleteComponent(c.id)} className="text-red-600 hover:text-red-800 text-xs">Hapus</button>
                        </div>
                      )}
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
                  <th className="table-header text-right">Koefisien</th>
                  <th className="table-header">Satuan</th>
                  <th className="table-header text-right">Upah</th>
                  <th className="table-header text-right">Subtotal</th>
                  <th className="table-header">Aksi</th>
                </tr>
              </thead>
              <tbody>
                {store.wageComponents.map(c => (
                  <tr key={c.id} className="border-b border-gray-100">
                    <td className="table-cell">
                      {editingId === c.id ? (
                        <select
                          value={editItemId}
                          onChange={e => setEditItemId(e.target.value)}
                          className="px-2 py-1 border border-blue-400 rounded text-sm bg-white w-64"
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
                    <td className="table-cell text-right font-mono">
                      {editingId === c.id ? (
                        <input
                          type="number"
                          step="any"
                          min="0"
                          value={editCoeff}
                          onChange={e => setEditCoeff(e.target.value)}
                          className="w-24 px-2 py-1 border border-blue-400 rounded text-sm text-right font-mono"
                          autoFocus
                        />
                      ) : (
                        c.coefficient
                      )}
                    </td>
                    <td className="table-cell">{c.wageUnit ?? '-'}</td>
                    <td className="table-cell text-right font-mono">{formatCurrency(c.dailyWage ?? 0)}</td>
                    <td className="table-cell text-right font-mono font-medium">{formatCurrency(c.totalPrice)}</td>
                    <td className="table-cell">
                      {editingId === c.id ? (
                        <div className="flex gap-2">
                          <button onClick={() => handleSaveEdit(c.id)} className="text-green-600 hover:text-green-800 text-xs font-semibold">Simpan</button>
                          <button onClick={() => setEditingId(null)} className="text-gray-500 hover:text-gray-700 text-xs">Batal</button>
                        </div>
                      ) : (
                        <div className="flex gap-2">
                          <button onClick={() => { setEditingId(c.id); setEditCoeff(c.coefficient.toString()); setEditItemId(c.wageId) }} className="text-blue-600 hover:text-blue-800 text-xs">Edit</button>
                          <button onClick={() => handleDeleteComponent(c.id)} className="text-red-600 hover:text-red-800 text-xs">Hapus</button>
                        </div>
                      )}
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
                  <th className="table-header text-right">Koefisien</th>
                  <th className="table-header">Satuan</th>
                  <th className="table-header text-right">Sewa</th>
                  <th className="table-header text-right">Subtotal</th>
                  <th className="table-header">Aksi</th>
                </tr>
              </thead>
              <tbody>
                {store.equipmentComponents.map(c => (
                  <tr key={c.id} className="border-b border-gray-100">
                    <td className="table-cell">
                      {editingId === c.id ? (
                        <select
                          value={editItemId}
                          onChange={e => setEditItemId(e.target.value)}
                          className="px-2 py-1 border border-blue-400 rounded text-sm bg-white w-64"
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
                    <td className="table-cell text-right font-mono">
                      {editingId === c.id ? (
                        <input
                          type="number"
                          step="any"
                          min="0"
                          value={editCoeff}
                          onChange={e => setEditCoeff(e.target.value)}
                          className="w-24 px-2 py-1 border border-blue-400 rounded text-sm text-right font-mono"
                          autoFocus
                        />
                      ) : (
                        c.coefficient
                      )}
                    </td>
                    <td className="table-cell">{c.equipmentUnit ?? '-'}</td>
                    <td className="table-cell text-right font-mono">{formatCurrency(c.rentalPrice ?? 0)}</td>
                    <td className="table-cell text-right font-mono font-medium">{formatCurrency(c.totalPrice)}</td>
                    <td className="table-cell">
                      {editingId === c.id ? (
                        <div className="flex gap-2">
                          <button onClick={() => handleSaveEdit(c.id)} className="text-green-600 hover:text-green-800 text-xs font-semibold">Simpan</button>
                          <button onClick={() => setEditingId(null)} className="text-gray-500 hover:text-gray-700 text-xs">Batal</button>
                        </div>
                      ) : (
                        <div className="flex gap-2">
                          <button onClick={() => { setEditingId(c.id); setEditCoeff(c.coefficient.toString()); setEditItemId(c.equipmentId) }} className="text-blue-600 hover:text-blue-800 text-xs">Edit</button>
                          <button onClick={() => handleDeleteComponent(c.id)} className="text-red-600 hover:text-red-800 text-xs">Hapus</button>
                        </div>
                      )}
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
      showAlert(`Import berhasil!\nAHS baru: ${s.ahsCreated}\nAHS dilewati: ${s.ahsSkipped}\nUpah baru: ${s.wagesCreated}\nMaterial baru: ${s.materialsCreated}\nAlat baru: ${s.equipmentCreated}`, 'Sukses Import')
      if (!projectId) store.loadAll()
    } else if (result.error !== 'Pembatalan import') {
      showAlert('Gagal import: ' + result.error, 'Error')
    }
  }

  const filteredAhsList = (store.ahsList || []).filter(ahs =>
    ahs.code.toLowerCase().includes(ahsSearchQuery.toLowerCase()) ||
    ahs.name.toLowerCase().includes(ahsSearchQuery.toLowerCase())
  )
  const displayAhsList = filteredAhsList.slice(0, 200)

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

      {/* Pencarian Library AHS */}
      <div className="card p-4 bg-gray-50 border border-gray-200 flex flex-col md:flex-row gap-3 items-center justify-between">
        <div className="w-full md:w-96 relative">
          <input
            type="text"
            placeholder="Cari Kode AHS atau Nama Pekerjaan..."
            value={ahsSearchQuery}
            onChange={e => setAhsSearchQuery(e.target.value)}
            className="w-full pl-9 pr-3 py-1.5 border border-gray-300 rounded text-sm focus:border-primary-500 focus:outline-none"
          />
          <span className="absolute left-3 top-2 text-gray-400 text-sm">🔍</span>
        </div>
        <span className="text-xs text-gray-500 font-medium">
          Menampilkan {displayAhsList.length} dari {filteredAhsList.length} AHS
        </span>
      </div>

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
            {displayAhsList.length === 0 ? (
              <tr><td colSpan={5} className="text-center py-8 text-gray-400">Tidak ada AHS yang cocok</td></tr>
            ) : (
              displayAhsList.map(ahs => (
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

      {showQuickCreate && (
        <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50 no-print">
          <div className="bg-white rounded-xl shadow-xl w-full max-w-md p-6 space-y-4">
            <div className="flex justify-between items-center border-b pb-2">
              <h3 className="font-bold text-gray-800">
                Buat {compTab === 'material' ? 'Material/Bahan' : compTab === 'wage' ? 'Tenaga Kerja' : 'Peralatan'} Baru
              </h3>
              <button type="button" onClick={() => setShowQuickCreate(false)} className="text-gray-400 hover:text-gray-600 text-xl font-bold">&times;</button>
            </div>

            <form onSubmit={handleQuickCreateSubmit} className="space-y-3 text-sm">
              {compTab === 'material' && (
                <>
                  <div>
                    <label className="block text-xs font-semibold text-gray-600 mb-1">Nama Material *</label>
                    <input
                      type="text"
                      required
                      value={quickForm.name}
                      onChange={e => setQuickForm({ ...quickForm, name: e.target.value })}
                      className="w-full px-3 py-1.5 border border-gray-300 rounded focus:border-primary-500 focus:outline-none"
                    />
                  </div>
                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <label className="block text-xs font-semibold text-gray-600 mb-1">Kode Material</label>
                      <input
                        type="text"
                        value={quickForm.code}
                        onChange={e => setQuickForm({ ...quickForm, code: e.target.value })}
                        className="w-full px-3 py-1.5 border border-gray-300 rounded focus:border-primary-500 focus:outline-none"
                      />
                    </div>
                    <div>
                      <label className="block text-xs font-semibold text-gray-600 mb-1">Spesifikasi</label>
                      <input
                        type="text"
                        value={quickForm.specification}
                        onChange={e => setQuickForm({ ...quickForm, specification: e.target.value })}
                        className="w-full px-3 py-1.5 border border-gray-300 rounded focus:border-primary-500 focus:outline-none"
                      />
                    </div>
                  </div>
                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <label className="block text-xs font-semibold text-gray-600 mb-1">Kategori</label>
                      <input
                        type="text"
                        placeholder="Pasir, Semen, Besi, dll"
                        value={quickForm.category}
                        onChange={e => setQuickForm({ ...quickForm, category: e.target.value })}
                        className="w-full px-3 py-1.5 border border-gray-300 rounded focus:border-primary-500 focus:outline-none"
                      />
                    </div>
                    <div>
                      <label className="block text-xs font-semibold text-gray-600 mb-1">Satuan *</label>
                      <input
                        type="text"
                        required
                        value={quickForm.unit}
                        onChange={e => setQuickForm({ ...quickForm, unit: e.target.value })}
                        className="w-full px-3 py-1.5 border border-gray-300 rounded focus:border-primary-500 focus:outline-none"
                      />
                    </div>
                  </div>
                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <label className="block text-xs font-semibold text-gray-600 mb-1">Harga Satuan (Rp) *</label>
                      <input
                        type="number"
                        required
                        min="0"
                        value={quickForm.unitPrice}
                        onChange={e => setQuickForm({ ...quickForm, unitPrice: e.target.value })}
                        className="w-full px-3 py-1.5 border border-gray-300 rounded focus:border-primary-500 focus:outline-none"
                      />
                    </div>
                    <div>
                      <label className="block text-xs font-semibold text-gray-600 mb-1">Supplier</label>
                      <input
                        type="text"
                        value={quickForm.supplier}
                        onChange={e => setQuickForm({ ...quickForm, supplier: e.target.value })}
                        className="w-full px-3 py-1.5 border border-gray-300 rounded focus:border-primary-500 focus:outline-none"
                      />
                    </div>
                  </div>
                </>
              )}

              {compTab === 'wage' && (
                <>
                  <div>
                    <label className="block text-xs font-semibold text-gray-600 mb-1">Jenis Tenaga Kerja *</label>
                    <input
                      type="text"
                      required
                      value={quickForm.type}
                      onChange={e => setQuickForm({ ...quickForm, type: e.target.value })}
                      className="w-full px-3 py-1.5 border border-gray-300 rounded focus:border-primary-500 focus:outline-none"
                    />
                  </div>
                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <label className="block text-xs font-semibold text-gray-600 mb-1">Upah Harian (Rp) *</label>
                      <input
                        type="number"
                        required
                        min="0"
                        value={quickForm.dailyWage}
                        onChange={e => setQuickForm({ ...quickForm, dailyWage: e.target.value })}
                        className="w-full px-3 py-1.5 border border-gray-300 rounded focus:border-primary-500 focus:outline-none"
                      />
                    </div>
                    <div>
                      <label className="block text-xs font-semibold text-gray-600 mb-1">Satuan</label>
                      <input
                        type="text"
                        disabled
                        value="OH"
                        className="w-full px-3 py-1.5 border border-gray-200 bg-gray-50 rounded text-gray-500"
                      />
                    </div>
                  </div>
                </>
              )}

              {compTab === 'equipment' && (
                <>
                  <div>
                    <label className="block text-xs font-semibold text-gray-600 mb-1">Nama Alat *</label>
                    <input
                      type="text"
                      required
                      value={quickForm.name}
                      onChange={e => setQuickForm({ ...quickForm, name: e.target.value })}
                      className="w-full px-3 py-1.5 border border-gray-300 rounded focus:border-primary-500 focus:outline-none"
                    />
                  </div>
                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <label className="block text-xs font-semibold text-gray-600 mb-1">Tipe / Model</label>
                      <input
                        type="text"
                        value={quickForm.type}
                        onChange={e => setQuickForm({ ...quickForm, type: e.target.value })}
                        className="w-full px-3 py-1.5 border border-gray-300 rounded focus:border-primary-500 focus:outline-none"
                      />
                    </div>
                    <div>
                      <label className="block text-xs font-semibold text-gray-600 mb-1">Kapasitas</label>
                      <input
                        type="text"
                        value={quickForm.capacity}
                        onChange={e => setQuickForm({ ...quickForm, capacity: e.target.value })}
                        className="w-full px-3 py-1.5 border border-gray-300 rounded focus:border-primary-500 focus:outline-none"
                      />
                    </div>
                  </div>
                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <label className="block text-xs font-semibold text-gray-600 mb-1">Harga Sewa Harian (Rp) *</label>
                      <input
                        type="number"
                        required
                        min="0"
                        value={quickForm.rentalPrice}
                        onChange={e => setQuickForm({ ...quickForm, rentalPrice: e.target.value })}
                        className="w-full px-3 py-1.5 border border-gray-300 rounded focus:border-primary-500 focus:outline-none"
                      />
                    </div>
                    <div>
                      <label className="block text-xs font-semibold text-gray-600 mb-1">Satuan</label>
                      <input
                        type="text"
                        disabled
                        value="hari"
                        className="w-full px-3 py-1.5 border border-gray-200 bg-gray-50 rounded text-gray-500"
                      />
                    </div>
                  </div>
                </>
              )}

              <div className="flex gap-2 justify-end pt-3 border-t">
                <button
                  type="button"
                  onClick={() => setShowQuickCreate(false)}
                  className="px-4 py-1.5 border border-gray-300 rounded text-gray-700 hover:bg-gray-50 text-xs font-medium"
                >
                  Batal
                </button>
                <button
                  type="submit"
                  className="btn-primary text-xs px-4 py-1.5"
                >
                  Simpan & Pilih
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {dialog && dialog.show && (
        <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50 no-print">
          <div className="bg-white rounded-xl shadow-xl w-full max-w-sm p-5 space-y-4">
            <h3 className="font-bold text-gray-950 border-b pb-2">{dialog.title}</h3>
            <p className="text-sm text-gray-600 whitespace-pre-line">{dialog.message}</p>
            <div className="flex gap-2 justify-end pt-2">
              {dialog.isConfirm ? (
                <>
                  <button
                    type="button"
                    onClick={() => {
                      setDialog(null)
                      if (dialog.onCancel) dialog.onCancel()
                    }}
                    className="px-4 py-1.5 border border-gray-300 rounded text-gray-700 hover:bg-gray-50 text-xs font-medium"
                  >
                    Batal
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      const onConfirmFn = dialog.onConfirm
                      setDialog(null)
                      if (onConfirmFn) onConfirmFn()
                    }}
                    className="btn-primary text-xs px-4 py-1.5"
                  >
                    Ya
                  </button>
                </>
              ) : (
                <button
                  type="button"
                  onClick={() => setDialog(null)}
                  className="btn-primary text-xs px-4 py-1.5"
                >
                  OK
                </button>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
