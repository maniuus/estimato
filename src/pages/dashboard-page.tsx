import React, { useEffect } from 'react'
import { ProjectList } from '../components/project-list'
import { useProjectStore } from '../stores/project-store'
import { formatCurrency } from '../lib/format'

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

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold text-gray-900">Dashboard</h2>
          <p className="text-sm text-gray-500 mt-1">Overview proyek konstruksi Anda</p>
        </div>
        <button onClick={onCreateProject} className="btn-primary">
          + Buat Proyek Baru
        </button>
      </div>

      <div className="grid grid-cols-4 gap-4">
        {[
          { label: 'Total Proyek', value: totalProjects.toString(), color: 'bg-blue-50 text-blue-700' },
          { label: 'Aktif', value: activeProjects.toString(), color: 'bg-green-50 text-green-700' },
          { label: 'Selesai', value: completedProjects.toString(), color: 'bg-purple-50 text-purple-700' },
          { label: 'Total Nilai', value: formatCurrency(totalValue), color: 'bg-amber-50 text-amber-700' }
        ].map(stat => (
          <div key={stat.label} className={`card p-4 ${stat.color}`}>
            <p className="text-sm font-medium opacity-80">{stat.label}</p>
            <p className="text-2xl font-bold mt-1">{stat.value}</p>
          </div>
        ))}
      </div>

      <div>
        <h3 className="text-lg font-semibold text-gray-900 mb-3">Daftar Proyek</h3>
        <ProjectList onSelectProject={onSelectProject} />
      </div>
    </div>
  )
}
