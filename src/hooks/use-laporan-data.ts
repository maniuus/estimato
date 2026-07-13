import { useState, useEffect } from 'react'
import { useRabStore } from '../stores/rab-store'
import { useVolumeStore } from '../stores/volume-store'
import { useProjectVolumeStore } from '../stores/project-volume-store'
import { useAhsStore } from '../stores/ahs-store'
import { useProjectStore } from '../stores/project-store'
import { useWbsStore } from '../stores/wbs-store'
import { useSettingsStore } from '../stores/settings-store'
import type { WbsItem, Ahs, AhsComponentMaterial, AhsComponentWage, AhsComponentEquipment } from '../types/models'
import { resolveLinkedVolume } from '../components/volume-calculator/helpers'

interface DetailedAhsData {
  ahs: Ahs
  materials: AhsComponentMaterial[]
  wages: AhsComponentWage[]
  equipment: AhsComponentEquipment[]
  subtotalWages: number
  subtotalMaterials: number
  subtotalEquipment: number
  totalComponents: number
  overheadAmount: number
  totalUnitPrice: number
}

interface BomItem {
  id: string
  name: string
  category: 'Bahan' | 'Tenaga Kerja' | 'Alat'
  unit: string
  quantity: number
  unitPrice: number
  totalPrice: number
}

