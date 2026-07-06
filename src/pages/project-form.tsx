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
    template: 'blank'
  })
  const [saving, setSaving] = useState(false)

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

            {!initialData && (
              <div className="col-span-2 space-y-1.5">
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

          <div className="flex gap-2 pt-2">
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
