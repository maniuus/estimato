import React, { useState, useEffect } from 'react'
import { useSettingsStore } from '../stores/settings-store'

export function SettingsPage(): React.ReactElement {
  const { settings, load, update, backup, restore, loading } = useSettingsStore()
  const [companyName, setCompanyName] = useState('')
  const [reportHeader, setReportHeader] = useState('')
  const [ppnDefault, setPpnDefault] = useState('11')
  const [saved, setSaved] = useState(false)
  const [backupMsg, setBackupMsg] = useState('')
  const [restoreMsg, setRestoreMsg] = useState('')

  useEffect(() => {
    load()
  }, [])

  useEffect(() => {
    if (settings) {
      setCompanyName(settings.companyName)
      setReportHeader(settings.reportHeader)
      setPpnDefault(String(settings.ppnDefault))
    }
  }, [settings])

  const handleSave = async () => {
    setSaved(false)
    setBackupMsg('')
    setRestoreMsg('')
    const ok = await update({ companyName, reportHeader, ppnDefault: parseFloat(ppnDefault) || 11 })
    if (ok) setSaved(true)
  }

  const handleBackup = async () => {
    setBackupMsg('')
    setRestoreMsg('')
    const path = await backup()
    if (path) setBackupMsg(`Backup berhasil: ${path}`)
    else setBackupMsg('Backup dibatalkan')
  }

  const handleRestore = async () => {
    if (!confirm('Yakin akan merestore database? Data saat ini akan diganti.')) return
    setBackupMsg('')
    setRestoreMsg('')
    const path = await restore()
    if (path) {
      setRestoreMsg('Restore berhasil! Muat ulang aplikasi.')
      await load()
    } else {
      setRestoreMsg('Restore dibatalkan')
    }
  }

  if (!settings && loading) {
    return <div className="text-center py-8 text-gray-500">Memuat...</div>
  }

  return (
    <div className="max-w-2xl space-y-6">
      <h2 className="text-xl font-bold text-gray-900">Pengaturan</h2>

      <div className="card p-5">
        <p className="text-sm font-medium text-gray-700 mb-4">Profil Perusahaan</p>
        <div className="space-y-3">
          <div>
            <label className="block text-xs text-gray-600 mb-1">Nama Perusahaan</label>
            <input
              type="text"
              value={companyName}
              onChange={e => setCompanyName(e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 rounded text-sm"
              placeholder="CV. Karya Mandiri"
            />
          </div>
          <div>
            <label className="block text-xs text-gray-600 mb-1">Header Laporan</label>
            <input
              type="text"
              value={reportHeader}
              onChange={e => setReportHeader(e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 rounded text-sm"
              placeholder="KONSULTAN PERENCANA"
            />
          </div>
          <div>
            <label className="block text-xs text-gray-600 mb-1">PPN Default (%)</label>
            <input
              type="number"
              min="0"
              max="100"
              step="0.5"
              value={ppnDefault}
              onChange={e => setPpnDefault(e.target.value)}
              className="w-32 px-3 py-2 border border-gray-300 rounded text-sm font-mono"
            />
          </div>
          <button onClick={handleSave} className="btn-primary text-sm px-4 py-2">
            Simpan Pengaturan
          </button>
          {saved && <span className="text-xs text-green-600 ml-2">Tersimpan!</span>}
        </div>
      </div>

      <div className="card p-5">
        <p className="text-sm font-medium text-gray-700 mb-4">Database</p>
        <div className="space-y-3">
          <div className="flex items-center gap-3">
            <button onClick={handleBackup} className="btn-primary text-sm px-4 py-2 bg-blue-600 hover:bg-blue-700">
              Backup Database
            </button>
            <span className="text-xs text-gray-500">Simpan salinan database ke file</span>
          </div>
          {backupMsg && <p className="text-xs text-gray-600">{backupMsg}</p>}

          <div className="flex items-center gap-3">
            <button
              onClick={handleRestore}
              className="btn-primary text-sm px-4 py-2 bg-red-600 hover:bg-red-700"
            >
              Restore Database
            </button>
            <span className="text-xs text-gray-500">Pulihkan database dari file backup</span>
          </div>
          {restoreMsg && <p className="text-xs text-red-600">{restoreMsg}</p>}
        </div>
      </div>
    </div>
  )
}
