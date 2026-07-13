import React from 'react'
import type { Project, WbsItem } from '../../types/models'
import { formatCurrency, getTerbilang } from '../../lib/format'
import { ReportHeader } from './report-header'
import { ReportFooter } from './report-footer'

interface RekapReportProps {
  project?: Project
  rekapCategories: WbsItem[]
  totalPrice: number
  ppn: number
  ppnAmount: number
  overhead: number
  overheadAmount: number
  grandTotal: number
  roundedGrandTotal: number
  isPrint?: boolean
  activeCompanyLogo?: string
  activeCompanyName?: string
  activeReportHeader?: string
  activeOwnerParaf?: string
  activeOwnerName?: string
  getGroupSubtotal: (path: string) => number
}

export function RekapReport({
  project,
  rekapCategories,
  totalPrice,
  ppn,
  ppnAmount,
  overhead,
  overheadAmount,
  grandTotal,
  roundedGrandTotal,
  isPrint = false,
  activeCompanyLogo,
  activeCompanyName,
  activeReportHeader,
  activeOwnerParaf,
  activeOwnerName,
  getGroupSubtotal
}: RekapReportProps): React.ReactElement {
  if (isPrint) {
    return (
      <section className="print-page border-b border-slate-200 pb-8">
        <ReportHeader
          title="REKAPITULASI RENCANA ANGGARAN BIAYA"
          project={project}
          activeCompanyLogo={activeCompanyLogo}
          activeCompanyName={activeCompanyName}
          activeReportHeader={activeReportHeader}
        />
        <table className="w-full border-collapse border border-slate-300 text-[9.5px] font-sans">
          <thead>
            <tr className="border-b-2 border-slate-900 text-[9px] font-bold uppercase tracking-wider text-slate-950 bg-white">
              <th className="border border-slate-300 py-2 px-1.5 text-center align-middle w-16 font-bold">No</th>
              <th className="border border-slate-300 py-2 px-1.5 text-center align-middle font-bold">Kategori Pekerjaan</th>
              <th className="border border-slate-300 py-2 px-1.5 text-center align-middle w-40 font-bold">Jumlah Biaya (Rp)</th>
            </tr>
          </thead>
          <tbody>
            {rekapCategories.map((cat, index) => {
              const catTotal = getGroupSubtotal(cat.wbsPath)
              return (
                <tr key={cat.id} className="bg-white">
                  <td className="border border-slate-300 py-1.5 px-1.5 text-center font-mono text-[9px] text-slate-500">{index + 1}</td>
                  <td className="border border-slate-300 py-1.5 px-1.5 font-bold text-slate-950 uppercase text-[9px] tracking-wide">{cat.name}</td>
                  <td className="border border-slate-300 py-1.5 px-1.5 text-right font-mono font-semibold text-slate-800 text-[9.5px]">{formatCurrency(catTotal)}</td>
                </tr>
              )
            })}
            <tr className="font-semibold border-t border-slate-300 bg-white">
              <td colSpan={2} className="border border-slate-300 py-1.5 px-1.5 text-right uppercase text-[8.5px] tracking-wider text-slate-400">Jumlah Subtotal Pekerjaan:</td>
              <td className="border border-slate-300 py-1.5 px-1.5 text-right font-mono text-slate-700 text-[9.5px]">{formatCurrency(totalPrice)}</td>
            </tr>
            <tr className="font-semibold bg-white">
              <td colSpan={2} className="border border-slate-300 py-1.5 px-1.5 text-right uppercase text-[8.5px] tracking-wider text-slate-400">PPN ({ppn}%):</td>
              <td className="border border-slate-300 py-1.5 px-1.5 text-right font-mono text-slate-700 text-[9.5px]">{formatCurrency(ppnAmount)}</td>
            </tr>
            <tr className="font-semibold bg-white">
              <td colSpan={2} className="border border-slate-300 py-1.5 px-1.5 text-right uppercase text-[8.5px] tracking-wider text-slate-400">Overhead & Profit ({overhead}%):</td>
              <td className="border border-slate-300 py-1.5 px-1.5 text-right font-mono text-slate-700 text-[9.5px]">{formatCurrency(overheadAmount)}</td>
            </tr>
            <tr className="font-semibold bg-white">
              <td colSpan={2} className="border border-slate-300 py-1.5 px-1.5 text-right uppercase text-[8.5px] tracking-wider text-slate-400">Grand Total RAB:</td>
              <td className="border border-slate-300 py-1.5 px-1.5 text-right font-mono text-slate-700 text-[9.5px]">{formatCurrency(grandTotal)}</td>
            </tr>
            <tr className="font-semibold bg-white">
              <td colSpan={2} className="border border-slate-300 py-1.5 px-1.5 text-right uppercase text-[8.5px] tracking-wider text-slate-400">Pembulatan:</td>
              <td className="border border-slate-300 py-1.5 px-1.5 text-right font-mono text-slate-700 text-[9.5px]">{formatCurrency(roundedGrandTotal - grandTotal)}</td>
            </tr>
            <tr className="font-bold bg-white border-t border-slate-900 border-b-double border-b-[3px] border-b-slate-950">
              <td colSpan={2} className="border border-slate-300 py-2 px-1.5 text-right uppercase tracking-wider text-[9px] text-slate-950">Grand Total Dibulatkan:</td>
              <td className="border border-slate-300 py-2 px-1.5 text-right font-mono text-slate-950 font-extrabold text-[11px]">{formatCurrency(roundedGrandTotal)}</td>
            </tr>
            <tr className="bg-white">
              <td colSpan={3} className="border border-slate-300 py-2 px-2.5 text-left font-sans text-[9px]">
                <span className="font-bold text-slate-950 uppercase tracking-wider text-[8px]">Terbilang:</span>{" "}
                <span className="italic font-semibold text-slate-950 capitalize ml-1">{getTerbilang(roundedGrandTotal)}</span>
              </td>
            </tr>
          </tbody>
        </table>
        <ReportFooter
          activeReportHeader={activeReportHeader}
          activeCompanyName={activeCompanyName}
          activeCompanyLogo={activeCompanyLogo}
          activeOwnerParaf={activeOwnerParaf}
          activeOwnerName={activeOwnerName}
        />
      </section>
    )
  }

  return (
    <div className="space-y-4">
      <div className="text-center border-b border-gray-100 pb-4">
        <h2 className="text-xl font-bold text-gray-900 tracking-wide font-sans">REKAPITULASI RENCANA ANGGARAN BIAYA</h2>
        <p className="text-sm text-gray-600 mt-1">{project?.name} &bull; {project?.location}</p>
      </div>
      <table className="w-full text-sm">
        <thead>
          <tr className="bg-gray-50 border-b border-gray-200">
            <th className="table-header w-16 text-center">No</th>
            <th className="table-header text-left">Kategori Pekerjaan</th>
            <th className="table-header w-48 text-right">Jumlah Biaya</th>
          </tr>
        </thead>
        <tbody className="divide-y divide-gray-100">
          {rekapCategories.map((cat, index) => {
            const catTotal = getGroupSubtotal(cat.wbsPath)
            return (
              <tr key={cat.id}>
                <td className="table-cell text-center font-mono text-xs">{index + 1}</td>
                <td className="table-cell font-semibold text-gray-800 uppercase text-xs tracking-wide">{cat.name}</td>
                <td className="table-cell text-right font-mono font-bold text-gray-900">{formatCurrency(catTotal)}</td>
              </tr>
            )
          })}
        </tbody>
      </table>
      <div className="border-t border-gray-200 pt-4 space-y-4">
        <div className="flex justify-end">
          <div className="w-80 space-y-1 text-sm font-sans">
            <div className="flex justify-between text-gray-500">
              <span>Subtotal Pekerjaan:</span>
              <span className="font-mono font-medium">{formatCurrency(totalPrice)}</span>
            </div>
            <div className="flex justify-between text-gray-500">
              <span>PPN ({ppn}%):</span>
              <span className="font-mono">{formatCurrency(ppnAmount)}</span>
            </div>
            <div className="flex justify-between text-gray-500">
              <span>Overhead ({overhead}%):</span>
              <span className="font-mono">{formatCurrency(overheadAmount)}</span>
            </div>
            <div className="flex justify-between text-gray-500">
              <span>Grand Total RAB:</span>
              <span className="font-mono">{formatCurrency(grandTotal)}</span>
            </div>
            <div className="flex justify-between text-gray-400 text-xs">
              <span>Pembulatan:</span>
              <span className="font-mono">{formatCurrency(roundedGrandTotal - grandTotal)}</span>
            </div>
            <hr className="border-gray-200 my-1" />
            <div className="flex justify-between font-extrabold text-primary-800 text-base">
              <span>Grand Total Dibulatkan:</span>
              <span className="font-mono">{formatCurrency(roundedGrandTotal)}</span>
            </div>
          </div>
        </div>

        {/* Spelled-out (Terbilang) Note */}
        <div className="bg-slate-50 border border-slate-200 rounded-lg p-3 text-sm">
          <span className="font-bold text-slate-800 uppercase text-xs tracking-wider">Terbilang:</span>{" "}
          <span className="italic font-semibold text-primary-800 capitalize ml-1">
            {getTerbilang(roundedGrandTotal)}
          </span>
        </div>
      </div>
    </div>
  )
}
