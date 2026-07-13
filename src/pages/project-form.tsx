import React, { useState } from 'react'
import { useProjectStore } from '../stores/project-store'
import { STATUS_LABELS } from '../lib/format'
import type { Project } from '../types/models'
import { X, Settings, ChevronDown, ChevronUp, FileText, Wrench, Building, Check } from 'lucide-react'

interface ProjectFormProps {
  onClose: () => void
  initialData?: Project
}

export function ProjectForm({ onClose, initialData }: ProjectFormProps): React.ReactElement {
  const { createProject, updateProject } = useProjectStore()
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
    <div className="fixed inset-0 bg-slate-900/40 backdrop-blur-xs flex items-center justify-center z-50 p-4 select-none">
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-lg max-h-[90vh] overflow-y-auto border border-slate-100 flex flex-col justify-between">
        <form onSubmit={handleSubmit} className="flex flex-col h-full">
          {/* Header */}
          <div className="px-6 py-4 border-b border-slate-100 flex justify-between items-center bg-slate-50/50">
            <h3 className="text-sm font-bold text-slate-800 tracking-tight">{initialData ? 'Edit Proyek Konstruksi' : 'Buat Proyek Konstruksi Baru'}</h3>
            <button type="button" onClick={onClose} className="text-slate-400 hover:text-slate-700 p-1.5 rounded-lg hover:bg-slate-100 transition-colors">
              <X className="w-4 h-4" />
            </button>
          </div>

          {/* Form Content */}
          <div className="p-6 space-y-4 overflow-y-auto flex-1 max-h-[65vh]">
            <div className="grid grid-cols-2 gap-4">
              <div className="col-span-2">
                <label className="block text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-1.5">Nama Proyek *</label>
                <input className="input-field font-bold" required value={form.name} onChange={e => setForm({ ...form, name: e.target.value })} placeholder="Contoh: Renovasi Rumah Tinggal Abimanyu" />
              </div>
              <div>
                <label className="block text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-1.5">No. Proyek</label>
                <input className="input-field" value={form.projectNumber} onChange={e => setForm({ ...form, projectNumber: e.target.value })} placeholder="Contoh: PRJ-2026-001" />
              </div>
              <div>
                <label className="block text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-1.5">Tahun Anggaran</label>
                <input className="input-field font-mono font-bold" type="number" value={form.year} onChange={e => setForm({ ...form, year: Number(e.target.value) })} />
              </div>
              <div className="col-span-2">
                <label className="block text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-1.5">Lokasi Proyek</label>
                <input className="input-field" value={form.location} onChange={e => setForm({ ...form, location: e.target.value })} placeholder="Contoh: Jl. Ahmad Yani No. 12, Bandung" />
              </div>
              <div>
                <label className="block text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-1.5">Tipe Bangunan</label>
                <input className="input-field" placeholder="Rumah, Ruko, Gedung, dll" value={form.buildingType} onChange={e => setForm({ ...form, buildingType: e.target.value })} />
              </div>
              <div>
                <label className="block text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-1.5">Luas Bangunan (m²)</label>
                <input className="input-field font-mono" type="number" value={form.buildingArea} onChange={e => setForm({ ...form, buildingArea: Number(e.target.value) })} />
              </div>
              <div>
                <label className="block text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-1.5">Jumlah Lantai</label>
                <input className="input-field font-mono" type="number" value={form.floors} onChange={e => setForm({ ...form, floors: Number(e.target.value) })} />
              </div>
              <div>
                <label className="block text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-1.5">Status Proyek</label>
                <select className="input-field font-bold" value={form.status} onChange={e => setForm({ ...form, status: e.target.value as Project['status'] })}>
                  {Object.entries(STATUS_LABELS).map(([key, label]) => (
                    <option key={key} value={key}>{label}</option>
                  ))}
                </select>
              </div>
              <div>
                <label className="block text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-1.5">PPN (%)</label>
                <input className="input-field font-mono font-bold" type="number" step="0.1" value={form.ppn} onChange={e => setForm({ ...form, ppn: Number(e.target.value) })} />
              </div>
              <div>
                <label className="block text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-1.5">Overhead & Profit (%)</label>
                <input className="input-field font-mono font-bold" type="number" step="0.1" value={form.overhead} onChange={e => setForm({ ...form, overhead: Number(e.target.value) })} />
              </div>
              <div className="col-span-2">
                <label className="block text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-1.5">Catatan Tambahan</label>
                <textarea className="input-field" rows={2} value={form.note} onChange={e => setForm({ ...form, note: e.target.value })} placeholder="Catatan opsional mengenai proyek..." />
              </div>

              {/* Collapsible Section for Custom Kop & Owner */}
              <div className="col-span-2 border-t border-slate-100 pt-4 mt-2">
                <button
                  type="button"
                  onClick={() => setShowCustomKop(!showCustomKop)}
                  className="w-full flex items-center justify-between text-xs font-bold text-slate-700 uppercase tracking-wider bg-slate-50 border border-slate-200/60 hover:bg-slate-100 p-2.5 rounded-lg transition-all"
                >
                  <span className="flex items-center gap-1.5">
                    <Settings className="w-3.5 h-3.5 text-indigo-500" />
                    <span>Kustomisasi Kop & Owner Laporan (Opsional)</span>
                  </span>
                  <span>{showCustomKop ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}</span>
                </button>

                {showCustomKop && (
                  <div className="mt-3 space-y-4 p-4 bg-slate-50/50 rounded-xl border border-slate-100">
                    <p className="text-[10px] text-slate-400 italic">
                      * Kosongkan isian di bawah ini jika ingin menggunakan identitas default dari Pengaturan Global.
                    </p>
                    
                    <div className="grid grid-cols-2 gap-4">
                      <div>
                        <label className="block text-[10px] font-bold text-slate-400 mb-1">Nama Perusahaan Kustom</label>
                        <input 
                          className="input-field text-xs font-bold" 
                          placeholder="CV. Mandiri Jaya (Kustom)"
                          value={form.companyName} 
                          onChange={e => setForm({ ...form, companyName: e.target.value })} 
                        />
                      </div>
                      
                      <div>
                        <label className="block text-[10px] font-bold text-slate-400 mb-1">Header Laporan Kustom</label>
                        <input 
                          className="input-field text-xs font-bold" 
                          placeholder="KONSULTAN PERENCANA"
                          value={form.reportHeader} 
                          onChange={e => setForm({ ...form, reportHeader: e.target.value })} 
                        />
                      </div>

                      <div className="col-span-2">
                        <label className="block text-[10px] font-bold text-slate-400 mb-1">Nama Owner / Direktur Kustom</label>
                        <input 
                          className="input-field text-xs font-bold" 
                          placeholder="Ir. Budi Santoso (Kustom)"
                          value={form.ownerName} 
                          onChange={e => setForm({ ...form, ownerName: e.target.value })} 
                        />
                      </div>

                      <div>
                        <label className="block text-[10px] font-bold text-slate-400 mb-1">Logo Kustom</label>
                        <div className="flex flex-col gap-2 p-2 border border-slate-200 rounded-lg bg-white">
                          {form.companyLogo ? (
                            <div className="relative w-fit">
                              <img 
                                src={form.companyLogo} 
                                alt="Logo Preview" 
                                className="h-10 w-10 object-contain border border-slate-100 rounded"
                              />
                              <button
                                type="button"
                                onClick={() => setForm({ ...form, companyLogo: '' })}
                                className="absolute -top-1 -right-1 bg-red-600 hover:bg-red-700 text-white rounded-full h-4 w-4 flex items-center justify-center shadow-sm leading-none"
                              >
                                &times;
                              </button>
                            </div>
                          ) : (
                            <div className="text-[10px] text-slate-400 italic">Menggunakan logo global</div>
                          )}
                          <input
                            type="file"
                            accept="image/*"
                            onChange={(e) => {
                              const file = e.target.files?.[0]
                              if (file) handleImageUpload(file, 'companyLogo')
                            }}
                            className="block w-full text-[10px] text-slate-500 file:mr-2 file:py-0.5 file:px-1.5 file:rounded file:border-0 file:text-[10px] file:font-semibold file:bg-slate-100 file:text-slate-700 hover:file:bg-slate-200"
                          />
                        </div>
                      </div>

                      <div>
                        <label className="block text-[10px] font-bold text-slate-400 mb-1">Paraf Owner Kustom</label>
                        <div className="flex flex-col gap-2 p-2 border border-slate-200 rounded-lg bg-white">
                          {form.ownerParaf ? (
                            <div className="relative w-fit">
                              <img 
                                src={form.ownerParaf} 
                                alt="Paraf Preview" 
                                className="h-10 w-10 object-contain border border-slate-100 rounded"
                              />
                              <button
                                type="button"
                                onClick={() => setForm({ ...form, ownerParaf: '' })}
                                className="absolute -top-1 -right-1 bg-red-600 hover:bg-red-700 text-white rounded-full h-4 w-4 flex items-center justify-center shadow-sm leading-none"
                              >
                                &times;
                              </button>
                            </div>
                          ) : (
                            <div className="text-[10px] text-slate-400 italic">Menggunakan paraf global</div>
                          )}
                          <input
                            type="file"
                            accept="image/*"
                            onChange={(e) => {
                              const file = e.target.files?.[0]
                              if (file) handleImageUpload(file, 'ownerParaf')
                            }}
                            className="block w-full text-[10px] text-slate-500 file:mr-2 file:py-0.5 file:px-1.5 file:rounded file:border-0 file:text-[10px] file:font-semibold file:bg-slate-100 file:text-slate-700 hover:file:bg-slate-200"
                          />
                        </div>
                      </div>
                    </div>
                  </div>
                )}
              </div>

              {!initialData && (
                <div className="col-span-2 space-y-2 pt-2 border-t border-slate-100 mt-2">
                  <label className="block text-[10px] font-bold text-slate-400 uppercase tracking-wider">
                    Pilih Template Pekerjaan Awal
                  </label>
                  <div className="grid grid-cols-3 gap-3">
                    <label className={`flex flex-col items-center justify-center p-3 border rounded-xl cursor-pointer transition-all duration-150 ${form.template === 'blank' ? 'border-primary-500 bg-primary-50/20 ring-1 ring-primary-500' : 'border-slate-200 hover:bg-slate-50'}`}>
                      <input
                        type="radio"
                        name="template"
                        value="blank"
                        checked={form.template === 'blank'}
                        onChange={() => setForm({ ...form, template: 'blank' })}
                        className="sr-only"
                      />
                      <FileText className={`w-5 h-5 mb-1.5 ${form.template === 'blank' ? 'text-primary-600' : 'text-slate-400'}`} />
                      <span className="font-bold text-xs text-slate-800">Kosong</span>
                      <span className="text-[9px] text-slate-400 text-center mt-0.5 leading-tight">Mulai struktur WBS baru</span>
                    </label>

                    <label className={`flex flex-col items-center justify-center p-3 border rounded-xl cursor-pointer transition-all duration-150 ${form.template === 'renovasi' ? 'border-primary-500 bg-primary-50/20 ring-1 ring-primary-500' : 'border-slate-200 hover:bg-slate-50'}`}>
                      <input
                        type="radio"
                        name="template"
                        value="renovasi"
                        checked={form.template === 'renovasi'}
                        onChange={() => setForm({ ...form, template: 'renovasi' })}
                        className="sr-only"
                      />
                      <Wrench className={`w-5 h-5 mb-1.5 ${form.template === 'renovasi' ? 'text-primary-600' : 'text-slate-400'}`} />
                      <span className="font-bold text-xs text-slate-800">Renovasi</span>
                      <span className="text-[9px] text-slate-400 text-center mt-0.5 leading-tight">Struktur renovasi ruangan</span>
                    </label>

                    <label className={`flex flex-col items-center justify-center p-3 border rounded-xl cursor-pointer transition-all duration-150 ${form.template === 'pembangunan' ? 'border-primary-500 bg-primary-50/20 ring-1 ring-primary-500' : 'border-slate-200 hover:bg-slate-50'}`}>
                      <input
                        type="radio"
                        name="template"
                        value="pembangunan"
                        checked={form.template === 'pembangunan'}
                        onChange={() => setForm({ ...form, template: 'pembangunan' })}
                        className="sr-only"
                      />
                      <Building className={`w-5 h-5 mb-1.5 ${form.template === 'pembangunan' ? 'text-primary-600' : 'text-slate-400'}`} />
                      <span className="font-bold text-xs text-slate-800">Pembangunan</span>
                      <span className="text-[9px] text-slate-400 text-center mt-0.5 leading-tight">Struktur rumah tinggal baru</span>
                    </label>
                  </div>
                </div>
              )}
            </div>
          </div>

          {/* Footer Actions */}
          <div className="px-6 py-4 border-t border-slate-100 flex gap-3 bg-slate-50/50 select-none">
            <button type="submit" disabled={saving} className="btn-primary flex-1">
              <span>{saving ? 'Menyimpan...' : 'Simpan Proyek'}</span>
            </button>
            <button type="button" onClick={onClose} className="btn-secondary">Batal</button>
          </div>
        </form>
      </div>
    </div>
  )
}
