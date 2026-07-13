import React from 'react'
import type { Project } from '../../types/models'
import { formatCurrency } from '../../lib/format'
import { ReportHeader } from './report-header'
import { ReportFooter } from './report-footer'

interface BomItem {
  id: string
  category: 'Bahan' | 'Tenaga Kerja' | 'Alat'
  name: string
  unit: string
  quantity: number
  unitPrice: number
  totalPrice: number
}

interface BomReportProps {
  project?: Project
  bomItems: BomItem[]
  isPrint?: boolean
  activeCompanyLogo?: string
  activeCompanyName?: string
  activeReportHeader?: string
  activeOwnerParaf?: string
  activeOwnerName?: string
}

export function BomReport({
  project,
  bomItems,
  isPrint = false,
  activeCompanyLogo,
  activeCompanyName,
  activeReportHeader,
  activeOwnerParaf,
  activeOwnerName
}: BomReportProps): React.ReactElement {
  const totalBomCost = bomItems.reduce((s, i) => s + i.totalPrice, 0)

  if (isPrint) {
    return (
      <section className="print-page border-b border-slate-200 pb-8" style={{ pageBreakBefore: 'always' }}>
        <ReportHeader
          title="BILL OF MATERIAL (BOM) REKAPITULASI"
          project={project}
          activeCompanyLogo={activeCompanyLogo}
          activeCompanyName={activeCompanyName}
          activeReportHeader={activeReportHeader}
        />
        <table className="w-full border-collapse border border-slate-300 text-[9.5px] font-sans">
          <thead>
            <tr className="border-b-2 border-slate-900 text-[9px] font-bold uppercase tracking-wider text-slate-950 bg-white">
              <th className="border border-slate-300 py-2 px-1.5 text-center align-middle w-10 font-bold">No</th>
              <th className="border border-slate-300 py-2 px-1.5 text-center align-middle font-bold">Deskripsi Komponen</th>
              <th className="border border-slate-300 py-2 px-1.5 text-center align-middle w-16 font-bold">Satuan</th>
              <th className="border border-slate-300 py-2 px-1.5 text-center align-middle w-28 font-bold">Total Kebutuhan</th>
              <th className="border border-slate-300 py-2 px-1.5 text-center align-middle w-32 font-bold">Harga Satuan (Rp)</th>
              <th className="border border-slate-300 py-2 px-1.5 text-center align-middle w-36 font-bold">Jumlah Biaya (Rp)</th>
            </tr>
          </thead>
          <tbody>
            {(['Bahan', 'Tenaga Kerja', 'Alat'] as const).map((cat, catIdx) => {
              const items = bomItems.filter(item => item.category === cat)
              if (items.length === 0) return null
              const catSubtotal = items.reduce((s, i) => s + i.totalPrice, 0)
              const letterCode = String.fromCharCode(65 + catIdx)

              return (
                <React.Fragment key={cat}>
                  {/* Category Divider Header Row */}
                  <tr className="bg-white font-bold text-slate-950 border-b border-slate-300">
                    <td className="border border-slate-300 py-1.5 px-1.5 text-center font-mono text-[10px]">{letterCode}</td>
                    <td colSpan={5} className="border border-slate-300 py-1.5 px-1.5 uppercase text-[9px] tracking-wide">
                      {cat === 'Alat' ? 'Peralatan / Alat' : cat}
                    </td>
                  </tr>
                  {/* Line items for this category */}
                  {items.map((item, idx) => (
                    <tr key={item.id} className="bg-white">
                      <td className="border border-slate-300 py-1.5 px-1.5 text-center font-mono text-[9px] text-slate-400">{idx + 1}</td>
                      <td className="border border-slate-300 py-1.5 px-1.5 text-slate-800 font-normal leading-tight">{item.name}</td>
                      <td className="border border-slate-300 py-1.5 px-1.5 text-center font-medium text-slate-500">{item.unit}</td>
                      <td className="border border-slate-300 py-1.5 px-1.5 text-right font-mono">{item.quantity.toFixed(4)}</td>
                      <td className="border border-slate-300 py-1.5 px-1.5 text-right font-mono text-slate-500">{formatCurrency(item.unitPrice)}</td>
                      <td className="border border-slate-300 py-1.5 px-1.5 text-right font-mono font-semibold text-slate-800">{formatCurrency(item.totalPrice)}</td>
                    </tr>
                  ))}
                  {/* Subtotal Row */}
                  <tr className="font-semibold bg-white border-b border-slate-200">
                    <td colSpan={5} className="border border-slate-300 py-1.5 px-1.5 text-right uppercase text-[8.5px] tracking-wider text-slate-400">
                      Subtotal {cat === 'Alat' ? 'Peralatan' : cat}:
                    </td>
                    <td className="border border-slate-300 py-1.5 px-1.5 text-right font-mono text-slate-700 text-[9.5px]">
                      {formatCurrency(catSubtotal)}
                    </td>
                  </tr>
                </React.Fragment>
              )
            })}
            {/* Grand Total */}
            <tr className="font-bold bg-white border-t border-slate-900 border-b-double border-b-[3px] border-b-slate-950">
              <td colSpan={5} className="border border-slate-300 py-2 px-1.5 text-right uppercase tracking-wider text-[9px] text-slate-700">Total Biaya Seluruh Komponen:</td>
              <td className="border border-slate-300 py-2 px-1.5 text-right font-mono text-slate-950 font-extrabold text-[11px]">{formatCurrency(totalBomCost)}</td>
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
      <table className="w-full text-sm">
        <thead>
          <tr className="bg-gray-50 border-b border-gray-200">
            <th className="table-header w-12 text-center">No</th>
            <th className="table-header">Uraian Komponen</th>
            <th className="table-header w-24 text-center">Satuan</th>
            <th className="table-header w-36 text-right">Total Kebutuhan</th>
            <th className="table-header w-36 text-right">Harga Satuan</th>
            <th className="table-header w-40 text-right">Jumlah Biaya</th>
          </tr>
        </thead>
        <tbody className="divide-y divide-gray-100">
          {(['Bahan', 'Tenaga Kerja', 'Alat'] as const).map((cat, catIdx) => {
            const items = bomItems.filter(item => item.category === cat)
            if (items.length === 0) return null
            const catSubtotal = items.reduce((s, i) => s + i.totalPrice, 0)
            const letterCode = String.fromCharCode(65 + catIdx)

            return (
              <React.Fragment key={cat}>
                {/* Category Row Divider */}
                <tr className="bg-slate-100/60 font-bold text-slate-800 text-xs">
                  <td className="px-4 py-2 text-center font-mono">{letterCode}</td>
                  <td colSpan={5} className="px-4 py-2 uppercase tracking-wider">
                    {cat === 'Alat' ? 'Peralatan / Alat' : cat}
                  </td>
                </tr>
                {/* Line items */}
                {items.map((item, idx) => (
                  <tr key={item.id} className="hover:bg-gray-50/50">
                    <td className="table-cell text-center text-gray-400 font-mono text-xs">{idx + 1}</td>
                    <td className="table-cell font-medium text-gray-800">{item.name}</td>
                    <td className="table-cell text-center text-gray-600 font-semibold">{item.unit}</td>
                    <td className="table-cell text-right font-mono">{item.quantity.toFixed(4)}</td>
                    <td className="table-cell text-right font-mono text-gray-600">{formatCurrency(item.unitPrice)}</td>
                    <td className="table-cell text-right font-mono font-bold text-gray-900">{formatCurrency(item.totalPrice)}</td>
                  </tr>
                ))}
                {/* Subtotal Row */}
                <tr className="bg-slate-50/30 font-semibold text-xs border-b border-gray-200">
                  <td colSpan={5} className="px-4 py-2 text-right text-gray-500 uppercase text-[10px]">
                    Subtotal {cat === 'Alat' ? 'Peralatan' : cat}:
                  </td>
                  <td className="px-4 py-2 text-right font-mono font-bold text-gray-800">
                    {formatCurrency(catSubtotal)}
                  </td>
                </tr>
              </React.Fragment>
            )
          })}
        </tbody>
      </table>
      <div className="bg-gray-50 px-6 py-4 border-t border-gray-200 flex justify-end">
        <div className="w-80 space-y-1 text-sm font-sans flex justify-between font-extrabold text-primary-800">
          <span>Total Biaya Seluruh Komponen:</span>
          <span className="font-mono">{formatCurrency(totalBomCost)}</span>
        </div>
      </div>
    </div>
  )
}
