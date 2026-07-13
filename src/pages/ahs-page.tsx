import React, { useState, useEffect } from 'react'
import { useAhsStore } from '../stores/ahs-store'
import { useMasterDataStore } from '../stores/master-data-store'
import { formatCurrency } from '../lib/format'
import type { Ahs } from '../types/models'
import { AhsQuickCreateModal } from '../components/ahs/ahs-quick-create-modal'
import { AhsComponentsTable } from '../components/ahs/ahs-components-table'
import { ArrowLeft, BookOpen, Plus, Search, Copy, Check, FileSpreadsheet, HelpCircle, Edit } from 'lucide-react'

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
  const [showQuickCreate, setShowQuickCreate] = useState(false)

  // Custom non-blocking dialog state
  const [dialog, setDialog] = useState<{
    show: boolean
    title: string
    message: string
    isConfirm: boolean
    onConfirm?: () => void
    onCancel?: () => void
  } | null>(null)

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

  const showAlert = (message: string, title = 'Informasi') => {
    setDialog({ show: true, title, message, isConfirm: false })
  }

  const showConfirm = (message: string, onConfirm: () => void, title = 'Konfirmasi') => {
    setDialog({ show: true, title, message, isConfirm: true, onConfirm })
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

  // Automatically select the first filtered item
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
      await store.addMaterialComponent({ ahsId: ahs.id, materialId: selectedItemId, coefficient: coeffVal })
    } else if (compTab === 'wage') {
      await store.addWageComponent({ ahsId: ahs.id, wageId: selectedItemId, coefficient: coeffVal })
    } else if (compTab === 'equipment') {
      await store.addEquipmentComponent({ ahsId: ahs.id, equipmentId: selectedItemId, coefficient: coeffVal })
    }
    
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

    const updatedRes = await window.api.ahs.getById(ahs.id)
    if (updatedRes.success && updatedRes.data) {
      store.selectAhs(updatedRes.data)
    }
  }

  const handleImportAhsp = async () => {
    const result = await window.api.ahsp.importAhsp()
    if (result.success && result.data) {
      const s = result.data
      showAlert(`Import berhasil!\n\nAHS baru: ${s.ahsCreated}\nAHS dilewati: ${s.ahsSkipped}\nUpah baru: ${s.wagesCreated}\nMaterial baru: ${s.materialsCreated}\nAlat baru: ${s.equipmentCreated}`, 'Sukses Import')
      if (!projectId) store.loadAll()
    } else if (result.error !== 'Pembatalan import') {
      showAlert('Gagal import: ' + result.error, 'Error')
    }
  }

  const handleQuickCreated = (newId: string) => {
    if (editingId) {
      setEditItemId(newId)
    } else {
      setSelectedItemId(newId)
    }
  }

  const renderEditMode = (): React.ReactElement => {
    const ahs = store.selectedAhs
    if (!ahs) return <div className="text-slate-500 font-semibold select-none">Pilih AHS terlebih dahulu.</div>

    const compTabs: { id: CompTab; label: string; count: number }[] = [
      { id: 'material', label: 'Material', count: store.materialComponents.length },
      { id: 'wage', label: 'Tenaga Kerja', count: store.wageComponents.length },
      { id: 'equipment', label: 'Alat Bantu', count: store.equipmentComponents.length }
    ]

    return (
      <div className="space-y-6">
        {/* Header with Navigation & Duplicate Button */}
        <div className="flex items-center justify-between border-b border-slate-200/50 pb-4 no-print select-none">
          <div className="flex items-center gap-3">
            <button 
              onClick={() => { setMode('list'); store.selectAhs(null) }} 
              className="flex items-center gap-1.5 text-xs text-slate-500 hover:text-slate-800 font-semibold px-2.5 py-1.5 rounded-lg border border-slate-200 hover:bg-slate-50 transition-all duration-150 active:scale-95"
            >
              <ArrowLeft className="w-3.5 h-3.5" />
              <span>Kembali ke Daftar</span>
            </button>
            <span className="text-slate-300 select-none">|</span>
            <span className="text-[10px] font-bold bg-indigo-50 border border-indigo-100 text-indigo-700 px-2.5 py-1 rounded-lg uppercase font-mono tracking-wide">
              Mode Analisa Detail
            </span>
          </div>

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
            className="btn-secondary text-xs px-3 py-1.5 flex items-center gap-1.5 border-amber-200 hover:border-amber-300 hover:bg-amber-50 hover:text-amber-800"
          >
            <Copy className="w-3.5 h-3.5 text-amber-500" />
            <span>Duplikat Analisa AHS</span>
          </button>
        </div>

        {/* Editable AHS Details Panel */}
        <div className="card p-6 bg-white border border-slate-100 shadow-sm space-y-4">
          <div className="flex justify-between items-center border-b border-slate-100 pb-3">
            <h4 className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Detail Informasi Analisa</h4>
            <span className="text-base font-extrabold font-mono text-primary-600">
              Total Harga Satuan: {formatCurrency(ahs.totalPrice)} / {ahs.unit}
            </span>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4 items-end">
            <div>
              <label className="block text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-1.5">Kode AHS</label>
              <input
                type="text"
                value={localCode}
                onChange={e => setLocalCode(e.target.value)}
                onBlur={handleUpdateAhsDetails}
                className="input-field font-mono font-bold"
              />
            </div>
            <div className="col-span-2">
              <label className="block text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-1.5">Nama Item Pekerjaan</label>
              <input
                type="text"
                value={localName}
                onChange={e => setLocalName(e.target.value)}
                onBlur={handleUpdateAhsDetails}
                className="input-field font-bold"
              />
            </div>
            <div>
              <label className="block text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-1.5">Satuan</label>
              <input
                type="text"
                value={localUnit}
                onChange={e => setLocalUnit(e.target.value)}
                onBlur={handleUpdateAhsDetails}
                className="input-field font-bold"
              />
            </div>
          </div>
        </div>

        <div className="flex justify-between items-center bg-slate-50/50 p-2 border border-slate-200/50 rounded-xl">
          <div className="flex gap-1.5 bg-slate-100/80 p-1 rounded-xl w-fit border border-slate-200/30">
            {compTabs.map(t => (
              <button
                key={t.id}
                onClick={() => setCompTab(t.id)}
                className={`px-4 py-2 rounded-lg text-xs font-bold tracking-wide transition-all duration-200 ${
                  compTab === t.id
                    ? 'bg-white shadow-sm text-primary-600'
                    : 'text-slate-500 hover:text-slate-800'
                }`}
              >
                {t.label} ({t.count})
              </button>
            ))}
          </div>
        </div>

        {/* Tambah Komponen Form */}
        <div className="card p-5 bg-slate-50 border border-slate-100 shadow-inner">
          <h4 className="text-xs font-bold text-slate-700 uppercase tracking-wider mb-3 flex items-center gap-1.5 select-none">
            <Plus className="w-4 h-4 text-indigo-500" />
            <span>Tambah Komponen {compTab === 'material' ? 'Material' : compTab === 'wage' ? 'Tenaga Kerja' : 'Alat'}</span>
          </h4>
          <form onSubmit={handleAddComponent} className="flex flex-col md:flex-row gap-3.5 items-end">
            <div className="w-full md:w-60">
              <label className="block text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-1.5">Cari / Filter</label>
              <input
                type="text"
                placeholder={`Cari ${compTab === 'material' ? 'material' : compTab === 'wage' ? 'tenaga' : 'alat'}...`}
                value={filterQuery}
                onChange={e => setFilterQuery(e.target.value)}
                className="input-field"
              />
            </div>
            <div className="flex-1 w-full">
              <label className="block text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-1.5 flex justify-between items-center select-none">
                <span>Pilih {compTab === 'material' ? 'Material' : compTab === 'wage' ? 'Tenaga' : 'Alat'} ({compTab === 'material' ? filteredMaterials.length : compTab === 'wage' ? filteredWages.length : filteredEquipment.length} pilihan)</span>
                <button
                  type="button"
                  onClick={() => setShowQuickCreate(true)}
                  className="text-primary-600 hover:text-primary-800 text-[10px] font-bold underline cursor-pointer"
                >
                  + Tambah Master Baru
                </button>
              </label>
              <select
                value={selectedItemId}
                onChange={e => setSelectedItemId(e.target.value)}
                className="input-field font-medium"
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
            <div className="w-full md:w-32">
              <label className="block text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-1.5">Koefisien</label>
              <input
                type="number"
                step="any"
                min="0"
                value={newCoeff}
                onChange={e => setNewCoeff(e.target.value)}
                className="input-field font-mono text-right"
                required
              />
            </div>
            <button type="submit" className="btn-primary text-xs px-4 py-2 flex items-center gap-1">
              <Plus className="w-3.5 h-3.5" />
              <span>Tambah</span>
            </button>
          </form>
        </div>

        <div className="card overflow-hidden bg-white border border-slate-100 shadow-sm">
          <div className="px-5 py-4 border-b border-slate-100 bg-slate-50/20 select-none">
            <span className="text-xs font-bold text-slate-600 uppercase tracking-wider">Daftar Komponen {compTabs.find(t => t.id === compTab)?.label}</span>
          </div>

          <AhsComponentsTable
            compTab={compTab}
            materialComponents={store.materialComponents}
            wageComponents={store.wageComponents}
            equipmentComponents={store.equipmentComponents}
            editingId={editingId}
            setEditingId={setEditingId}
            editCoeff={editCoeff}
            setEditCoeff={setEditCoeff}
            editItemId={editItemId}
            setEditItemId={setEditItemId}
            onSaveEdit={handleSaveEdit}
            onDeleteComponent={handleDeleteComponent}
          />
        </div>
      </div>
    )
  }

  const filteredAhsList = (store.ahsList || []).filter(ahs =>
    ahs.code.toLowerCase().includes(ahsSearchQuery.toLowerCase()) ||
    ahs.name.toLowerCase().includes(ahsSearchQuery.toLowerCase())
  )
  const displayAhsList = filteredAhsList.slice(0, 200)

  if (mode === 'edit') return renderEditMode()

  return (
    <div className="space-y-6">
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center bg-white p-5 rounded-xl border border-slate-100 gap-4 shadow-sm select-none">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-indigo-50 flex items-center justify-center text-primary-600 border border-indigo-100">
            <BookOpen className="w-5 h-5" />
          </div>
          <div>
            <h2 className="text-base font-extrabold text-slate-800 tracking-tight">Library Analisa Harga Satuan (AHS)</h2>
            <p className="text-xs text-slate-500 mt-0.5">Katalog Analisa Harga Satuan Pekerjaan (AHSP) standar nasional maupun kustom.</p>
          </div>
        </div>
        {!projectId && (
          <button onClick={handleImportAhsp} className="btn-primary text-xs px-4 py-2 bg-emerald-600 hover:bg-emerald-500 shadow-emerald-600/10 flex items-center gap-1.5">
            <FileSpreadsheet className="w-4 h-4" />
            <span>Import AHSP Excel</span>
          </button>
        )}
      </div>

      <form onSubmit={handleCreate} className="card p-5 grid grid-cols-1 md:grid-cols-5 gap-3.5 bg-slate-50 border border-slate-100 shadow-inner">
        <input className="input-field font-mono font-bold" placeholder="Kode AHS" value={form.code} onChange={e => setForm({ ...form, code: e.target.value })} required />
        <input className="input-field font-bold md:col-span-2" placeholder="Nama item pekerjaan" value={form.name} onChange={e => setForm({ ...form, name: e.target.value })} required />
        <input className="input-field font-bold" placeholder="Satuan (m³, kg, m')" value={form.unit} onChange={e => setForm({ ...form, unit: e.target.value })} required />
        <button type="submit" className="btn-primary text-xs px-4 py-2 flex items-center gap-1.5">
          <Plus className="w-4 h-4" />
          <span>Buat Analisa AHS</span>
        </button>
      </form>

      {/* Pencarian Library AHS */}
      <div className="card p-4 px-5 bg-white border border-slate-100 flex flex-col md:flex-row gap-4 items-center justify-between shadow-sm">
        <div className="w-full md:w-96 relative">
          <input
            type="text"
            placeholder="Cari Kode AHS atau Nama Pekerjaan..."
            value={ahsSearchQuery}
            onChange={e => setAhsSearchQuery(e.target.value)}
            className="input-field pl-9 pr-4 py-2"
          />
          <Search className="absolute left-3.5 top-2.5 w-4 h-4 text-slate-400 select-none" />
        </div>
        <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider select-none">
          Menampilkan {displayAhsList.length} dari {filteredAhsList.length} AHS
        </span>
      </div>

      <div className="card overflow-hidden bg-white border border-slate-100 shadow-sm">
        <div className="overflow-x-auto">
          <table className="w-full border-collapse">
            <thead>
              <tr className="border-b border-slate-100 bg-slate-50/50">
                <th className="table-header w-36">Kode</th>
                <th className="table-header">Nama Pekerjaan</th>
                <th className="table-header text-center w-24">Satuan</th>
                <th className="table-header text-center w-28">Kategori</th>
                <th className="table-header text-right w-36">Harga Satuan</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 bg-white">
              {displayAhsList.length === 0 ? (
                <tr><td colSpan={5} className="text-center py-12 text-slate-400 font-medium italic text-sm">Tidak ada AHS yang cocok dalam library.</td></tr>
              ) : (
                displayAhsList.map(ahs => (
                  <tr key={ahs.id} onClick={() => handleSelect(ahs)} className="hover:bg-slate-50/50 cursor-pointer transition-colors group">
                    <td className="table-cell font-mono font-bold text-slate-500">{ahs.code}</td>
                    <td className="table-cell font-bold text-slate-800 group-hover:text-primary-600 transition-colors">{ahs.name}</td>
                    <td className="table-cell text-center text-slate-500 font-bold">{ahs.unit}</td>
                    <td className="table-cell text-center select-none">
                      <span className={`inline-flex px-2 py-0.5 rounded-full text-[9px] font-bold border ${ahs.category === 'sni' ? 'bg-emerald-50 text-emerald-700 border-emerald-100' : 'bg-amber-50 text-amber-700 border-amber-100'}`}>
                        {ahs.category.toUpperCase()}
                      </span>
                    </td>
                    <td className="table-cell text-right font-mono font-bold text-slate-700">{formatCurrency(ahs.totalPrice)}</td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      {dialog && dialog.show && (
        <div className="fixed inset-0 bg-slate-900/40 backdrop-blur-xs flex items-center justify-center z-50 no-print">
          <div className="bg-white rounded-xl shadow-xl w-full max-w-sm p-5 space-y-4 border border-slate-100 select-none">
            <h3 className="font-bold text-slate-800 border-b border-slate-150 pb-2 text-sm flex items-center gap-1.5">
              <HelpCircle className="w-4 h-4 text-indigo-500" />
              <span>{dialog.title}</span>
            </h3>
            <p className="text-xs text-slate-500 whitespace-pre-line leading-relaxed font-semibold">{dialog.message}</p>
            <div className="flex gap-2 justify-end pt-2">
              {dialog.isConfirm ? (
                <>
                  <button
                    type="button"
                    onClick={() => {
                      setDialog(null)
                      if (dialog.onCancel) dialog.onCancel()
                    }}
                    className="btn-secondary text-xs px-3.5 py-1.5"
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
                    Setujui
                  </button>
                </>
              ) : (
                <button
                  type="button"
                  onClick={() => setDialog(null)}
                  className="btn-primary text-xs px-4 py-1.5"
                >
                  Selesai
                </button>
              )}
            </div>
          </div>
        </div>
      )}

      {showQuickCreate && (
        <AhsQuickCreateModal
          isOpen={showQuickCreate}
          onClose={() => setShowQuickCreate(false)}
          compTab={compTab}
          onCreated={handleQuickCreated}
          showAlert={showAlert}
        />
      )}
    </div>
  )
}