export function useLaporanData(projectId: string) {
  const { calculation, calculate, latestSnapshot, loadLatest } = useRabStore()
  const { items: volumes, loadByProject: loadVolumes } = useVolumeStore()
  const { ahsList, loadLibrary } = useAhsStore()
  const { projects } = useProjectStore()
  const { items: wbsItems, loadByProject: loadWbs } = useWbsStore()
  const { settings, load: loadSettings } = useSettingsStore()
  const { items: projectVolumes, loadByProject: loadProjectVolumes } = useProjectVolumeStore()

  const project = projects.find(p => p.id === projectId)
  const ppn = project?.ppn ?? 11
  const overhead = project?.overhead ?? 0

  const [detailedAhsList, setDetailedAhsList] = useState<DetailedAhsData[]>([])
  const [bomItems, setBomItems] = useState<BomItem[]>([])
  const [loadingDetails, setLoadingDetails] = useState(false)

  const [durationWeeks, setDurationWeeks] = useState(12)
  const [categorySchedules, setCategorySchedules] = useState<Record<string, { startWeek: number, endWeek: number }>>({})

  useEffect(() => {
    loadVolumes(projectId)
    loadWbs(projectId)
    loadProjectVolumes(projectId)
    loadLibrary()
    loadLatest(projectId)
    loadSettings()
  }, [projectId])

  // Load detailed analysis and BOM components
  useEffect(() => {
    const processReportsData = async () => {
      const activeVolumes = volumes.filter(v => v.volume > 0 && v.ahsId)
      if (activeVolumes.length === 0) {
        setDetailedAhsList([])
        setBomItems([])
        return
      }

      setLoadingDetails(true)
      try {
        const uniqueAhsIds = Array.from(new Set(activeVolumes.map(v => v.ahsId!)))
        
        // 1. Load AHS Details
        const details: DetailedAhsData[] = await Promise.all(
          uniqueAhsIds.map(async id => {
            let ahs = ahsList.find(a => a.id === id)
            if (!ahs) {
              const res = await window.api.ahs.getById(id)
              ahs = res.success ? res.data! : undefined
            }

            if (!ahs) throw new Error(`AHS id ${id} not found`)

            const [mRes, wRes, eRes] = await Promise.all([
              window.api.ahs.material.getByAhs(id, projectId),
              window.api.ahs.wage.getByAhs(id, projectId),
              window.api.ahs.equipment.getByAhs(id, projectId)
            ])
            const materials = mRes.success ? mRes.data || [] : []
            const wages = wRes.success ? wRes.data || [] : []
            const equipment = eRes.success ? eRes.data || [] : []

            const subtotalWages = wages.reduce((s: number, c: any) => s + c.totalPrice, 0)
            const subtotalMaterials = materials.reduce((s: number, c: any) => s + c.totalPrice, 0)
            const subtotalEquipment = equipment.reduce((s: number, c: any) => s + c.totalPrice, 0)

            const totalComponents = subtotalWages + subtotalMaterials + subtotalEquipment
            const overheadAmount = (overhead / 100) * totalComponents
            const totalUnitPrice = totalComponents + overheadAmount

            return {
              ahs,
              materials,
              wages,
              equipment,
              subtotalWages,
              subtotalMaterials,
              subtotalEquipment,
              totalComponents,
              overheadAmount,
              totalUnitPrice
            }
          })
        )

        setDetailedAhsList(details)

        // 2. Generate BOM Items
        const materialMap: Record<string, BomItem> = {}
        const wageMap: Record<string, BomItem> = {}
        const equipmentMap: Record<string, BomItem> = {}

        activeVolumes.forEach(vol => {
          const wbs = wbsItems.find(w => w.id === vol.wbsItemId)
          if (!wbs) return

          // Resolve shared volume value
          const totalVol = resolveLinkedVolume(vol, projectVolumes)

          const dataItem = details.find(d => d.ahs.id === vol.ahsId)
          if (!dataItem) return

          dataItem.materials.forEach(item => {
            const reqQty = item.coefficient * totalVol
            const mId = item.materialId
            if (materialMap[mId]) {
              materialMap[mId].quantity += reqQty
              materialMap[mId].totalPrice = materialMap[mId].quantity * materialMap[mId].unitPrice
            } else {
              materialMap[mId] = {
                id: mId,
                name: item.materialName || 'Bahan',
                category: 'Bahan',
                unit: item.materialUnit || 'unit',
                quantity: reqQty,
                unitPrice: item.unitPrice || 0,
                totalPrice: reqQty * (item.unitPrice || 0)
              }
            }
          })

          dataItem.wages.forEach(item => {
            const reqQty = item.coefficient * totalVol
            const wId = item.wageId
            if (wageMap[wId]) {
              wageMap[wId].quantity += reqQty
              wageMap[wId].totalPrice = wageMap[wId].quantity * wageMap[wId].unitPrice
            } else {
              wageMap[wId] = {
                id: wId,
                name: item.wageType || 'Tenaga',
                category: 'Tenaga Kerja',
                unit: item.wageUnit || 'OH',
                quantity: reqQty,
                unitPrice: item.dailyWage || 0,
                totalPrice: reqQty * (item.dailyWage || 0)
              }
            }
          })

          dataItem.equipment.forEach(item => {
            const reqQty = item.coefficient * totalVol
            const eId = item.equipmentId
            if (equipmentMap[eId]) {
              equipmentMap[eId].quantity += reqQty
              equipmentMap[eId].totalPrice = equipmentMap[eId].quantity * equipmentMap[eId].unitPrice
            } else {
              equipmentMap[eId] = {
                id: eId,
                name: item.equipmentName || 'Alat',
                category: 'Alat',
                unit: item.equipmentUnit || 'hari',
                quantity: reqQty,
                unitPrice: item.rentalPrice || 0,
                totalPrice: reqQty * (item.rentalPrice || 0)
              }
            }
          })
        })

        setBomItems([
          ...Object.values(wageMap),
          ...Object.values(materialMap),
          ...Object.values(equipmentMap)
        ].sort((a, b) => a.category.localeCompare(b.category) || a.name.localeCompare(b.name)))
      } catch (err) {
        console.error('Error generating report datasets:', err)
      } finally {
        setLoadingDetails(false)
      }
    }

    if (volumes.length > 0 && ahsList.length > 0) {
      processReportsData()
    }
  }, [volumes, ahsList, overhead])

  // Recursive subtotal calculation
  const getGroupSubtotal = (groupWbsPath: string) => {
    const leaves = wbsItems.filter(i => 
      i.type === 'item' && 
      (i.wbsPath === groupWbsPath || i.wbsPath.startsWith(groupWbsPath + '.'))
    )
    
    return leaves.reduce((sum, leaf) => {
      const volItem = volumes.find(v => v.wbsItemId === leaf.id)
      const volume = volItem ? resolveLinkedVolume(volItem, projectVolumes) : 0
      const calcItem = calculation?.lineItems?.find(li => li.wbsItemId === leaf.id)
      let unitPrice = calcItem?.unitPrice ?? 0
      if (!calcItem && volItem?.ahsId) {
        const matchedAhs = ahsList.find(a => a.id === volItem.ahsId)
        unitPrice = matchedAhs?.totalPrice ?? 0
      }
      return sum + (volume * unitPrice)
    }, 0)
  }

  // Rekapitulasi categories (roots only)
  const rekapCategories = wbsItems.filter(i => i.type === 'group' && !i.parentId)
  rekapCategories.sort((a, b) => a.sortOrder - b.sortOrder)

  // Initialize schedules if empty
  useEffect(() => {
    if (rekapCategories.length > 0) {
      setCategorySchedules(prev => {
        const next = { ...prev }
        let changed = false
        rekapCategories.forEach((cat, index) => {
          if (!next[cat.id]) {
            // Distribute default weeks sequentially with overlap
            const start = Math.floor((index / rekapCategories.length) * (durationWeeks - 1)) + 1
            const duration = Math.max(2, Math.floor(durationWeeks / rekapCategories.length) + 1)
            const end = Math.min(durationWeeks, start + duration - 1)
            next[cat.id] = { startWeek: start, endWeek: end }
            changed = true
          }
        })
        if (changed) return next
        return prev
      })
    }
  }, [rekapCategories, durationWeeks])

  return {
    project,
    calculation,
    wbsItems,
    volumes,
    ahsList,
    detailedAhsList,
    bomItems,
    loadingDetails,
    durationWeeks,
    setDurationWeeks,
    categorySchedules,
    setCategorySchedules,
    getGroupSubtotal,
    rekapCategories,
    ppn,
    overhead,
    settings,
    projectVolumes
  }
}
