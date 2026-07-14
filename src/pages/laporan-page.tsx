import React, { useState } from 'react'
import { formatCurrency, getTerbilang } from '../lib/format'
import { useLaporanData } from '../hooks/use-laporan-data'
import { useLaporanExport } from '../hooks/use-laporan-export'
import { useProjectStore } from '../stores/project-store'

// Import modular report components
import { RekapReport } from '../components/reports/rekap-report'
import { RabReport } from '../components/reports/rab-report'
import { SCurveReport } from '../components/reports/scurve-report'
import { AnalisaReport } from '../components/reports/analisa-report'
import { BomReport } from '../components/reports/bom-report'
import { BackupReport } from '../components/reports/backup-report'

import { parseFormulaToText } from '../components/volume-calculator/helpers'
import { Printer, Download, FileSpreadsheet, FileText, ClipboardList, TrendingUp, BarChart2, ShieldAlert, FileJson } from 'lucide-react'

interface LaporanPageProps {
  projectId: string
}

export function LaporanPage({ projectId }: LaporanPageProps): React.ReactElement {
  const {
    project,
    calculation,
    wbsItems,
    volumes,
    ahsList,
    detailedAhsList,
    bomItems,
    loadingDetails,
    durationWeeks,
    setDurationWeeks,
    categorySchedules,
    setCategorySchedules,
    getGroupSubtotal,
    rekapCategories,
    ppn,
    overhead,
    settings,
    projectVolumes
  } = useLaporanData(projectId)

  const {
    exporting,
    exportingPdf,
    handleExportExcel,
    handleExportPdf,
    handlePrint
  } = useLaporanExport({
    project,
    calculation,
    wbsItems,
    volumes,
    ahsList,
    detailedAhsList,
    bomItems,
    ppn,
    overhead,
    getGroupSubtotal
  })

  const { exportProject } = useProjectStore()

  const [previewTab, setPreviewTab] = useState<'rekap' | 'rab' | 'analisa' | 'bom' | 'backup' | 'analisis_kurvas'>('rekap')

  if (!calculation || calculation.lineItems.length === 0) {
    return (
      <div className="card p-8 text-center text-slate-400 font-medium italic text-sm">
        Belum ada laporan yang dapat ditampilkan. Silakan buat pekerjaan dan isi volume pada tab Input RAB terlebih dahulu.
      </div>
    )
  }

  const totalPrice = calculation.totalPrice
  const ppnAmount = calculation.ppnAmount
  const overheadAmount = calculation.overheadAmount
  const grandTotal = calculation.grandTotal
  const roundedGrandTotal = Math.round(grandTotal / 1000) * 1000

  const activeCompanyLogo = project?.companyLogo || settings?.companyLogo || ''
  const activeCompanyName = project?.companyName || settings?.companyName || ''
  const activeReportHeader = project?.reportHeader || settings?.reportHeader || ''
  const activeOwnerName = project?.ownerName || settings?.ownerName || ''
  const activeOwnerParaf = project?.ownerParaf || settings?.ownerParaf || ''

  const reportTabs: { id: typeof previewTab; label: string; icon: React.ComponentType<{ className?: string }> }[] = [
    { id: 'rekap', label: 'Rekapitulasi', icon: ClipboardList },
    { id: 'rab', label: 'RAB Proyek', icon: FileSpreadsheet },
    { id: 'analisa', label: 'Analisa AHS', icon: FileText },
    { id: 'bom', label: 'Bill of Material', icon: BarChart2 },
    { id: 'backup', label: 'Backup Volume', icon: FileText },
    { id: 'analisis_kurvas', label: 'Kurva S & Jadwal', icon: TrendingUp }
  ]

  const handleExportJson = async () => {
    const success = await exportProject(projectId)
    if (success) {
      alert('Proyek berhasil disimpan ke file lokal.')
    }
  }

  return (
    <div className="space-y-6">
      {/* Action Header */}
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center bg-white p-5 rounded-xl border border-slate-100 gap-4 shadow-sm no-print select-none">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-indigo-50 flex items-center justify-center text-primary-600 border border-indigo-100">
            <Printer className="w-5 h-5" />
          </div>
          <div>
            <span className="text-[10px] text-slate-400 font-bold block uppercase tracking-wider">MODUL EKSPOR & CETAK</span>
            <h3 className="text-base font-extrabold text-slate-800 tracking-tight">Cetak Dokumen Laporan & Format Excel</h3>
          </div>
        </div>
        <div className="flex gap-2">
          <button 
            onClick={handleExportJson}
            className="flex items-center gap-1.5 px-3 py-1.5 border border-[#EAEAEA] bg-white text-[#111111] rounded-lg text-xs font-bold hover:bg-[#F5F5F5] transition-all"
          >
            <FileJson className="w-3.5 h-3.5 text-blue-600" />
            <span>Save to Local (JSON)</span>
          </button>
          <button 
            onClick={handlePrint} 
            className="btn-secondary text-xs px-3.5 py-2 flex items-center gap-1.5"
          >
            <Printer className="w-3.5 h-3.5 text-slate-500" />
            <span>Cetak PDF</span>
          </button>
          <button 
            onClick={handleExportPdf}
            disabled={exportingPdf}
            className="btn-primary bg-red-600 hover:bg-red-500 shadow-red-600/10 text-xs px-3.5 py-2 flex items-center gap-1.5"
          >
            <Download className="w-3.5 h-3.5" />
            <span>{exportingPdf ? 'Mengekspor...' : 'Ekspor PDF'}</span>
          </button>
          <button 
            onClick={handleExportExcel} 
            disabled={exporting}
            className="btn-primary bg-emerald-600 hover:bg-emerald-500 shadow-emerald-600/10 text-xs px-3.5 py-2 flex items-center gap-1.5"
          >
            <FileSpreadsheet className="w-3.5 h-3.5" />
            <span>{exporting ? 'Mengekspor...' : 'Ekspor Excel'}</span>
          </button>
        </div>
      </div>

      {/* Screen Preview Tabs */}
      <div className="space-y-4 no-print select-none">
        <div className="flex gap-1.5 bg-slate-100/80 p-1 rounded-xl w-fit border border-slate-200/30">
          {reportTabs.map(t => {
            const Icon = t.icon
            const isSelected = previewTab === t.id
            return (
              <button 
                key={t.id}
                onClick={() => setPreviewTab(t.id)}
                className={`flex items-center gap-2 px-4 py-2 rounded-lg text-xs font-bold tracking-wide transition-all duration-200 ${
                  isSelected
                    ? 'bg-white shadow-sm text-primary-600'
                    : 'text-slate-500 hover:text-slate-800 hover:bg-white/40'
                }`}
              >
                <Icon className="w-3.5 h-3.5" />
                <span>{t.label}</span>
              </button>
            )
          })}
        </div>

        {/* Tab Previews */}
        <div className="bg-white rounded-xl border border-slate-100 shadow-sm overflow-hidden p-6">
          {previewTab === 'rekap' && (
            <RekapReport
              project={project}
              rekapCategories={rekapCategories}
              totalPrice={totalPrice}
              ppn={ppn}
              ppnAmount={ppnAmount}
              overhead={overhead}
              overheadAmount={overheadAmount}
              grandTotal={grandTotal}
              roundedGrandTotal={roundedGrandTotal}
              getGroupSubtotal={getGroupSubtotal}
            />
          )}

          {previewTab === 'rab' && (
            <RabReport
              project={project}
              wbsItems={wbsItems}
              volumes={volumes}
              ahsList={ahsList}
              calculation={calculation}
              totalPrice={totalPrice}
              ppn={ppn}
              ppnAmount={ppnAmount}
              overhead={overhead}
              overheadAmount={overheadAmount}
              grandTotal={grandTotal}
              roundedGrandTotal={roundedGrandTotal}
              getGroupSubtotal={getGroupSubtotal}
              projectVolumes={projectVolumes}
            />
          )}

          {previewTab === 'analisa' && (
            <AnalisaReport
              project={project}
              detailedAhsList={detailedAhsList}
              overhead={overhead}
            />
          )}

          {previewTab === 'bom' && (
            <BomReport
              project={project}
              bomItems={bomItems}
            />
          )}

          {previewTab === 'backup' && (
            <BackupReport
              project={project}
              wbsItems={wbsItems}
              volumes={volumes}
              projectVolumes={projectVolumes}
              parseFormulaToText={parseFormulaToText}
            />
          )}

          {previewTab === 'analisis_kurvas' && (
            <SCurveReport
              project={project}
              rekapCategories={rekapCategories}
              totalPrice={totalPrice}
              durationWeeks={durationWeeks}
              setDurationWeeks={setDurationWeeks}
              categorySchedules={categorySchedules}
              setCategorySchedules={setCategorySchedules}
              getGroupSubtotal={getGroupSubtotal}
            />
          )}
        </div>
      </div>

      {/* PRINT-ONLY COMPILATION WORKBOOK LAYOUT */}
      <div className="print-only hidden space-y-10 text-slate-800 font-sans leading-relaxed text-[9.5px]">
        <RekapReport
          isPrint={true}
          project={project}
          rekapCategories={rekapCategories}
          totalPrice={totalPrice}
          ppn={ppn}
          ppnAmount={ppnAmount}
          overhead={overhead}
          overheadAmount={overheadAmount}
          grandTotal={grandTotal}
          roundedGrandTotal={roundedGrandTotal}
          activeCompanyLogo={activeCompanyLogo}
          activeCompanyName={activeCompanyName}
          activeReportHeader={activeReportHeader}
          activeOwnerParaf={activeOwnerParaf}
          activeOwnerName={activeOwnerName}
          getGroupSubtotal={getGroupSubtotal}
        />

        <RabReport
          isPrint={true}
          project={project}
          wbsItems={wbsItems}
          volumes={volumes}
          ahsList={ahsList}
          calculation={calculation}
          totalPrice={totalPrice}
          ppn={ppn}
          ppnAmount={ppnAmount}
          overhead={overhead}
          overheadAmount={overheadAmount}
          grandTotal={grandTotal}
          roundedGrandTotal={roundedGrandTotal}
          activeCompanyLogo={activeCompanyLogo}
          activeCompanyName={activeCompanyName}
          activeReportHeader={activeReportHeader}
          activeOwnerParaf={activeOwnerParaf}
          activeOwnerName={activeOwnerName}
          getGroupSubtotal={getGroupSubtotal}
          projectVolumes={projectVolumes}
        />

        <SCurveReport
          isPrint={true}
          project={project}
          rekapCategories={rekapCategories}
          totalPrice={totalPrice}
          durationWeeks={durationWeeks}
          setDurationWeeks={setDurationWeeks}
          categorySchedules={categorySchedules}
          setCategorySchedules={setCategorySchedules}
          getGroupSubtotal={getGroupSubtotal}
          activeCompanyLogo={activeCompanyLogo}
          activeCompanyName={activeCompanyName}
          activeReportHeader={activeReportHeader}
          activeOwnerParaf={activeOwnerParaf}
          activeOwnerName={activeOwnerName}
        />

        <AnalisaReport
          isPrint={true}
          project={project}
          detailedAhsList={detailedAhsList}
          overhead={overhead}
          activeCompanyLogo={activeCompanyLogo}
          activeCompanyName={activeCompanyName}
          activeReportHeader={activeReportHeader}
          activeOwnerParaf={activeOwnerParaf}
          activeOwnerName={activeOwnerName}
        />

        <BomReport
          isPrint={true}
          project={project}
          bomItems={bomItems}
          activeCompanyLogo={activeCompanyLogo}
          activeCompanyName={activeCompanyName}
          activeReportHeader={activeReportHeader}
          activeOwnerParaf={activeOwnerParaf}
          activeOwnerName={activeOwnerName}
        />

        <BackupReport
          isPrint={true}
          project={project}
          wbsItems={wbsItems}
          volumes={volumes}
          projectVolumes={projectVolumes}
          parseFormulaToText={parseFormulaToText}
          activeCompanyLogo={activeCompanyLogo}
          activeCompanyName={activeCompanyName}
          activeReportHeader={activeReportHeader}
          activeOwnerParaf={activeOwnerParaf}
          activeOwnerName={activeOwnerName}
        />
      </div>

      {/* Global CSS styles for Print styling */}
      <style dangerouslySetInnerHTML={{__html: `
        @media print {
          body {
            background-color: white !important;
            color: #0f172a !important;
          }
          @page {
            size: A4 portrait;
            margin: 15mm 12mm 15mm 15mm;
          }
          .print-page {
            page-break-inside: avoid !important;
            page-break-after: always !important;
            break-after: page !important;
            padding: 0 !important;
            margin: 0 !important;
          }
          .no-print {
            display: none !important;
          }
          .print-only {
            display: block !important;
          }
          /* Custom layout overrides for print */
          .card {
            border: none !important;
            box-shadow: none !important;
            padding: 0 !important;
            margin: 0 !important;
          }
          /* Force all table cells and rows to have a solid white background only */
          table, thead, tbody, tr, th, td {
            background-color: white !important;
            background: white !important;
          }
          /* Force compact padding and height on all tables during print */
          table th, table td {
            padding-top: 3px !important;
            padding-bottom: 3px !important;
            line-height: 1.15 !important;
          }
        }
      `}} />
    </div>
  )
}
