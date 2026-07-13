import React from 'react'

interface ReportFooterProps {
  activeReportHeader?: string
  activeCompanyName?: string
  activeCompanyLogo?: string
  activeOwnerParaf?: string
  activeOwnerName?: string
}

export function ReportFooter({
  activeReportHeader,
  activeCompanyName,
  activeCompanyLogo,
  activeOwnerParaf,
  activeOwnerName
}: ReportFooterProps): React.ReactElement {
  return (
    <div className="mt-8 flex justify-between items-start text-[8.5px] font-sans bg-white no-break-inside text-slate-950 w-full pl-2 pr-8 pt-4">
      {/* Kolom Kiri: Tanggal Cetak & Tanda Tangan Konsultan */}
      <div className="flex flex-col items-center justify-center text-center w-52 leading-tight">
        <div className="text-slate-400 font-medium mb-0.5">
          Jawa Timur, {new Date().toLocaleDateString('id-ID', { day: 'numeric', month: 'long', year: 'numeric' })}
        </div>
        <div className="font-bold uppercase text-slate-900">Dibuat Oleh:</div>
        <div className="font-semibold text-slate-500 uppercase tracking-wider text-[7.5px] mb-0.5">
          {activeReportHeader || 'KONSULTAN PERENCANA / KONTRAKTOR'}
        </div>
        <div className="font-extrabold text-[10px] text-slate-950 uppercase tracking-wide mb-1">
          {activeCompanyName || 'CV. KARYA MANDIRI'}
        </div>
        <div className="h-[50px] flex items-center justify-center my-1">
          {activeCompanyLogo ? (
            <img 
              src={activeCompanyLogo} 
              alt="Logo Perusahaan" 
              className="max-h-[48px] max-w-[120px] object-contain"
            />
          ) : (
            <div className="text-[7.5px] text-slate-300 italic">Tanda Tangan & Stempel</div>
          )}
        </div>
        <div className="font-bold underline uppercase text-slate-950 truncate w-full">
          {activeCompanyName || '...........................'}
        </div>
      </div>

      {/* Kolom Kanan: Tanda Tangan Owner */}
      <div className="flex flex-col items-center justify-center text-center w-52 leading-tight">
        <div className="text-slate-400 font-medium mb-0.5">&nbsp;</div>
        <div className="font-bold uppercase text-slate-900">Menyetujui,</div>
        <div className="font-semibold text-slate-500 uppercase tracking-wider text-[7.5px] mb-0.5">
          OWNER / PEMILIK PROYEK
        </div>
        <div className="font-bold uppercase mt-0.5 text-slate-900">Owner / Pemilik Proyek</div>
        <div className="h-[50px] flex items-center justify-center my-1">
          {activeOwnerParaf ? (
            <img 
              src={activeOwnerParaf} 
              alt="Paraf Owner" 
              className="max-h-[48px] max-w-[120px] object-contain"
            />
          ) : (
            <div className="text-[7.5px] text-slate-300 italic">Tanda Tangan / Paraf</div>
          )}
        </div>
        <div className="font-bold underline uppercase text-slate-950 truncate w-full">
          {activeOwnerName || '...........................'}
        </div>
      </div>
    </div>
  )
}
