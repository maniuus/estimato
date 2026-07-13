import React, { useState, useEffect } from 'react'
import { useProjectStore } from '../stores/project-store'
import { useRabStore } from '../stores/rab-store'
import { STATUS_LABELS, STATUS_COLORS, formatCurrency } from '../lib/format'
import { RabInputTab } from './rab-input-tab'
import { ProjectVolumeTab } from './project-volume-tab'
import { AhsAnalisaTab } from './ahs-analisa-tab'
import { BomTab } from './bom-tab'
import { LaporanPage } from './laporan-page'
import { ArrowLeft, Edit3, Info, ClipboardList, HardHat, Layers, FileSpreadsheet } from 'lucide-react'

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
    return <div className="text-center py-8 text-slate-500 font-medium">Proyek tidak ditemukan</div>
  }

  const tabs: { id: ProjectTab; label: string; icon: React.ComponentType<{ className?: string }> }[] = [
    { id: 'info', label: 'Ringkasan', icon: Info },
    { id: 'rab-input', label: 'RAB & WBS', icon: ClipboardList },
    { id: 'ahs-analisa', label: 'Analisa AHS', icon: HardHat },
    { id: 'bom', label: 'Bahan & Upah (BOM)', icon: Layers },
    { id: 'laporan', label: 'Laporan & Ekspor', icon: FileSpreadsheet }
  ]

  const renderTabContent = (): React.ReactElement => {
    switch (activeTab) {
      case 'info':
        return (
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            <div className="card p-6 border-slate-100 shadow-sm">
              <h4 className="text-xs text-slate-400 font-bold uppercase tracking-wider mb-4 pb-2 border-b border-slate-100 flex items-center gap-2">
                <Info className="w-3.5 h-3.5 text-indigo-500" />
                <span>Informasi Proyek</span>
              </h4>
              <div className="space-y-3.5 text-sm">
                <div className="flex justify-between items-center"><span className="text-slate-500 font-medium">No. Proyek</span><span className="font-semibold text-slate-800">{project.projectNumber || '-'}</span></div>
                <div className="flex justify-between items-center"><span className="text-slate-500 font-medium">Lokasi</span><span className="font-semibold text-slate-800">{project.location || '-'}</span></div>
                <div className="flex justify-between items-center"><span className="text-slate-500 font-medium">Tahun Anggaran</span><span className="font-semibold text-slate-800">{project.year}</span></div>
                <div className="flex justify-between items-center"><span className="text-slate-500 font-medium">Tipe Bangunan</span><span className="font-semibold text-slate-800">{project.buildingType || '-'}</span></div>
                <div className="flex justify-between items-center"><span className="text-slate-500 font-medium">Jumlah Lantai</span><span className="font-semibold text-slate-800">{project.floors} Lantai</span></div>
                <div className="flex justify-between items-center border-t border-slate-100 pt-3.5"><span className="text-slate-500 font-medium">PPN (%)</span><span className="font-mono font-bold text-slate-800">{project.ppn}%</span></div>
                <div className="flex justify-between items-center"><span className="text-slate-500 font-medium">Overhead (%)</span><span className="font-mono font-bold text-slate-800">{project.overhead}%</span></div>
              </div>
            </div>
            
            <div className="card p-6 col-span-2 border-slate-100 shadow-sm flex flex-col justify-between">
              <div>
                <h4 className="text-xs text-slate-400 font-bold uppercase tracking-wider mb-4 pb-2 border-b border-slate-100 flex items-center gap-2">
                  <ClipboardList className="w-3.5 h-3.5 text-indigo-500" />
                  <span>Rekapitulasi Estimasi RAB</span>
                </h4>
                <div className="grid grid-cols-2 gap-6 mt-4">
                  <div className="p-4 bg-slate-50 rounded-xl border border-slate-100 flex flex-col justify-center">
                    <span className="text-xs text-slate-400 font-semibold uppercase tracking-wider">Total Item Pekerjaan</span>
                    <span className="text-2xl font-extrabold text-slate-800 mt-1 font-mono">{calculation ? calculation.lineItems.length : 0}</span>
                  </div>
                  <div className="p-4 bg-indigo-50/40 rounded-xl border border-indigo-100/50 flex flex-col justify-center">
                    <span className="text-xs text-indigo-500/80 font-semibold uppercase tracking-wider">Subtotal Biaya</span>
                    <span className="text-xl font-extrabold text-indigo-900 mt-1 font-mono">{calculation ? formatCurrency(calculation.totalPrice) : '-'}</span>
                  </div>
                </div>
              </div>
              <div className="mt-6 pt-5 border-t border-slate-100 flex justify-between items-center bg-slate-900 text-white p-5 rounded-xl shadow-inner shadow-black/10">
                <div className="space-y-0.5">
                  <span className="text-xs text-slate-400 font-bold uppercase tracking-wider">Grand Total (Termasuk PPN & OH)</span>
                  <p className="text-[10px] text-slate-500">Estimasi total biaya perencanaan pembangunan fisik</p>
                </div>
                <span className="text-2xl font-black text-indigo-300 tracking-tight font-mono">
                  {calculation ? formatCurrency(calculation.grandTotal) : '-'}
                </span>
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
      <div className="flex items-center gap-3 no-print border-b border-slate-200/50 pb-4">
        <button 
          onClick={onBack} 
          className="flex items-center gap-1.5 text-xs text-slate-500 hover:text-slate-800 font-semibold px-2.5 py-1.5 rounded-lg border border-slate-200 hover:bg-slate-50 transition-all duration-150 active:scale-95"
        >
          <ArrowLeft className="w-3.5 h-3.5" />
          <span>Kembali</span>
        </button>
        <h2 className="text-xl font-extrabold text-slate-800 tracking-tight">{project.name}</h2>
        <span className={`px-2.5 py-0.5 rounded-full text-xs font-semibold tracking-wide ${STATUS_COLORS[project.status]}`}>
          {STATUS_LABELS[project.status]}
        </span>
        <button 
          onClick={onEdit} 
          className="btn-secondary ml-auto text-xs px-3 py-1.5 flex items-center gap-1.5"
        >
          <Edit3 className="w-3.5 h-3.5" />
          <span>Edit Proyek</span>
        </button>
      </div>

      <div className="flex gap-1.5 bg-slate-100/80 p-1 rounded-xl w-fit no-print border border-slate-200/30">
        {tabs.map(tab => {
          const Icon = tab.icon
          const isSelected = activeTab === tab.id
          return (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              className={`flex items-center gap-2 px-4 py-2 rounded-lg text-xs font-bold tracking-wide transition-all duration-200 ${
                isSelected
                  ? 'bg-white shadow-sm text-primary-600'
                  : 'text-slate-500 hover:text-slate-800 hover:bg-white/40'
              }`}
            >
              <Icon className="w-3.5 h-3.5" />
              <span>{tab.label}</span>
            </button>
          )
        })}
      </div>

      {renderTabContent()}
    </div>
  )
}
