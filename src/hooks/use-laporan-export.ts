import { useState } from 'react'
import type { Project, WbsItem, VolumeItem } from '../types/models'
import type { RabCalculation } from '../stores/rab-store'

interface UseLaporanExportProps {
  project?: Project
  calculation: RabCalculation | null
  wbsItems: WbsItem[]
  volumes: VolumeItem[]
  ahsList: any[]
  detailedAhsList: any[]
  bomItems: any[]
  ppn: number
  overhead: number
  getGroupSubtotal: (path: string) => number
}

export function useLaporanExport({
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
}: UseLaporanExportProps) {
  const [exporting, setExporting] = useState(false)
  const [exportingPdf, setExportingPdf] = useState(false)

  const handleExportExcel = async () => {
    if (!project || !calculation) return
    setExporting(true)

    try {
      const exportLineItems = wbsItems.map(item => {
        const isGroup = item.type === 'group'
        const subtotal = isGroup ? getGroupSubtotal(item.wbsPath) : 0
        const volItem = !isGroup ? volumes.find(v => v.wbsItemId === item.id) : null
        const volume = volItem?.volume ?? 0
        const unit = volItem?.unit || item.unit
        
        const calcItem = !isGroup ? calculation?.lineItems?.find(li => li.wbsItemId === item.id) : null
        let unitPrice = calcItem?.unitPrice ?? 0
        if (!isGroup && !calcItem && volItem?.ahsId) {
          const matchedAhs = ahsList.find(a => a.id === volItem.ahsId)
          unitPrice = matchedAhs?.totalPrice ?? 0
        }
        const totalPrice = isGroup ? subtotal : (volume * unitPrice)

        return {
          id: item.id,
          isGroup,
          level: item.wbsPath ? item.wbsPath.split('.').length - 1 : 0,
          wbsCode: item.code,
          wbsName: item.name,
          ahsCode: calcItem?.ahsCode ?? (volItem?.ahsId ? (ahsList.find(a => a.id === volItem.ahsId)?.code ?? '') : ''),
          volume: isGroup ? 0 : volume,
          unit: isGroup ? '' : (unit || ''),
          unitPrice: isGroup ? 0 : unitPrice,
          totalPrice
        }
      })

      const result = await window.api.rab.exportExcel({
        projectName: project.name,
        location: project.location,
        year: project.year,
        ppn,
        overhead,
        lineItems: exportLineItems,
        detailedAhsList,
        bomItems
      })

      if (result.success) {
        alert(`Laporan berhasil diekspor ke:\n${result.data?.filePath}`)
      } else {
        alert(`Gagal mengekspor laporan: ${result.error}`)
      }
    } catch (err: any) {
      console.error('Error exporting Excel:', err)
      alert(`Terjadi kesalahan: ${err.message}`)
    } finally {
      setExporting(false)
    }
  }

  const handleExportPdf = async () => {
    if (!project) return
    setExportingPdf(true)
    try {
      const result = await window.api.rab.exportPdf(project.name)
      if (result.success) {
        alert(`Laporan PDF berhasil diekspor ke:\n${result.data?.filePath}`)
      } else if (result.error !== 'Ekspor dibatalkan oleh pengguna') {
        alert(`Gagal mengekspor PDF: ${result.error}`)
      }
    } catch (err) {
      console.error('Error exporting PDF:', err)
      alert(`Terjadi kesalahan: ${(err as Error).message}`)
    } finally {
      setExportingPdf(false)
    }
  }

  const handlePrint = () => {
    window.print()
  }

  return {
    exporting,
    exportingPdf,
    handleExportExcel,
    handleExportPdf,
    handlePrint
  }
}
