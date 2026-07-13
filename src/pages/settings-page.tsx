import React, { useState, useEffect } from 'react'
import { useSettingsStore } from '../stores/settings-store'
import { Save, Database, ShieldAlert, Upload, X, Check, Settings } from 'lucide-react'

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
    if (ok) {
      setSaved(true)
      setTimeout(() => setSaved(false), 3000)
    }
  }

  const handleBackup = async () => {
    setBackupMsg('')
    setRestoreMsg('')
    const path = await backup()
    if (path) setBackupMsg(`Backup berhasil disimpan di: ${path}`)
    else setBackupMsg('Backup dibatalkan')
  }

  const handleRestore = async () => {
    if (!confirm('Yakin akan merestore database? Seluruh data proyek dan library saat ini akan digantikan oleh file backup.')) return
    setBackupMsg('')
    setRestoreMsg('')
    const path = await restore()
    if (path) {
      setRestoreMsg('Restore berhasil! Silakan muat ulang aplikasi.')
      await load()
    } else {
      setRestoreMsg('Restore dibatalkan')
    }
  }

  if (!settings && loading) {
    return <div className="text-center py-12 text-slate-500 font-medium select-none">Memuat pengaturan...</div>
  }

  return (
    <div className="max-w-4xl space-y-6">
      <div className="flex items-center gap-3 border-b border-slate-200/50 pb-4">
        <div className="w-10 h-10 rounded-xl bg-indigo-50 flex items-center justify-center text-primary-600 border border-indigo-100">
          <Settings className="w-5 h-5" />
        </div>
        <div>
          <h2 className="text-base font-extrabold text-slate-800 tracking-tight">Pengaturan Aplikasi</h2>
          <p className="text-xs text-slate-500 mt-0.5">Konfigurasi profil instansi, format lembar laporan, nilai pajak default, dan pemeliharaan database.</p>
        </div>
      </div>

      <div className="grid grid-cols-1 gap-6">
        {/* Profile Card */}
        <div className="card p-6 bg-white border border-slate-100 shadow-sm">
          <h3 className="text-sm font-bold text-slate-800 border-b border-slate-100 pb-3 mb-5 flex items-center gap-2">
            <span className="w-2 h-4 rounded bg-indigo-600 inline-block"></span>
            <span>Profil Perusahaan & Format Laporan</span>
          </h3>

          <div className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-xs font-bold text-slate-400 uppercase tracking-wider mb-1.5">Nama Perusahaan / Organisasi</label>
                <input
                  type="text"
                  value={companyName}
                  onChange={e => setCompanyName(e.target.value)}
                  className="input-field"
                  placeholder="Contoh: CV. Karya Mandiri Utama"
                />
              </div>
              <div>
                <label className="block text-xs font-bold text-slate-400 uppercase tracking-wider mb-1.5">Sub-Header Laporan (Perencana/Konsultan)</label>
                <input
                  type="text"
                  value={reportHeader}
                  onChange={e => setReportHeader(e.target.value)}
                  className="input-field"
                  placeholder="Contoh: KONSULTAN PERENCANA & ESTIMATOR"
                />
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-xs font-bold text-slate-400 uppercase tracking-wider mb-1.5">Nama Pemilik / Direktur (Penandatangan RAB)</label>
                <input
                  type="text"
                  value={ownerName}
                  onChange={e => setOwnerName(e.target.value)}
                  className="input-field"
                  placeholder="Contoh: Ir. H. Abimanyu, M.T."
                />
              </div>
              <div>
                <label className="block text-xs font-bold text-slate-400 uppercase tracking-wider mb-1.5">PPN Default (%)</label>
                <div className="relative w-36">
                  <input
                    type="number"
                    min="0"
                    max="100"
                    step="0.5"
                    value={ppnDefault}
                    onChange={e => setPpnDefault(e.target.value)}
                    className="input-field font-mono font-bold text-slate-700 pr-8"
                  />
                  <span className="absolute right-3 top-2 text-xs font-semibold text-slate-400 select-none">%</span>
                </div>
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6 border-t border-slate-100 pt-5 mt-3 select-none">
              {/* Logo Upload */}
              <div className="space-y-2">
                <label className="block text-xs font-bold text-slate-400 uppercase tracking-wider">Logo Instansi</label>
                <div className="flex items-center gap-4 border border-slate-150 rounded-xl p-3.5 bg-slate-50/50">
                  {companyLogo ? (
                    <div className="relative group">
                      <img 
                        src={companyLogo} 
                        alt="Logo Preview" 
                        className="h-16 w-16 object-contain bg-white border border-slate-200 rounded-lg p-1.5 shadow-sm"
                      />
                      <button
                        type="button"
                        onClick={() => setCompanyLogo('')}
                        className="absolute -top-1.5 -right-1.5 bg-red-600 hover:bg-red-700 text-white rounded-full h-5 w-5 flex items-center justify-center shadow-md leading-none border border-white"
                        title="Hapus Logo"
                      >
                        <X className="w-3 h-3" />
                      </button>
                    </div>
                  ) : (
                    <div className="h-16 w-16 bg-slate-100 border border-dashed border-slate-300 rounded-xl flex items-center justify-center text-xs text-slate-400 font-bold">
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
                      className="block w-full text-xs text-slate-500 file:mr-3 file:py-1.5 file:px-3 file:rounded-lg file:border-0 file:text-xs file:font-bold file:bg-indigo-50 file:text-indigo-700 hover:file:bg-indigo-100 file:cursor-pointer"
                    />
                    <span className="text-[10px] text-slate-400 mt-1.5 block">Format yang didukung: PNG, JPG, WEBP. Maks 1MB.</span>
                  </div>
                </div>
              </div>

              {/* Paraf Upload */}
              <div className="space-y-2">
                <label className="block text-xs font-bold text-slate-400 uppercase tracking-wider">Paraf / Tanda Tangan Direktur</label>
                <div className="flex items-center gap-4 border border-slate-150 rounded-xl p-3.5 bg-slate-50/50">
                  {ownerParaf ? (
                    <div className="relative group">
                      <img 
                        src={ownerParaf} 
                        alt="Paraf Preview" 
                        className="h-16 w-16 object-contain bg-white border border-slate-200 rounded-lg p-1.5 shadow-sm"
                      />
                      <button
                        type="button"
                        onClick={() => setOwnerParaf('')}
                        className="absolute -top-1.5 -right-1.5 bg-red-600 hover:bg-red-700 text-white rounded-full h-5 w-5 flex items-center justify-center shadow-md leading-none border border-white"
                        title="Hapus Paraf"
                      >
                        <X className="w-3 h-3" />
                      </button>
                    </div>
                  ) : (
                    <div className="h-16 w-16 bg-slate-100 border border-dashed border-slate-300 rounded-xl flex items-center justify-center text-xs text-slate-400 font-bold">
                      No Sign
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
                      className="block w-full text-xs text-slate-500 file:mr-3 file:py-1.5 file:px-3 file:rounded-lg file:border-0 file:text-xs file:font-bold file:bg-indigo-50 file:text-indigo-700 hover:file:bg-indigo-100 file:cursor-pointer"
                    />
                    <span className="text-[10px] text-slate-400 mt-1.5 block">Format PNG dengan background transparan disarankan.</span>
                  </div>
                </div>
              </div>
            </div>

            <div className="flex items-center gap-3 pt-4 border-t border-slate-100 mt-2 select-none">
              <button onClick={handleSave} className="btn-primary flex items-center gap-2">
                <Save className="w-4 h-4" />
                <span>Simpan Profil</span>
              </button>
              {saved && (
                <span className="text-xs text-emerald-600 font-bold flex items-center gap-1 bg-emerald-50 px-2.5 py-1.5 rounded-lg border border-emerald-100 animate-fade-in-down">
                  <Check className="w-3.5 h-3.5" />
                  <span>Pengaturan berhasil disimpan!</span>
                </span>
              )}
            </div>
          </div>
        </div>

        {/* Database Card */}
        <div className="card p-6 bg-white border border-slate-100 shadow-sm select-none">
          <h3 className="text-sm font-bold text-slate-800 border-b border-slate-100 pb-3 mb-5 flex items-center gap-2">
            <span className="w-2 h-4 rounded bg-indigo-600 inline-block"></span>
            <span>Pemeliharaan Database</span>
          </h3>
          
          <div className="space-y-5">
            <div className="flex flex-col md:flex-row items-start md:items-center justify-between border border-slate-150 rounded-xl p-4 bg-slate-50/40 gap-4">
              <div className="space-y-1">
                <div className="flex items-center gap-1.5 text-slate-700 font-bold text-xs uppercase tracking-wider">
                  <Database className="w-4 h-4 text-indigo-500" />
                  <span>Backup Database</span>
                </div>
                <p className="text-xs text-slate-400 font-medium">Buat salinan penuh database (.sqlite) untuk dicadangkan secara lokal.</p>
              </div>
              <button onClick={handleBackup} className="btn-secondary hover:bg-indigo-50 hover:text-indigo-700 hover:border-indigo-200 flex items-center gap-1.5 text-xs py-2">
                <span>Backup Database</span>
              </button>
            </div>
            {backupMsg && (
              <p className="text-xs text-slate-600 font-bold bg-slate-100 px-3 py-2 rounded-lg border border-slate-200">
                {backupMsg}
              </p>
            )}

            <div className="flex flex-col md:flex-row items-start md:items-center justify-between border border-red-150 rounded-xl p-4 bg-red-50/20 gap-4">
              <div className="space-y-1">
                <div className="flex items-center gap-1.5 text-red-700 font-bold text-xs uppercase tracking-wider">
                  <ShieldAlert className="w-4 h-4 text-red-500" />
                  <span>Restore Database</span>
                </div>
                <p className="text-xs text-slate-400 font-medium">Pulihkan database Anda dari file cadangan sebelumnya. Tindakan ini akan menimpa data saat ini.</p>
              </div>
              <button
                onClick={handleRestore}
                className="btn-primary bg-red-600 hover:bg-red-500 flex items-center gap-1.5 text-xs py-2 shadow-red-600/10"
              >
                <span>Restore Database</span>
              </button>
            </div>
            {restoreMsg && (
              <p className="text-xs text-red-600 font-extrabold bg-red-50/50 px-3 py-2 rounded-lg border border-red-100">
                ⚠️ {restoreMsg}
              </p>
            )}
          </div>
        </div>
      </div>
    </div>
  )
}
