import React from 'react'
import type { Project, WbsItem, VolumeItem, ProjectVolume } from '../../types/models'
import { ReportHeader } from './report-header'
import { ReportFooter } from './report-footer'
import { getProfileSteelWeights } from '../volume-calculator/helpers'

interface BackupReportProps {
  project?: Project
  wbsItems: WbsItem[]
  volumes: VolumeItem[]
  projectVolumes: ProjectVolume[]
  isPrint?: boolean
  activeCompanyLogo?: string
  activeCompanyName?: string
  activeReportHeader?: string
  activeOwnerParaf?: string
  activeOwnerName?: string
  parseFormulaToText: (formulaJson: string) => string
}

function parseLinkedVolumeToText(
  volItem: any, 
  linkedVol: ProjectVolume, 
  projectVolumes: ProjectVolume[]
): string {
  try {
    const parsed = JSON.parse(linkedVol.formula)
    
    if (parsed.type === 'structural_group') {
      const isBesi = volItem?.formula === 'besi'
      const profileIds = parsed.profileIds || []
      let lines: string[] = []
      
      lines.push(`Kelompok Struktur: ${linkedVol.name} (${isBesi ? 'Berat Besi kg' : 'Volume Beton m³'})`)
      
      if (profileIds.length === 0) {
        lines.push('(Belum ada profil terpilih)')
      } else {
        profileIds.forEach((pid: string) => {
          const prof = projectVolumes.find(p => p.id === pid)
          if (prof) {
            try {
              const pf = JSON.parse(prof.formula)
              const segments = pf.segments || []
              const totalL = segments.reduce((sum: number, s: any) => sum + (parseFloat(s.length) || 0), 0)
              const b = parseFloat(pf.b) || 0
              const h = parseFloat(pf.h) || 0
              
              if (isBesi) {
                const w = getProfileSteelWeights(pf, totalL)
                const steelWeight = w.ulirWeight + w.polosWeight
                const mainRebars = (pf.mainRebarRows || [])
                  .map((r: any) => `${r.position}: ${r.qty}x${r.diameter}`)
                  .join(', ')
                lines.push(`- ${prof.name} (${b}x${h}): L=${totalL.toFixed(1)}m, Tulangan (${mainRebars}), Begel (${pf.stirrupDia}@${pf.stirrupSpacing}) -> ${steelWeight.toFixed(2)} kg`)
              } else {
                const concreteVol = (b / 1000) * (h / 1000) * totalL
                lines.push(`- ${prof.name} (${b}x${h}): L=${totalL.toFixed(1)}m -> ${concreteVol.toFixed(3)} m³`)
              }
            } catch {
              lines.push(`- ${prof.name}: Error parsing profil`)
            }
          }
        })
      }
      return lines.join('\n')
    }
    
    if (parsed.type === 'wall_area') {
      const walls = parsed.walls || []
      let lines: string[] = []
      lines.push(`Kalkulator Pekerjaan Dinding: ${linkedVol.name}`)
      
      walls.forEach((wall: any) => {
        const length = parseFloat(wall.length) || 0
        const height = parseFloat(wall.height) || 0
        const gross = length * height
        
        let openingText: string[] = []
        let openingSum = 0
        const openings = wall.openings || []
        openings.forEach((op: any) => {
          const opW = parseFloat(op.w) || 0
          const opH = parseFloat(op.h) || 0
          const opQty = parseFloat(op.qty) || 0
          const opArea = opW * opH * opQty
          openingSum += opArea
          openingText.push(`${op.label || 'Bukaan'}(${opW}x${opH} x${opQty}qty = -${opArea.toFixed(2)}m²)`)
        })
        const net = Math.max(0, gross - openingSum)
        
        let line = `- ${wall.label || 'Dinding'}: ${length}m x ${height}m = ${gross.toFixed(2)}m²`
        if (openingText.length > 0) {
          line += `\n  Bukaan: ${openingText.join(', ')}\n  Net = ${net.toFixed(2)} m²`
        }
        lines.push(line)
      })
      return lines.join('\n')
    }
    
    if (parsed.type === 'room_area') {
      const rooms = parsed.rooms || []
      let lines: string[] = []
      lines.push(`Kalkulator Ruangan (Lantai & Plafon): ${linkedVol.name}`)
      rooms.forEach((room: any) => {
        const length = parseFloat(room.length) || 0
        const width = parseFloat(room.width) || 0
        const area = length * width
        lines.push(`- ${room.label || 'Ruang'}: ${length}m x ${width}m = ${area.toFixed(2)} m²`)
      })
      return lines.join('\n')
    }
    
    if (parsed.type === 'simple') {
      return `Rumus Matematika: ${linkedVol.name} = ${parsed.data?.formula || '0'}`
    }
    
  } catch {}
  return `Dihubungkan ke Volume: ${linkedVol.name}`
}

