import React, { useState, useEffect } from 'react'
import { useProjectStore } from '../stores/project-store'
import { useRabStore } from '../stores/rab-store'
import { STATUS_LABELS, STATUS_COLORS, formatCurrency } from '../lib/format'
import { RabInputTab } from './rab-input-tab'
import { ProjectVolumeTab } from './project-volume-tab'
import { AhsAnalisaTab } from './ahs-analisa-tab'
import { BomTab } from './bom-tab'
import { LaporanPage } from './laporan-page'

interface ProjectDetailPageProps {
  projectId: string
  onBack: () => void
  onEdit: () => void
}

type ProjectTab = 'info' | 'volume' | 'rab-input' | 'ahs-analisa' | 'bom' | 'laporan'

export function ProjectDetailPage({ projectId, onBack, onEdit }: ProjectDetailPageProps): React.ReactElement {
  const { projects, loadProjects } = useProjectStore()
  const { calculation, calculate } = useRabStore()
  const [activeTab, setActiveTab] = useState<ProjectTab>('info')

  useEffect(() => {
    loadProjects()
  }, [])

  const project = projects.find(p => p.id === projectId)

  useEffect(() => {
    if (project) {
      calculate(projectId, project.ppn, project.overhead)
    }
  }, [projectId, project?.ppn, project?.overhead])

  if (!project) {
    return <div className="text-center py-8 text-gray-500">Proyek tidak ditemukan</div>
  }

  const tabs: { id: ProjectTab; label: string }[] = [
    { id: 'info', label: 'Info' },
    { id: 'rab-input', label: 'Input RAB' },
    { id: 'ahs-analisa', label: 'Lembar Analisa' },
    { id: 'bom', label: 'Bill of Material (BOM)' },
    { id: 'laporan', label: 'Laporan & Ekspor' }
  ]

  const renderTabContent = (): React.ReactElement => {
    switch (activeTab) {
      case 'info':
        return (
          <div className="grid grid-cols-3 gap-4">
            <div className="card p-4">
              <p className="text-xs text-gray-500 font-medium uppercase tracking-wider">Informasi Proyek</p>
              <div className="mt-3 space-y-2 text-sm">
                <div className="flex justify-between"><span className="text-gray-500">No. Proyek</span><span className="font-semibold text-gray-800">{project.projectNumber || '-'}</span></div>
                <div className="flex justify-between"><span className="text-gray-500">Lokasi</span><span className="font-semibold text-gray-800">{project.location || '-'}</span></div>
                <div className="flex justify-between"><span className="text-gray-500">Tahun</span><span className="font-semibold text-gray-800">{project.year}</span></div>
                <div className="flex justify-between"><span className="text-gray-500">Tipe Bangunan</span><span className="font-semibold text-gray-800">{project.buildingType || '-'}</span></div>
                <div className="flex justify-between"><span className="text-gray-500">Lantai</span><span className="font-semibold text-gray-800">{project.floors} Lantai</span></div>
                <div className="flex justify-between"><span className="text-gray-500">PPN (%)</span><span className="font-semibold text-gray-800">{project.ppn}%</span></div>
                <div className="flex justify-between"><span className="text-gray-500">Overhead (%)</span><span className="font-semibold text-gray-800">{project.overhead}%</span></div>
              </div>
            </div>
            
            <div className="card p-4 col-span-2">
              <p className="text-xs text-gray-500 font-medium uppercase tracking-wider">Rekapitulasi Biaya</p>
              <div className="mt-3 space-y-2 text-sm">
                <div className="flex justify-between"><span className="text-gray-500">Total Pekerjaan</span><span className="font-mono font-bold text-gray-800">{calculation ? calculation.lineItems.length : 0}</span></div>
                <div className="flex justify-between"><span className="text-gray-500">Subtotal</span><span className="font-mono font-bold text-gray-800">{calculation ? formatCurrency(calculation.totalPrice) : '-'}</span></div>
                <div className="flex justify-between"><span className="text-gray-500">Grand Total</span><span className="font-mono font-extrabold text-primary-800">{calculation ? formatCurrency(calculation.grandTotal) : '-'}</span></div>
              </div>
            </div>
          </div>
        )

      case 'rab-input':
        return <RabInputTab projectId={projectId} />

      case 'ahs-analisa':
        return <AhsAnalisaTab projectId={projectId} />

      case 'bom':
        return <BomTab projectId={projectId} />

      case 'laporan':
        return <LaporanPage projectId={projectId} />

      default:
        return <div />
    }
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-3 no-print">
        <button onClick={onBack} className="text-gray-500 hover:text-gray-700 text-sm">&larr; Kembali</button>
        <h2 className="text-2xl font-bold text-gray-900">{project.name}</h2>
        <span className={`px-3 py-0.5 rounded-full text-xs font-medium ${STATUS_COLORS[project.status]}`}>
          {STATUS_LABELS[project.status]}
        </span>
        <button onClick={onEdit} className="btn-primary ml-auto text-xs px-3 py-1.5">Edit Proyek</button>
      </div>

      <div className="flex gap-1 bg-gray-100 p-1 rounded-lg w-fit no-print">
        {tabs.map(tab => (
          <button
            key={tab.id}
            onClick={() => setActiveTab(tab.id)}
            className={`px-4 py-2 rounded-md text-sm font-medium transition-colors ${
              activeTab === tab.id
                ? 'bg-white shadow-sm text-primary-800'
                : 'text-gray-600 hover:text-gray-900'
            }`}
          >
            {tab.label}
          </button>
        ))}
      </div>

      {renderTabContent()}
    </div>
  )
}
