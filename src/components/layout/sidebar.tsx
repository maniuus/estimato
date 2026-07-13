import React, { useState } from 'react'
import {
  LayoutDashboard,
  FolderKanban,
  BookOpen,
  Package,
  HardHat,
  Wrench,
  Settings,
  ChevronRight,
  ChevronDown
} from 'lucide-react'

const navItems = [
  { id: 'dashboard', label: 'Dashboard', icon: 'dashboard' },
  { id: 'projects', label: 'Proyek', icon: 'projects' },
  { id: 'ahs-library', label: 'Library AHS', icon: 'ahs-library' },
  { id: 'master-data', label: 'Master Data', icon: 'master-data' },
  { id: 'materials', label: 'Material', icon: 'materials', parent: 'master-data' },
  { id: 'wages', label: 'Upah Tenaga', icon: 'wages', parent: 'master-data' },
  { id: 'equipment', label: 'Alat', icon: 'equipment', parent: 'master-data' },
  { id: 'settings', label: 'Pengaturan', icon: 'settings' }
]

const iconMap: Record<string, React.ComponentType<{ className?: string }>> = {
  dashboard: LayoutDashboard,
  projects: FolderKanban,
  'ahs-library': BookOpen,
  'master-data': Package,
  materials: Package,
  wages: HardHat,
  equipment: Wrench,
  settings: Settings
}

interface SidebarProps {
  activePage: string
  onNavigate: (page: string) => void
}

export function Sidebar({ activePage, onNavigate }: SidebarProps): React.ReactElement {
  const [expanded, setExpanded] = useState<Record<string, boolean>>({
    'master-data': true
  })

  const toggleExpand = (id: string): void => {
    setExpanded(prev => ({ ...prev, [id]: !prev[id] }))
  }

  return (
    <aside className="w-64 h-full bg-slate-900 border-r border-slate-800 flex flex-col text-slate-300 select-none">
      <div className="px-6 py-5 border-b border-slate-800 flex flex-col">
        <div className="flex items-center gap-3">
          <div className="w-8 h-8 rounded-lg bg-gradient-to-tr from-primary-600 to-indigo-400 flex items-center justify-center text-white font-extrabold text-sm shadow-md shadow-primary-600/30">
            MR
          </div>
          <div>
            <h1 className="text-sm font-bold text-white tracking-wide">Master RAB</h1>
            <p className="text-[10px] text-slate-500 font-semibold tracking-wider uppercase mt-0.5">Konstruksi v1.0</p>
          </div>
        </div>
      </div>

      <nav className="flex-1 overflow-y-auto p-4 space-y-1.5">
        {navItems.map(item => {
          const Icon = iconMap[item.icon] || Package

          if (item.parent) {
            if (!expanded[item.parent]) return null
            return (
              <button
                key={item.id}
                onClick={() => onNavigate(item.id)}
                className={`w-full flex items-center gap-2.5 pl-9 pr-3 py-2.5 rounded-lg text-xs font-semibold tracking-wide transition-all duration-200 ${
                  activePage === item.id
                    ? 'bg-primary-600 text-white shadow-sm shadow-primary-600/10'
                    : 'text-slate-400 hover:text-slate-200 hover:bg-slate-800/40'
                }`}
              >
                <Icon className="w-3.5 h-3.5" />
                <span>{item.label}</span>
              </button>
            )
          }

          const hasChildren = navItems.some(n => n.parent === item.id)
          const isActive = activePage === item.id || (hasChildren && navItems.some(n => n.parent === item.id && activePage === n.id))

          return (
            <div key={item.id} className="space-y-1">
              <button
                onClick={() => {
                  if (hasChildren) {
                    toggleExpand(item.id)
                  }
                  onNavigate(item.id)
                }}
                className={`sidebar-link w-full text-left ${isActive ? 'active' : ''}`}
              >
                <Icon className="w-4 h-4" />
                <span className="flex-1 tracking-wide">{item.label}</span>
                {hasChildren && (
                  <span className="transition-transform duration-200">
                    {expanded[item.id] ? (
                      <ChevronDown className="w-3.5 h-3.5 opacity-60" />
                    ) : (
                      <ChevronRight className="w-3.5 h-3.5 opacity-60" />
                    )}
                  </span>
                )}
              </button>
            </div>
          )
        })}
      </nav>

      <div className="px-6 py-4 border-t border-slate-800 text-[10px] font-medium tracking-wide text-slate-500">
        Master RAB v1.0.0
      </div>
    </aside>
  )
}
