import React from 'react'
import { Sidebar } from './sidebar'

interface LayoutProps {
  activePage: string
  onNavigate: (page: string) => void
  children: React.ReactNode
}

export function Layout({ activePage, onNavigate, children }: LayoutProps): React.ReactElement {
  return (
    <div className="h-screen w-screen flex overflow-hidden">
      <Sidebar activePage={activePage} onNavigate={onNavigate} />
      <main className="flex-1 overflow-y-auto bg-gray-50">
        <div className="p-6">
          {children}
        </div>
      </main>
    </div>
  )
}
