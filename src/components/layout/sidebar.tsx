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
  ChevronDown,
  Heart
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
    <aside className="w-64 h-full bg-[#F7F6F3] border-r border-[#EAEAEA] flex flex-col text-[#2F3437] select-none">
      <div className="px-6 py-5 border-b border-[#EAEAEA] flex flex-col">
        <div className="flex items-center gap-3">
          <div className="w-8 h-8 rounded bg-[#111111] flex items-center justify-center text-white font-mono font-extrabold text-sm">
            ES
          </div>
          <div>
            <h1 className="text-sm font-bold text-[#111111] tracking-wide">Estimato</h1>
            <p className="text-[10px] text-[#787774] font-semibold tracking-wider uppercase mt-0.5">by archiTech</p>
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
                className={`w-full flex items-center gap-2.5 pl-9 pr-3 py-2.5 rounded-md text-xs font-semibold tracking-wide transition-all duration-150 ${
                  activePage === item.id
                    ? 'bg-[#111111] text-white font-semibold'
                    : 'text-[#787774] hover:text-[#111111] hover:bg-[#EAEAEA]/50'
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

      <div className="px-6 py-4 border-t border-[#EAEAEA] flex flex-col gap-2.5">
        <div className="flex items-center justify-between text-[10px] font-medium tracking-wide text-[#787774]">
          <span>Estimato v1.0.0</span>
          <span className="px-1.5 py-0.5 rounded bg-amber-100 text-amber-800 text-[8px] font-bold uppercase tracking-wider">
            Pre-release
          </span>
        </div>
        <button
          onClick={() => window.api.openExternal('https://saweria.co/architech')}
          className="w-full flex items-center justify-center gap-1.5 py-1.5 rounded border border-[#EAEAEA] bg-white hover:bg-[#F2F1EC] text-[10px] font-semibold text-[#2F3437] transition-all duration-150 shadow-sm"
        >
          <Heart className="w-3 h-3 text-red-500 fill-red-500" />
          <span>Donasi / Dukung</span>
        </button>
      </div>
    </aside>
  )
}
