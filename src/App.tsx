import React, { useState, useEffect } from 'react'
import { Layout } from './components/layout/layout'
import { DashboardPage } from './pages/dashboard-page'
import { MasterDataPage } from './pages/master-data-page'
import { ProjectForm } from './pages/project-form'
import { ProjectDetailPage } from './pages/project-detail-page'
import { AhsPage } from './pages/ahs-page'
import { SettingsPage } from './pages/settings-page'
import { useProjectStore } from './stores/project-store'

type Page = 'dashboard' | 'projects' | 'master-data' | 'materials' | 'wages' | 'equipment' | 'ahs-library' | 'settings'

export default function App(): React.ReactElement {
  const [activePage, setActivePage] = useState<Page>('dashboard')
  const [showProjectForm, setShowProjectForm] = useState(false)
  const [isEditing, setIsEditing] = useState(false)
  const [selectedProjectId, setSelectedProjectId] = useState<string | null>(null)
  const { projects, loadProjects } = useProjectStore()

  useEffect(() => {
    loadProjects()
  }, [])

  const handleNavigate = (page: string): void => {
    setActivePage(page as Page)
    setSelectedProjectId(null)
  }

  const handleSelectProject = (id: string): void => {
    setSelectedProjectId(id)
    setActivePage('projects')
  }

  const renderContent = (): React.ReactElement => {
    switch (activePage) {
      case 'dashboard':
        return (
          <DashboardPage
            onCreateProject={() => { setIsEditing(false); setShowProjectForm(true) }}
            onSelectProject={handleSelectProject}
          />
        )
      case 'projects':
        if (selectedProjectId) {
          return (
            <ProjectDetailPage
              projectId={selectedProjectId}
              onBack={() => setActivePage('dashboard')}
              onEdit={() => { setIsEditing(true); setShowProjectForm(true) }}
            />
          )
        }
        return <DashboardPage onCreateProject={() => { setIsEditing(false); setShowProjectForm(true) }} onSelectProject={handleSelectProject} />
      case 'master-data':
      case 'materials':
      case 'wages':
      case 'equipment':
        return <MasterDataPage />
      case 'ahs-library':
        return <AhsPage />
      case 'settings':
        return <SettingsPage />
      default:
        return <DashboardPage onCreateProject={() => { setIsEditing(false); setShowProjectForm(true) }} onSelectProject={handleSelectProject} />
    }
  }

  return (
    <Layout activePage={activePage} onNavigate={handleNavigate}>
      {renderContent()}
      {showProjectForm && (
        <ProjectForm
          onClose={() => setShowProjectForm(false)}
          initialData={isEditing && selectedProjectId ? projects.find(p => p.id === selectedProjectId) : undefined}
        />
      )}
    </Layout>
  )
}