export function BackupReport({
  project,
  wbsItems,
  volumes,
  projectVolumes,
  isPrint = false,
  activeCompanyLogo,
  activeCompanyName,
  activeReportHeader,
  activeOwnerParaf,
  activeOwnerName,
  parseFormulaToText
}: BackupReportProps): React.ReactElement {
  if (isPrint) {
    return (
      <section className="print-page pb-8" style={{ pageBreakBefore: 'always' }}>
        <ReportHeader
          title="BACKUP PERHITUNGAN VOLUME PEKERJAAN"
          project={project}
          activeCompanyLogo={activeCompanyLogo}
          activeCompanyName={activeCompanyName}
          activeReportHeader={activeReportHeader}
        />
        <table className="w-full border-collapse border border-slate-300 text-[9.5px] font-sans">
          <thead>
            <tr className="border-b-2 border-slate-900 text-[9px] font-bold uppercase tracking-wider text-slate-950 bg-white">
              <th className="border border-slate-300 py-2 px-1.5 text-center align-middle w-14 font-bold">No WBS</th>
              <th className="border border-slate-300 py-2 px-1.5 text-center align-middle font-bold w-1/4">Uraian Kategori & Pekerjaan</th>
              <th className="border border-slate-300 py-2 px-1.5 text-center align-middle w-16 font-bold">Volume</th>
              <th className="border border-slate-300 py-2 px-1.5 text-center align-middle w-14 font-bold">Satuan</th>
              <th className="border border-slate-300 py-2 px-1.5 text-center align-middle font-bold">Rincian Perhitungan (Formula)</th>
              <th className="border border-slate-300 py-2 px-1.5 text-center align-middle font-bold w-1/4">Catatan</th>
            </tr>
          </thead>
          <tbody>
            {wbsItems.map((item) => {
              const level = item.wbsPath ? item.wbsPath.split('.').length - 1 : 0
              
              if (item.type === 'group') {
                return (
                  <tr key={item.id} className="bg-slate-50 font-bold text-slate-950 border-b border-slate-300">
                    <td className="border border-slate-300 py-1.5 px-1.5 text-center font-mono text-[9px]">{item.code}</td>
                    <td colSpan={5} className="border border-slate-300 py-1.5 px-1.5 uppercase text-[9px] tracking-wide" style={{ paddingLeft: `${6 + level * 12}px` }}>
                      {item.name}
                    </td>
                  </tr>
                )
              }

              const volItem = volumes.find(v => v.wbsItemId === item.id)
              const linkedVol = volItem?.projectVolumeId 
                ? projectVolumes.find(pv => pv.id === volItem.projectVolumeId) 
                : null

              const volume = volItem ? volItem.volume : 0
              const unit = volItem ? volItem.unit : (item.unit || '-')
              
              const formulaSrc = linkedVol ? linkedVol.formula : (volItem?.formula || '')
              const notesText = linkedVol 
                ? `Tautan Volume Bersama: ${linkedVol.name}` 
                : (volItem?.notes || '-')
              
              const hasBackup = formulaSrc && formulaSrc.trim().startsWith('{')
              const formulaText = linkedVol 
                ? parseLinkedVolumeToText(volItem, linkedVol, projectVolumes)
                : (hasBackup ? parseFormulaToText(formulaSrc) : 'Manual Input')

              return (
                <tr key={item.id} className="bg-white">
                  <td className="border border-slate-300 py-1.5 px-1.5 text-center font-mono text-[9px] text-slate-400">{item.code}</td>
                  <td className="border border-slate-300 py-1.5 px-1.5 text-slate-800 font-normal leading-tight" style={{ paddingLeft: `${6 + level * 12}px` }}>{item.name}</td>
                  <td className="border border-slate-300 py-1.5 px-1.5 text-right font-mono">{volume.toFixed(2)}</td>
                  <td className="border border-slate-300 py-1.5 px-1.5 text-center font-medium text-slate-500">{unit || '-'}</td>
                  <td className="border border-slate-300 py-1.5 px-1.5 text-left font-mono text-[8.5px] whitespace-pre-line leading-normal">
                    {formulaText}
                  </td>
                  <td className="border border-slate-300 py-1.5 px-1.5 text-left text-slate-600 text-[8.5px] whitespace-pre-line">{notesText}</td>
                </tr>
              )
            })}
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
        <h2 className="text-xl font-bold text-gray-900 tracking-wide font-sans">DAFTAR BACKUP PERHITUNGAN VOLUME</h2>
        <p className="text-sm text-gray-600 mt-1">{project?.name} &bull; {project?.location}</p>
      </div>
      <div className="overflow-x-auto">
        <table className="w-full text-sm">
          <thead>
            <tr className="bg-gray-50 border-b border-gray-200">
              <th className="table-header w-20 text-center">No WBS</th>
              <th className="table-header text-left w-1/4">Uraian Pekerjaan</th>
              <th className="table-header w-24 text-right">Volume</th>
              <th className="table-header w-20 text-center">Satuan</th>
              <th className="table-header text-left">Rincian Perhitungan (Formula)</th>
              <th className="table-header text-left w-1/4">Catatan / Keterangan</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-100">
            {wbsItems.map((item) => {
              const level = item.wbsPath ? item.wbsPath.split('.').length - 1 : 0
              
              if (item.type === 'group') {
                return (
                  <tr key={item.id} className="bg-slate-50/80 font-bold text-slate-800 text-xs">
                    <td className="px-4 py-2 font-mono text-center">{item.code}</td>
                    <td colSpan={5} className="px-4 py-2 uppercase tracking-wider" style={{ paddingLeft: `${level * 16}px` }}>
                      {item.name}
                    </td>
                  </tr>
                )
              }

              const volItem = volumes.find(v => v.wbsItemId === item.id)
              const linkedVol = volItem?.projectVolumeId 
                ? projectVolumes.find(pv => pv.id === volItem.projectVolumeId) 
                : null

              const volume = volItem ? volItem.volume : 0
              const unit = volItem ? volItem.unit : (item.unit || '-')
              
              const formulaSrc = linkedVol ? linkedVol.formula : (volItem?.formula || '')
              const notesText = linkedVol 
                ? `Tautan Volume Bersama: ${linkedVol.name}` 
                : (volItem?.notes || '-')
              
              const hasBackup = formulaSrc && formulaSrc.trim().startsWith('{')
              const formulaText = linkedVol 
                ? parseLinkedVolumeToText(volItem, linkedVol, projectVolumes)
                : (hasBackup ? parseFormulaToText(formulaSrc) : 'Manual Input')

              return (
                <tr key={item.id} className="hover:bg-gray-50/50">
                  <td className="table-cell text-center text-gray-400 font-mono text-xs">{item.code}</td>
                  <td className="table-cell font-medium text-gray-800" style={{ paddingLeft: `${level * 16}px` }}>{item.name}</td>
                  <td className="table-cell text-right font-mono font-semibold">{volume.toFixed(2)}</td>
                  <td className="table-cell text-center text-gray-600 font-semibold">{unit || '-'}</td>
                  <td className="table-cell font-mono text-xs text-gray-700 whitespace-pre-line leading-relaxed">
                    {linkedVol || hasBackup ? (
                      <span className="text-amber-700 bg-amber-50/50 border border-amber-100 rounded px-1.5 py-0.5 inline-block font-sans mt-0.5">
                        {formulaText}
                      </span>
                    ) : (
                      <span className="text-gray-400 italic font-sans">{formulaText}</span>
                    )}
                  </td>
                  <td className="table-cell text-gray-600 text-xs whitespace-pre-line">{notesText}</td>
                </tr>
              )
            })}
          </tbody>
        </table>
      </div>
    </div>
  )
}
