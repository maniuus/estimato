import React from 'react'
import type { Project, WbsItem } from '../../types/models'
import { formatCurrency } from '../../lib/format'
import { ReportHeader } from './report-header'
import { ReportFooter } from './report-footer'
import { SCurveChart } from './scurve-chart'
import { calculateSCurveData } from './scurve-helper'

interface SCurveReportProps {
  project?: Project
  rekapCategories: WbsItem[]
  totalPrice: number
  isPrint?: boolean
  durationWeeks: number
  setDurationWeeks: (weeks: number) => void
  categorySchedules: Record<string, { startWeek: number, endWeek: number }>
  setCategorySchedules: React.Dispatch<React.SetStateAction<Record<string, { startWeek: number, endWeek: number }>>>
  getGroupSubtotal: (path: string) => number
  activeCompanyLogo?: string
  activeCompanyName?: string
  activeReportHeader?: string
  activeOwnerParaf?: string
  activeOwnerName?: string
}

export function SCurveReport({
  project,
  rekapCategories,
  totalPrice,
  isPrint = false,
  durationWeeks,
  setDurationWeeks,
  categorySchedules,
  setCategorySchedules,
  getGroupSubtotal,
  activeCompanyLogo,
  activeCompanyName,
  activeReportHeader,
  activeOwnerParaf,
  activeOwnerName
}: SCurveReportProps): React.ReactElement {

  const { weeklyProgress, cumulativeProgress } = calculateSCurveData({
    totalPrice,
    durationWeeks,
    rekapCategories,
    categorySchedules,
    getGroupSubtotal
  })

  const handleDurationChangeLocal = (newWeeks: number) => {
    const oldWeeks = durationWeeks
    setDurationWeeks(newWeeks)
    setCategorySchedules(prev => {
      const next = { ...prev }
      Object.keys(next).forEach(id => {
        const { startWeek, endWeek } = next[id]
        const newStart = Math.max(1, Math.min(newWeeks, Math.round((startWeek / oldWeeks) * newWeeks)))
        const newEnd = Math.max(newStart, Math.min(newWeeks, Math.round((endWeek / oldWeeks) * newWeeks)))
        next[id] = { startWeek: newStart, endWeek: newEnd }
      })
      return next
    })
  }

  if (isPrint) {
    return (
      <section className="print-page border-b border-slate-200 pb-8" style={{ pageBreakBefore: 'always' }}>
        <ReportHeader
          title="ANALISIS BOBOT PEKERJAAN & KURVA S JADWAL RENCANA"
          project={project}
          activeCompanyLogo={activeCompanyLogo}
          activeCompanyName={activeCompanyName}
          activeReportHeader={activeReportHeader}
        />
        <div className="space-y-4 text-[9.5px]">
          {/* Table of Weights and Schedules */}
          <div className="space-y-2">
            <div className="font-bold text-slate-950 uppercase text-[9.5px] tracking-wide border-b border-slate-900 pb-1">
              I. TABEL BOBOT PEKERJAAN & JADWAL RENCANA PELAKSANAAN
            </div>
            <table className="w-full border-collapse border border-slate-300 text-[9.5px] font-sans">
              <thead>
                <tr className="border-b border-slate-900 font-bold uppercase text-slate-950 bg-slate-50">
                  <th className="border border-slate-300 py-1.5 px-1 text-center w-10">No</th>
                  <th className="border border-slate-300 py-1.5 px-1.5 text-left">Kategori Pekerjaan</th>
                  <th className="border border-slate-300 py-1.5 px-1.5 text-right w-40">Biaya Total (Rp)</th>
                  <th className="border border-slate-300 py-1.5 px-1.5 text-center w-24">Bobot Pekerjaan (%)</th>
                  <th className="border border-slate-300 py-1.5 px-1.5 text-center w-36">Jadwal Rencana Kerja</th>
                </tr>
              </thead>
              <tbody>
                {rekapCategories.map((cat, index) => {
                  const cost = getGroupSubtotal(cat.wbsPath)
                  const weight = totalPrice > 0 ? (cost / totalPrice) * 100 : 0
                  const sched = categorySchedules[cat.id] || { startWeek: 1, endWeek: 3 }
                  return (
                    <tr key={cat.id} className="bg-white">
                      <td className="border border-slate-300 py-1 px-1 text-center font-mono text-[9px] text-slate-500">{index + 1}</td>
                      <td className="border border-slate-300 py-1 px-1.5 font-bold text-slate-950 uppercase text-[9px]">{cat.name}</td>
                      <td className="border border-slate-300 py-1 px-1.5 text-right font-mono text-[9.5px]">{formatCurrency(cost)}</td>
                      <td className="border border-slate-300 py-1 px-1.5 text-center font-mono font-bold text-[9.5px] text-slate-900">{weight.toFixed(2)}%</td>
                      <td className="border border-slate-300 py-1 px-1.5 text-center font-bold text-primary-900 text-[9.5px]">Minggu {sched.startWeek} - {sched.endWeek}</td>
                    </tr>
                  )
                })}
                <tr className="font-bold border-t border-slate-900 bg-white">
                  <td colSpan={2} className="border border-slate-300 py-1.5 px-1.5 text-right uppercase text-[8.5px] tracking-wider text-slate-400">Jumlah Total Pekerjaan (RAB Utama):</td>
                  <td className="border border-slate-300 py-1.5 px-1.5 text-right font-mono text-[9.5px] text-slate-800">{formatCurrency(totalPrice)}</td>
                  <td className="border border-slate-300 py-1.5 px-1.5 text-center font-mono text-[9.5px] text-slate-900">100.00%</td>
                  <td className="border border-slate-300 py-1.5 px-1.5 text-center text-slate-400 font-normal">-</td>
                </tr>
              </tbody>
            </table>
          </div>

          {/* S-Curve Chart (Printed version) */}
          <div className="space-y-1.5 no-break-inside">
            <div className="font-bold text-slate-950 uppercase text-[9.5px] tracking-wide border-b border-slate-900 pb-1">
              II. DIAGRAM KEMAJUAN PEKERJAAN & KURVA S
            </div>
            
            <SCurveChart
              weeklyProgress={weeklyProgress}
              cumulativeProgress={cumulativeProgress}
              durationWeeks={durationWeeks}
              isPrint={true}
            />
          </div>
        </div>

        <ReportFooter 
          activeOwnerName={activeOwnerName} 
          activeOwnerParaf={activeOwnerParaf} 
        />
      </section>
    )
  }

  return (
    <div className="space-y-6 font-sans">
      {/* S-Curve Controls Header */}
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center bg-slate-50 p-4 rounded-xl border border-slate-200 gap-4">
        <div>
          <span className="text-xs text-gray-500 font-semibold block uppercase tracking-wider">KURVA S JADWAL PELAKSANAAN</span>
          <h3 className="text-base font-bold text-gray-800">Visualisasi Bobot & Penjadwalan Kerja Rencana</h3>
        </div>
        <div className="flex items-center gap-3">
          <label className="text-xs font-semibold text-gray-600 uppercase tracking-wide">Durasi Proyek:</label>
          <select
            value={durationWeeks}
            onChange={e => handleDurationChangeLocal(parseInt(e.target.value) || 12)}
            className="px-3 py-1.5 border border-slate-300 rounded bg-white text-xs font-bold text-slate-800"
          >
            {[4, 6, 8, 10, 12, 16, 20, 24, 28, 32, 36, 40, 48, 52].map(w => (
              <option key={w} value={w}>{w} Minggu ({Math.ceil(w / 4)} Bulan)</option>
            ))}
          </select>
        </div>
      </div>

      {/* S-Curve SVG Chart Container */}
      <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-sm space-y-3">
        <div className="flex justify-between items-center border-b border-slate-100 pb-2">
          <span className="font-bold text-slate-800 text-sm">📈 Kurva S Kemajuan Pekerjaan Rencana</span>
          <div className="flex gap-4 text-xs font-semibold">
            <div className="flex items-center gap-1.5">
              <span className="w-3 h-3 bg-blue-500/60 rounded"></span>
              <span className="text-slate-500">Bobot Mingguan (%)</span>
            </div>
            <div className="flex items-center gap-1.5">
              <span className="w-4 h-0.5 bg-amber-500 border-t border-amber-500"></span>
              <span className="text-slate-500">Kumulatif Kurva S (%)</span>
            </div>
          </div>
        </div>

        <SCurveChart
          weeklyProgress={weeklyProgress}
          cumulativeProgress={cumulativeProgress}
          durationWeeks={durationWeeks}
          isPrint={false}
        />
      </div>

      {/* Table Editor for schedules and weights */}
      <div className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden">
        <div className="p-4 border-b border-slate-150">
          <span className="font-bold text-slate-800 text-sm">🗓️ Pengaturan Jadwal Rencana & Bobot per Kategori</span>
        </div>
        <table className="w-full text-xs">
          <thead>
            <tr className="bg-slate-50 border-b border-slate-200 text-gray-500 font-semibold uppercase">
              <th className="px-4 py-2.5 text-center w-12">No</th>
              <th className="px-4 py-2.5 text-left">Nama Kategori Pekerjaan</th>
              <th className="px-4 py-2.5 text-right w-48">Subtotal Biaya</th>
              <th className="px-4 py-2.5 text-center w-36">Bobot Pekerjaan</th>
              <th className="px-4 py-2.5 text-center w-48">Minggu Mulai</th>
              <th className="px-4 py-2.5 text-center w-48">Minggu Selesai</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100">
            {rekapCategories.map((cat, index) => {
              const cost = getGroupSubtotal(cat.wbsPath)
              const weight = totalPrice > 0 ? (cost / totalPrice) * 100 : 0
              const sched = categorySchedules[cat.id] || { startWeek: 1, endWeek: 3 }

              return (
                <tr key={cat.id} className="hover:bg-slate-50/50 transition-colors">
                  <td className="py-2.5 px-4 text-center text-gray-400 font-medium font-mono">{index + 1}</td>
                  <td className="py-2.5 px-4 font-bold text-slate-800 uppercase tracking-wide">{cat.name}</td>
                  <td className="py-2.5 px-4 text-right font-mono font-semibold text-slate-600">{formatCurrency(cost)}</td>
                  <td className="py-2.5 px-4 text-center font-mono font-bold text-primary-800">{weight.toFixed(2)}%</td>
                  <td className="py-2 px-4 text-center">
                    <select
                      value={sched.startWeek}
                      onChange={e => setCategorySchedules(prev => ({
                        ...prev,
                        [cat.id]: {
                          ...sched,
                          startWeek: Math.min(sched.endWeek, parseInt(e.target.value) || 1)
                        }
                      }))}
                      className="px-2 py-1 border border-slate-300 bg-white rounded font-bold font-mono text-center text-[11px]"
                    >
                      {Array.from({ length: durationWeeks }).map((_, i) => (
                        <option key={i} value={i + 1}>Minggu {i + 1}</option>
                      ))}
                    </select>
                  </td>
                  <td className="py-2 px-4 text-center">
                    <select
                      value={sched.endWeek}
                      onChange={e => setCategorySchedules(prev => ({
                        ...prev,
                        [cat.id]: {
                          ...sched,
                          endWeek: Math.max(sched.startWeek, parseInt(e.target.value) || 1)
                        }
                      }))}
                      className="px-2 py-1 border border-slate-300 bg-white rounded font-bold font-mono text-center text-[11px]"
                    >
                      {Array.from({ length: durationWeeks }).map((_, i) => (
                        <option key={i} value={i + 1}>Minggu {i + 1}</option>
                      ))}
                    </select>
                  </td>
                </tr>
              )
            })}
          </tbody>
        </table>
      </div>
    </div>
  )
}
