import React, { useEffect } from 'react'
import { ProjectList } from '../components/project-list'
import { useProjectStore } from '../stores/project-store'
import { formatCurrency } from '../lib/format'
import { FolderKanban, CheckCircle2, Clock, Coins, Plus, FileUp } from 'lucide-react'

interface DashboardPageProps {
  onCreateProject: () => void
  onSelectProject: (id: string) => void
}

export function DashboardPage({ onCreateProject, onSelectProject }: DashboardPageProps): React.ReactElement {
  const { projects, loadProjects, importProject } = useProjectStore()

  useEffect(() => {
    loadProjects()
  }, [loadProjects])

  const totalProjects = projects.length
  const activeProjects = projects.filter(p => p.status === 'active').length
  const completedProjects = projects.filter(p => p.status === 'completed').length
  const totalValue = projects.reduce((sum, p) => sum + (p.grandTotal ?? 0), 0)

  return (
    <div className="space-y-8">
      <div className="flex items-center justify-between border-b border-[#EAEAEA] pb-5">
        <div>
          <h2 className="text-2xl font-bold text-[#111111] tracking-tight">Dashboard</h2>
          <p className="text-xs text-[#787774] mt-1 font-sans">Overview proyek konstruksi dan estimasi rencana anggaran biaya Anda</p>
        </div>
        <div className="flex items-center gap-3">
          <button 
            onClick={async () => {
              const importedId = await importProject()
              if (importedId) {
                onSelectProject(importedId)
              }
            }} 
            className="flex items-center gap-2 px-4 py-2 border border-[#EAEAEA] bg-white text-[#111111] rounded-lg text-xs font-bold hover:bg-[#F5F5F5] active:scale-95 transition-all"
          >
            <FileUp className="w-4 h-4" />
            <span>Load from Local (JSON)</span>
          </button>
          <button onClick={onCreateProject} className="btn-primary">
            <Plus className="w-4 h-4" />
            <span>Buat Proyek Baru</span>
          </button>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Large Financial Overview Card (Left) */}
        <div className="lg:col-span-2 card p-8 bg-white border border-[#EAEAEA] flex flex-col justify-between relative overflow-hidden">
          <div className="space-y-2">
            <span className="text-[10px] font-bold text-[#787774] uppercase tracking-widest block">Estimasi Nilai Perencanaan</span>
            <span className="text-3xl font-bold font-sans text-[#111111] tracking-tight block">
              {formatCurrency(totalValue)}
            </span>
          </div>
          <div className="mt-8 pt-4 border-t border-[#EAEAEA] flex items-center justify-between text-[10px] text-[#787774] font-medium tracking-wide">
            <span>Total nilai dari seluruh proyek konstruksi aktif dan selesai</span>
            <Coins className="w-4 h-4 text-[#787774]" />
          </div>
        </div>

        {/* Sidebar Stats Column (Right) */}
        <div className="space-y-3.5 flex flex-col justify-between">
          <div className="card p-4 flex items-center justify-between border border-[#EAEAEA] bg-white">
            <div className="space-y-1">
              <span className="text-[9px] font-bold text-[#787774] uppercase tracking-wider block">Total Proyek</span>
              <span className="text-xl font-bold text-[#111111] font-mono">{totalProjects}</span>
            </div>
            <span className="text-[9px] font-bold px-2 py-0.5 rounded-full bg-[#E1F3FE] text-[#1F6C9F] tracking-wide uppercase">PROYEK</span>
          </div>

          <div className="card p-4 flex items-center justify-between border border-[#EAEAEA] bg-white">
            <div className="space-y-1">
              <span className="text-[9px] font-bold text-[#787774] uppercase tracking-wider block">Proyek Aktif</span>
              <span className="text-xl font-bold text-[#111111] font-mono">{activeProjects}</span>
            </div>
            <span className="text-[9px] font-bold px-2 py-0.5 rounded-full bg-[#FBF3DB] text-[#956400] tracking-wide uppercase">BERJALAN</span>
          </div>

          <div className="card p-4 flex items-center justify-between border border-[#EAEAEA] bg-white">
            <div className="space-y-1">
              <span className="text-[9px] font-bold text-[#787774] uppercase tracking-wider block">Proyek Selesai</span>
              <span className="text-xl font-bold text-[#111111] font-mono">{completedProjects}</span>
            </div>
            <span className="text-[9px] font-bold px-2 py-0.5 rounded-full bg-[#EDF3EC] text-[#346538] tracking-wide uppercase">SELESAI</span>
          </div>
        </div>
      </div>

      <div className="space-y-4">
        <h3 className="text-xs font-bold text-[#787774] uppercase tracking-wider">Daftar Proyek Terbaru</h3>
        <ProjectList onSelectProject={onSelectProject} />
      </div>
    </div>
  )
}
