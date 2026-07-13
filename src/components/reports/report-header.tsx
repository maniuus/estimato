import React from 'react'
import type { Project } from '../../types/models'

interface ReportHeaderProps {
  title: string
  project?: Project
  activeCompanyLogo?: string
  activeCompanyName?: string
  activeReportHeader?: string
}

export function ReportHeader({
  title,
  project,
  activeCompanyLogo,
  activeCompanyName,
  activeReportHeader
}: ReportHeaderProps): React.ReactElement {
  return (
    <div className="mb-4 text-[9.5px] font-sans bg-white no-break-inside text-slate-950 w-full">
      {/* ROW 1: Logo and Company Info / Document Title */}
      <div className="flex items-center justify-between pb-1.5">
        {/* Logo Perusahaan */}
        <div className="w-[80px] p-1 flex items-center justify-start bg-white">
          {activeCompanyLogo ? (
            <img 
              src={activeCompanyLogo} 
              alt="Logo" 
              className="max-h-[48px] max-w-[80px] object-contain"
            />
          ) : (
            <div className="text-[8px] font-bold text-slate-300 uppercase leading-tight">
              {activeCompanyName || 'LOGO'}
            </div>
          )}
        </div>

        {/* Nama Perusahaan & Judul Laporan */}
        <div className="flex-1 p-1 flex flex-col justify-center items-center text-center bg-white leading-tight">
          <div className="font-extrabold text-[12px] text-slate-950 uppercase tracking-wide">
            {activeCompanyName || 'CV. KARYA MANDIRI'}
          </div>
          <div className="text-[7.5px] text-slate-500 font-semibold uppercase tracking-wider mb-0.5">
            {activeReportHeader || 'KONSULTAN PERENCANA / KONTRAKTOR'}
          </div>
          <div className="font-black text-[12.5px] text-slate-950 uppercase tracking-wider">
            {title}
          </div>
        </div>

        {/* Spacer to keep center alignment perfect */}
        <div className="w-[80px] p-1"></div>
      </div>

      {/* Thick line separator typical of Kop Surat */}
      <div className="border-b-[1.5px] border-slate-900 mb-2.5 w-full"></div>

      {/* ROW 2: Project Details (Stacked - Left Aligned) */}
      <div className="pb-2 flex flex-col items-start justify-center text-[9px] w-full space-y-0.5 leading-normal pl-1">
        <div>
          <span className="font-bold text-slate-400 uppercase mr-1">Proyek:</span> 
          <span className="font-bold text-slate-900 uppercase">{project?.name}</span>
        </div>
        <div>
          <span className="font-bold text-slate-400 uppercase mr-1">Lokasi:</span> 
          <span className="font-bold text-slate-700 uppercase">{project?.location}</span>
        </div>
        <div>
          <span className="font-bold text-slate-400 uppercase mr-1">Tahun:</span> 
          <span className="font-bold text-slate-700 font-mono">{project?.year}</span>
        </div>
        <div>
          <span className="font-bold text-slate-400 uppercase mr-1">No. Proyek:</span> 
          <span className="font-bold text-slate-700 font-mono">{project?.projectNumber || '-'}</span>
        </div>
      </div>
    </div>
  )
}
