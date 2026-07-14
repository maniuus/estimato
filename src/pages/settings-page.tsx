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
      <div className="flex items-center justify-between border-b border-[#EAEAEA] pb-5">
        <div>
          <h2 className="text-2xl font-bold text-[#111111] tracking-tight">Pengaturan Aplikasi</h2>
          <p className="text-xs text-[#787774] mt-1 font-sans">Konfigurasi profil instansi, format lembar laporan, nilai pajak default, dan pemeliharaan database.</p>
        </div>
      </div>

      <div className="grid grid-cols-1 gap-6">
        {/* Profile Card */}
        <div className="card p-6 bg-white border border-[#EAEAEA]">
          <h3 className="text-xs font-bold text-[#111111] border-b border-[#EAEAEA] pb-3 mb-5 uppercase tracking-wider">
            Profil Perusahaan & Format Laporan
          </h3>

          <div className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-xs font-bold text-[#787774] uppercase tracking-wider mb-1.5">Nama Perusahaan / Organisasi</label>
                <input
                  type="text"
                  value={companyName}
                  onChange={e => setCompanyName(e.target.value)}
                  className="input-field"
                  placeholder="Contoh: CV. Karya Mandiri Utama"
                />
              </div>
              <div>
                <label className="block text-xs font-bold text-[#787774] uppercase tracking-wider mb-1.5">Sub-Header Laporan (Perencana/Konsultan)</label>
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
                <label className="block text-xs font-bold text-[#787774] uppercase tracking-wider mb-1.5">Nama Pemilik / Direktur (Penandatangan RAB)</label>
                <input
                  type="text"
                  value={ownerName}
                  onChange={e => setOwnerName(e.target.value)}
                  className="input-field"
                  placeholder="Contoh: Ir. H. Abimanyu, M.T."
                />
              </div>
              <div>
                <label className="block text-xs font-bold text-[#787774] uppercase tracking-wider mb-1.5">PPN Default (%)</label>
                <div className="relative w-36">
                  <input
                    type="number"
                    min="0"
                    max="100"
                    step="0.5"
                    value={ppnDefault}
                    onChange={e => setPpnDefault(e.target.value)}
                    className="input-field font-mono font-bold text-[#111111] pr-8"
                  />
                  <span className="absolute right-3 top-2 text-xs font-semibold text-[#787774] select-none">%</span>
                </div>
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6 border-t border-[#EAEAEA] pt-5 mt-3 select-none">
              {/* Logo Upload */}
              <div className="space-y-2">
                <label className="block text-xs font-bold text-[#787774] uppercase tracking-wider">Logo Instansi</label>
                <div className="flex items-center gap-4 border border-dashed border-[#EAEAEA] rounded-md p-3.5 bg-[#FBFBFA]">
                  {companyLogo ? (
                    <div className="relative group">
                      <img 
                        src={companyLogo} 
                        alt="Logo Preview" 
                        className="h-16 w-16 object-contain bg-white border border-[#EAEAEA] rounded p-1.5"
                      />
                      <button
                        type="button"
                        onClick={() => setCompanyLogo('')}
                        className="absolute -top-1.5 -right-1.5 bg-red-655 hover:bg-[#9F2F2D] text-white rounded-full h-5 w-5 flex items-center justify-center shadow-md leading-none border border-white"
                        title="Hapus Logo"
                      >
                        <X className="w-3 h-3" />
                      </button>
                    </div>
                  ) : (
                    <div className="h-16 w-16 bg-white border border-dashed border-[#EAEAEA] rounded flex items-center justify-center text-[10px] text-[#787774] font-bold">
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
                      className="block w-full text-xs text-slate-500 file:mr-3 file:py-1 file:px-2.5 file:rounded-md file:border file:border-[#EAEAEA] file:text-[10px] file:font-bold file:bg-[#111111] file:text-white hover:file:bg-[#2F3437] file:cursor-pointer"
                    />
                    <span className="text-[9px] text-[#787774] mt-1.5 block">Format yang didukung: PNG, JPG, WEBP. Maks 1MB.</span>
                  </div>
                </div>
              </div>

              {/* Paraf Upload */}
              <div className="space-y-2">
                <label className="block text-xs font-bold text-[#787774] uppercase tracking-wider">Paraf / Tanda Tangan Direktur</label>
                <div className="flex items-center gap-4 border border-dashed border-[#EAEAEA] rounded-md p-3.5 bg-[#FBFBFA]">
                  {ownerParaf ? (
                    <div className="relative group">
                      <img 
                        src={ownerParaf} 
                        alt="Paraf Preview" 
                        className="h-16 w-16 object-contain bg-white border border-[#EAEAEA] rounded p-1.5"
                      />
                      <button
                        type="button"
                        onClick={() => setOwnerParaf('')}
                        className="absolute -top-1.5 -right-1.5 bg-red-655 hover:bg-[#9F2F2D] text-white rounded-full h-5 w-5 flex items-center justify-center shadow-md leading-none border border-white"
                        title="Hapus Paraf"
                      >
                        <X className="w-3 h-3" />
                      </button>
                    </div>
                  ) : (
                    <div className="h-16 w-16 bg-white border border-dashed border-[#EAEAEA] rounded flex items-center justify-center text-[10px] text-[#787774] font-bold">
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
                      className="block w-full text-xs text-slate-500 file:mr-3 file:py-1 file:px-2.5 file:rounded-md file:border file:border-[#EAEAEA] file:text-[10px] file:font-bold file:bg-[#111111] file:text-white hover:file:bg-[#2F3437] file:cursor-pointer"
                    />
                    <span className="text-[9px] text-[#787774] mt-1.5 block">Format PNG dengan background transparan disarankan.</span>
                  </div>
                </div>
              </div>
            </div>

            <div className="flex items-center gap-3 pt-4 border-t border-[#EAEAEA] mt-2 select-none">
              <button onClick={handleSave} className="btn-primary flex items-center gap-2">
                <Save className="w-4 h-4" />
                <span>Simpan Profil</span>
              </button>
              {saved && (
                <span className="text-xs text-[#346538] font-bold flex items-center gap-1 bg-[#EDF3EC] px-2.5 py-1.5 rounded border border-[#EDF3EC] animate-fade-in-down">
                  <Check className="w-3.5 h-3.5" />
                  <span>Pengaturan berhasil disimpan!</span>
                </span>
              )}
            </div>
          </div>
        </div>

        {/* Database Card */}
        <div className="card p-6 bg-white border border-[#EAEAEA] select-none">
          <h3 className="text-xs font-bold text-[#111111] border-b border-[#EAEAEA] pb-3 mb-5 uppercase tracking-wider">
            Pemeliharaan Database
          </h3>
          
          <div className="space-y-5">
            <div className="flex flex-col md:flex-row items-start md:items-center justify-between border border-[#EAEAEA] rounded-md p-4 bg-white gap-4">
              <div className="space-y-1">
                <div className="flex items-center gap-1.5 text-[#111111] font-bold text-xs uppercase tracking-wider">
                  <Database className="w-4 h-4 text-[#787774]" />
                  <span>Backup Database</span>
                </div>
                <p className="text-xs text-[#787774] font-medium">Buat salinan penuh database (.sqlite) untuk dicadangkan secara lokal.</p>
              </div>
              <button onClick={handleBackup} className="btn-secondary flex items-center gap-1.5 text-xs py-2">
                <span>Backup Database</span>
              </button>
            </div>
            {backupMsg && (
              <p className="text-xs text-[#111111] font-bold bg-[#F7F6F3] px-3 py-2 rounded border border-[#EAEAEA]">
                {backupMsg}
              </p>
            )}

            <div className="flex flex-col md:flex-row items-start md:items-center justify-between border border-[#FDEBEC] rounded-md p-4 bg-[#FDEBEC]/25 gap-4">
              <div className="space-y-1">
                <div className="flex items-center gap-1.5 text-[#9F2F2D] font-bold text-xs uppercase tracking-wider">
                  <ShieldAlert className="w-4 h-4 text-[#9F2F2D]" />
                  <span>Restore Database</span>
                </div>
                <p className="text-xs text-[#9F2F2D]/80 font-medium">Pulihkan database Anda dari file cadangan sebelumnya. Tindakan ini akan menimpa data saat ini.</p>
              </div>
              <button
                onClick={handleRestore}
                className="btn-primary bg-[#9F2F2D] hover:bg-[#B73B39] flex items-center gap-1.5 text-xs py-2 shadow-none"
              >
                <span>Restore Database</span>
              </button>
            </div>
            {restoreMsg && (
              <p className="text-xs text-[#9F2F2D] font-extrabold bg-[#FDEBEC] px-3 py-2 rounded border border-[#FDEBEC]">
                ⚠️ {restoreMsg}
              </p>
            )}
          </div>
        </div>
      </div>
    </div>
  )
}
