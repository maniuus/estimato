import React from 'react'
import { useProjectStore } from '../stores/project-store'
import { formatCurrency, formatDateShort, STATUS_LABELS, STATUS_COLORS } from '../lib/format'

interface ProjectListProps {
  onSelectProject: (id: string) => void
}

export function ProjectList({ onSelectProject }: ProjectListProps): React.ReactElement {
  const storeData = useProjectStore()
  const projects = Array.isArray(storeData.projects) ? storeData.projects : []
  const { loading, error, loadProjects } = storeData

  React.useEffect(() => {
    loadProjects()
  }, [])

  if (loading) {
    return <div className="text-center py-8 text-gray-500">Memuat data...</div>
  }

  if (error) {
    return <div className="text-center py-8 text-red-500">{error}</div>
  }

  return (
    <div className="card overflow-hidden border border-slate-100 shadow-sm">
      <table className="w-full border-collapse">
        <thead>
          <tr className="border-b border-slate-100 bg-slate-50/50">
            <th className="table-header">Nama Proyek</th>
            <th className="table-header">Lokasi</th>
            <th className="table-header">Tahun</th>
            <th className="table-header">Nilai</th>
            <th className="table-header">Status</th>
          </tr>
        </thead>
        <tbody>
          {projects.length === 0 ? (
            <tr>
              <td colSpan={5} className="text-center py-8 text-gray-400">
                Belum ada proyek. Klik "Buat Proyek" untuk memulai.
              </td>
            </tr>
          ) : (
            projects.map(project => (
              <tr
                key={project.id}
                onClick={() => onSelectProject(project.id)}
                className="border-b border-slate-50 hover:bg-slate-50/80 cursor-pointer transition-all duration-150 group"
              >
                <td className="table-cell font-bold text-slate-800 group-hover:text-primary-600 transition-colors">{project.name}</td>
                <td className="table-cell font-medium text-slate-600">{project.location}</td>
                <td className="table-cell text-slate-500 font-medium">{project.year}</td>
                <td className="table-cell font-mono font-bold text-slate-700">{formatCurrency(project.grandTotal ?? 0)}</td>
                <td className="table-cell">
                  <span className={`inline-flex px-2.5 py-0.5 rounded-full text-xs font-semibold tracking-wide ${STATUS_COLORS[project.status]}`}>
                    {STATUS_LABELS[project.status]}
                  </span>
                </td>
              </tr>
            ))
          )}
        </tbody>
      </table>
    </div>
  )
}
