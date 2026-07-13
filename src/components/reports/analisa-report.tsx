import React from 'react'
import type { Project } from '../../types/models'
import { formatCurrency } from '../../lib/format'
import { ReportHeader } from './report-header'
import { ReportFooter } from './report-footer'

interface DetailedAhsData {
  ahs: {
    id: string
    code: string
    name: string
    unit: string
  }
  wages: any[]
  materials: any[]
  equipment: any[]
  subtotalWages: number
  subtotalMaterials: number
  subtotalEquipment: number
  totalComponents: number
  overheadAmount: number
  totalUnitPrice: number
}

interface AnalisaReportProps {
  project?: Project
  detailedAhsList: DetailedAhsData[]
  overhead: number
  isPrint?: boolean
  activeCompanyLogo?: string
  activeCompanyName?: string
  activeReportHeader?: string
  activeOwnerParaf?: string
  activeOwnerName?: string
}

export function AnalisaReport({
  project,
  detailedAhsList,
  overhead,
  isPrint = false,
  activeCompanyLogo,
  activeCompanyName,
  activeReportHeader,
  activeOwnerParaf,
  activeOwnerName
}: AnalisaReportProps): React.ReactElement {
  if (isPrint) {
    return (
      <section className="print-page page-break border-b border-slate-200 pb-8" style={{ pageBreakBefore: 'always' }}>
        <ReportHeader
          title="LEMBAR ANALISA HARGA SATUAN PEKERJAAN (AHSP)"
          project={project}
          activeCompanyLogo={activeCompanyLogo}
          activeCompanyName={activeCompanyName}
          activeReportHeader={activeReportHeader}
        />
        <div className="space-y-6">
          {detailedAhsList.map(data => (
            <div key={data.ahs.id} className="border border-slate-300 p-3 rounded bg-white page-break-inside-avoid">
              <h3 className="font-bold border-b-2 border-slate-900 pb-1.5 mb-2 text-slate-950 text-[10.5px] uppercase tracking-wide">
                Kode AHSP: {data.ahs.code} &bull; Pekerjaan: {data.ahs.name} (per {data.ahs.unit})
              </h3>
              <table className="w-full border-collapse border border-slate-300 text-[9px]">
                <thead>
                  <tr className="border-b border-slate-400 text-slate-950 text-[8.5px] font-bold uppercase tracking-wider bg-white">
                    <th className="border border-slate-300 py-1.5 px-1 text-center align-middle w-8 font-bold">No</th>
                    <th className="border border-slate-300 py-1.5 px-1 text-center align-middle font-bold">Komponen Analisa</th>
                    <th className="border border-slate-300 py-1.5 px-1 text-center align-middle w-14 font-bold">Satuan</th>
                    <th className="border border-slate-300 py-1.5 px-1 text-center align-middle w-16 font-bold">Koefisien</th>
                    <th className="border border-slate-300 py-1.5 px-1 text-center align-middle w-24 font-bold">Harga Satuan (Rp)</th>
                    <th className="border border-slate-300 py-1.5 px-1 text-center align-middle w-28 font-bold">Jumlah Harga (Rp)</th>
                  </tr>
                </thead>
                <tbody>
                  {/* Wages */}
                  {data.wages.length > 0 && (
                    <>
                      <tr>
                        <td className="border border-slate-300 py-1 px-1 text-center font-bold text-slate-400 text-[9px]">A</td>
                        <td colSpan={5} className="border border-slate-300 py-1 px-1 font-bold bg-white uppercase text-[8.5px] text-slate-500 tracking-wider">Tenaga Kerja</td>
                      </tr>
                      {data.wages.map((w, i) => (
                        <tr key={w.id} className="bg-white">
                          <td className="border border-slate-300 py-1 px-1 text-center font-mono text-slate-400">{i + 1}</td>
                          <td className="border border-slate-300 py-1 px-1 text-slate-700 font-normal">{w.wageType}</td>
                          <td className="border border-slate-300 py-1 px-1 text-center text-slate-500">{w.wageUnit}</td>
                          <td className="border border-slate-300 py-1 px-1 text-right font-mono">{w.coefficient.toFixed(4)}</td>
                          <td className="border border-slate-300 py-1 px-1 text-right font-mono text-slate-500">{formatCurrency(w.dailyWage || 0)}</td>
                          <td className="border border-slate-300 py-1 px-1 text-right font-mono text-slate-700 font-medium">{formatCurrency(w.totalPrice || 0)}</td>
                        </tr>
                      ))}
                      <tr className="font-semibold bg-white border-b border-slate-200">
                        <td colSpan={5} className="border border-slate-300 py-1 px-1 text-right text-slate-400 text-[8.5px]">Subtotal Tenaga Kerja (A):</td>
                        <td className="border border-slate-300 py-1 px-1 text-right font-mono text-slate-700">{formatCurrency(data.subtotalWages)}</td>
                      </tr>
                    </>
                  )}

                  {/* Materials */}
                  {data.materials.length > 0 && (
                    <>
                      <tr>
                        <td className="border border-slate-300 py-1 px-1 text-center font-bold text-slate-400 text-[9px]">B</td>
                        <td colSpan={5} className="border border-slate-300 py-1 px-1 font-bold bg-white uppercase text-[8.5px] text-slate-500 tracking-wider">Bahan</td>
                      </tr>
                      {data.materials.map((m, i) => (
                        <tr key={m.id} className="bg-white">
                          <td className="border border-slate-300 py-1 px-1 text-center font-mono text-slate-400">{i + 1}</td>
                          <td className="border border-slate-300 py-1 px-1 text-slate-700 font-normal">{m.materialName}</td>
                          <td className="border border-slate-300 py-1 px-1 text-center text-slate-500">{m.materialUnit}</td>
                          <td className="border border-slate-300 py-1 px-1 text-right font-mono">{m.coefficient.toFixed(4)}</td>
                          <td className="border border-slate-300 py-1 px-1 text-right font-mono text-slate-500">{formatCurrency(m.unitPrice || 0)}</td>
                          <td className="border border-slate-300 py-1 px-1 text-right font-mono text-slate-700 font-medium">{formatCurrency(m.totalPrice || 0)}</td>
                        </tr>
                      ))}
                      <tr className="font-semibold bg-white border-b border-slate-200">
                        <td colSpan={5} className="border border-slate-300 py-1 px-1 text-right text-slate-400 text-[8.5px]">Subtotal Bahan (B):</td>
                        <td className="border border-slate-300 py-1 px-1 text-right font-mono text-slate-700">{formatCurrency(data.subtotalMaterials)}</td>
                      </tr>
                    </>
                  )}

                  {/* Tools */}
                  {data.equipment.length > 0 && (
                    <>
                      <tr>
                        <td className="border border-slate-300 py-1 px-1 text-center font-bold text-slate-400 text-[9px]">C</td>
                        <td colSpan={5} className="border border-slate-300 py-1 px-1 font-bold bg-white uppercase text-[8.5px] text-slate-500 tracking-wider">Peralatan</td>
                      </tr>
                      {data.equipment.map((e, i) => (
                        <tr key={e.id} className="bg-white">
                          <td className="border border-slate-300 py-1 px-1 text-center font-mono text-slate-400">{i + 1}</td>
                          <td className="border border-slate-300 py-1 px-1 text-slate-700 font-normal">{e.equipmentName}</td>
                          <td className="border border-slate-300 py-1 px-1 text-center text-slate-500">{e.equipmentUnit}</td>
                          <td className="border border-slate-300 py-1 px-1 text-right font-mono">{e.coefficient.toFixed(4)}</td>
                          <td className="border border-slate-300 py-1 px-1 text-right font-mono text-slate-500">{formatCurrency(e.rentalPrice || 0)}</td>
                          <td className="border border-slate-300 py-1 px-1 text-right font-mono text-slate-700 font-medium">{formatCurrency(e.totalPrice || 0)}</td>
                        </tr>
                      ))}
                      <tr className="font-semibold bg-white border-b border-slate-200">
                        <td colSpan={5} className="border border-slate-300 py-1 px-1 text-right text-slate-400 text-[8.5px]">Subtotal Alat (C):</td>
                        <td className="border border-slate-300 py-1 px-1 text-right font-mono text-slate-700">{formatCurrency(data.subtotalEquipment)}</td>
                      </tr>
                    </>
                  )}

                  {/* Total breakdown */}
                  <tr className="font-semibold border-t border-slate-300 bg-white text-slate-700">
                    <td colSpan={5} className="border border-slate-300 py-1 px-1 text-right uppercase text-[8.5px]">Jumlah Biaya Komponen (A + B + C):</td>
                    <td className="border border-slate-300 py-1 px-1 text-right font-mono">{formatCurrency(data.totalComponents)}</td>
                  </tr>
                  <tr className="font-semibold bg-white text-slate-700">
                    <td colSpan={5} className="border border-slate-300 py-1 px-1 text-right uppercase text-[8.5px]">Overhead & Profit ({overhead}%):</td>
                    <td className="border border-slate-300 py-1 px-1 text-right font-mono">{formatCurrency(data.overheadAmount)}</td>
                  </tr>
                  <tr className="font-bold bg-white text-slate-950 border-t border-slate-900 border-b-double border-b-[3px] border-b-slate-950">
                    <td colSpan={5} className="border border-slate-300 py-1.5 px-1 text-right uppercase text-[8.5px] tracking-wider text-slate-950">Harga Satuan Pekerjaan (HSP):</td>
                    <td className="border border-slate-300 py-1.5 px-1 text-right font-mono text-[10px] font-extrabold text-slate-950">{formatCurrency(data.totalUnitPrice)}</td>
                  </tr>
                </tbody>
              </table>
            </div>
          ))}
        </div>
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
    <div className="space-y-6">
      {detailedAhsList.map(data => (
        <div key={data.ahs.id} className="border border-gray-100 rounded-lg p-4 bg-gray-50/50">
          <h4 className="font-bold text-gray-800 font-sans border-b border-gray-200 pb-2 mb-3">
            {data.ahs.code} - {data.ahs.name} (per {data.ahs.unit})
          </h4>
          <table className="w-full text-xs bg-white border border-gray-200 rounded">
            <thead>
              <tr className="bg-gray-100 text-gray-600">
                <th className="p-2 text-left w-12">No</th>
                <th className="p-2 text-left">Uraian</th>
                <th className="p-2 text-center w-16">Satuan</th>
                <th className="p-2 text-right w-24">Koefisien</th>
                <th className="p-2 text-right w-32">Harga Satuan</th>
                <th className="p-2 text-right w-36">Jumlah Harga</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100 font-sans">
              {/* Labor */}
              {data.wages.map((w, i) => (
                <tr key={w.id}>
                  <td className="p-2 text-center text-gray-400 font-mono">{i + 1}</td>
                  <td className="p-2 text-gray-700 font-medium">{w.wageType} (Tenaga Kerja)</td>
                  <td className="p-2 text-center">{w.wageUnit}</td>
                  <td className="p-2 text-right font-mono">{w.coefficient}</td>
                  <td className="p-2 text-right font-mono">{formatCurrency(w.dailyWage || 0)}</td>
                  <td className="p-2 text-right font-mono font-medium">{formatCurrency(w.totalPrice || 0)}</td>
                </tr>
              ))}
              {/* Materials */}
              {data.materials.map((m, i) => (
                <tr key={m.id}>
                  <td className="p-2 text-center text-gray-400 font-mono">{i + 1}</td>
                  <td className="p-2 text-gray-700 font-medium">{m.materialName} (Bahan)</td>
                  <td className="p-2 text-center">{m.materialUnit}</td>
                  <td className="p-2 text-right font-mono">{m.coefficient}</td>
                  <td className="p-2 text-right font-mono">{formatCurrency(m.unitPrice || 0)}</td>
                  <td className="p-2 text-right font-mono font-medium">{formatCurrency(m.totalPrice || 0)}</td>
                </tr>
              ))}
              {/* Equipment */}
              {data.equipment.map((e, i) => (
                <tr key={e.id}>
                  <td className="p-2 text-center text-gray-400 font-mono">{i + 1}</td>
                  <td className="p-2 text-gray-700 font-medium">{e.equipmentName} (Alat)</td>
                  <td className="p-2 text-center">{e.equipmentUnit}</td>
                  <td className="p-2 text-right font-mono">{e.coefficient}</td>
                  <td className="p-2 text-right font-mono">{formatCurrency(e.rentalPrice || 0)}</td>
                  <td className="p-2 text-right font-mono font-medium">{formatCurrency(e.totalPrice || 0)}</td>
                </tr>
              ))}
              <tr className="font-bold bg-gray-50 text-gray-800">
                <td colSpan={5} className="p-2 text-right uppercase">Subtotal Pekerjaan:</td>
                <td className="p-2 text-right font-mono">{formatCurrency(data.totalComponents)}</td>
              </tr>
              <tr className="font-bold bg-gray-50 text-gray-800 border-t border-gray-200">
                <td colSpan={5} className="p-2 text-right uppercase">Overhead & Profit ({overhead}%):</td>
                <td className="p-2 text-right font-mono">{formatCurrency(data.overheadAmount)}</td>
              </tr>
              <tr className="font-bold bg-amber-50 text-primary-900 border-t-2 border-primary-300">
                <td colSpan={5} className="p-2 text-right uppercase">Harga Satuan Pekerjaan (HSP):</td>
                <td className="p-2 text-right font-mono">{formatCurrency(data.totalUnitPrice)}</td>
              </tr>
            </tbody>
          </table>
        </div>
      ))}
    </div>
  )
}
