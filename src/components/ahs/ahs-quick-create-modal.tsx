import React, { useState } from 'react'
import { useMasterDataStore } from '../../stores/master-data-store'

interface AhsQuickCreateModalProps {
  isOpen: boolean
  onClose: () => void
  compTab: 'material' | 'wage' | 'equipment'
  onCreated: (id: string) => void
  showAlert: (message: string, title?: string) => void
}

export function AhsQuickCreateModal({
  isOpen,
  onClose,
  compTab,
  onCreated,
  showAlert
}: AhsQuickCreateModalProps): React.ReactElement | null {
  const masterStore = useMasterDataStore()
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

  if (!isOpen) return null

  const handleQuickCreateSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    let newId = ''
    try {
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
      onCreated(newId)
      
      // Reset form
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
      onClose()
    } catch (err: any) {
      showAlert('Terjadi kesalahan: ' + err.message, 'Error')
    }
  }

  return (
    <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50 no-print">
      <div className="bg-white rounded-xl shadow-xl w-full max-w-md p-6 space-y-4">
        <div className="flex justify-between items-center border-b pb-2">
          <h3 className="font-bold text-gray-800">
            Buat {compTab === 'material' ? 'Material/Bahan' : compTab === 'wage' ? 'Tenaga Kerja' : 'Peralatan'} Baru
          </h3>
          <button type="button" onClick={onClose} className="text-gray-400 hover:text-gray-600 text-xl font-bold">&times;</button>
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
              onClick={onClose}
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
  )
}
