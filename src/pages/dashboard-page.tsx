import React, { useEffect } from 'react'
import { ProjectList } from '../components/project-list'
import { useProjectStore } from '../stores/project-store'
import { formatCurrency } from '../lib/format'
import { FolderKanban, CheckCircle2, Clock, Coins, Plus } from 'lucide-react'

interface DashboardPageProps {
  onCreateProject: () => void
  onSelectProject: (id: string) => void
}

export function DashboardPage({ onCreateProject, onSelectProject }: DashboardPageProps): React.ReactElement {
  const { projects, loadProjects } = useProjectStore()

  useEffect(() => {
    loadProjects()
  }, [loadProjects])

  const totalProjects = projects.length
  const activeProjects = projects.filter(p => p.status === 'active').length
  const completedProjects = projects.filter(p => p.status === 'completed').length
  const totalValue = projects.reduce((sum, p) => sum + (p.grandTotal ?? 0), 0)

  const stats = [
    { label: 'Total Proyek', value: totalProjects.toString(), icon: FolderKanban, iconColor: 'text-indigo-600 bg-indigo-50 border-indigo-100', accent: 'border-l-4 border-indigo-500' },
    { label: 'Aktif', value: activeProjects.toString(), icon: Clock, iconColor: 'text-amber-600 bg-amber-50 border-amber-100', accent: 'border-l-4 border-amber-500' },
    { label: 'Selesai', value: completedProjects.toString(), icon: CheckCircle2, iconColor: 'text-emerald-600 bg-emerald-50 border-emerald-100', accent: 'border-l-4 border-emerald-500' },
    { label: 'Total Nilai', value: formatCurrency(totalValue), icon: Coins, iconColor: 'text-sky-600 bg-sky-50 border-sky-100', accent: 'border-l-4 border-sky-500' }
  ]

  return (
    <div className="space-y-8">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-extrabold text-slate-900 tracking-tight">Dashboard</h2>
          <p className="text-sm text-slate-500 mt-1">Overview proyek konstruksi dan estimasi rencana anggaran biaya Anda</p>
        </div>
        <button onClick={onCreateProject} className="btn-primary">
          <Plus className="w-4 h-4" />
          <span>Buat Proyek Baru</span>
        </button>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-4 gap-5">
        {stats.map(stat => {
          const Icon = stat.icon
          return (
            <div key={stat.label} className={`card p-5 flex items-center justify-between border-slate-100 shadow-sm hover:shadow-md transition-all duration-200 ${stat.accent}`}>
              <div className="space-y-1">
                <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">{stat.label}</p>
                <p className="text-2xl font-extrabold text-slate-800 tracking-tight font-sans">{stat.value}</p>
              </div>
              <div className={`w-10 h-10 rounded-xl flex items-center justify-center border ${stat.iconColor} transition-transform hover:scale-105 duration-200`}>
                <Icon className="w-5 h-5" />
              </div>
            </div>
          )
        })}
      </div>

      <div className="space-y-4">
        <h3 className="text-lg font-bold text-slate-800 tracking-tight">Daftar Proyek Terbaru</h3>
        <ProjectList onSelectProject={onSelectProject} />
      </div>
    </div>
  )
}
