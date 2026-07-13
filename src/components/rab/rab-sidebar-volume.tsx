import React, { useState, useEffect } from 'react'
import { useProjectVolumeStore } from '../../stores/project-volume-store'
import { useVolumeStore } from '../../stores/volume-store'
import { useRabStore } from '../../stores/rab-store'
import { getProfileSteelWeights, diameterOptions } from '../volume-calculator/helpers'

interface RabSidebarVolumeProps {
  projectId: string
  activeWbsItemId: string | null
  ppn: number
  overhead: number
  onClose: () => void
}

type DisciplineTab = 'struktur' | 'arsitektur' | 'mep'

export function RabSidebarVolume({
  projectId,
  activeWbsItemId,
  ppn,
  overhead,
  onClose
}: RabSidebarVolumeProps): React.ReactElement {
  const { items: projectVolumes, loadByProject, upsert, deleteItem } = useProjectVolumeStore()
  const { items: volumes, upsert: upsertVolume, loadByProject: loadVolumes } = useVolumeStore()
  const { calculate } = useRabStore()

  // Navigation Tabs
  const [activeTab, setActiveTab] = useState<DisciplineTab>('struktur')
  const [expandedId, setExpandedId] = useState<string | null>(null)
  
  // Quick Add Input States
  const [newVarName, setNewVarName] = useState('')
  const [newVarType, setNewVarType] = useState<'simple' | 'wall_area' | 'room_area'>('simple')
  const [strukturAddType, setStrukturAddType] = useState<'profile' | 'variable'>('profile')
  const [strukturAddName, setStrukturAddName] = useState('')

  useEffect(() => {
    loadByProject(projectId)
  }, [projectId])

  const handleCreateVolume = async (e: React.FormEvent, type: 'profile' | 'variable') => {
    e.preventDefault()
    
    if (type === 'profile') {
      const nameToUse = strukturAddName.trim()
      if (!nameToUse) return
      const sanitized = nameToUse.replace(/\s+/g, '_')
      
      const defaultProfile = {
        type: 'structural_profile',
        b: '200',
        h: '300',
        c: '40',
        mainRebarRows: [
          { id: '1', position: 'Atas', diameter: 'D13', qty: '2' },
          { id: '2', position: 'Tengah', diameter: 'D10', qty: '0' },
          { id: '3', position: 'Bawah', diameter: 'D13', qty: '3' }
        ],
        stirrupDia: 'Ø8',
        stirrupMode: 'uniform',
        stirrupSpacing: '150',
        stirrupSpacingTumpuan: '100',
        stirrupSpacingLapangan: '150',
        segments: [
          { id: 'seg1', label: 'As A-B', length: '4.0' }
        ]
      }

      const success = await upsert(projectId, {
        name: sanitized,
        unit: 'm³',
        value: 0.24,
        formula: JSON.stringify(defaultProfile),
        notes: 'global_profile'
      })

      if (success) {
        setStrukturAddName('')
        loadByProject(projectId)
      }
    } else {
      const nameToUse = activeTab === 'struktur' ? strukturAddName.trim() : newVarName.trim()
      if (!nameToUse) return
      const sanitized = nameToUse.replace(/\s+/g, '_')
      
      let formula = ''
      let initialValue = 0
      let unit = 'm³'

      if (activeTab === 'struktur') {
        formula = JSON.stringify({ type: 'structural_group', profileIds: [] })
        initialValue = 0
        unit = 'm³'
      } else if (activeTab === 'arsitektur') {
        if (newVarType === 'wall_area') {
          formula = JSON.stringify({
            type: 'wall_area',
            walls: [
              { id: 'w1', label: 'Dinding 1', length: '4.0', height: '3.0', openings: [] }
            ]
          })
          initialValue = 12.0
          unit = 'm²'
        } else if (newVarType === 'room_area') {
          formula = JSON.stringify({
            type: 'room_area',
            rooms: [
              { id: 'r1', label: 'R. Tamu', length: '4.0', width: '3.0' }
            ]
          })
          initialValue = 12.0
          unit = 'm²'
        } else {
          formula = JSON.stringify({ type: 'simple', data: { formula: '0' } })
          initialValue = 0
          unit = 'm²'
        }
      } else {
        formula = JSON.stringify({ type: 'simple', data: { formula: '0' } })
        initialValue = 0
        unit = 'm'
      }

      const success = await upsert(projectId, {
        name: sanitized,
        unit,
        value: initialValue,
        formula,
        notes: activeTab
      })

      if (success) {
        if (activeTab === 'struktur') {
          setStrukturAddName('')
        } else {
          setNewVarName('')
        }
        loadByProject(projectId)
      }
    }
  }

  const handleDeleteVolume = async (id: string, name: string) => {
    if (confirm(`Hapus '${name}'? Seluruh baris WBS yang bertautan akan terputus.`)) {
      await deleteItem(id)
      loadByProject(projectId)
      loadVolumes(projectId)
      calculate(projectId, ppn, overhead)
    }
  }

  const getProfileValues = (pv: any) => {
    try {
      const parsed = JSON.parse(pv.formula)
      if (parsed.type === 'structural_profile') {
        const segments = parsed.segments || []
        const totalL = segments.reduce((sum: number, seg: any) => sum + (parseFloat(seg.length) || 0), 0)
        const b = parseFloat(parsed.b) || 0
        const h = parseFloat(parsed.h) || 0
        const concrete = (b / 1000) * (h / 1000) * totalL
        const w = getProfileSteelWeights(parsed, totalL)
        const steel = w.ulirWeight + w.polosWeight
        return { concrete, steel }
      }
    } catch {}
    return { concrete: 0, steel: 0 }
  }

  const getGroupValues = (pv: any) => {
    try {
      const parsed = JSON.parse(pv.formula)
      if (parsed.type === 'structural_group') {
        const profileIds = parsed.profileIds || []
        let totalConcrete = 0
        let totalSteel = 0

        profileIds.forEach((pid: string) => {
          const prof = projectVolumes.find(p => p.id === pid)
          if (prof) {
            const vals = getProfileValues(prof)
            totalConcrete += vals.concrete
            totalSteel += vals.steel
          }
        })

        return { concrete: totalConcrete, steel: totalSteel }
      }
    } catch {}
    return { concrete: 0, steel: 0 }
  }

  const handleLinkToWbs = async (pvId: string, outputType: 'beton' | 'besi' | 'simple' | 'wall' | 'room') => {
    if (!activeWbsItemId) {
      alert('Pilih baris pekerjaan WBS di sebelah kiri terlebih dahulu dengan mengklik kolom input volumenya!')
      return
    }

    const pv = projectVolumes.find(p => p.id === pvId)
    if (!pv) return

    const volItem = volumes.find(v => v.wbsItemId === activeWbsItemId)
    
    let resolvedVolume = pv.value
    let unit = pv.unit
    let formulaValue = ''

    if (activeTab === 'struktur' && (outputType === 'beton' || outputType === 'besi')) {
      const vals = getGroupValues(pv)
      if (outputType === 'besi') {
        resolvedVolume = vals.steel
        unit = 'kg'
        formulaValue = 'besi'
      } else {
        resolvedVolume = vals.concrete
        unit = 'm³'
        formulaValue = 'beton'
      }
    }

    await upsertVolume(activeWbsItemId, {
      volume: resolvedVolume,
      ahsId: volItem?.ahsId ?? null,
      unit: unit || volItem?.unit || '',
      formula: formulaValue,
      notes: `Tautan: ${pv.name} (${outputType === 'besi' ? 'Besi' : outputType === 'beton' ? 'Beton' : 'Variabel'})`,
      projectVolumeId: pvId
    })

    await loadVolumes(projectId)
    calculate(projectId, ppn, overhead)
  }

  const propagateProfileChanges = async (profileId: string) => {
    const structuralGroups = projectVolumes.filter(pv => {
      if (pv.notes !== 'struktur') return false
      try {
        const parsed = JSON.parse(pv.formula)
        return parsed.type === 'structural_group' && parsed.profileIds.includes(profileId)
      } catch {
        return false
      }
    })

    for (const group of structuralGroups) {
      const vals = getGroupValues(group)
      
      await upsert(projectId, {
        id: group.id,
        name: group.name,
        unit: group.unit,
        value: vals.concrete,
        formula: group.formula,
        notes: group.notes
      })

      const linkedWbsItems = volumes.filter(v => v.projectVolumeId === group.id)
      for (const volItem of linkedWbsItems) {
        const isBesi = volItem.formula === 'besi'
        const volumeToSet = isBesi ? vals.steel : vals.concrete

        await upsertVolume(volItem.wbsItemId, {
          volume: volumeToSet,
          ahsId: volItem.ahsId,
          unit: volItem.unit,
          formula: volItem.formula,
          notes: volItem.notes,
          projectVolumeId: group.id
        })
      }
    }
  }

  const handleUpdateProfile = async (id: string, updatedFields: any) => {
    const pv = projectVolumes.find(p => p.id === id)
    if (!pv) return

    try {
      const currentFormula = JSON.parse(pv.formula)
      const newFormulaObj = { ...currentFormula, ...updatedFields }
      const newFormulaStr = JSON.stringify(newFormulaObj)

      const segments = newFormulaObj.segments || []
      const totalL = segments.reduce((sum: number, seg: any) => sum + (parseFloat(seg.length) || 0), 0)
      const b = parseFloat(newFormulaObj.b) || 0
      const h = parseFloat(newFormulaObj.h) || 0
      const betonVolume = (b / 1000) * (h / 1000) * totalL

      await upsert(projectId, {
        id,
        name: pv.name,
        unit: pv.unit,
        value: betonVolume,
        formula: newFormulaStr,
        notes: pv.notes
      })

      await loadByProject(projectId)
      await propagateProfileChanges(id)
      await loadVolumes(projectId)
      calculate(projectId, ppn, overhead)
    } catch (e) {
      console.error(e)
    }
  }

  const handleToggleProfileInGroup = async (groupId: string, profileId: string) => {
    const group = projectVolumes.find(g => g.id === groupId)
    if (!group) return

    try {
      const parsed = JSON.parse(group.formula)
      let profileIds = parsed.profileIds || []

      if (profileIds.includes(profileId)) {
        profileIds = profileIds.filter((pid: string) => pid !== profileId)
      } else {
        profileIds = [...profileIds, profileId]
      }

      const newFormulaStr = JSON.stringify({ ...parsed, profileIds })
      
      let totalConcrete = 0
      profileIds.forEach((pid: string) => {
        const prof = projectVolumes.find(p => p.id === pid)
        if (prof) {
          totalConcrete += getProfileValues(prof).concrete
        }
      })

      await upsert(projectId, {
        id: groupId,
        name: group.name,
        unit: group.unit,
        value: totalConcrete,
        formula: newFormulaStr,
        notes: group.notes
      })

      await loadByProject(projectId)
      
      const linkedWbsItems = volumes.filter(v => v.projectVolumeId === groupId)
      for (const volItem of linkedWbsItems) {
        let totalVal = totalConcrete
        if (volItem.formula === 'besi') {
          let totalSteel = 0
          profileIds.forEach((pid: string) => {
            const prof = projectVolumes.find(p => p.id === pid)
            if (prof) {
              totalSteel += getProfileValues(prof).steel
            }
          })
          totalVal = totalSteel
        }

        await upsertVolume(volItem.wbsItemId, {
          volume: totalVal,
          ahsId: volItem.ahsId,
          unit: volItem.unit,
          formula: volItem.formula,
          notes: volItem.notes,
          projectVolumeId: groupId
        })
      }

      await loadVolumes(projectId)
      calculate(projectId, ppn, overhead)
    } catch (e) {
      console.error(e)
    }
  }

  const handleUpdateWallArea = async (groupId: string, updatedWalls: any[]) => {
    const pv = projectVolumes.find(p => p.id === groupId)
    if (!pv) return

    try {
      const currentFormula = JSON.parse(pv.formula)
      const newFormulaStr = JSON.stringify({
        ...currentFormula,
        walls: updatedWalls
      })

      let totalArea = 0
      updatedWalls.forEach((wall: any) => {
        const length = parseFloat(wall.length) || 0
        const height = parseFloat(wall.height) || 0
        const gross = length * height
        
        let openingSum = 0
        const openings = wall.openings || []
        openings.forEach((op: any) => {
          const opW = parseFloat(op.w) || 0
          const opH = parseFloat(op.h) || 0
          const opQty = parseFloat(op.qty) || 0
          openingSum += opW * opH * opQty
        })
        totalArea += Math.max(0, gross - openingSum)
      })

      await upsert(projectId, {
        id: groupId,
        name: pv.name,
        unit: pv.unit,
        value: totalArea,
        formula: newFormulaStr,
        notes: pv.notes
      })

      await loadByProject(projectId)

      const linkedWbsItems = volumes.filter(v => v.projectVolumeId === groupId)
      if (linkedWbsItems.length > 0) {
        for (const volItem of linkedWbsItems) {
          await upsertVolume(volItem.wbsItemId, {
            volume: totalArea,
            ahsId: volItem.ahsId,
            unit: volItem.unit,
            formula: volItem.formula,
            notes: volItem.notes,
            projectVolumeId: groupId
          })
        }
        await loadVolumes(projectId)
        calculate(projectId, ppn, overhead)
      }
    } catch (e) {
      console.error(e)
    }
  }

  const handleUpdateRoomArea = async (groupId: string, updatedRooms: any[]) => {
    const pv = projectVolumes.find(p => p.id === groupId)
    if (!pv) return

    try {
      const currentFormula = JSON.parse(pv.formula)
      const newFormulaStr = JSON.stringify({
        ...currentFormula,
        rooms: updatedRooms
      })

      let totalArea = 0
      updatedRooms.forEach((room: any) => {
        const length = parseFloat(room.length) || 0
        const width = parseFloat(room.width) || 0
        totalArea += length * width
      })

      await upsert(projectId, {
        id: groupId,
        name: pv.name,
        unit: pv.unit,
        value: totalArea,
        formula: newFormulaStr,
        notes: pv.notes
      })

      await loadByProject(projectId)

      const linkedWbsItems = volumes.filter(v => v.projectVolumeId === groupId)
      if (linkedWbsItems.length > 0) {
        for (const volItem of linkedWbsItems) {
          await upsertVolume(volItem.wbsItemId, {
            volume: totalArea,
            ahsId: volItem.ahsId,
            unit: volItem.unit,
            formula: volItem.formula,
            notes: volItem.notes,
            projectVolumeId: groupId
          })
        }
        await loadVolumes(projectId)
        calculate(projectId, ppn, overhead)
      }
    } catch (e) {
      console.error(e)
    }
  }

  const handleUpdateSimpleMath = async (id: string, formulaStr: string, name: string) => {
    try {
      const newFormulaStr = JSON.stringify({ type: 'simple', data: { formula: formulaStr } })
      const expression = formulaStr.replace(/[^0-9+\-*/().\s]/g, '')
      let val = 0
      try {
        val = new Function(`return (${expression})`)()
      } catch {
        val = 0
      }

      await upsert(projectId, {
        id,
        name,
        unit: activeTab === 'arsitektur' ? 'm²' : 'm',
        value: val,
        formula: newFormulaStr,
        notes: activeTab
      })
      await loadByProject(projectId)

      const linkedWbsItems = volumes.filter(v => v.projectVolumeId === id)
      if (linkedWbsItems.length > 0) {
        for (const volItem of linkedWbsItems) {
          await upsertVolume(volItem.wbsItemId, {
            volume: val,
            ahsId: volItem.ahsId,
            unit: volItem.unit,
            formula: volItem.formula,
            notes: volItem.notes,
            projectVolumeId: id
          })
        }
        await loadVolumes(projectId)
        calculate(projectId, ppn, overhead)
      }
    } catch (e) {
      console.error(e)
    }
  }

  const globalProfiles = projectVolumes.filter(pv => pv.notes === 'global_profile')
  const structuralGroups = projectVolumes.filter(pv => pv.notes === 'struktur')
  const arsitekturVars = projectVolumes.filter(pv => pv.notes === 'arsitektur')
  const mepVars = projectVolumes.filter(pv => pv.notes === 'mep')

  return (
    <div className="w-80 h-full border-l border-slate-200 bg-slate-50 flex flex-col font-sans text-[11px] no-print select-none">
      {/* Discipline Tabs */}
      <div className="bg-white border-b border-slate-200 p-1 flex shadow-sm">
        {(['struktur', 'arsitektur', 'mep'] as DisciplineTab[]).map(tab => (
          <button
            key={tab}
            type="button"
            onClick={() => {
              setActiveTab(tab)
              setExpandedId(null)
            }}
            className={`flex-1 py-1 text-center font-extrabold uppercase tracking-wider transition-all duration-100 rounded text-[10px] ${
              activeTab === tab
                ? 'bg-slate-900 text-white shadow-xs'
                : 'text-slate-500 hover:text-slate-800 hover:bg-slate-50'
            }`}
          >
            {tab}
          </button>
        ))}
      </div>

      {/* Lists View (Scrollable) */}
      <div className="flex-1 overflow-y-auto p-2.5 space-y-3.5">
        {activeTab === 'struktur' ? (
          <>
            {/* Section A: Global Concrete Profiles */}
            <div className="space-y-1.5">
              <span className="font-extrabold text-[10px] text-slate-500 uppercase tracking-wider block">🧱 Profil Struktur (Global):</span>
              {globalProfiles.length === 0 ? (
                <div className="bg-white border border-slate-200 border-dashed rounded-lg p-2 text-center text-slate-400 italic text-[10px]">
                  Belum ada profil.
                </div>
              ) : (
                globalProfiles.map(pv => {
                  const isExpanded = expandedId === pv.id
                  let formulaData: any = null
                  try {
                    formulaData = JSON.parse(pv.formula)
                  } catch {}

                  const vals = getProfileValues(pv)

                  return (
                    <div key={pv.id} className="bg-white rounded-lg border border-slate-200 shadow-2xs overflow-hidden">
                      <div
                        onClick={() => setExpandedId(isExpanded ? null : pv.id)}
                        className="py-1 px-2 flex justify-between items-center cursor-pointer hover:bg-slate-50"
                      >
                        <div className="flex items-center gap-1.5">
                          <span className="font-bold text-slate-850 text-[11px] font-mono bg-slate-100 px-1 py-0.2 rounded">
                            {pv.name}
                          </span>
                          <span className="text-[10px] text-slate-400 font-semibold font-mono">
                            {vals.concrete.toFixed(2)}m³ / {vals.steel.toFixed(1)}kg
                          </span>
                        </div>
                        <div className="flex items-center gap-1.5">
                          <button
                            type="button"
                            onClick={(e) => {
                              e.stopPropagation()
                              handleDeleteVolume(pv.id, pv.name)
                            }}
                            className="text-slate-400 hover:text-red-500 font-bold p-0.5 text-[11px]"
                          >
                            ✕
                          </button>
                          <span className="text-slate-400 text-[9px]">{isExpanded ? '▲' : '▼'}</span>
                        </div>
                      </div>

                      {isExpanded && formulaData && (
                        <div className="p-2 border-t border-slate-100 bg-slate-50/30 space-y-2 text-[10px]">
                          {/* Dimensions */}
                          <div className="flex gap-1.5 items-center">
                            <span className="font-bold text-slate-500 w-14 text-[9px] uppercase">Penampang</span>
                            <div className="flex gap-1 items-center flex-1">
                              <input
                                type="number"
                                value={formulaData.b}
                                onChange={e => handleUpdateProfile(pv.id, { b: e.target.value })}
                                className="w-12 px-1 py-0.5 border border-slate-250 rounded font-mono text-center text-[10px]"
                                placeholder="b"
                              />
                              <span className="text-[9px] text-slate-400">x</span>
                              <input
                                type="number"
                                value={formulaData.h}
                                onChange={e => handleUpdateProfile(pv.id, { h: e.target.value })}
                                className="w-12 px-1 py-0.5 border border-slate-250 rounded font-mono text-center text-[10px]"
                                placeholder="h"
                              />
                              <span className="text-[9px] text-slate-400">c</span>
                              <input
                                type="number"
                                value={formulaData.c}
                                onChange={e => handleUpdateProfile(pv.id, { c: e.target.value })}
                                className="w-10 px-1 py-0.5 border border-slate-250 rounded font-mono text-center text-[10px]"
                                placeholder="c"
                              />
                              <span className="text-[9px] text-slate-400">mm</span>
                            </div>
                          </div>

                          {/* Rebar Specs */}
                          <div className="space-y-1 bg-white p-1.5 rounded border border-slate-150">
                            <span className="font-semibold text-slate-600 text-[9px] uppercase block mb-0.5">Tulangan:</span>
                            {(() => {
                              const mainRows = [...(formulaData.mainRebarRows || [])]
                              if (!mainRows.some(r => r.position === 'Tengah')) {
                                mainRows.splice(1, 0, { id: 'tengah', position: 'Tengah', diameter: 'D10', qty: '0' })
                              }
                              return mainRows.map((row: any, rIdx: number) => (
                                <div key={row.id} className="flex gap-1.5 items-center">
                                  <span className="w-10 text-[9px] text-slate-400 uppercase font-semibold">{row.position}</span>
                                  <select
                                    value={row.diameter}
                                    onChange={e => {
                                      const nextRows = [...mainRows]
                                      nextRows[rIdx].diameter = e.target.value
                                      handleUpdateProfile(pv.id, { mainRebarRows: nextRows })
                                    }}
                                    className="w-16 px-0.5 py-0.2 border border-slate-200 rounded text-[10px] bg-slate-50 font-mono"
                                  >
                                    {diameterOptions.map(opt => (
                                      <option key={opt} value={opt}>{opt}</option>
                                    ))}
                                  </select>
                                  <input
                                    type="number"
                                    value={row.qty}
                                    onChange={e => {
                                      const nextRows = [...mainRows]
                                      nextRows[rIdx].qty = e.target.value
                                      handleUpdateProfile(pv.id, { mainRebarRows: nextRows })
                                    }}
                                    className="w-10 px-0.5 py-0.2 border border-slate-200 rounded font-mono text-center text-[10px]"
                                  />
                                </div>
                              ))
                            })()}
                            
                            {/* Stirrup */}
                            <div className="flex gap-1.5 items-center border-t border-slate-100 pt-1 mt-1">
                              <span className="w-10 text-[9px] text-slate-400 uppercase font-semibold">Begel</span>
                              <select
                                value={formulaData.stirrupDia}
                                onChange={e => handleUpdateProfile(pv.id, { stirrupDia: e.target.value })}
                                className="w-16 px-0.5 py-0.2 border border-slate-200 rounded text-[10px] bg-slate-50 font-mono"
                              >
                                {diameterOptions.filter(d => d.startsWith('Ø')).map(opt => (
                                  <option key={opt} value={opt}>{opt}</option>
                                ))}
                              </select>
                              <span className="text-gray-405 font-bold">@</span>
                              <input
                                type="number"
                                value={formulaData.stirrupSpacing}
                                onChange={e => handleUpdateProfile(pv.id, { stirrupSpacing: e.target.value })}
                                className="w-12 px-0.5 py-0.2 border border-slate-200 rounded font-mono text-center text-[10px]"
                              />
                              <span className="text-[9px] text-slate-400">mm</span>
                            </div>
                          </div>

                          {/* Segments L */}
                          <div className="space-y-1 bg-white p-1.5 rounded border border-slate-150">
                            <span className="font-bold text-[9px] text-slate-500 uppercase block mb-0.5">Segmen L (m):</span>
                            <div className="space-y-1 max-h-24 overflow-y-auto">
                              {(formulaData.segments || []).map((seg: any, idx: number) => (
                                <div key={seg.id} className="flex gap-1.5 items-center">
                                  <input
                                    type="text"
                                    value={seg.label}
                                    onChange={e => {
                                      const nextSegs = [...formulaData.segments]
                                      nextSegs[idx].label = e.target.value
                                      handleUpdateProfile(pv.id, { segments: nextSegs })
                                    }}
                                    className="flex-1 px-1.5 py-0.2 border border-slate-200 rounded text-[10px]"
                                    placeholder="Label"
                                  />
                                  <input
                                    type="number"
                                    step="any"
                                    value={seg.length}
                                    onChange={e => {
                                      const nextSegs = [...formulaData.segments]
                                      nextSegs[idx].length = e.target.value
                                      handleUpdateProfile(pv.id, { segments: nextSegs })
                                    }}
                                    className="w-12 px-1.5 py-0.2 border border-slate-200 rounded font-mono text-right text-[10px]"
                                  />
                                  <button
                                    type="button"
                                    onClick={() => {
                                      const nextSegs = formulaData.segments.filter((s: any) => s.id !== seg.id)
                                      handleUpdateProfile(pv.id, { segments: nextSegs })
                                    }}
                                    disabled={formulaData.segments.length <= 1}
                                    className="text-red-500 font-bold p-0.5 hover:bg-slate-100 rounded disabled:opacity-30 text-[10px]"
                                  >
                                    ✕
                                  </button>
                                </div>
                              ))}
                            </div>
                            <button
                              type="button"
                              onClick={() => {
                                const nextSegs = [
                                  ...(formulaData.segments || []),
                                  { id: String(Date.now()), label: `Segmen ${formulaData.segments.length + 1}`, length: '3.0' }
                                ]
                                handleUpdateProfile(pv.id, { segments: nextSegs })
                              }}
                              className="w-full py-0.5 border border-dashed border-slate-200 text-slate-500 hover:bg-slate-50 font-bold text-[9px] rounded flex justify-center items-center"
                            >
                              +
                            </button>
                          </div>
                        </div>
                      )}
                    </div>
                  )
                })
              )}
            </div>

            {/* Section B: Linkable Structural Groups */}
            <div className="space-y-1.5 border-t border-slate-200 pt-2.5">
              <span className="font-extrabold text-[10px] text-slate-500 uppercase tracking-wider block">🔗 Variabel Pekerjaan (WBS Link):</span>
              {structuralGroups.length === 0 ? (
                <div className="bg-white border border-slate-200 border-dashed rounded-lg p-2 text-center text-slate-400 italic text-[10px]">
                  Belum ada variabel pekerjaan.
                </div>
              ) : (
                structuralGroups.map(pv => {
                  const isExpanded = expandedId === pv.id
                  let formulaData: any = null
                  try {
                    formulaData = JSON.parse(pv.formula)
                  } catch {}

                  const vals = getGroupValues(pv)
                  const checkedIds = formulaData?.profileIds || []

                  return (
                    <div key={pv.id} className="bg-white rounded-lg border border-slate-200 shadow-2xs overflow-hidden">
                      <div
                        onClick={() => setExpandedId(isExpanded ? null : pv.id)}
                        className="py-1 px-2 flex justify-between items-center cursor-pointer hover:bg-slate-50"
                      >
                        <div className="space-y-0.5">
                          <span className="font-bold text-slate-800 text-[11px] block font-mono bg-blue-50/50 border border-blue-150 px-1 py-0.2 rounded w-fit">
                            {pv.name}
                          </span>
                          <span className="text-[10px] text-slate-400 font-semibold font-mono">
                            {vals.concrete.toFixed(2)}m³ / {vals.steel.toFixed(1)}kg
                          </span>
                        </div>
                        <div className="flex items-center gap-1.5">
                          <button
                            type="button"
                            onClick={(e) => {
                              e.stopPropagation()
                              handleDeleteVolume(pv.id, pv.name)
                            }}
                            className="text-slate-400 hover:text-red-500 font-bold p-0.5 text-[11px]"
                          >
                            ✕
                          </button>
                          <span className="text-slate-400 text-[9px]">{isExpanded ? '▲' : '▼'}</span>
                        </div>
                      </div>

                      {isExpanded && formulaData && (
                        <div className="p-2 border-t border-slate-100 bg-slate-50/30 space-y-2">
                          {/* Profiles Selector Pills */}
                          <div className="bg-white p-1.5 rounded border border-slate-200">
                            <span className="font-bold text-[9px] text-slate-500 uppercase block mb-1">Centang Profil Masuk:</span>
                            {globalProfiles.length === 0 ? (
                              <div className="text-slate-400 italic text-[10px]">Buat profil struktur di atas terlebih dahulu.</div>
                            ) : (
                              <div className="flex flex-wrap gap-1">
                                {globalProfiles.map(gp => {
                                  const isChecked = checkedIds.includes(gp.id)
                                  return (
                                    <button
                                      key={gp.id}
                                      type="button"
                                      onClick={() => handleToggleProfileInGroup(pv.id, gp.id)}
                                      className={`px-2 py-0.5 rounded text-[9px] font-bold font-mono transition-colors border ${
                                        isChecked
                                          ? 'bg-blue-600 text-white border-blue-600'
                                          : 'bg-slate-50 text-slate-600 border-slate-250 hover:bg-slate-100'
                                      }`}
                                    >
                                      {gp.name}
                                    </button>
                                  )
                                })}
                              </div>
                            )}
                          </div>

                          {/* Link Actions Inline */}
                          <div className="grid grid-cols-2 gap-1.5">
                            <button
                              type="button"
                              onClick={() => handleLinkToWbs(pv.id, 'beton')}
                              className="py-1 px-1.5 bg-blue-600 hover:bg-blue-700 text-white font-extrabold rounded text-[10px] shadow-sm flex flex-col items-center"
                            >
                              <span>Taut Beton</span>
                              <span className="font-mono text-[9px]">{vals.concrete.toFixed(2)} m³</span>
                            </button>

                            <button
                              type="button"
                              onClick={() => handleLinkToWbs(pv.id, 'besi')}
                              className="py-1 px-1.5 bg-amber-600 hover:bg-amber-700 text-white font-extrabold rounded text-[10px] shadow-sm flex flex-col items-center"
                            >
                              <span>Taut Besi</span>
                              <span className="font-mono text-[9px]">{vals.steel.toFixed(1)} kg</span>
                            </button>
                          </div>
                        </div>
                      )}
                    </div>
                  )
                })
              )}
            </div>
          </>
        ) : (
          /* Architectural & MEP Tab Lists */
          <div className="space-y-1.5">
            <span className="font-extrabold text-[10px] text-slate-500 uppercase tracking-wider block">🔗 Variabel Pekerjaan (WBS Link):</span>
            {(activeTab === 'arsitektur' ? arsitekturVars : mepVars).length === 0 ? (
              <div className="bg-white border border-slate-200 border-dashed rounded-lg p-2 text-center text-slate-400 italic text-[10px]">
                Belum ada variabel.
              </div>
            ) : (
              (activeTab === 'arsitektur' ? arsitekturVars : mepVars).map(pv => {
                const isExpanded = expandedId === pv.id
                let formulaData: any = null
                let isWallArea = false
                let isRoomArea = false
                try {
                  if (pv.formula) {
                    formulaData = JSON.parse(pv.formula)
                    isWallArea = formulaData.type === 'wall_area'
                    isRoomArea = formulaData.type === 'room_area'
                  }
                } catch {}

                const typeLabel = isWallArea ? 'Dinding Net' : isRoomArea ? 'Lantai/Ceiling' : 'Nilai'

                return (
                  <div key={pv.id} className="bg-white rounded-lg border border-slate-200 shadow-2xs overflow-hidden">
                    <div
                      onClick={() => setExpandedId(isExpanded ? null : pv.id)}
                      className="py-1 px-2 flex justify-between items-center cursor-pointer hover:bg-slate-50"
                    >
                      <div className="flex items-center gap-1.5">
                        <span className="font-bold text-slate-800 text-[11px] block font-mono bg-slate-100 px-1 py-0.2 rounded">
                          {pv.name}
                        </span>
                        <span className="text-[10px] text-slate-400 font-semibold font-mono">
                          {typeLabel}: {pv.value.toFixed(2)} {pv.unit}
                        </span>
                      </div>
                      <div className="flex items-center gap-1.5">
                        <button
                          type="button"
                          onClick={(e) => {
                            e.stopPropagation()
                            handleDeleteVolume(pv.id, pv.name)
                          }}
                          className="text-slate-400 hover:text-red-500 font-bold p-0.5 text-[11px]"
                        >
                          ✕
                        </button>
                        <span className="text-slate-400 text-[9px]">{isExpanded ? '▲' : '▼'}</span>
                      </div>
                    </div>

                    {isExpanded && (
                      <div className="p-2 border-t border-slate-100 bg-slate-50/30 space-y-2">
                        {/* Link to WBS */}
                        <div className="flex justify-between items-center bg-white p-1.5 border border-slate-200 rounded-lg">
                          <div className="space-y-0.5">
                            <span className="font-bold text-slate-700 text-[9px] block">Nilai Terhitung</span>
                            <span className="font-mono font-extrabold text-blue-700 text-[11px]">{pv.value.toFixed(2)} {pv.unit}</span>
                          </div>
                          <button
                            type="button"
                            onClick={() => handleLinkToWbs(pv.id, 'simple')}
                            className="px-2.5 py-1 bg-blue-600 hover:bg-blue-700 text-white font-extrabold rounded text-[10px] shadow-xs"
                          >
                            Tautkan ke WBS
                          </button>
                        </div>

                        {isWallArea && formulaData ? (
                          /* Detailed Wall & Opening Editor */
                          <div className="space-y-2">
                            <span className="font-bold text-[9px] text-slate-500 uppercase block">Daftar Dinding:</span>
                            {(formulaData.walls || []).map((wall: any, wIdx: number) => {
                              const gross = (parseFloat(wall.length) || 0) * (parseFloat(wall.height) || 0)
                              
                              let opSum = 0
                              const openings = wall.openings || []
                              openings.forEach((op: any) => {
                                opSum += (parseFloat(op.w) || 0) * (parseFloat(op.h) || 0) * (parseFloat(op.qty) || 0)
                              })
                              const net = Math.max(0, gross - opSum)

                              return (
                                <div key={wall.id} className="bg-white border border-slate-200 rounded-md p-1.5 space-y-2">
                                  {/* Wall Header */}
                                  <div className="flex justify-between items-center border-b border-slate-100 pb-1">
                                    <input
                                      type="text"
                                      value={wall.label}
                                      onChange={e => {
                                        const nextWalls = [...formulaData.walls]
                                        nextWalls[wIdx].label = e.target.value
                                        handleUpdateWallArea(pv.id, nextWalls)
                                      }}
                                      className="font-extrabold text-[11px] text-slate-800 w-24 border-b border-transparent hover:border-slate-300 focus:outline-none"
                                    />
                                    <div className="flex items-center gap-1.5">
                                      <span className="font-mono text-slate-600 font-bold text-[10px]">
                                        Net: {net.toFixed(1)} m²
                                      </span>
                                      <button
                                        type="button"
                                        onClick={() => {
                                          const nextWalls = formulaData.walls.filter((w: any) => w.id !== wall.id)
                                          handleUpdateWallArea(pv.id, nextWalls)
                                        }}
                                        disabled={formulaData.walls.length <= 1}
                                        className="text-red-500 font-bold p-0.5 disabled:opacity-30 text-[10px]"
                                      >
                                        ✕
                                      </button>
                                    </div>
                                  </div>

                                  {/* Wall dimensions inline */}
                                  <div className="flex gap-2 items-center text-[10px]">
                                    <div className="flex items-center gap-1">
                                      <span className="text-slate-400">Panjang</span>
                                      <input
                                        type="number"
                                        step="any"
                                        value={wall.length}
                                        onChange={e => {
                                          const nextWalls = [...formulaData.walls]
                                          nextWalls[wIdx].length = e.target.value
                                          handleUpdateWallArea(pv.id, nextWalls)
                                        }}
                                        className="w-12 px-1.5 py-0.5 border border-slate-200 rounded font-mono text-center text-[10px]"
                                      />
                                      <span className="text-slate-400">m</span>
                                    </div>
                                    <div className="flex items-center gap-1">
                                      <span className="text-slate-400">Tinggi</span>
                                      <input
                                        type="number"
                                        step="any"
                                        value={wall.height}
                                        onChange={e => {
                                          const nextWalls = [...formulaData.walls]
                                          nextWalls[wIdx].height = e.target.value
                                          handleUpdateWallArea(pv.id, nextWalls)
                                        }}
                                        className="w-12 px-1.5 py-0.5 border border-slate-200 rounded font-mono text-center text-[10px]"
                                      />
                                      <span className="text-slate-400">m</span>
                                    </div>
                                  </div>

                                  {/* Openings list */}
                                  <div className="space-y-1 bg-slate-50/50 p-1.5 rounded border border-slate-150">
                                    <span className="font-bold text-[9px] text-slate-500 uppercase block mb-0.5">Opening (Bukaan):</span>
                                    {openings.length > 0 && (
                                      <div className="space-y-1">
                                        {openings.map((op: any, oIdx: number) => (
                                          <div key={op.id} className="flex gap-1 items-center">
                                            <input
                                              type="text"
                                              value={op.label}
                                              onChange={e => {
                                                const nextWalls = [...formulaData.walls]
                                                nextWalls[wIdx].openings[oIdx].label = e.target.value
                                                handleUpdateWallArea(pv.id, nextWalls)
                                              }}
                                              className="flex-1 px-1.5 py-0.5 border border-slate-200 rounded text-[10px] bg-white"
                                            />
                                            <input
                                              type="number"
                                              step="any"
                                              value={op.w}
                                              onChange={e => {
                                                const nextWalls = [...formulaData.walls]
                                                nextWalls[wIdx].openings[oIdx].w = e.target.value
                                                handleUpdateWallArea(pv.id, nextWalls)
                                              }}
                                              className="w-10 px-1 py-0.5 border border-slate-200 rounded font-mono text-center bg-white text-[10px]"
                                            />
                                            <span className="text-slate-400">x</span>
                                            <input
                                              type="number"
                                              step="any"
                                              value={op.h}
                                              onChange={e => {
                                                const nextWalls = [...formulaData.walls]
                                                nextWalls[wIdx].openings[oIdx].h = e.target.value
                                                handleUpdateWallArea(pv.id, nextWalls)
                                              }}
                                              className="w-10 px-1 py-0.5 border border-slate-200 rounded font-mono text-center bg-white text-[10px]"
                                            />
                                            <span className="text-slate-400">x</span>
                                            <input
                                              type="number"
                                              value={op.qty}
                                              onChange={e => {
                                                const nextWalls = [...formulaData.walls]
                                                nextWalls[wIdx].openings[oIdx].qty = e.target.value
                                                handleUpdateWallArea(pv.id, nextWalls)
                                              }}
                                              className="w-8 px-1 py-0.5 border border-slate-200 rounded font-mono text-center bg-white text-[10px]"
                                            />
                                            <button
                                              type="button"
                                              onClick={() => {
                                                const nextWalls = [...formulaData.walls]
                                                nextWalls[wIdx].openings = openings.filter((o: any) => o.id !== op.id)
                                                handleUpdateWallArea(pv.id, nextWalls)
                                              }}
                                              className="text-red-500 font-bold p-0.5 hover:bg-slate-100 rounded text-[10px]"
                                            >
                                              ✕
                                            </button>
                                          </div>
                                        ))}
                                      </div>
                                    )}
                                    <button
                                      type="button"
                                      onClick={() => {
                                        const nextWalls = [...formulaData.walls]
                                        nextWalls[wIdx].openings = [
                                          ...(openings || []),
                                          { id: String(Date.now()), label: `Bukaan ${openings.length + 1}`, w: '0.9', h: '2.1', qty: '1' }
                                        ]
                                        handleUpdateWallArea(pv.id, nextWalls)
                                      }}
                                      className="w-full py-0.5 border border-dashed border-slate-255 text-slate-500 hover:bg-white font-bold text-[9px] rounded flex justify-center items-center"
                                    >
                                      +
                                    </button>
                                  </div>
                                </div>
                              )
                            })}

                            <button
                              type="button"
                              onClick={() => {
                                const newWall = {
                                  id: String(Date.now()),
                                  label: `Dinding ${formulaData.walls.length + 1}`,
                                  length: '4.0',
                                  height: '3.0',
                                  openings: []
                                }
                                const nextWalls = [...(formulaData.walls || []), newWall]
                                handleUpdateWallArea(pv.id, nextWalls)
                              }}
                              className="w-full py-1.5 bg-slate-800 hover:bg-slate-900 text-white font-bold transition-all text-[10px] rounded-md shadow-xs flex justify-center items-center"
                            >
                              +
                            </button>
                          </div>
                        ) : isRoomArea && formulaData ? (
                          /* Detailed Floor & Ceiling Room Editor */
                          <div className="space-y-2">
                            <span className="font-bold text-[9px] text-slate-500 uppercase block">Daftar Ruangan:</span>
                            <div className="space-y-1.5 text-[10px]">
                              {(formulaData.rooms || []).map((room: any, rIdx: number) => {
                                const roomArea = (parseFloat(room.length) || 0) * (parseFloat(room.width) || 0)

                                return (
                                  <div key={room.id} className="flex gap-1.5 items-center bg-white border border-slate-200 rounded-md p-1">
                                    <input
                                      type="text"
                                      value={room.label}
                                      onChange={e => {
                                        const nextRooms = [...formulaData.rooms]
                                        nextRooms[rIdx].label = e.target.value
                                        handleUpdateRoomArea(pv.id, nextRooms)
                                      }}
                                      className="flex-1 px-1.5 py-0.5 border-b border-transparent hover:border-slate-300 focus:outline-none text-[10px]"
                                      placeholder="Nama Ruang"
                                    />
                                    <div className="flex gap-1 items-center">
                                      <input
                                        type="number"
                                        step="any"
                                        value={room.length}
                                        onChange={e => {
                                          const nextRooms = [...formulaData.rooms]
                                          nextRooms[rIdx].length = e.target.value
                                          handleUpdateRoomArea(pv.id, nextRooms)
                                        }}
                                        className="w-10 px-1 py-0.5 border border-slate-200 rounded font-mono text-center text-[10px]"
                                        placeholder="P"
                                        title="Panjang"
                                      />
                                      <span className="text-slate-400">x</span>
                                      <input
                                        type="number"
                                        step="any"
                                        value={room.width}
                                        onChange={e => {
                                          const nextRooms = [...formulaData.rooms]
                                          nextRooms[rIdx].width = e.target.value
                                          handleUpdateRoomArea(pv.id, nextRooms)
                                        }}
                                        className="w-10 px-1 py-0.5 border border-slate-200 rounded font-mono text-center text-[10px]"
                                        placeholder="L"
                                        title="Lebar"
                                      />
                                    </div>
                                    <span className="font-mono text-slate-600 font-bold text-[10px] w-14 text-right">
                                      {roomArea.toFixed(1)} m²
                                    </span>
                                    <button
                                      type="button"
                                      onClick={() => {
                                        const nextRooms = formulaData.rooms.filter((r: any) => r.id !== room.id)
                                        handleUpdateRoomArea(pv.id, nextRooms)
                                      }}
                                      disabled={formulaData.rooms.length <= 1}
                                      className="text-red-500 font-bold p-0.5 disabled:opacity-30 text-[10px]"
                                    >
                                      ✕
                                    </button>
                                  </div>
                                )
                              })}
                            </div>
                            <button
                              type="button"
                              onClick={() => {
                                const newRoom = {
                                  id: String(Date.now()),
                                  label: `Ruang ${formulaData.rooms.length + 1}`,
                                  length: '4.0',
                                  width: '3.0'
                                }
                                const nextRooms = [...(formulaData.rooms || []), newRoom]
                                handleUpdateRoomArea(pv.id, nextRooms)
                              }}
                              className="w-full py-1 bg-slate-800 hover:bg-slate-900 text-white font-bold text-[10px] rounded-md shadow-xs flex justify-center items-center"
                            >
                              +
                            </button>
                          </div>
                        ) : (
                          /* Standard simple math input */
                          <div className="space-y-1">
                            <label className="text-[10px] font-bold text-slate-500 block">Formula Matematika:</label>
                            <input
                              type="text"
                              defaultValue={formulaData?.data?.formula || String(pv.value)}
                              onBlur={e => handleUpdateSimpleMath(pv.id, e.target.value, pv.name)}
                              onKeyDown={e => {
                                if (e.key === 'Enter') {
                                  handleUpdateSimpleMath(pv.id, (e.target as HTMLInputElement).value, pv.name)
                                  ;(e.target as HTMLInputElement).blur()
                                }
                              }}
                              className="w-full px-2 py-1.5 border border-slate-200 rounded font-mono text-center text-[10px]"
                            />
                          </div>
                        )}
                      </div>
                    )}
                  </div>
                )
              })
            )}
          </div>
        )}
      </div>

      {/* Docked / Sticky Quick Add Form at the bottom of the sidebar (Fixed) */}
      <div className="bg-white border-t border-slate-200 p-2 text-[10px] shadow-lg">
        {activeTab === 'struktur' ? (
          <form onSubmit={e => handleCreateVolume(e, strukturAddType)} className="flex gap-1.5 items-center">
            <select
              value={strukturAddType}
              onChange={e => setStrukturAddType(e.target.value as any)}
              className="px-1.5 py-1 border border-slate-200 rounded text-[10px] bg-slate-50 font-semibold"
            >
              <option value="profile">Profil</option>
              <option value="variable">WBS</option>
            </select>
            <input
              type="text"
              required
              placeholder={strukturAddType === 'profile' ? "Nama profil baru" : "Nama variabel WBS"}
              value={strukturAddName}
              onChange={e => setStrukturAddName(e.target.value)}
              className="flex-1 px-2 py-1 border border-slate-200 rounded bg-slate-50 font-semibold focus:outline-none focus:bg-white text-[10px]"
            />
            <button
              type="submit"
              className="px-3 py-1 bg-slate-800 hover:bg-slate-900 text-white font-bold rounded text-[10px] shadow-xs"
            >
              +
            </button>
          </form>
        ) : (
          <form onSubmit={e => handleCreateVolume(e, 'variable')} className="flex gap-1.5 items-center">
            <input
              type="text"
              required
              placeholder="Nama variabel baru"
              value={newVarName}
              onChange={e => setNewVarName(e.target.value)}
              className="flex-1 px-2 py-1 border border-slate-200 rounded bg-slate-50 font-semibold focus:outline-none focus:bg-white text-[10px]"
            />
            {activeTab === 'arsitektur' && (
              <select
                value={newVarType}
                onChange={e => setNewVarType(e.target.value as any)}
                className="px-1.5 py-1 border border-slate-200 rounded text-[10px] bg-slate-50 font-semibold"
              >
                <option value="simple">Rumus</option>
                <option value="wall_area">Dinding</option>
                <option value="room_area">Lantai & Plafon</option>
              </select>
            )}
            <button
              type="submit"
              className="px-3 py-1 bg-slate-800 hover:bg-slate-900 text-white font-bold rounded text-[10px] shadow-xs"
            >
              +
            </button>
          </form>
        )}
      </div>
    </div>
  )
}
