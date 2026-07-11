import React, { useState, useEffect } from 'react'
import { useSettingsStore } from '../stores/settings-store'

export function SettingsPage(): React.ReactElement {
  const { settings, load, update, backup, restore, loading } = useSettingsStore()
  const [companyName, setCompanyName] = useState('')
  const [reportHeader, setReportHeader] = useState('')
  const [ppnDefault, setPpnDefault] = useState('11')
  const [companyLogo, setCompanyLogo] = useState('')
  const [ownerName, setOwnerName] = useState('')
  const [ownerParaf, setOwnerParaf] = useState('')
  const [saved, setSaved] = useState(false)
  const [backupMsg, setBackupMsg] = useState('')
  const [restoreMsg, setRestoreMsg] = useState('')

  useEffect(() => {
    load()
  }, [])

  useEffect(() => {
    if (settings) {
      setCompanyName(settings.companyName || '')
      setReportHeader(settings.reportHeader || '')
      setPpnDefault(String(settings.ppnDefault ?? '11'))
      setCompanyLogo(settings.companyLogo || '')
      setOwnerName((settings as any).ownerName || '')
      setOwnerParaf((settings as any).ownerParaf || '')
    }
  }, [settings])

  const handleImageUpload = (file: File, callback: (base64: string) => void) => {
    if (!file) return
    const reader = new FileReader()
    reader.onload = (e) => {
      if (e.target?.result) {
        callback(e.target.result as string)
      }
    }
    reader.readAsDataURL(file)
  }

  const handleSave = async () => {
    setSaved(false)
    setBackupMsg('')
    setRestoreMsg('')
    const ok = await update({ 
      companyName, 
      reportHeader, 
      ppnDefault: parseFloat(ppnDefault) || 11,
      companyLogo,
      ownerName,
      ownerParaf
    } as any)
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
    <div className="max-w-3xl space-y-6">
      <h2 className="text-xl font-bold text-gray-900">Pengaturan</h2>

      <div className="card p-5">
        <p className="text-sm font-medium text-gray-700 mb-4">Profil Perusahaan & Laporan</p>
        <div className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
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
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-xs text-gray-600 mb-1">Nama Pemilik / Owner (Untuk Paraf)</label>
              <input
                type="text"
                value={ownerName}
                onChange={e => setOwnerName(e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded text-sm"
                placeholder="Ir. H. Abimanyu"
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
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6 border-t border-gray-100 pt-4">
            <div>
              <label className="block text-xs font-semibold text-gray-700 mb-1">Logo Perusahaan</label>
              <div className="flex items-center gap-3 border border-gray-200 rounded p-2 bg-gray-50/50">
                {companyLogo ? (
                  <div className="relative group">
                    <img 
                      src={companyLogo} 
                      alt="Logo Preview" 
                      className="h-16 w-16 object-contain bg-white border border-gray-200 rounded p-1"
                    />
                    <button
                      type="button"
                      onClick={() => setCompanyLogo('')}
                      className="absolute -top-1 -right-1 bg-red-600 hover:bg-red-700 text-white rounded-full h-4 w-4 flex items-center justify-center shadow-sm leading-none"
                      style={{ fontSize: '10px' }}
                      title="Hapus Logo"
                    >
                      &times;
                    </button>
                  </div>
                ) : (
                  <div className="h-16 w-16 bg-gray-100 border border-dashed border-gray-300 rounded flex items-center justify-center text-xs text-gray-400 font-medium">
                    No Logo
                  </div>
                )}
                <div className="flex-1">
                  <input
                    type="file"
                    accept="image/*"
                    onChange={(e) => {
                      const file = e.target.files?.[0]
                      if (file) handleImageUpload(file, setCompanyLogo)
                    }}
                    className="block w-full text-xs text-gray-500 file:mr-2 file:py-1 file:px-2 file:rounded file:border-0 file:text-xs file:font-semibold file:bg-gray-200 file:text-gray-700 hover:file:bg-gray-300"
                  />
                  <span className="text-[10px] text-gray-400 mt-1 block">Format: PNG, JPG (Max 1MB disarankan)</span>
                </div>
              </div>
            </div>

            <div>
              <label className="block text-xs font-semibold text-gray-700 mb-1">Paraf Owner (Tanda Tangan)</label>
              <div className="flex items-center gap-3 border border-gray-200 rounded p-2 bg-gray-50/50">
                {ownerParaf ? (
                  <div className="relative group">
                    <img 
                      src={ownerParaf} 
                      alt="Paraf Preview" 
                      className="h-16 w-16 object-contain bg-white border border-gray-200 rounded p-1"
                    />
                    <button
                      type="button"
                      onClick={() => setOwnerParaf('')}
                      className="absolute -top-1 -right-1 bg-red-600 hover:bg-red-700 text-white rounded-full h-4 w-4 flex items-center justify-center shadow-sm leading-none"
                      style={{ fontSize: '10px' }}
                      title="Hapus Paraf"
                    >
                      &times;
                    </button>
                  </div>
                ) : (
                  <div className="h-16 w-16 bg-gray-100 border border-dashed border-gray-300 rounded flex items-center justify-center text-xs text-gray-400 font-medium">
                    No Paraf
                  </div>
                )}
                <div className="flex-1">
                  <input
                    type="file"
                    accept="image/*"
                    onChange={(e) => {
                      const file = e.target.files?.[0]
                      if (file) handleImageUpload(file, setOwnerParaf)
                    }}
                    className="block w-full text-xs text-gray-500 file:mr-2 file:py-1 file:px-2 file:rounded file:border-0 file:text-xs file:font-semibold file:bg-gray-200 file:text-gray-700 hover:file:bg-gray-300"
                  />
                  <span className="text-[10px] text-gray-400 mt-1 block">PNG transparan disarankan</span>
                </div>
              </div>
            </div>
          </div>

          <div className="flex items-center gap-2 pt-2">
            <button onClick={handleSave} className="btn-primary text-sm px-4 py-2">
              Simpan Pengaturan
            </button>
            {saved && <span className="text-xs text-green-650 ml-2 font-medium">Tersimpan!</span>}
          </div>
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
              className="btn-primary text-sm px-4 py-2 bg-red-650 hover:bg-red-700"
            >
              Restore Database
            </button>
            <span className="text-xs text-gray-500">Pulihkan database dari file backup</span>
          </div>
          {restoreMsg && <p className="text-xs text-red-650 font-semibold">{restoreMsg}</p>}
        </div>
      </div>
    </div>
  )
}
