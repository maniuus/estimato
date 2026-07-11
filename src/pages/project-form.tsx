import React, { useState } from 'react'
import { useProjectStore } from '../stores/project-store'
import { STATUS_LABELS } from '../lib/format'
import type { Project } from '../types/models'

interface ProjectFormProps {
  onClose: () => void
  initialData?: Project
}

export function ProjectForm({ onClose, initialData }: ProjectFormProps): React.ReactElement {
  const { createProject, updateProject, loadProjects } = useProjectStore()
  const [showCustomKop, setShowCustomKop] = useState(false)
  const [form, setForm] = React.useState({
    name: initialData?.name ?? '',
    projectNumber: initialData?.projectNumber ?? '',
    location: initialData?.location ?? '',
    year: initialData?.year ?? new Date().getFullYear(),
    buildingType: initialData?.buildingType ?? '',
    buildingArea: initialData?.buildingArea ?? 0,
    floors: initialData?.floors ?? 0,
    status: initialData?.status ?? 'draft' as Project['status'],
    ppn: initialData?.ppn ?? 11,
    overhead: initialData?.overhead ?? 0,
    note: initialData?.note ?? '',
    companyName: initialData?.companyName ?? '',
    companyLogo: initialData?.companyLogo ?? '',
    reportHeader: initialData?.reportHeader ?? '',
    ownerName: initialData?.ownerName ?? '',
    ownerParaf: initialData?.ownerParaf ?? '',
    template: 'blank'
  })
  const [saving, setSaving] = useState(false)

  const handleImageUpload = (file: File, field: 'companyLogo' | 'ownerParaf') => {
    if (!file) return
    const reader = new FileReader()
    reader.onload = () => {
      if (reader.result) {
        setForm(prev => ({ ...prev, [field]: reader.result as string }))
      }
    }
    reader.readAsDataURL(file)
  }

  const handleSubmit = async (e: React.FormEvent): Promise<void> => {
    e.preventDefault()
    setSaving(true)

    if (initialData) {
      const { template, ...updateData } = form
      await updateProject(initialData.id, updateData)
    } else {
      await createProject(form)
    }

    setSaving(false)
    onClose()
  }

  return (
    <div className="fixed inset-0 bg-black/30 flex items-center justify-center z-50">
      <div className="bg-white rounded-xl shadow-xl w-full max-w-lg mx-4 max-h-[90vh] overflow-y-auto">
        <form onSubmit={handleSubmit} className="p-6 space-y-4">
          <div className="flex justify-between items-center">
            <h3 className="text-lg font-bold">{initialData ? 'Edit Proyek' : 'Buat Proyek Baru'}</h3>
            <button type="button" onClick={onClose} className="text-gray-400 hover:text-gray-600 text-xl">&times;</button>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div className="col-span-2">
              <label className="block text-xs font-medium text-gray-600 mb-1">Nama Proyek *</label>
              <input className="input-field" required value={form.name} onChange={e => setForm({ ...form, name: e.target.value })} />
            </div>
            <div>
              <label className="block text-xs font-medium text-gray-600 mb-1">No. Proyek</label>
              <input className="input-field" value={form.projectNumber} onChange={e => setForm({ ...form, projectNumber: e.target.value })} />
            </div>
            <div>
              <label className="block text-xs font-medium text-gray-600 mb-1">Tahun</label>
              <input className="input-field" type="number" value={form.year} onChange={e => setForm({ ...form, year: Number(e.target.value) })} />
            </div>
            <div className="col-span-2">
              <label className="block text-xs font-medium text-gray-600 mb-1">Lokasi</label>
              <input className="input-field" value={form.location} onChange={e => setForm({ ...form, location: e.target.value })} />
            </div>
            <div>
              <label className="block text-xs font-medium text-gray-600 mb-1">Tipe Bangunan</label>
              <input className="input-field" placeholder="Rumah, Gedung, dll" value={form.buildingType} onChange={e => setForm({ ...form, buildingType: e.target.value })} />
            </div>
            <div>
              <label className="block text-xs font-medium text-gray-600 mb-1">Luas (m²)</label>
              <input className="input-field" type="number" value={form.buildingArea} onChange={e => setForm({ ...form, buildingArea: Number(e.target.value) })} />
            </div>
            <div>
              <label className="block text-xs font-medium text-gray-600 mb-1">Jumlah Lantai</label>
              <input className="input-field" type="number" value={form.floors} onChange={e => setForm({ ...form, floors: Number(e.target.value) })} />
            </div>
            <div>
              <label className="block text-xs font-medium text-gray-600 mb-1">Status</label>
              <select className="input-field" value={form.status} onChange={e => setForm({ ...form, status: e.target.value as Project['status'] })}>
                {Object.entries(STATUS_LABELS).map(([key, label]) => (
                  <option key={key} value={key}>{label}</option>
                ))}
              </select>
            </div>
            <div>
              <label className="block text-xs font-medium text-gray-600 mb-1">PPN (%)</label>
              <input className="input-field" type="number" step="0.1" value={form.ppn} onChange={e => setForm({ ...form, ppn: Number(e.target.value) })} />
            </div>
            <div>
              <label className="block text-xs font-medium text-gray-600 mb-1">Overhead & Laba (%)</label>
              <input className="input-field" type="number" step="0.1" value={form.overhead} onChange={e => setForm({ ...form, overhead: Number(e.target.value) })} />
            </div>
            <div className="col-span-2">
              <label className="block text-xs font-medium text-gray-600 mb-1">Catatan</label>
              <textarea className="input-field" rows={3} value={form.note} onChange={e => setForm({ ...form, note: e.target.value })} />
            </div>

            {/* Collapsible Section for Custom Kop & Owner */}
            <div className="col-span-2 border-t border-gray-200 pt-3 mt-1">
              <button
                type="button"
                onClick={() => setShowCustomKop(!showCustomKop)}
                className="w-full flex items-center justify-between text-xs font-bold text-gray-700 uppercase tracking-wider bg-gray-50 hover:bg-gray-100 p-2 rounded transition-all"
              >
                <span>⚙️ Kustomisasi Kop & Owner Laporan (Opsional)</span>
                <span>{showCustomKop ? '▲ Tutup' : '▼ Buka'}</span>
              </button>

              {showCustomKop && (
                <div className="mt-3 space-y-3 p-3 bg-gray-50/50 rounded-lg border border-gray-100">
                  <p className="text-[10px] text-gray-400 italic mb-2">
                    * Kosongkan jika ingin menggunakan logo dan pengaturan dari Pengaturan Global aplikasi.
                  </p>
                  
                  <div className="grid grid-cols-2 gap-3">
                    <div className="col-span-2 md:col-span-1">
                      <label className="block text-[11px] font-medium text-gray-600 mb-1">Nama Perusahaan Kustom</label>
                      <input 
                        className="input-field text-xs" 
                        placeholder="CV. Mandiri Jaya (Kustom)"
                        value={form.companyName} 
                        onChange={e => setForm({ ...form, companyName: e.target.value })} 
                      />
                    </div>
                    
                    <div className="col-span-2 md:col-span-1">
                      <label className="block text-[11px] font-medium text-gray-600 mb-1">Header Laporan Kustom</label>
                      <input 
                        className="input-field text-xs" 
                        placeholder="KONSULTAN PERENCANA"
                        value={form.reportHeader} 
                        onChange={e => setForm({ ...form, reportHeader: e.target.value })} 
                      />
                    </div>

                    <div className="col-span-2">
                      <label className="block text-[11px] font-medium text-gray-600 mb-1">Nama Owner Kustom</label>
                      <input 
                        className="input-field text-xs" 
                        placeholder="Ir. Budi Santoso (Kustom)"
                        value={form.ownerName} 
                        onChange={e => setForm({ ...form, ownerName: e.target.value })} 
                      />
                    </div>

                    <div className="col-span-2 md:col-span-1">
                      <label className="block text-[11px] font-semibold text-gray-700 mb-1">Logo Kustom</label>
                      <div className="flex flex-col gap-2 p-2 border border-gray-200 rounded bg-white">
                        {form.companyLogo ? (
                          <div className="relative w-fit">
                            <img 
                              src={form.companyLogo} 
                              alt="Logo Preview" 
                              className="h-12 w-12 object-contain border border-gray-100 rounded"
                            />
                            <button
                              type="button"
                              onClick={() => setForm({ ...form, companyLogo: '' })}
                              className="absolute -top-1 -right-1 bg-red-650 hover:bg-red-700 text-white rounded-full h-4 w-4 flex items-center justify-center shadow-sm leading-none"
                              style={{ fontSize: '10px' }}
                            >
                              &times;
                            </button>
                          </div>
                        ) : (
                          <div className="text-[10px] text-gray-400 italic">Menggunakan logo global</div>
                        )}
                        <input
                          type="file"
                          accept="image/*"
                          onChange={(e) => {
                            const file = e.target.files?.[0]
                            if (file) handleImageUpload(file, 'companyLogo')
                          }}
                          className="block w-full text-[10px] text-gray-500 file:mr-2 file:py-0.5 file:px-1.5 file:rounded file:border-0 file:text-[10px] file:font-semibold file:bg-gray-100 file:text-gray-700 hover:file:bg-gray-200"
                        />
                      </div>
                    </div>

                    <div className="col-span-2 md:col-span-1">
                      <label className="block text-[11px] font-semibold text-gray-700 mb-1">Paraf Owner Kustom</label>
                      <div className="flex flex-col gap-2 p-2 border border-gray-200 rounded bg-white">
                        {form.ownerParaf ? (
                          <div className="relative w-fit">
                            <img 
                              src={form.ownerParaf} 
                              alt="Paraf Preview" 
                              className="h-12 w-12 object-contain border border-gray-100 rounded"
                            />
                            <button
                              type="button"
                              onClick={() => setForm({ ...form, ownerParaf: '' })}
                              className="absolute -top-1 -right-1 bg-red-650 hover:bg-red-700 text-white rounded-full h-4 w-4 flex items-center justify-center shadow-sm leading-none"
                              style={{ fontSize: '10px' }}
                            >
                              &times;
                            </button>
                          </div>
                        ) : (
                          <div className="text-[10px] text-gray-400 italic">Menggunakan paraf global</div>
                        )}
                        <input
                          type="file"
                          accept="image/*"
                          onChange={(e) => {
                            const file = e.target.files?.[0]
                            if (file) handleImageUpload(file, 'ownerParaf')
                          }}
                          className="block w-full text-[10px] text-gray-500 file:mr-2 file:py-0.5 file:px-1.5 file:rounded file:border-0 file:text-[10px] file:font-semibold file:bg-gray-100 file:text-gray-700 hover:file:bg-gray-200"
                        />
                      </div>
                    </div>
                  </div>
                </div>
              )}
            </div>

            {!initialData && (
              <div className="col-span-2 space-y-1.5 pt-1">
                <label className="block text-xs font-bold text-gray-700 uppercase tracking-wider">
                  Pilih Template Proyek
                </label>
                <div className="grid grid-cols-3 gap-3">
                  <label className={`flex flex-col items-center justify-center p-3 border rounded-lg cursor-pointer transition-all ${form.template === 'blank' ? 'border-blue-600 bg-blue-50/50 ring-1 ring-blue-600' : 'border-gray-200 hover:bg-gray-50'}`}>
                    <input
                      type="radio"
                      name="template"
                      value="blank"
                      checked={form.template === 'blank'}
                      onChange={() => setForm({ ...form, template: 'blank' })}
                      className="sr-only"
                    />
                    <span className="text-xl mb-1">📄</span>
                    <span className="font-bold text-xs text-gray-800">Blank Page</span>
                    <span className="text-[10px] text-gray-400 text-center mt-0.5 leading-tight">Mulai dari nol</span>
                  </label>

                  <label className={`flex flex-col items-center justify-center p-3 border rounded-lg cursor-pointer transition-all ${form.template === 'renovasi' ? 'border-blue-600 bg-blue-50/50 ring-1 ring-blue-600' : 'border-gray-200 hover:bg-gray-50'}`}>
                    <input
                      type="radio"
                      name="template"
                      value="renovasi"
                      checked={form.template === 'renovasi'}
                      onChange={() => setForm({ ...form, template: 'renovasi' })}
                      className="sr-only"
                    />
                    <span className="text-xl mb-1">🛠️</span>
                    <span className="font-bold text-xs text-gray-800">Proyek Renovasi</span>
                    <span className="text-[10px] text-gray-400 text-center mt-0.5 leading-tight">Struktur Renovasi</span>
                  </label>

                  <label className={`flex flex-col items-center justify-center p-3 border rounded-lg cursor-pointer transition-all ${form.template === 'pembangunan' ? 'border-blue-600 bg-blue-50/50 ring-1 ring-blue-600' : 'border-gray-200 hover:bg-gray-50'}`}>
                    <input
                      type="radio"
                      name="template"
                      value="pembangunan"
                      checked={form.template === 'pembangunan'}
                      onChange={() => setForm({ ...form, template: 'pembangunan' })}
                      className="sr-only"
                    />
                    <span className="text-xl mb-1">🏗️</span>
                    <span className="font-bold text-xs text-gray-800">Pembangunan Baru</span>
                    <span className="text-[10px] text-gray-400 text-center mt-0.5 leading-tight">Struktur Gedung/Rumah</span>
                  </label>
                </div>
              </div>
            )}
          </div>

          <div className="flex gap-2 pt-2 border-t border-gray-100">
            <button type="submit" disabled={saving} className="btn-primary flex-1">
              {saving ? 'Menyimpan...' : 'Simpan'}
            </button>
            <button type="button" onClick={onClose} className="btn-secondary">Batal</button>
          </div>
        </form>
      </div>
    </div>
  )
}
