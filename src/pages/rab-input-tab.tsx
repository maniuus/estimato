import React, { useState, useEffect } from 'react'
import { useWbsStore } from '../stores/wbs-store'
import { useVolumeStore } from '../stores/volume-store'
import { useProjectVolumeStore } from '../stores/project-volume-store'
import { useAhsStore } from '../stores/ahs-store'
import { useProjectStore } from '../stores/project-store'
import { useRabStore } from '../stores/rab-store'
import { formatCurrency } from '../lib/format'
import { VolumeCalculatorModal } from '../components/volume-calculator'
import { RabWbsRow } from '../components/rab/rab-wbs-row'
import { RabSummaryCard } from '../components/rab/rab-summary-card'
import { RabSidebarVolume } from '../components/rab/rab-sidebar-volume'
import type { WbsItem } from '../types/models'
import { Layers, Link2, Plus, Info, LayoutGrid } from 'lucide-react'

interface RabInputTabProps {
  projectId: string
}

export function RabInputTab({ projectId }: RabInputTabProps): React.ReactElement {
  const { items: wbsItems, loadByProject: loadWbs, createItem, deleteItem } = useWbsStore()
  const { items: volumes, loadByProject: loadVolumes, upsert: upsertVolume } = useVolumeStore()
  const { items: projectVolumes, loadByProject: loadProjectVolumes } = useProjectVolumeStore()
  const { ahsList, loadLibrary } = useAhsStore()
  const { projects } = useProjectStore()
  const { calculation, calculate, latestSnapshot, loadLatest } = useRabStore()

  const project = projects.find(p => p.id === projectId)
  const ppn = project?.ppn ?? 11
  const overhead = project?.overhead ?? 0

  // Calculator Modal States
  const [calculatorOpen, setCalculatorOpen] = useState(false)
  const [selectedVolItem, setSelectedVolItem] = useState<any | null>(null)

  // Sidebar Volume Bersama States
  const [sidebarOpen, setSidebarOpen] = useState(true)
  const [activeWbsItemId, setActiveWbsItemId] = useState<string | null>(null)

  useEffect(() => {
    loadWbs(projectId)
    loadVolumes(projectId)
    loadProjectVolumes(projectId)
    loadLibrary()
    loadLatest(projectId)
  }, [projectId])

  const rows = wbsItems.filter(i => i.type === 'item')
  const categories = wbsItems.filter(i => i.type === 'group')

  const getRabRowForWbs = (wbs: WbsItem) => {
    const volItem = volumes.find(v => v.wbsItemId === wbs.id)
    
    // Resolve shared volume value
    const linkedVol = volItem?.projectVolumeId 
      ? projectVolumes.find(pv => pv.id === volItem.projectVolumeId) 
      : null
    const volVal = linkedVol ? linkedVol.value : (volItem?.volume ?? 0)

    const calcItem = calculation?.lineItems?.find(li => li.wbsItemId === wbs.id)
    let unitPrice = calcItem?.unitPrice ?? 0
    if (!calcItem && volItem?.ahsId) {
      const matchedAhs = ahsList.find(a => a.id === volItem.ahsId)
      unitPrice = matchedAhs?.totalPrice ?? 0
    }
    const totalPrice = volVal * unitPrice

    return {
      wbsItemId: wbs.id,
      code: wbs.code,
      name: wbs.name,
      unit: volItem?.unit || wbs.unit || '',
      volume: volVal,
      ahsId: volItem?.ahsId ?? null,
      ahsCode: calcItem?.ahsCode ?? (volItem?.ahsId ? (ahsList.find(a => a.id === volItem.ahsId)?.code ?? '') : ''),
      ahsName: calcItem?.ahsName ?? (volItem?.ahsId ? (ahsList.find(a => a.id === volItem.ahsId)?.name ?? '') : ''),
      unitPrice,
      totalPrice,
      parentId: wbs.parentId
    }
  }

  const getGroupSubtotal = (groupWbsPath: string) => {
    const leaves = wbsItems.filter(i => 
      i.type === 'item' && 
      (i.wbsPath === groupWbsPath || i.wbsPath.startsWith(groupWbsPath + '.'))
    )
    return leaves.reduce((sum, leaf) => {
      const rowData = getRabRowForWbs(leaf)
      return sum + rowData.totalPrice
    }, 0)
  }

  const handleAddCategory = async () => {
    const rootCategories = wbsItems.filter(i => i.type === 'group' && !i.parentId)
    await createItem({
      projectId,
      name: `Kategori Baru ${rootCategories.length + 1}`,
      type: 'group',
      unit: '',
      parentId: null,
      sortOrder: rootCategories.length + 1
    })
    calculate(projectId, ppn, overhead)
  }

  const handleAddSubCategory = async (parentId: string) => {
    const parent = wbsItems.find(i => i.id === parentId)
    if (!parent) return
    const siblings = wbsItems.filter(i => i.parentId === parentId && i.type === 'group')
    await createItem({
      projectId,
      name: `Sub-Kategori Baru ${siblings.length + 1}`,
      type: 'group',
      unit: '',
      parentId,
      sortOrder: siblings.length + 1
    })
    calculate(projectId, ppn, overhead)
  }

  const handleAddSubRow = async (parentId: string) => {
    const parent = wbsItems.find(i => i.id === parentId)
    if (!parent) return
    const siblings = wbsItems.filter(i => i.parentId === parentId)
    await createItem({
      projectId,
      name: `Pekerjaan Baru ${siblings.length + 1}`,
      type: 'item',
      unit: 'm³',
      parentId,
      sortOrder: siblings.length + 1
    })
    calculate(projectId, ppn, overhead)
  }

  const handleDeleteRow = async (id: string) => {
    if (confirm('Apakah Anda yakin ingin menghapus item/kategori ini beserta seluruh isinya?')) {
      await deleteItem(id)
      calculate(projectId, ppn, overhead)
    }
  }

  const handleTriggerCalculator = (row: any) => {
    setSelectedVolItem(row)
    setCalculatorOpen(true)
  }

  const handleApplyCalculator = async (volume: number, formula: string, notes: string, projectVolumeId?: string | null) => {
    if (!selectedVolItem) return
    const volItem = volumes.find(v => v.wbsItemId === selectedVolItem.wbsItemId)
    await upsertVolume(selectedVolItem.wbsItemId, {
      volume,
      ahsId: volItem?.ahsId ?? null,
      unit: selectedVolItem.unit || '',
      formula,
      notes,
      projectVolumeId: projectVolumeId ?? null
    })
    await loadVolumes(projectId)
    calculate(projectId, ppn, overhead)
    setCalculatorOpen(false)
  }

  const grandTotalCalculated = calculation?.grandTotal ?? 0

  return (
    <div className="space-y-4">
      {/* Top Banner & Quick Add Category */}
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center bg-white p-5 rounded-xl border border-slate-100 gap-4 shadow-sm">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-indigo-50 flex items-center justify-center text-primary-600 border border-indigo-100">
            <LayoutGrid className="w-5 h-5" />
          </div>
          <div>
            <span className="text-[10px] text-slate-400 font-bold block uppercase tracking-wider">STRUKTUR RENCANA ANGGARAN BIAYA (WBS)</span>
            <h3 className="text-base font-extrabold text-slate-800 tracking-tight">Daftar Divisi, Sub-Pekerjaan, & Volume Backup</h3>
          </div>
        </div>
        <div className="flex items-center gap-5 w-full md:w-auto justify-between md:justify-end border-t md:border-t-0 pt-3 md:pt-0 border-slate-100">
          <div className="text-right">
            <span className="text-[10px] text-slate-400 font-bold block uppercase tracking-wider">Total RAB Proyek (Inc. PPN & OH)</span>
            <span className="text-xl font-extrabold text-primary-600 font-mono tracking-tight">{formatCurrency(grandTotalCalculated)}</span>
          </div>
          <div className="flex gap-2">
            <button
              type="button"
              onClick={() => setSidebarOpen(prev => !prev)}
              className={`flex items-center gap-1.5 text-xs px-3 py-2 border rounded-lg font-bold transition-all duration-150 shadow-sm ${
                sidebarOpen 
                  ? 'bg-indigo-50/70 border-indigo-100 text-indigo-700 hover:bg-indigo-100/50' 
                  : 'bg-white border-slate-200 text-slate-700 hover:bg-slate-50'
              }`}
            >
              <Link2 className="w-3.5 h-3.5" />
              <span>{sidebarOpen ? 'Tutup Panel Volume' : 'Volume Bersama'}</span>
            </button>
            <button 
              onClick={handleAddCategory}
              className="btn-primary flex items-center gap-1.5 text-xs px-3.5 py-2 font-bold shadow-sm rounded-lg"
            >
              <Plus className="w-3.5 h-3.5" />
              <span>Lantai / Bagian</span>
            </button>
          </div>
        </div>
      </div>

      <div className="flex gap-4 items-stretch h-full w-full">
        <div className="flex-1 card min-h-[500px] flex flex-col justify-between overflow-hidden bg-white border border-slate-100/80 shadow-sm">
          <div className="overflow-x-auto flex-1">
            <table className="w-full border-collapse">
              <thead>
                <tr className="bg-slate-50/60 border-b border-slate-100">
                  <th className="px-3 py-3 text-center text-[10px] font-bold text-slate-400 uppercase tracking-wider w-16">No WBS</th>
                  <th className="px-3 py-3 text-left text-[10px] font-bold text-slate-400 uppercase tracking-wider">Uraian Kategori & Item Pekerjaan / Referensi AHS</th>
                  <th className="px-3 py-3 text-left text-[10px] font-bold text-slate-400 uppercase tracking-wider w-24">Volume</th>
                  <th className="px-3 py-3 text-center text-[10px] font-bold text-slate-400 uppercase tracking-wider w-16">Satuan</th>
                  <th className="px-3 py-3 text-right text-[10px] font-bold text-slate-400 uppercase tracking-wider w-28">Harga Satuan</th>
                  <th className="px-3 py-3 text-right text-[10px] font-bold text-slate-400 uppercase tracking-wider w-32">Jumlah Biaya</th>
                  <th className="px-3 py-3 text-center text-[10px] font-bold text-slate-400 uppercase tracking-wider w-20">Aksi</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 bg-white">
                {wbsItems.map((item) => {
                  const level = item.wbsPath ? item.wbsPath.split('.').length - 1 : 0
                  return (
                    <RabWbsRow
                      key={item.id}
                      item={item}
                      level={level}
                      projectId={projectId}
                      ppn={ppn}
                      overhead={overhead}
                      categories={categories}
                      volumes={volumes}
                      projectVolumes={projectVolumes}
                      ahsList={ahsList}
                      calculation={calculation}
                      activeWbsItemId={activeWbsItemId}
                      onSelectWbsItem={setActiveWbsItemId}
                      getRabRowForWbs={getRabRowForWbs}
                      getGroupSubtotal={getGroupSubtotal}
                      onAddSubCategory={handleAddSubCategory}
                      onAddSubRow={handleAddSubRow}
                      onDeleteRow={handleDeleteRow}
                    />
                  )
                })}

                {wbsItems.length === 0 && (
                  <tr>
                    <td colSpan={7} className="text-center py-12 text-gray-400 text-sm italic">
                      Belum ada item pekerjaan atau kategori di proyek ini. Klik "+ Tambah Lantai / Bagian" untuk memulai.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>

          <RabSummaryCard
            calculation={calculation}
            ppn={ppn}
            overhead={overhead}
          />
        </div>

        {sidebarOpen && (
          <RabSidebarVolume
            projectId={projectId}
            activeWbsItemId={activeWbsItemId}
            ppn={ppn}
            overhead={overhead}
            onClose={() => setSidebarOpen(false)}
          />
        )}
      </div>

      {/* Volume Calculator Modal overlay */}
      <VolumeCalculatorModal
        isOpen={calculatorOpen}
        onClose={() => setCalculatorOpen(false)}
        onApply={handleApplyCalculator}
        initialFormula={selectedVolItem ? (volumes.find(v => v.wbsItemId === selectedVolItem.wbsItemId)?.formula || '') : ''}
        initialNotes={selectedVolItem ? (volumes.find(v => v.wbsItemId === selectedVolItem.wbsItemId)?.notes || '') : ''}
        unit={selectedVolItem?.unit || ''}
        projectId={projectId}
        initialProjectVolumeId={selectedVolItem ? (volumes.find(v => v.wbsItemId === selectedVolItem.wbsItemId)?.projectVolumeId || null) : null}
      />
    </div>
  )
}
