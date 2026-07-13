import React from 'react'
import type { Project, WbsItem, VolumeItem } from '../../types/models'
import type { RabCalculation, RabLineItem } from '../../stores/rab-store'
import { formatCurrency, getTerbilang } from '../../lib/format'
import { ReportHeader } from './report-header'
import { ReportFooter } from './report-footer'
import { resolveLinkedVolume } from '../volume-calculator/helpers'

interface RabReportProps {
  project?: Project
  wbsItems: WbsItem[]
  volumes: VolumeItem[]
  ahsList: any[]
  calculation: RabCalculation | null
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
  projectVolumes: any[]
}

export function RabReport({
  project,
  wbsItems,
  volumes,
  ahsList,
  calculation,
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
  getGroupSubtotal,
  projectVolumes
}: RabReportProps): React.ReactElement {
  if (isPrint) {
    return (
      <section className="print-page border-b border-slate-200 pb-8" style={{ pageBreakBefore: 'always' }}>
        <ReportHeader
          title="RENCANA ANGGARAN BIAYA (RAB)"
          project={project}
          activeCompanyLogo={activeCompanyLogo}
          activeCompanyName={activeCompanyName}
          activeReportHeader={activeReportHeader}
        />
        <table className="w-full border-collapse border border-slate-300 text-[9.5px] font-sans">
          <thead>
            <tr className="border-b-2 border-slate-900 text-[9px] font-bold uppercase tracking-wider text-slate-950 bg-white">
              <th className="border border-slate-300 py-2 px-1.5 text-center align-middle w-14 font-bold">No WBS</th>
              <th className="border border-slate-300 py-2 px-1.5 text-center align-middle font-bold">Uraian Kategori & Pekerjaan</th>
              <th className="border border-slate-300 py-2 px-1.5 text-center align-middle w-20 font-bold">Volume</th>
              <th className="border border-slate-300 py-2 px-1.5 text-center align-middle w-16 font-bold">Satuan</th>
              <th className="border border-slate-300 py-2 px-1.5 text-center align-middle w-28 font-bold">Harga Satuan (Rp)</th>
              <th className="border border-slate-300 py-2 px-1.5 text-center align-middle w-32 font-bold">Jumlah Biaya (Rp)</th>
            </tr>
          </thead>
          <tbody>
            {wbsItems.map((item) => {
              const level = item.wbsPath ? item.wbsPath.split('.').length - 1 : 0
              
              if (item.type === 'group') {
                const subtotal = getGroupSubtotal(item.wbsPath)
                return (
                  <tr key={item.id} className="bg-slate-50 font-bold text-slate-950 border-b border-slate-300">
                    <td className="border border-slate-300 py-1.5 px-1.5 text-center font-mono text-[9px]">{item.code}</td>
                    <td colSpan={4} className="border border-slate-300 py-1.5 px-1.5 uppercase text-[9px] tracking-wide" style={{ paddingLeft: `${6 + level * 12}px` }}>
                      {item.name}
                    </td>
                    <td className="border border-slate-300 py-1.5 px-1.5 text-right font-mono font-extrabold text-[9.5px]">
                      {formatCurrency(subtotal)}
                    </td>
                  </tr>
                )
              } else {
                const calcItem = calculation?.lineItems?.find((li: RabLineItem) => li.wbsItemId === item.id)
                const volItem = volumes.find(v => v.wbsItemId === item.id)
                const volume = volItem ? resolveLinkedVolume(volItem, projectVolumes) : 0
                const unit = volItem?.unit || item.unit
                let unitPrice = calcItem?.unitPrice ?? 0
                if (!calcItem && volItem?.ahsId) {
                  const matchedAhs = ahsList.find(a => a.id === volItem.ahsId)
                  unitPrice = matchedAhs?.totalPrice ?? 0
                }
                const total = volume * unitPrice

                return (
                  <tr key={item.id} className="hover:bg-slate-50/20 bg-white">
                    <td className="border border-slate-300 py-1.5 px-1.5 text-center font-mono text-[9px] text-slate-400">{item.code}</td>
                    <td className="border border-slate-300 py-1.5 px-1.5 text-slate-800 font-normal leading-tight" style={{ paddingLeft: `${6 + level * 12}px` }}>{item.name}</td>
                    <td className="border border-slate-300 py-1.5 px-1.5 text-right font-mono">{volume}</td>
                    <td className="border border-slate-300 py-1.5 px-1.5 text-center font-medium text-slate-500">{unit || '-'}</td>
                    <td className="border border-slate-300 py-1.5 px-1.5 text-right font-mono text-slate-500">{formatCurrency(unitPrice)}</td>
                    <td className="border border-slate-300 py-1.5 px-1.5 text-right font-mono font-semibold text-slate-800">{formatCurrency(total)}</td>
                  </tr>
                )
              }
            })}
            <tr className="font-semibold border-t border-slate-300 bg-white">
              <td colSpan={5} className="border border-slate-300 py-1.5 px-1.5 text-right uppercase text-[8.5px] tracking-wider text-slate-400">Subtotal Pekerjaan:</td>
              <td className="border border-slate-300 py-1.5 px-1.5 text-right font-mono text-slate-700 text-[9.5px]">{formatCurrency(totalPrice)}</td>
            </tr>
            <tr className="font-semibold bg-white">
              <td colSpan={5} className="border border-slate-300 py-1.5 px-1.5 text-right uppercase text-[8.5px] tracking-wider text-slate-400">PPN ({ppn}%):</td>
              <td className="border border-slate-300 py-1.5 px-1.5 text-right font-mono text-slate-700 text-[9.5px]">{formatCurrency(ppnAmount)}</td>
            </tr>
            <tr className="font-semibold bg-white">
              <td colSpan={5} className="border border-slate-300 py-1.5 px-1.5 text-right uppercase text-[8.5px] tracking-wider text-slate-400">Overhead & Profit ({overhead}%):</td>
              <td className="border border-slate-300 py-1.5 px-1.5 text-right font-mono text-slate-700 text-[9.5px]">{formatCurrency(overheadAmount)}</td>
            </tr>
            <tr className="font-semibold bg-white">
              <td colSpan={5} className="border border-slate-300 py-1.5 px-1.5 text-right uppercase text-[8.5px] tracking-wider text-slate-400">Grand Total RAB:</td>
              <td className="border border-slate-300 py-1.5 px-1.5 text-right font-mono text-slate-700 text-[9.5px]">{formatCurrency(grandTotal)}</td>
            </tr>
            <tr className="font-semibold bg-white">
              <td colSpan={5} className="border border-slate-300 py-1.5 px-1.5 text-right uppercase text-[8.5px] tracking-wider text-slate-400">Pembulatan:</td>
              <td className="border border-slate-300 py-1.5 px-1.5 text-right font-mono text-slate-700 text-[9.5px]">{formatCurrency(roundedGrandTotal - grandTotal)}</td>
            </tr>
            <tr className="font-bold bg-white border-t border-slate-900 border-b-double border-b-[3px] border-b-slate-950">
              <td colSpan={5} className="border border-slate-300 py-2 px-1.5 text-right uppercase tracking-wider text-[9px] text-slate-950">Grand Total Dibulatkan:</td>
              <td className="border border-slate-300 py-2 px-1.5 text-right font-mono text-slate-950 font-extrabold text-[11px]">{formatCurrency(roundedGrandTotal)}</td>
            </tr>
            <tr className="bg-white">
              <td colSpan={6} className="border border-slate-300 py-2 px-2.5 text-left font-sans text-[9px]">
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
        <h2 className="text-xl font-bold text-gray-900 tracking-wide font-sans">RENCANA ANGGARAN BIAYA (RAB)</h2>
        <p className="text-sm text-gray-600 mt-1">{project?.name} &bull; {project?.location}</p>
      </div>
      <table className="w-full text-sm">
        <thead>
          <tr className="bg-gray-50 border-b border-gray-200">
            <th className="table-header w-16 text-center">No WBS</th>
            <th className="table-header">Uraian Kategori & Pekerjaan</th>
            <th className="table-header w-24 text-right">Volume</th>
            <th className="table-header w-20 text-center">Satuan</th>
            <th className="table-header w-36 text-right">Harga Satuan</th>
            <th className="table-header w-40 text-right">Jumlah Biaya</th>
          </tr>
        </thead>
        <tbody className="divide-y divide-gray-100">
          {wbsItems.map((item) => {
            const level = item.wbsPath ? item.wbsPath.split('.').length - 1 : 0
            
            if (item.type === 'group') {
              const subtotal = getGroupSubtotal(item.wbsPath)
              return (
                <tr key={item.id} className="bg-slate-100/60 font-bold text-slate-800 text-xs">
                  <td className="px-4 py-2 font-mono text-center">{item.code}</td>
                  <td colSpan={4} className="px-4 py-2 uppercase tracking-wider" style={{ paddingLeft: `${level * 16}px` }}>
                    {item.name}
                  </td>
                  <td className="px-4 py-2 text-right font-mono font-bold">
                    {formatCurrency(subtotal)}
                  </td>
                </tr>
              )
            } else {
              const calcItem = calculation?.lineItems?.find((li: RabLineItem) => li.wbsItemId === item.id)
              const volItem = volumes.find(v => v.wbsItemId === item.id)
              const volume = volItem ? resolveLinkedVolume(volItem, projectVolumes) : 0
              const unit = volItem?.unit || item.unit
              let unitPrice = calcItem?.unitPrice ?? 0
              if (!calcItem && volItem?.ahsId) {
                const matchedAhs = ahsList.find(a => a.id === volItem.ahsId)
                unitPrice = matchedAhs?.totalPrice ?? 0
              }
              const total = volume * unitPrice

              return (
                <tr key={item.id}>
                  <td className="table-cell text-center text-gray-400 font-mono text-xs">{item.code}</td>
                  <td className="table-cell font-medium text-gray-800" style={{ paddingLeft: `${level * 16}px` }}>{item.name}</td>
                  <td className="table-cell text-right font-mono">{volume}</td>
                  <td className="table-cell text-center text-gray-600 font-semibold">{unit || '-'}</td>
                  <td className="table-cell text-right font-mono text-gray-600">{formatCurrency(unitPrice)}</td>
                  <td className="table-cell text-right font-mono font-bold text-gray-900">{formatCurrency(total)}</td>
                </tr>
              )
            }
          })}
        </tbody>
      </table>
      <div className="border-t border-gray-200 pt-4 space-y-4">
        <div className="flex justify-end">
          <div className="w-80 space-y-1 text-sm font-sans">
            <div className="flex justify-between text-gray-500">
              <span>Total Pekerjaan:</span>
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
