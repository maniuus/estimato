import React, { useState } from 'react'

const navItems = [
  { id: 'dashboard', label: 'Dashboard', icon: '📊' },
  { id: 'projects', label: 'Proyek', icon: '📁' },
  { id: 'ahs-library', label: 'Library AHS', icon: '📚' },
  { id: 'master-data', label: 'Master Data', icon: '📦' },
  { id: 'materials', label: '  Material', icon: '📦', parent: 'master-data' },
  { id: 'wages', label: '  Upah Tenaga', icon: '👷', parent: 'master-data' },
  { id: 'equipment', label: '  Alat', icon: '🔧', parent: 'master-data' },
  { id: 'settings', label: 'Pengaturan', icon: '⚙️' }
]

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
    <aside className="w-60 h-full bg-white border-r border-gray-200 flex flex-col">
      <div className="px-4 py-5 border-b border-gray-200">
        <h1 className="text-base font-bold text-primary-800">Master RAB</h1>
        <p className="text-xs text-gray-500 mt-0.5">Konstruksi v1.0</p>
      </div>

      <nav className="flex-1 overflow-y-auto p-3 space-y-1">
        {navItems.map(item => {
          if (item.parent) {
            if (!expanded[item.parent]) return null
            return (
              <button
                key={item.id}
                onClick={() => onNavigate(item.id)}
                className={`sidebar-link w-full text-left ${activePage === item.id ? 'active' : ''}`}
              >
                <span className="text-base">{item.icon}</span>
                <span>{item.label}</span>
              </button>
            )
          }

          const hasChildren = navItems.some(n => n.parent === item.id)
          return (
            <div key={item.id}>
              <button
                onClick={() => {
                  if (hasChildren) {
                    toggleExpand(item.id)
                  }
                  onNavigate(item.id)
                }}
                className={`sidebar-link w-full text-left ${activePage === item.id ? 'active' : ''}`}
              >
                <span className="text-base">{item.icon}</span>
                <span className="flex-1">{item.label}</span>
                {hasChildren && (
                  <span className={`transition-transform text-xs ${expanded[item.id] ? 'rotate-90' : ''}`}>
                    ▶
                  </span>
                )}
              </button>
            </div>
          )
        })}
      </nav>

      <div className="px-4 py-3 border-t border-gray-200 text-xs text-gray-400">
        Master RAB v1.0.0
      </div>
    </aside>
  )
}
