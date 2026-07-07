import React, { useState, useEffect, useCallback } from 'react'
import type { ProjectVolume } from '../types/models'
import { useProjectVolumeStore } from '../stores/project-volume-store'

interface VolumeCalculatorModalProps {
  isOpen: boolean
  onClose: () => void
  onApply: (volume: number, formulaJson: string, notes: string, projectVolumeId?: string | null) => void
  initialFormula: string
  initialNotes: string
  unit: string
  projectId?: string
  initialProjectVolumeId?: string | null
}

type TabType = 'simple' | 'dimensions' | 'steel' | 'wall' | 'project-volume'

const evaluateProjectVolumes = (volumes: ProjectVolume[]): ProjectVolume[] => {
  const resolved = volumes.map(v => ({ ...v, value: v.value }))
  
  for (let iteration = 0; iteration < 5; iteration++) {
    let changed = false
    
    for (const vol of resolved) {
      if (!vol.formula) continue
      try {
        const parsed = JSON.parse(vol.formula)
        if (parsed.type === 'simple' && parsed.data) {
          const formulaStr = parsed.data.formula || ''
          if (!formulaStr) continue
          
          let expression = formulaStr
          const sortedVars = [...resolved].sort((a, b) => b.name.length - a.name.length)
          
          for (const v of sortedVars) {
            if (v.id === vol.id) continue
            const escapedName = v.name.replace(/[-\/\\^$*+?.()|[\]{}]/g, '\\$&')
            const regex = new RegExp(`\\[${escapedName}\\]`, 'g')
            if (regex.test(expression)) {
              expression = expression.replace(regex, String(v.value))
            }
          }
          
          const sanitized = expression.replace(/[^0-9+\-*/().\s]/g, '')
          if (sanitized.trim()) {
            const newValue = new Function(`return (${sanitized})`)()
            if (typeof newValue === 'number' && !isNaN(newValue) && vol.value !== newValue) {
              vol.value = newValue
              changed = true
            }
          }
        }
      } catch {
        // ignore
      }
    }
    
    if (!changed) break
  }
  
  return resolved
}

export const diameterOptions = [
  'Ø6', 'Ø8', 'Ø10', 'Ø12', 'Ø14', 'Ø16', 'Ø19', 'Ø22', 'Ø25',
  'D10', 'D13', 'D16', 'D19', 'D22', 'D25', 'D29', 'D32'
]

export function VolumeCalculatorModal({
  isOpen,
  onClose,
  onApply,
  initialFormula,
  initialNotes,
  unit,
  projectId,
  initialProjectVolumeId = null
}: VolumeCalculatorModalProps): React.ReactElement | null {
  const [activeTab, setActiveTab] = useState<TabType>('simple')

  // Project Volume state and linking
  const { items: loadedProjectVolumes, loadByProject, upsert: upsertSharedVolume, deleteItem: deleteSharedVolume } = useProjectVolumeStore()
  const [currentProjectVolumeId, setCurrentProjectVolumeId] = useState<string | null>(null)

  // Load project volumes when projectId changes
  useEffect(() => {
    if (isOpen && projectId) {
      loadByProject(projectId)
    }
  }, [projectId, isOpen])

  // Sync initial linked state
  useEffect(() => {
    if (isOpen) {
      setCurrentProjectVolumeId(initialProjectVolumeId || null)
      if (initialProjectVolumeId) {
        setActiveTab('project-volume')
      }
    }
  }, [initialProjectVolumeId, isOpen])

  // 1. Simple Tab State
  const [simpleFormula, setSimpleFormula] = useState('')
  const [simpleResult, setSimpleResult] = useState(0)
  const [simpleError, setSimpleError] = useState<string | null>(null)

  // 2. Dimensions Tab State
  const [dimRows, setDimRows] = useState<Array<{
    id: string
    description: string
    length: string
    width: string
    height: string
    qty: string
  }>>([{ id: '1', description: '', length: '', width: '', height: '', qty: '1' }])

  // 3. Steel Tab State
  const [steelRows, setSteelRows] = useState<Array<{
    id: string
    description: string
    diameter: string // e.g. D10, Ø8
    length: string // m
    qty: string
    mult: string // multiplier
  }>>([{ id: '1', description: '', diameter: 'Ø10', length: '', qty: '', mult: '1' }])

  const [steelMode, setSteelMode] = useState<'table' | 'section'>('table')
  
  // Section elements summary list
  const [sectionElements, setSectionElements] = useState<Array<{
    id: string
    name: string
    b: string
    h: string
    c: string
    length: string
    qty: string
    mainRebarRows: Array<{ id: string, position: 'Atas' | 'Bawah' | 'Samping', diameter: string, qty: string }>
    stirrupMode: 'uniform' | 'split'
    stirrupDia: string
    stirrupSpacing: string
    stirrupSpacingTumpuan: string
    stirrupSpacingLapangan: string
  }>>([
    {
      id: '1',
      name: 'Balok B1',
      b: '200',
      h: '300',
      c: '40',
      length: '4',
      qty: '1',
      mainRebarRows: [
        { id: '1', position: 'Atas', diameter: 'D13', qty: '2' },
        { id: '2', position: 'Bawah', diameter: 'D13', qty: '3' }
      ],
      stirrupMode: 'uniform',
      stirrupDia: 'Ø8',
      stirrupSpacing: '150',
      stirrupSpacingTumpuan: '100',
      stirrupSpacingLapangan: '150'
    }
  ])

  // Editor states for active editing element
  const [editingElementId, setEditingElementId] = useState<string | null>(null)
  const [formName, setFormName] = useState('Balok B1')
  const [formB, setFormB] = useState('200')
  const [formH, setFormH] = useState('300')
  const [formCover, setFormCover] = useState('40')
  const [formLength, setFormLength] = useState('4')
  const [formQty, setFormQty] = useState('1')
  const [formMainRebarRows, setFormMainRebarRows] = useState<Array<{ id: string, position: 'Atas' | 'Bawah' | 'Samping', diameter: string, qty: string }>>([
    { id: '1', position: 'Atas', diameter: 'D13', qty: '2' },
    { id: '2', position: 'Bawah', diameter: 'D13', qty: '3' }
  ])
  const [formStirrupMode, setFormStirrupMode] = useState<'uniform' | 'split'>('uniform')
  const [formStirrupDia, setFormStirrupDia] = useState('Ø8')
  const [formStirrupSpacing, setFormStirrupSpacing] = useState('150')
  const [formStirrupSpacingTumpuan, setFormStirrupSpacingTumpuan] = useState('100')
  const [formStirrupSpacingLapangan, setFormStirrupSpacingLapangan] = useState('150')

  // Keep compatibility dummy states
  const [sectionName, setSectionName] = useState('B1')
  const [sectionB, setSectionB] = useState('200')
  const [sectionH, setSectionH] = useState('300')
  const [sectionCover, setSectionCover] = useState('40')
  const [elementLength, setElementLength] = useState('4')
  const [elementQty, setElementQty] = useState('1')
  const [mainRebarRows, setMainRebarRows] = useState<any>([])
  const [stirrupMode, setStirrupMode] = useState<'uniform' | 'split'>('uniform')
  const [stirrupDia, setStirrupDia] = useState('Ø8')
  const [stirrupSpacing, setStirrupSpacing] = useState('150')
  const [stirrupSpacingTumpuan, setStirrupSpacingTumpuan] = useState('100')
  const [stirrupSpacingLapangan, setStirrupSpacingLapangan] = useState('150')
  const [mainDia, setMainDia] = useState('D13')
  const [mainQtyTop, setMainQtyTop] = useState('2')
  const [mainQtyBottom, setMainQtyBottom] = useState('3')

  // 4. Wall Tab State
  const [wallRows, setWallRows] = useState<Array<{
    id: string
    description: string
    length: string
    height: string
    qty: string
  }>>([{ id: '1', description: 'Dinding Utama', length: '', height: '', qty: '1' }])
  const [openings, setOpenings] = useState<Array<{
    id: string
    name: string
    width: string
    height: string
    qty: string
  }>>([{ id: '1', name: 'Pintu P1', width: '0.9', height: '2.1', qty: '1' }])

  // Auto-detect tab based on unit on open
  useEffect(() => {
    if (isOpen) {
      const lowerUnit = (unit || '').toLowerCase()
      if (lowerUnit === 'kg' || lowerUnit === 'kg/m' || lowerUnit === 'besi') {
        setActiveTab('steel')
      } else if (lowerUnit === 'm²' || lowerUnit === 'm2' || lowerUnit === 'hebel' || lowerUnit === 'bata') {
        setActiveTab('wall')
      } else if (lowerUnit === 'm³' || lowerUnit === 'm3') {
        setActiveTab('dimensions')
      } else {
        setActiveTab('simple')
      }

      // Try to parse initialFormula as JSON
      if (initialFormula) {
        try {
          const parsed = JSON.parse(initialFormula)
          if (parsed.type && ['simple', 'dimensions', 'steel', 'wall'].includes(parsed.type)) {
            setActiveTab(parsed.type)
            if (parsed.type === 'simple') {
              setSimpleFormula(parsed.data.formula || '')
            } else if (parsed.type === 'dimensions') {
              setDimRows(parsed.data.rows || [])
            } else if (parsed.type === 'steel') {
              const mode = parsed.data.steelMode || 'table'
              setSteelMode(mode)
              if (mode === 'section') {
                if (parsed.data.sectionElements) {
                  setSectionElements(parsed.data.sectionElements)
                } else {
                  // Fallback for single section format
                  setSectionElements([{
                    id: '1',
                    name: parsed.data.sectionName || 'Balok B1',
                    b: parsed.data.sectionB || '200',
                    h: parsed.data.sectionH || '300',
                    c: parsed.data.sectionCover || '40',
                    length: parsed.data.elementLength || '4',
                    qty: parsed.data.elementQty || '1',
                    mainRebarRows: parsed.data.mainRebarRows || [
                      { id: '1', position: 'Atas', diameter: parsed.data.mainDia || 'D13', qty: parsed.data.mainQtyTop || '2' },
                      { id: '2', position: 'Bawah', diameter: parsed.data.mainDia || 'D13', qty: parsed.data.mainQtyBottom || '3' }
                    ],
                    stirrupMode: parsed.data.stirrupMode || 'uniform',
                    stirrupDia: parsed.data.stirrupDia || 'Ø8',
                    stirrupSpacing: parsed.data.stirrupSpacing || '150',
                    stirrupSpacingTumpuan: parsed.data.stirrupSpacingTumpuan || '100',
                    stirrupSpacingLapangan: parsed.data.stirrupSpacingLapangan || '150'
                  }])
                }
                setEditingElementId(null)
              } else {
                const loadedRows = (parsed.data.rows || []).map((row: any) => ({
                  ...row,
                  diameter: /^[0-9.]+$/.test(String(row.diameter)) ? 'D' + row.diameter : String(row.diameter)
                }))
                setSteelRows(loadedRows.length > 0 ? loadedRows : [{ id: '1', description: '', diameter: 'Ø10', length: '', qty: '', mult: '1' }])
              }
            } else if (parsed.type === 'wall') {
              if (parsed.data.wallRows) {
                setWallRows(parsed.data.wallRows)
              } else {
                // Fallback for old single wall format
                setWallRows([{
                  id: '1',
                  description: 'Dinding Utama',
                  length: parsed.data.wallLength || '',
                  height: parsed.data.wallHeight || '',
                  qty: parsed.data.wallMult || '1'
                }])
              }
              setOpenings(parsed.data.openings || [])
            }
          }
        } catch {
          // If not JSON, it's a plain string formula
          setSimpleFormula(initialFormula)
          setActiveTab('simple')
        }
      } else {
        // Reset states to default if empty
        setSimpleFormula('')
        setDimRows([{ id: '1', description: '', length: '', width: '', height: '', qty: '1' }])
        setSteelRows([{ id: '1', description: '', diameter: 'Ø10', length: '', qty: '', mult: '1' }])
        setSteelMode('table')
        setSectionElements([
          {
            id: '1',
            name: 'Balok B1',
            b: '200',
            h: '300',
            c: '40',
            length: '4',
            qty: '1',
            mainRebarRows: [
              { id: '1', position: 'Atas', diameter: 'D13', qty: '2' },
              { id: '2', position: 'Bawah', diameter: 'D13', qty: '3' }
            ],
            stirrupMode: 'uniform',
            stirrupDia: 'Ø8',
            stirrupSpacing: '150',
            stirrupSpacingTumpuan: '100',
            stirrupSpacingLapangan: '150'
          }
        ])
        setEditingElementId(null)
        setSectionB('200')
        setSectionH('300')
        setSectionCover('40')
        setElementLength('4')
        setElementQty('1')
        setMainDia('D13')
        setMainQtyTop('2')
        setMainQtyBottom('3')
        setStirrupDia('Ø8')
        setStirrupSpacing('150')
        setWallRows([{ id: '1', description: 'Dinding Utama', length: '', height: '', qty: '1' }])
        setOpenings([{ id: '1', name: 'Pintu P1', width: '0.9', height: '2.1', qty: '1' }])
      }
    }
  }, [isOpen, initialFormula, unit])

  // Math helper
  const evaluateMath = useCallback((str: string): number => {
    let expression = str
    
    // Replace variable references like [Nama Volume] with their actual values
    if (loadedProjectVolumes && loadedProjectVolumes.length > 0) {
      const sortedVars = [...loadedProjectVolumes].sort((a, b) => b.name.length - a.name.length)
      for (const v of sortedVars) {
        const escapedName = v.name.replace(/[-\/\\^$*+?.()|[\]{}]/g, '\\$&')
        const regex = new RegExp(`\\[${escapedName}\\]`, 'g')
        expression = expression.replace(regex, String(v.value))
      }
    }

    const sanitized = expression.replace(/[^0-9+\-*/().\s]/g, '')
    if (!sanitized.trim()) return 0
    try {
      const val = new Function(`return (${sanitized})`)()
      return typeof val === 'number' && !isNaN(val) ? val : 0
    } catch {
      return 0
    }
  }, [loadedProjectVolumes])

  // 1. Simple tab effect
  useEffect(() => {
    if (activeTab === 'simple') {
      try {
        const res = evaluateMath(simpleFormula)
        setSimpleResult(res)
        setSimpleError(null)
      } catch (e) {
        setSimpleError('Format formula salah')
      }
    }
  }, [simpleFormula, activeTab, evaluateMath])

  // Calculation helpers
  const getDimRowTotal = (r: typeof dimRows[0]) => {
    const l = r.length !== '' ? parseFloat(r.length) || 0 : 1
    const w = r.width !== '' ? parseFloat(r.width) || 0 : 1
    const h = r.height !== '' ? parseFloat(r.height) || 0 : 1
    const q = r.qty !== '' ? parseFloat(r.qty) || 0 : 1
    if (r.length === '' && r.width === '' && r.height === '' && r.qty === '') return 0
    return l * w * h * q
  }

  const getDimTotal = () => {
    return dimRows.reduce((sum, r) => sum + getDimRowTotal(r), 0)
  }

  const parseDiameter = (val: string): { size: number, type: 'polos' | 'ulir' } => {
    if (!val) return { size: 0, type: 'polos' }
    const size = parseFloat(val.replace(/[^\d.]/g, '')) || 0
    const type = val.includes('Ø') ? 'polos' : 'ulir'
    return { size, type }
  }

  const getSteelRowWeight = (r: typeof steelRows[0]) => {
    const { size } = parseDiameter(r.diameter)
    const l = parseFloat(r.length) || 0
    const q = parseFloat(r.qty) || 0
    const m = parseFloat(r.mult) || 1
    
    // Weight per meter formula: 0.006165 * D^2
    const weightPerMeter = 0.006165 * size * size
    return weightPerMeter * l * q * m
  }

  const getSingleElementWeight = (el: typeof sectionElements[0]) => {
    const b = parseFloat(el.b) || 0
    const h = parseFloat(el.h) || 0
    const c = parseFloat(el.c) || 0
    const len = parseFloat(el.length) || 0
    const eqty = parseFloat(el.qty) || 0
    
    // Main rebar weight calculation
    let mainWeight = 0
    el.mainRebarRows.forEach(row => {
      const { size } = parseDiameter(row.diameter)
      const qty = parseFloat(row.qty) || 0
      const rowWeight = qty * len * (0.006165 * size * size) * eqty
      mainWeight += rowWeight
    })
    
    const { size: dStirrup } = parseDiameter(el.stirrupDia)
    
    // Perimeter of stirrup (begel)
    const stirrupLengthMm = (b > 2 * c && h > 2 * c) 
      ? 2 * (b - 2 * c) + 2 * (h - 2 * c) + 12 * dStirrup
      : 0
    const stirrupLengthM = stirrupLengthMm / 1000
    
    let stirrupCount = 0
    if (el.stirrupMode === 'split') {
      const sTumpuan = parseFloat(el.stirrupSpacingTumpuan) || 100
      const sLapangan = parseFloat(el.stirrupSpacingLapangan) || 150
      const countTumpuan = (sTumpuan > 0 && len > 0) ? Math.floor(((len / 2) * 1000) / sTumpuan) : 0
      const countLapangan = (sLapangan > 0 && len > 0) ? Math.floor(((len / 2) * 1000) / sLapangan) : 0
      stirrupCount = countTumpuan + countLapangan + 1
    } else {
      const spacing = parseFloat(el.stirrupSpacing) || 150
      stirrupCount = (spacing > 0 && len > 0) ? Math.floor((len * 1000) / spacing) + 1 : 0
    }
    
    const stirrupUnitWeight = 0.006165 * dStirrup * dStirrup
    const stirrupWeight = stirrupCount * stirrupLengthM * stirrupUnitWeight * eqty
    
    return {
      mainWeight,
      stirrupWeight,
      totalWeight: mainWeight + stirrupWeight,
      stirrupLengthM,
      stirrupCount
    }
  }

  const getSteelFormTotals = () => {
    const b = parseFloat(formB) || 0
    const h = parseFloat(formH) || 0
    const c = parseFloat(formCover) || 0
    const len = parseFloat(formLength) || 0
    const eqty = parseFloat(formQty) || 0
    
    let mainWeight = 0
    formMainRebarRows.forEach(row => {
      const { size } = parseDiameter(row.diameter)
      const qty = parseFloat(row.qty) || 0
      const rowWeight = qty * len * (0.006165 * size * size) * eqty
      mainWeight += rowWeight
    })
    
    const { size: dStirrup } = parseDiameter(formStirrupDia)
    const stirrupLengthMm = (b > 2 * c && h > 2 * c) 
      ? 2 * (b - 2 * c) + 2 * (h - 2 * c) + 12 * dStirrup
      : 0
    const stirrupLengthM = stirrupLengthMm / 1000
    
    let stirrupCount = 0
    if (formStirrupMode === 'split') {
      const sTumpuan = parseFloat(formStirrupSpacingTumpuan) || 100
      const sLapangan = parseFloat(formStirrupSpacingLapangan) || 150
      const countTumpuan = (sTumpuan > 0 && len > 0) ? Math.floor(((len / 2) * 1000) / sTumpuan) : 0
      const countLapangan = (sLapangan > 0 && len > 0) ? Math.floor(((len / 2) * 1000) / sLapangan) : 0
      stirrupCount = countTumpuan + countLapangan + 1
    } else {
      const spacing = parseFloat(formStirrupSpacing) || 150
      stirrupCount = (spacing > 0 && len > 0) ? Math.floor((len * 1000) / spacing) + 1 : 0
    }
    
    const stirrupUnitWeight = 0.006165 * dStirrup * dStirrup
    const stirrupWeight = stirrupCount * stirrupLengthM * stirrupUnitWeight * eqty
    
    return {
      mainWeight,
      stirrupWeight,
      totalWeight: mainWeight + stirrupWeight,
      stirrupLengthM,
      stirrupCount
    }
  }

  const getSteelSectionTotals = getSteelFormTotals

  const getSteelTotal = () => {
    if (steelMode === 'section') {
      return sectionElements.reduce((sum, el) => sum + getSingleElementWeight(el).totalWeight, 0)
    }
    return steelRows.reduce((sum, r) => sum + getSteelRowWeight(r), 0)
  }

  const getRebarBarBreakdown = () => {
    const breakdown: Record<string, { diameter: string, totalLength: number, totalWeight: number }> = {}

    const addRecord = (dia: string, len: number, qty: number, mult: number) => {
      if (!dia) return
      const cleanDia = dia.trim()
      const { size } = parseDiameter(cleanDia)
      const weightPerMeter = 0.006165 * size * size
      const rowLen = len * qty * mult
      const rowWeight = rowLen * weightPerMeter
      
      if (!breakdown[cleanDia]) {
        breakdown[cleanDia] = { diameter: cleanDia, totalLength: 0, totalWeight: 0 }
      }
      breakdown[cleanDia].totalLength += rowLen
      breakdown[cleanDia].totalWeight += rowWeight
    }

    if (steelMode === 'section') {
      sectionElements.forEach(el => {
        const len = parseFloat(el.length) || 0
        const eqty = parseFloat(el.qty) || 0
        if (len <= 0 || eqty <= 0) return

        // 1. Longitudinal
        el.mainRebarRows.forEach(row => {
          const qty = parseFloat(row.qty) || 0
          addRecord(row.diameter, len, qty, eqty)
        })

        // 2. Stirrups (Begel)
        const res = getSingleElementWeight(el)
        addRecord(el.stirrupDia, res.stirrupLengthM, res.stirrupCount, eqty)
      })
    } else {
      steelRows.forEach(row => {
        const len = parseFloat(row.length) || 0
        const qty = parseFloat(row.qty) || 0
        const mult = parseFloat(row.mult) || 1
        addRecord(row.diameter, len, qty, mult)
      })
    }

    return Object.values(breakdown).sort((a, b) => {
      const sizeA = parseFloat(a.diameter.replace(/[^\d.]/g, '')) || 0
      const sizeB = parseFloat(b.diameter.replace(/[^\d.]/g, '')) || 0
      return sizeB - sizeA
    })
  }

  const getWallRowArea = (r: typeof wallRows[0]) => {
    const l = parseFloat(r.length) || 0
    const h = parseFloat(r.height) || 0
    const q = parseFloat(r.qty) || 0
    return l * h * q
  }

  const getWallGrossArea = () => {
    return wallRows.reduce((sum, r) => sum + getWallRowArea(r), 0)
  }

  const getOpeningArea = (o: typeof openings[0]) => {
    const w = parseFloat(o.width) || 0
    const h = parseFloat(o.height) || 0
    const q = parseFloat(o.qty) || 0
    return w * h * q
  }

  const getWallTotalOpenings = () => {
    return openings.reduce((sum, o) => sum + getOpeningArea(o), 0)
  }

  const getWallNetArea = () => {
    const gross = getWallGrossArea()
    const deductions = getWallTotalOpenings()
    return Math.max(0, gross - deductions)
  }

  const handleApply = () => {
    /* Bypass project volume link apply as per user's hold request */
    if (false && currentProjectVolumeId) {
      const matched = loadedProjectVolumes.find(pv => pv.id === currentProjectVolumeId)
      const val = matched ? matched.value : 0
      const name = matched ? matched.name : 'Volume Bersama'
      onApply(parseFloat(val.toFixed(4)), '', `Dihubungkan ke Volume Bersama: ${name}`, currentProjectVolumeId)
      onClose()
      return
    }

    let finalVolume = 0
    let formulaJson = ''
    let calculatedNotes = ''

    if (activeTab === 'simple') {
      finalVolume = simpleResult
      formulaJson = JSON.stringify({
        type: 'simple',
        data: { formula: simpleFormula }
      })
      calculatedNotes = `Rumus: ${simpleFormula} = ${simpleResult.toFixed(3)}`
    } else if (activeTab === 'dimensions') {
      finalVolume = getDimTotal()
      formulaJson = JSON.stringify({
        type: 'dimensions',
        data: { rows: dimRows }
      })
      
      const details = dimRows
        .filter(r => r.length || r.width || r.height)
        .map(r => `${r.description || 'Pek'}: ${r.length || '1'}x${r.width || '1'}x${r.height || '1'} (${r.qty}x)`)
        .join(', ')
      calculatedNotes = `Dimensi: ${details}`
    } else if (activeTab === 'steel') {
      finalVolume = getSteelTotal()
      if (steelMode === 'section') {
        formulaJson = JSON.stringify({
          type: 'steel',
          data: {
            steelMode,
            sectionElements
          }
        })
        const details = sectionElements.map(el => {
          const w = getSingleElementWeight(el).totalWeight
          return `${el.name} (${w.toFixed(1)} kg)`
        }).join(', ')
        calculatedNotes = `Rekap Elemen Struktur Besi: ${details}`
      } else {
        formulaJson = JSON.stringify({
          type: 'steel',
          data: { steelMode, rows: steelRows }
        })
        const details = steelRows
          .filter(r => r.length && r.qty)
          .map(r => `${r.diameter} L${r.length}m (${r.qty}x)`)
          .join(', ')
        calculatedNotes = `Pembesian: ${details}`
      }
    } else if (activeTab === 'wall') {
      finalVolume = getWallNetArea()
      formulaJson = JSON.stringify({
        type: 'wall',
        data: { wallRows, openings }
      })
      
      const wallDetails = wallRows
        .filter(r => r.length && r.height)
        .map(r => `${r.description || 'Dinding'}: ${r.length}x${r.height} (${r.qty}x)`)
        .join(', ')
      const openingDetails = openings
        .filter(o => o.width && o.height && o.qty !== '0')
        .map(o => `${o.name || 'Lubang'}: ${o.width}x${o.height} (${o.qty}x)`)
        .join(', ')
      
      calculatedNotes = `Gross: [${wallDetails}] dikurangi bukaan [${openingDetails || 'tidak ada'}]`
    }

    onApply(parseFloat(finalVolume.toFixed(4)), formulaJson, calculatedNotes, null)
    onClose()
  }

  const renderConcreteSvg = () => {
    const b = parseFloat(formB) || 200
    const h = parseFloat(formH) || 300
    const c = parseFloat(formCover) || 40

    const svgW = 180
    const svgH = 200
    const pad = 24

    const scale = Math.min((svgW - 2 * pad) / b, (svgH - 2 * pad) / h)
    const drawW = b * scale
    const drawH = h * scale
    const drawX = (svgW - drawW) / 2
    const drawY = (svgH - drawH) / 2
    const drawC = c * scale

    const stirX = drawX + drawC
    const stirY = drawY + drawC
    const stirW = drawW - 2 * drawC
    const stirH = drawH - 2 * drawC

    const drawRebars: Array<{ cx: number, cy: number, r: number }> = []

    formMainRebarRows.forEach((row) => {
      const { size } = parseDiameter(row.diameter)
      const qty = parseInt(row.qty) || 0
      if (qty <= 0) return

      const radius = Math.max(3.5, Math.min(8, size * scale * 0.4))

      if (row.position === 'Atas') {
        if (qty === 1) {
          drawRebars.push({ cx: stirX + stirW / 2, cy: stirY, r: radius })
        } else {
          for (let i = 0; i < qty; i++) {
            drawRebars.push({
              cx: stirX + (i * stirW) / (qty - 1),
              cy: stirY,
              r: radius
            })
          }
        }
      } else if (row.position === 'Bawah') {
        if (qty === 1) {
          drawRebars.push({ cx: stirX + stirW / 2, cy: stirY + stirH, r: radius })
        } else {
          for (let i = 0; i < qty; i++) {
            drawRebars.push({
              cx: stirX + (i * stirW) / (qty - 1),
              cy: stirY + stirH,
              r: radius
            })
          }
        }
      } else if (row.position === 'Samping') {
        const sideQtyEach = Math.ceil(qty / 2)
        if (sideQtyEach === 1) {
          drawRebars.push({ cx: stirX, cy: stirY + stirH / 2, r: radius })
          if (qty > 1) {
            drawRebars.push({ cx: stirX + stirW, cy: stirY + stirH / 2, r: radius })
          }
        } else {
          for (let i = 0; i < sideQtyEach; i++) {
            const fraction = (i + 1) / (sideQtyEach + 1)
            drawRebars.push({ cx: stirX, cy: stirY + stirH * fraction, r: radius })
            if (qty > i + sideQtyEach) {
              drawRebars.push({ cx: stirX + stirW, cy: stirY + stirH * fraction, r: radius })
            }
          }
        }
      }
    })

    return (
      <div className="flex flex-col items-center p-3 bg-slate-50 border border-gray-200 rounded-xl shadow-sm">
        <span className="text-[10px] font-bold text-gray-500 uppercase mb-2 font-sans">Visual Penampang Struktur</span>
        <svg width={svgW} height={svgH} className="bg-white border border-gray-100 rounded-lg">
          {/* Concrete outer body */}
          <rect
            x={drawX}
            y={drawY}
            width={drawW}
            height={drawH}
            fill="#f1f5f9"
            stroke="#475569"
            strokeWidth="2"
            rx="2"
          />

          {/* Stirrup wrapper */}
          <rect
            x={stirX}
            y={stirY}
            width={stirW}
            height={stirH}
            fill="none"
            stroke="#1e293b"
            strokeWidth="1.5"
            rx="1"
          />

          {/* Stirrup Hooks at top-left corner */}
          {stirW > 0 && stirH > 0 && (
            <g stroke="#1e293b" strokeWidth="1.5" fill="none">
              <line x1={stirX} y1={stirY} x2={stirX + 12} y2={stirY + 12} />
              <line x1={stirX} y1={stirY} x2={stirX + 6} y2={stirY + 14} />
            </g>
          )}

          {/* Longitudinal bars */}
          {drawRebars.map((r, idx) => (
            <circle
              key={`bar-${idx}`}
              cx={r.cx}
              cy={r.cy}
              r={r.r}
              fill="#ea580c"
              stroke="#9a3412"
              strokeWidth="1"
            />
          ))}

          {/* Concrete width label b */}
          <text
            x={drawX + drawW / 2}
            y={drawY + drawH + 14}
            textAnchor="middle"
            className="fill-slate-500 font-mono text-[9px] font-bold"
          >
            b = {b} mm
          </text>

          {/* Concrete height label h */}
          <text
            x={drawX - 8}
            y={drawY + drawH / 2}
            textAnchor="middle"
            transform={`rotate(-90, ${drawX - 8}, ${drawY + drawH / 2})`}
            className="fill-slate-500 font-mono text-[9px] font-bold"
          >
            h = {h} mm
          </text>

          {/* Cover label c */}
          {drawC > 8 && (
            <text
              x={stirX + 4}
              y={stirY + 10}
              className="fill-slate-400 font-mono text-[8px]"
            >
              c={c}
            </text>
          )}
        </svg>
      </div>
    )
  }

  const applyTemplate = (type: 'latei' | 'ringbalk' | 'kolom_praktis') => {
    setEditingElementId(String(Date.now()))
    if (type === 'latei') {
      setFormName('Balok Latei 10x10')
      setFormB('100')
      setFormH('100')
      setFormCover('20')
      setFormLength('4')
      setFormQty('1')
      setFormMainRebarRows([
        { id: '1', position: 'Atas', diameter: 'Ø8', qty: '2' },
        { id: '2', position: 'Bawah', diameter: 'Ø8', qty: '2' }
      ])
      setFormStirrupMode('uniform')
      setFormStirrupDia('Ø6')
      setFormStirrupSpacing('150')
    } else if (type === 'ringbalk') {
      setFormName('Ring Balk 15x20')
      setFormB('150')
      setFormH('200')
      setFormCover('25')
      setFormLength('4')
      setFormQty('1')
      setFormMainRebarRows([
        { id: '1', position: 'Atas', diameter: 'D10', qty: '2' },
        { id: '2', position: 'Bawah', diameter: 'D10', qty: '2' }
      ])
      setFormStirrupMode('uniform')
      setFormStirrupDia('Ø8')
      setFormStirrupSpacing('150')
    } else if (type === 'kolom_praktis') {
      setFormName('Kolom Praktis 15x15')
      setFormB('150')
      setFormH('150')
      setFormCover('20')
      setFormLength('4')
      setFormQty('1')
      setFormMainRebarRows([
        { id: '1', position: 'Atas', diameter: 'D10', qty: '2' },
        { id: '2', position: 'Bawah', diameter: 'D10', qty: '2' }
      ])
      setFormStirrupMode('uniform')
      setFormStirrupDia('Ø8')
      setFormStirrupSpacing('150')
    }
  }

  const handleSaveElement = () => {
    const updatedElement = {
      id: editingElementId!,
      name: formName,
      b: formB,
      h: formH,
      c: formCover,
      length: formLength,
      qty: formQty,
      mainRebarRows: formMainRebarRows,
      stirrupMode: formStirrupMode,
      stirrupDia: formStirrupDia,
      stirrupSpacing: formStirrupSpacing,
      stirrupSpacingTumpuan: formStirrupSpacingTumpuan,
      stirrupSpacingLapangan: formStirrupSpacingLapangan
    }
    
    if (sectionElements.some(el => el.id === editingElementId)) {
      setSectionElements(sectionElements.map(el => el.id === editingElementId ? updatedElement : el))
    } else {
      setSectionElements([...sectionElements, updatedElement])
    }
    setEditingElementId(null)
  }

  const handleStartEdit = (el: typeof sectionElements[0]) => {
    setEditingElementId(el.id)
    setFormName(el.name)
    setFormB(el.b)
    setFormH(el.h)
    setFormCover(el.c)
    setFormLength(el.length)
    setFormQty(el.qty)
    setFormMainRebarRows(el.mainRebarRows)
    setFormStirrupMode(el.stirrupMode)
    setFormStirrupDia(el.stirrupDia)
    setFormStirrupSpacing(el.stirrupSpacing)
    setFormStirrupSpacingTumpuan(el.stirrupSpacingTumpuan)
    setFormStirrupSpacingLapangan(el.stirrupSpacingLapangan)
  }

  const handleStartAdd = () => {
    setEditingElementId(String(Date.now()))
    setFormName('Balok B' + (sectionElements.length + 1))
    setFormB('200')
    setFormH('300')
    setFormCover('40')
    setFormLength('4')
    setFormQty('1')
    setFormMainRebarRows([
      { id: '1', position: 'Atas', diameter: 'D13', qty: '2' },
      { id: '2', position: 'Bawah', diameter: 'D13', qty: '3' }
    ])
    setFormStirrupMode('uniform')
    setFormStirrupDia('Ø8')
    setFormStirrupSpacing('150')
    setFormStirrupSpacingTumpuan('100')
    setFormStirrupSpacingLapangan('150')
  }

  if (!isOpen) return null

  return (
    <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-[999] overflow-y-auto">
      <div className="bg-white rounded-xl shadow-2xl w-full max-w-4xl mx-4 my-8 flex flex-col max-h-[85vh] border border-gray-100">
        
        {/* Header */}
        <div className="p-5 border-b border-gray-200 flex justify-between items-center bg-slate-50 rounded-t-xl">
          <div>
            <h3 className="text-lg font-bold text-slate-800 flex items-center gap-2">
              🧮 Backup Kalkulator Volume Pekerjaan
            </h3>
            <p className="text-xs text-gray-500 mt-1">
              Gunakan kalkulator ini untuk menghitung secara terinci. Hasil perhitungan akan mengisi kolom volume utama.
            </p>
          </div>
          <button type="button" onClick={onClose} className="text-gray-400 hover:text-gray-600 text-2xl font-semibold leading-none">&times;</button>
        </div>

        {/* Tabs */}
        <div className="flex border-b border-gray-200 bg-gray-100 text-sm">
          <button
            onClick={() => setActiveTab('simple')}
            className={`flex-1 py-3 text-center font-medium border-b-2 transition-all ${
              activeTab === 'simple'
                ? 'border-primary-800 text-primary-800 bg-white font-bold'
                : 'border-transparent text-gray-500 hover:text-gray-700 hover:bg-gray-50'
            }`}
          >
            🧮 Formula Matematika
          </button>
          <button
            onClick={() => setActiveTab('dimensions')}
            className={`flex-1 py-3 text-center font-medium border-b-2 transition-all ${
              activeTab === 'dimensions'
                ? 'border-primary-800 text-primary-800 bg-white font-bold'
                : 'border-transparent text-gray-500 hover:text-gray-700 hover:bg-gray-50'
            }`}
          >
            📏 Daftar Dimensi (P x L x T)
          </button>
          <button
            onClick={() => setActiveTab('steel')}
            className={`flex-1 py-3 text-center font-medium border-b-2 transition-all ${
              activeTab === 'steel'
                ? 'border-primary-800 text-primary-800 bg-white font-bold'
                : 'border-transparent text-gray-500 hover:text-gray-700 hover:bg-gray-50'
            }`}
          >
            ⛓️ Pembesian (kg)
          </button>
          <button
            onClick={() => setActiveTab('wall')}
            className={`flex-1 py-3 text-center font-medium border-b-2 transition-all ${
              activeTab === 'wall'
                ? 'border-primary-800 text-primary-800 bg-white font-bold'
                : 'border-transparent text-gray-500 hover:text-gray-700 hover:bg-gray-50'
            }`}
          >
            🧱 Dinding & Bukaan
          </button>
          {/* Hide Volume Bersama tab button as per user's hold request */}
          {false && projectId && (
            <button
              onClick={() => setActiveTab('project-volume')}
              className={`flex-1 py-3 text-center font-medium border-b-2 transition-all ${
                activeTab === 'project-volume'
                  ? 'border-primary-800 text-primary-800 bg-white font-bold'
                  : 'border-transparent text-gray-500 hover:text-gray-700 hover:bg-gray-50'
              }`}
            >
              🔗 Volume Bersama
            </button>
          )}
        </div>

        {/* Content Body */}
        <div className="p-6 flex-1 overflow-y-auto min-h-[300px]">
          
          {/* Hide Linked Volume Banner as per user's hold request */}
          {false && currentProjectVolumeId && activeTab !== 'project-volume' && (
            <div className="mb-4 p-3 bg-blue-50 border border-blue-200 rounded-lg flex items-center justify-between text-xs text-blue-800 font-sans shadow-sm">
              <div className="flex items-center gap-2">
                <span className="text-lg">🔗</span>
                <div>
                  <span className="font-bold">Terhubung ke Volume Bersama: </span>
                  <span className="font-semibold text-blue-900 bg-blue-100 px-2 py-0.5 rounded ml-1">
                    {loadedProjectVolumes.find(pv => pv.id === currentProjectVolumeId)?.name || 'Volume Bersama'} 
                    {' '}
                    ({loadedProjectVolumes.find(pv => pv.id === currentProjectVolumeId)?.value} {loadedProjectVolumes.find(pv => pv.id === currentProjectVolumeId)?.unit})
                  </span>
                </div>
              </div>
              <button
                type="button"
                onClick={() => {
                  setCurrentProjectVolumeId(null)
                }}
                className="text-red-600 hover:text-red-800 font-bold bg-white px-2.5 py-1 border border-red-200 rounded shadow-sm hover:bg-red-50 transition-colors"
              >
                Putuskan Hubungan (Ubah ke Manual)
              </button>
            </div>
          )}

          {/* TAB 1: SIMPLE MATH FORMULA */}
          {activeTab === 'simple' && (
            <div className="space-y-4 max-w-lg mx-auto py-4">
              <label className="block text-sm font-semibold text-slate-700">Tulis Formula Matematika:</label>
              <input
                type="text"
                value={simpleFormula}
                onChange={e => setSimpleFormula(e.target.value)}
                placeholder="Contoh: (2 * 4.5) + (3 * 1.25) - 0.5"
                className="input-field font-mono text-base focus:ring-2 focus:ring-primary-500"
              />
              <p className="text-[10px] text-gray-400 font-sans leading-relaxed">
                Mendukung angka, operator (+, -, *, /), kurung, dan variabel volume bersama berformat <code>[Nama Volume]</code>.
              </p>

              {/* Variable selection section */}
              {loadedProjectVolumes && loadedProjectVolumes.length > 0 && (
                <div className="space-y-2 border-t border-slate-100 pt-3">
                  <span className="block text-xs font-bold text-slate-500 uppercase tracking-wider">Sisipkan Variabel Volume Bersama:</span>
                  <div className="flex flex-wrap gap-1.5 max-h-32 overflow-y-auto p-1 bg-slate-50/50 rounded-lg border border-slate-100">
                    {loadedProjectVolumes.map(pv => (
                      <button
                        key={pv.id}
                        type="button"
                        onClick={() => {
                          setSimpleFormula(prev => {
                            const trimmed = prev.trim()
                            const needsAdd = trimmed && !/[+\-*/(]$/.test(trimmed)
                            return prev + (needsAdd ? ' + ' : '') + `[${pv.name}]`
                          })
                        }}
                        className="px-2 py-1 bg-white hover:bg-blue-50 text-blue-700 border border-blue-200 hover:border-blue-300 rounded font-semibold text-[10px] shadow-sm transition-colors flex items-center gap-1"
                        title={`Nilai saat ini: ${pv.value} ${pv.unit}`}
                      >
                        <span>🔗</span>
                        <span>{pv.name}</span>
                        <span className="text-gray-400 font-mono">({pv.value} {pv.unit})</span>
                      </button>
                    ))}
                  </div>
                </div>
              )}

              {simpleError && (
                <div className="p-3 bg-red-50 text-red-700 border border-red-200 rounded-lg text-xs font-semibold">
                  ⚠️ {simpleError}
                </div>
              )}

              <div className="p-4 bg-slate-50 border border-gray-200 rounded-xl flex items-center justify-between shadow-inner">
                <span className="text-gray-500 font-medium text-sm">Hasil Kalkulasi:</span>
                <span className="text-2xl font-extrabold text-primary-800 font-mono">{simpleResult.toLocaleString('id-ID', { minimumFractionDigits: 0, maximumFractionDigits: 4 })}</span>
              </div>
            </div>
          )}

          {/* TAB 2: DIMENSIONS LIST */}
          {activeTab === 'dimensions' && (
            <div className="space-y-4">
              <div className="flex justify-between items-center">
                <h4 className="font-bold text-sm text-slate-800">Daftar Dimensi (Masing-masing baris akan dijumlahkan)</h4>
                <button
                  type="button"
                  onClick={() => setDimRows([...dimRows, { id: String(Date.now()), description: '', length: '', width: '', height: '', qty: '1' }])}
                  className="btn-primary text-xs px-3 py-1.5 bg-slate-800 hover:bg-slate-900"
                >
                  + Tambah Baris
                </button>
              </div>

              <table className="w-full text-xs">
                <thead>
                  <tr className="bg-slate-50 border-b border-gray-200 text-gray-500 font-semibold uppercase">
                    <th className="px-3 py-2 text-left">Deskripsi Pekerjaan / Segmen</th>
                    <th className="px-3 py-2 text-right w-24">Panjang (P) m</th>
                    <th className="px-3 py-2 text-right w-24">Lebar (L) m</th>
                    <th className="px-3 py-2 text-right w-24">Tinggi (T) m</th>
                    <th className="px-3 py-2 text-right w-24">Jumlah (Qty)</th>
                    <th className="px-3 py-2 text-right w-28">Total Volume</th>
                    <th className="px-2 py-2 text-center w-12">Aksi</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-100">
                  {dimRows.map((row, idx) => {
                    const rowTotal = getDimRowTotal(row)
                    return (
                      <tr key={row.id}>
                        <td className="py-2 pr-2">
                          <input
                            type="text"
                            value={row.description}
                            onChange={e => {
                              const newRows = [...dimRows]
                              newRows[idx].description = e.target.value
                              setDimRows(newRows)
                            }}
                            placeholder={`Contoh: Segmen ${idx + 1}`}
                            className="w-full px-2.5 py-1 border border-gray-200 rounded text-xs focus:ring-1 focus:ring-primary-500"
                          />
                        </td>
                        <td className="py-2 px-1">
                          <input
                            type="number"
                            step="any"
                            value={row.length}
                            onChange={e => {
                              const newRows = [...dimRows]
                              newRows[idx].length = e.target.value
                              setDimRows(newRows)
                            }}
                            placeholder="1"
                            className="w-full px-2 py-1 border border-gray-200 rounded text-right font-mono text-xs"
                          />
                        </td>
                        <td className="py-2 px-1">
                          <input
                            type="number"
                            step="any"
                            value={row.width}
                            onChange={e => {
                              const newRows = [...dimRows]
                              newRows[idx].width = e.target.value
                              setDimRows(newRows)
                            }}
                            placeholder="1"
                            className="w-full px-2 py-1 border border-gray-200 rounded text-right font-mono text-xs"
                          />
                        </td>
                        <td className="py-2 px-1">
                          <input
                            type="number"
                            step="any"
                            value={row.height}
                            onChange={e => {
                              const newRows = [...dimRows]
                              newRows[idx].height = e.target.value
                              setDimRows(newRows)
                            }}
                            placeholder="1"
                            className="w-full px-2 py-1 border border-gray-200 rounded text-right font-mono text-xs"
                          />
                        </td>
                        <td className="py-2 px-1">
                          <input
                            type="number"
                            step="any"
                            value={row.qty}
                            onChange={e => {
                              const newRows = [...dimRows]
                              newRows[idx].qty = e.target.value
                              setDimRows(newRows)
                            }}
                            placeholder="1"
                            className="w-full px-2 py-1 border border-gray-200 rounded text-right font-mono text-xs"
                          />
                        </td>
                        <td className="py-2 pl-2 text-right font-mono font-semibold text-slate-700">
                          {rowTotal.toFixed(3)}
                        </td>
                        <td className="py-2 text-center">
                          <button
                            type="button"
                            disabled={dimRows.length === 1}
                            onClick={() => setDimRows(dimRows.filter(r => r.id !== row.id))}
                            className="text-red-500 hover:text-red-700 disabled:opacity-30 p-1 rounded"
                          >
                            &times;
                          </button>
                        </td>
                      </tr>
                    )
                  })}
                </tbody>
              </table>

              <div className="p-4 bg-slate-50 border border-gray-200 rounded-xl flex items-center justify-between shadow-inner mt-4">
                <span className="text-gray-500 font-medium text-sm">Total Volume Gabungan:</span>
                <span className="text-2xl font-extrabold text-primary-800 font-mono">{getDimTotal().toLocaleString('id-ID', { minimumFractionDigits: 0, maximumFractionDigits: 3 })} {unit || 'm³'}</span>
              </div>
            </div>
          )}

          {/* TAB 3: STEEL WEIGHT CALCULATOR */}
          {activeTab === 'steel' && (
            <div className="space-y-4">
              
              {/* Mode Switcher */}
              <div className="flex gap-4 p-1 bg-slate-100 rounded-lg max-w-sm mb-4">
                <button
                  type="button"
                  onClick={() => setSteelMode('table')}
                  className={`flex-1 text-center py-1.5 text-xs font-semibold rounded-md transition-all ${
                    steelMode === 'table' ? 'bg-white text-slate-800 shadow-sm font-bold' : 'text-slate-500 hover:text-slate-700'
                  }`}
                >
                  📝 Daftar Detail Besi (Manual)
                </button>
                <button
                  type="button"
                  onClick={() => setSteelMode('section')}
                  className={`flex-1 text-center py-1.5 text-xs font-semibold rounded-md transition-all ${
                    steelMode === 'section' ? 'bg-white text-slate-800 shadow-sm font-bold' : 'text-slate-500 hover:text-slate-700'
                  }`}
                >
                  🧱 Penampang Struktur (Balok/Kolom)
                </button>
              </div>

              {steelMode === 'table' && (
                <div className="space-y-4">
                  <div className="flex justify-between items-center">
                    <div>
                      <h4 className="font-bold text-sm text-slate-800">Kalkulator Volume Pembesian Besi Beton</h4>
                      <p className="text-[10px] text-gray-500">Otomatis menghitung berat besi berdasarkan diameter (D) menggunakan standar: `0.006165 * D² * Panjang * Qty * Mult` kg</p>
                    </div>
                    <button
                      type="button"
                      onClick={() => setSteelRows([...steelRows, { id: String(Date.now()), description: '', diameter: 'Ø10', length: '', qty: '', mult: '1' }])}
                      className="btn-primary text-xs px-3 py-1.5 bg-slate-800 hover:bg-slate-900"
                    >
                      + Tambah Baris
                    </button>
                  </div>

                  <table className="w-full text-xs">
                    <thead>
                      <tr className="bg-slate-50 border-b border-gray-200 text-gray-500 font-semibold uppercase">
                        <th className="px-3 py-2 text-left">Elemen / Bagian Pekerjaan</th>
                        <th className="px-3 py-2 text-center w-28">Diameter (D)</th>
                        <th className="px-3 py-2 text-right w-24">Berat/m (kg)</th>
                        <th className="px-3 py-2 text-right w-24">Panjang (L) m</th>
                        <th className="px-3 py-2 text-right w-20">Qty (Btg)</th>
                        <th className="px-3 py-2 text-right w-20">Mult (Kali)</th>
                        <th className="px-3 py-2 text-right w-28">Total Berat (kg)</th>
                        <th className="px-2 py-2 text-center w-10">Aksi</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-gray-100">
                      {steelRows.map((row, idx) => {
                        const { size } = parseDiameter(row.diameter)
                        const wPerMeter = 0.006165 * size * size
                        const rowWeight = getSteelRowWeight(row)
                        return (
                          <tr key={row.id}>
                            <td className="py-2 pr-2">
                              <input
                                type="text"
                                value={row.description}
                                onChange={e => {
                                  const newRows = [...steelRows]
                                  newRows[idx].description = e.target.value
                                  setSteelRows(newRows)
                                }}
                                placeholder="Contoh: Tulangan Utama Balok"
                                className="w-full px-2.5 py-1 border border-gray-200 rounded text-xs focus:ring-1 focus:ring-primary-500"
                              />
                            </td>
                            <td className="py-2 px-1 text-center">
                              <select
                                value={row.diameter}
                                onChange={e => {
                                  const newRows = [...steelRows]
                                  newRows[idx].diameter = e.target.value
                                  setSteelRows(newRows)
                                }}
                                className="px-1 py-1 border border-gray-200 rounded font-mono text-xs w-28 focus:ring-1"
                              >
                                {diameterOptions.map(opt => (
                                  <option key={opt} value={opt}>{opt}</option>
                                ))}
                              </select>
                            </td>
                            <td className="py-2 px-1 text-right font-mono text-gray-500">
                              {wPerMeter.toFixed(3)}
                            </td>
                            <td className="py-2 px-1">
                              <input
                                type="number"
                                step="any"
                                value={row.length}
                                onChange={e => {
                                  const newRows = [...steelRows]
                                  newRows[idx].length = e.target.value
                                  setSteelRows(newRows)
                                }}
                                placeholder="Panjang (m)"
                                className="w-full px-2 py-1 border border-gray-200 rounded text-right font-mono text-xs"
                              />
                            </td>
                            <td className="py-2 px-1">
                              <input
                                type="number"
                                step="any"
                                value={row.qty}
                                onChange={e => {
                                  const newRows = [...steelRows]
                                  newRows[idx].qty = e.target.value
                                  setSteelRows(newRows)
                                }}
                                placeholder="Jumlah"
                                className="w-full px-2 py-1 border border-gray-200 rounded text-right font-mono text-xs"
                              />
                            </td>
                            <td className="py-2 px-1">
                              <input
                                type="number"
                                step="any"
                                value={row.mult}
                                onChange={e => {
                                  const newRows = [...steelRows]
                                  newRows[idx].mult = e.target.value
                                  setSteelRows(newRows)
                                }}
                                placeholder="1"
                                className="w-full px-2 py-1 border border-gray-200 rounded text-right font-mono text-xs"
                              />
                            </td>
                            <td className="py-2 pl-2 text-right font-mono font-semibold text-slate-700">
                              {rowWeight.toFixed(3)}
                            </td>
                            <td className="py-2 text-center">
                              <button
                                type="button"
                                disabled={steelRows.length === 1}
                                onClick={() => setSteelRows(steelRows.filter(r => r.id !== row.id))}
                                className="text-red-500 hover:text-red-700 disabled:opacity-30 p-1 rounded"
                              >
                                &times;
                              </button>
                            </td>
                          </tr>
                        )
                      })}
                    </tbody>
                  </table>
                </div>
              )}

              {steelMode === 'section' && (
                <div className="space-y-6">
                  {editingElementId === null ? (
                    // LIST MODE (Rekap Elemen Struktur & Kebutuhan Besinya)
                    <div className="space-y-4">
                      <div className="flex justify-between items-center">
                        <div>
                          <h4 className="font-bold text-sm text-slate-800">Rekap Elemen Struktur & Kebutuhan Besi</h4>
                          <p className="text-[10px] text-gray-500">
                            Berikut daftar rekap kebutuhan pembesian dari penampang beton sipil yang Anda inputkan.
                          </p>
                        </div>
                        <button
                          type="button"
                          onClick={handleStartAdd}
                          className="btn-primary text-xs px-3 py-1.5 bg-slate-800 hover:bg-slate-900"
                        >
                          + Tambah Elemen Baru
                        </button>
                      </div>

                      {/* Summary Table */}
                      <div className="border border-gray-200 rounded-xl overflow-hidden shadow-sm">
                        <table className="w-full text-xs">
                          <thead>
                            <tr className="bg-slate-50 border-b border-gray-200 text-gray-500 font-semibold uppercase">
                              <th className="px-3 py-2 text-left">Nama Elemen</th>
                              <th className="px-3 py-2 text-center w-24">Dimensi (mm)</th>
                              <th className="px-3 py-2 text-right w-24">Bentang (L)</th>
                              <th className="px-3 py-2 text-right w-16">Qty</th>
                              <th className="px-3 py-2 text-left">Tul. Utama</th>
                              <th className="px-3 py-2 text-left">Begel/Sengkang</th>
                              <th className="px-3 py-2 text-right w-28">Berat Total (kg)</th>
                              <th className="px-2 py-2 text-center w-20">Aksi</th>
                            </tr>
                          </thead>
                          <tbody className="divide-y divide-gray-100 bg-white">
                            {sectionElements.length === 0 ? (
                              <tr>
                                <td colSpan={8} className="text-center py-6 text-gray-400 font-sans text-xs">
                                  Belum ada elemen penampang. Silakan pilih template di bawah atau "+ Tambah Elemen Baru" untuk memulai.
                                </td>
                              </tr>
                            ) : (
                              sectionElements.map((el) => {
                                const res = getSingleElementWeight(el)
                                const mainRebarsDesc = el.mainRebarRows
                                  .map(r => `${r.position}: ${r.qty}x${r.diameter}`)
                                  .join(', ')
                                const spacingText = el.stirrupMode === 'split'
                                  ? `Tumpuan @${el.stirrupSpacingTumpuan}mm, Lapangan @${el.stirrupSpacingLapangan}mm`
                                  : `@${el.stirrupSpacing}mm`
                                const begelDesc = `${el.stirrupDia} ${spacingText}`
                                
                                return (
                                  <tr key={el.id} className="hover:bg-slate-50/50">
                                    <td className="px-3 py-2.5 font-semibold text-slate-800">{el.name}</td>
                                    <td className="px-3 py-2.5 text-center font-mono text-gray-600">{el.b}x{el.h} c{el.c}</td>
                                    <td className="px-3 py-2.5 text-right font-mono text-gray-600">{el.length} m</td>
                                    <td className="px-3 py-2.5 text-right font-mono text-gray-600">{el.qty}x</td>
                                    <td className="px-3 py-2.5 text-slate-600 max-w-xs truncate" title={mainRebarsDesc}>
                                      {mainRebarsDesc}
                                    </td>
                                    <td className="px-3 py-2.5 text-slate-600 max-w-xs truncate" title={begelDesc}>
                                      {begelDesc}
                                    </td>
                                    <td className="px-3 py-2.5 text-right font-mono font-bold text-slate-700">
                                      {res.totalWeight.toFixed(3)} kg
                                    </td>
                                    <td className="px-2 py-2.5 text-center space-x-1">
                                      <button
                                        type="button"
                                        onClick={() => handleStartEdit(el)}
                                        className="text-primary-600 hover:text-primary-800 hover:underline font-semibold"
                                      >
                                        Edit
                                      </button>
                                      <span className="text-gray-300">|</span>
                                      <button
                                        type="button"
                                        onClick={() => setSectionElements(sectionElements.filter(item => item.id !== el.id))}
                                        className="text-red-600 hover:text-red-800 hover:underline font-semibold"
                                      >
                                        Hapus
                                      </button>
                                    </td>
                                  </tr>
                                )
                              })
                            )}
                          </tbody>
                        </table>
                      </div>

                      {/* Templates Selection */}
                      <div className="bg-slate-50 p-4 rounded-xl border border-gray-200 space-y-2">
                        <span className="text-[10px] font-bold text-gray-500 uppercase tracking-wide block">Pilih Template Struktur untuk Ditambahkan</span>
                        <div className="flex flex-wrap gap-2">
                          <button
                            type="button"
                            onClick={() => applyTemplate('latei')}
                            className="px-3 py-1.5 text-xs bg-white border border-gray-200 rounded-md hover:bg-gray-50 text-slate-700 font-semibold"
                          >
                            ➕ Latei 10x10
                          </button>
                          <button
                            type="button"
                            onClick={() => applyTemplate('ringbalk')}
                            className="px-3 py-1.5 text-xs bg-white border border-gray-200 rounded-md hover:bg-gray-50 text-slate-700 font-semibold"
                          >
                            ➕ Ring Balk 15x20
                          </button>
                          <button
                            type="button"
                            onClick={() => applyTemplate('kolom_praktis')}
                            className="px-3 py-1.5 text-xs bg-white border border-gray-200 rounded-md hover:bg-gray-50 text-slate-700 font-semibold"
                          >
                            ➕ Kolom Praktis 15x15
                          </button>
                        </div>
                      </div>
                    </div>
                  ) : (
                    // EDITOR MODE (Edit / Tambah Elemen Penampang Baru)
                    <div className="space-y-4">
                      <div className="flex justify-between items-center border-b border-gray-100 pb-2">
                        <h4 className="font-bold text-sm text-slate-800">
                          ⚙️ Konfigurasi Parameter Penampang Struktur
                        </h4>
                        <span className="text-[10px] px-2 py-0.5 bg-primary-50 text-primary-700 font-semibold rounded-full">
                          Editing Mode
                        </span>
                      </div>

                      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                        {/* Left Parameter Panel */}
                        <div className="md:col-span-2 space-y-4">
                          
                          {/* Nama Elemen */}
                          <div className="bg-slate-50 p-4 rounded-xl border border-gray-200">
                            <label className="block text-[10px] uppercase font-bold text-gray-500 mb-1">Nama Elemen Struktur (Balok/Kolom)</label>
                            <input
                              type="text"
                              value={formName}
                              onChange={e => setFormName(e.target.value)}
                              placeholder="Contoh: Balok B1"
                              className="w-full px-2.5 py-1.5 border border-gray-200 rounded text-xs focus:ring-1"
                            />
                          </div>

                          {/* Dimensi Beton */}
                          <div className="bg-slate-50 p-4 rounded-xl border border-gray-200 space-y-3">
                            <h5 className="font-bold text-xs text-slate-800 uppercase tracking-wide">1. Dimensi Penampang Beton & Selimut</h5>
                            <div className="grid grid-cols-3 gap-3">
                              <div>
                                <label className="block text-[10px] uppercase font-bold text-gray-500 mb-1">Lebar (b) mm</label>
                                <input
                                  type="number"
                                  value={formB}
                                  onChange={e => setFormB(e.target.value)}
                                  placeholder="200"
                                  className="w-full px-2 py-1.5 border border-gray-200 rounded text-right font-mono text-xs focus:ring-1"
                                />
                              </div>
                              <div>
                                <label className="block text-[10px] uppercase font-bold text-gray-500 mb-1">Tinggi (h) mm</label>
                                <input
                                  type="number"
                                  value={formH}
                                  onChange={e => setFormH(e.target.value)}
                                  placeholder="300"
                                  className="w-full px-2 py-1.5 border border-gray-200 rounded text-right font-mono text-xs focus:ring-1"
                                />
                              </div>
                              <div>
                                <label className="block text-[10px] uppercase font-bold text-gray-500 mb-1">Selimut (c) mm</label>
                                <input
                                  type="number"
                                  value={formCover}
                                  onChange={e => setFormCover(e.target.value)}
                                  placeholder="40"
                                  className="w-full px-2 py-1.5 border border-gray-200 rounded text-right font-mono text-xs focus:ring-1"
                                />
                              </div>
                            </div>
                            <div className="grid grid-cols-2 gap-3 pt-1">
                              <div>
                                <label className="block text-[10px] uppercase font-bold text-gray-500 mb-1">Panjang Struktur (L) m</label>
                                <input
                                  type="number"
                                  step="any"
                                  value={formLength}
                                  onChange={e => setFormLength(e.target.value)}
                                  placeholder="4"
                                  className="w-full px-2 py-1.5 border border-gray-200 rounded text-right font-mono text-xs focus:ring-1"
                                />
                              </div>
                              <div>
                                <label className="block text-[10px] uppercase font-bold text-gray-500 mb-1">Jumlah Elemen (Qty)</label>
                                <input
                                  type="number"
                                  value={formQty}
                                  onChange={e => setFormQty(e.target.value)}
                                  placeholder="1"
                                  className="w-full px-2 py-1.5 border border-gray-200 rounded text-right font-mono text-xs focus:ring-1"
                                />
                              </div>
                            </div>
                          </div>

                          {/* Tulangan Longitudinal */}
                          <div className="bg-slate-50 p-4 rounded-xl border border-gray-200 space-y-3">
                            <div className="flex justify-between items-center">
                              <h5 className="font-bold text-xs text-slate-800 uppercase tracking-wide">2. Penulangan Utama (Longitudinal)</h5>
                              <button
                                type="button"
                                onClick={() => setFormMainRebarRows([...formMainRebarRows, { id: String(Date.now()), position: 'Atas', diameter: 'D13', qty: '2' }])}
                                className="btn-primary text-xs px-2.5 py-1 bg-slate-800 hover:bg-slate-900"
                              >
                                + Tambah Tulangan
                              </button>
                            </div>
                            
                            <table className="w-full text-xs">
                              <thead>
                                <tr className="text-gray-500 border-b border-gray-200 font-semibold uppercase">
                                  <th className="py-1 text-left">Posisi</th>
                                  <th className="py-1 text-left w-36">Diameter</th>
                                  <th className="py-1 text-right w-24">Jumlah (Qty)</th>
                                  <th className="py-1 text-center w-10">Aksi</th>
                                </tr>
                              </thead>
                              <tbody className="divide-y divide-gray-100">
                                {formMainRebarRows.map((row, idx) => (
                                  <tr key={row.id}>
                                    <td className="py-1.5 pr-2">
                                      <select
                                        value={row.position}
                                        onChange={e => {
                                          const newRows = [...formMainRebarRows]
                                          newRows[idx].position = e.target.value as any
                                          setFormMainRebarRows(newRows)
                                        }}
                                        className="px-1 py-1 border border-gray-200 rounded text-xs w-full focus:ring-1"
                                      >
                                        <option value="Atas">Atas</option>
                                        <option value="Bawah">Bawah</option>
                                        <option value="Samping">Samping (Tengah)</option>
                                      </select>
                                    </td>
                                    <td className="py-1.5 px-1">
                                      <select
                                        value={row.diameter}
                                        onChange={e => {
                                          const newRows = [...formMainRebarRows]
                                          newRows[idx].diameter = e.target.value
                                          setFormMainRebarRows(newRows)
                                        }}
                                        className="px-1 py-1 border border-gray-200 rounded font-mono text-xs w-36 focus:ring-1"
                                      >
                                        {diameterOptions.map(opt => (
                                          <option key={opt} value={opt}>{opt}</option>
                                        ))}
                                      </select>
                                    </td>
                                    <td className="py-1.5 px-1">
                                      <input
                                        type="number"
                                        value={row.qty}
                                        onChange={e => {
                                          const newRows = [...formMainRebarRows]
                                          newRows[idx].qty = e.target.value
                                          setFormMainRebarRows(newRows)
                                        }}
                                        placeholder="2"
                                        className="w-full px-2 py-1 border border-gray-200 rounded text-right font-mono text-xs"
                                      />
                                    </td>
                                    <td className="py-1.5 text-center">
                                      <button
                                        type="button"
                                        disabled={formMainRebarRows.length === 1}
                                        onClick={() => setFormMainRebarRows(formMainRebarRows.filter(r => r.id !== row.id))}
                                        className="text-red-500 hover:text-red-700 disabled:opacity-30 p-0.5 rounded text-sm font-bold"
                                      >
                                        &times;
                                      </button>
                                    </td>
                                  </tr>
                                ))}
                              </tbody>
                            </table>
                          </div>

                          {/* Sengkang / Begel */}
                          <div className="bg-slate-50 p-4 rounded-xl border border-gray-200 space-y-3">
                            <h5 className="font-bold text-xs text-slate-800 uppercase tracking-wide">3. Begel / Sengkang (Stirrups) & Hook</h5>
                            
                            <div className="flex gap-4 p-1 bg-white border border-gray-200 rounded-lg max-w-xs text-xs mb-2">
                              <button
                                type="button"
                                onClick={() => setFormStirrupMode('uniform')}
                                className={`flex-1 text-center py-1 font-semibold rounded transition-all ${
                                  formStirrupMode === 'uniform' ? 'bg-slate-800 text-white shadow-sm' : 'text-slate-500 hover:text-slate-700'
                                }`}
                              >
                                Seragam (Uniform)
                              </button>
                              <button
                                type="button"
                                onClick={() => setFormStirrupMode('split')}
                                className={`flex-1 text-center py-1 font-semibold rounded transition-all ${
                                  formStirrupMode === 'split' ? 'bg-slate-800 text-white shadow-sm' : 'text-slate-500 hover:text-slate-700'
                                }`}
                              >
                                Tumpuan / Lapangan
                              </button>
                            </div>

                            <div className="grid grid-cols-3 gap-3">
                              <div>
                                <label className="block text-[10px] uppercase font-bold text-gray-500 mb-1">Diameter Begel</label>
                                <select
                                  value={formStirrupDia}
                                  onChange={e => setFormStirrupDia(e.target.value)}
                                  className="w-full px-2 py-1.5 border border-gray-200 rounded text-xs font-mono focus:ring-1"
                                >
                                  {diameterOptions.map(opt => (
                                    <option key={opt} value={opt}>{opt}</option>
                                  ))}
                                </select>
                              </div>
                              
                              {formStirrupMode === 'uniform' ? (
                                <div>
                                  <label className="block text-[10px] uppercase font-bold text-gray-500 mb-1">Jarak Begel (s) mm</label>
                                  <input
                                    type="number"
                                    value={formStirrupSpacing}
                                    onChange={e => setFormStirrupSpacing(e.target.value)}
                                    placeholder="150"
                                    className="w-full px-2 py-1.5 border border-gray-200 rounded text-right font-mono text-xs focus:ring-1"
                                  />
                                </div>
                              ) : (
                                <>
                                  <div>
                                    <label className="block text-[10px] uppercase font-bold text-gray-500 mb-1">s Tumpuan (1/4 L) mm</label>
                                    <input
                                      type="number"
                                      value={formStirrupSpacingTumpuan}
                                      onChange={e => setFormStirrupSpacingTumpuan(e.target.value)}
                                      placeholder="100"
                                      className="w-full px-2 py-1.5 border border-gray-200 rounded text-right font-mono text-xs focus:ring-1"
                                    />
                                  </div>
                                  <div>
                                    <label className="block text-[10px] uppercase font-bold text-gray-500 mb-1">s Lapangan (1/2 L) mm</label>
                                    <input
                                      type="number"
                                      value={formStirrupSpacingLapangan}
                                      onChange={e => setFormStirrupSpacingLapangan(e.target.value)}
                                      placeholder="150"
                                      className="w-full px-2 py-1.5 border border-gray-200 rounded text-right font-mono text-xs focus:ring-1"
                                    />
                                  </div>
                                </>
                              )}
                              
                              {formStirrupMode === 'uniform' && (
                                <div>
                                  <label className="block text-[10px] uppercase font-bold text-gray-400 mb-1">Panjang Kait (Hook)</label>
                                  <div className="py-2.5 text-[10.5px] font-mono text-gray-500 font-semibold text-center bg-white border border-gray-100 rounded">
                                    2 x 6d ({12 * (parseDiameter(formStirrupDia).size)} mm)
                                  </div>
                                </div>
                              )}
                            </div>

                            {formStirrupMode === 'split' && (
                              <div className="grid grid-cols-2 gap-3 pt-1">
                                <div className="text-[10px] text-gray-500 font-sans leading-relaxed">
                                  💡 **Tumpuan (Tepi)**: 1/4 L kiri + 1/4 L kanan = **1/2 bentang total** (Begel Tumpuan rapat, Lapangan renggang).
                                </div>
                                <div>
                                  <label className="block text-[10px] uppercase font-bold text-gray-400 mb-1">Panjang Kait (Hook)</label>
                                  <div className="py-2 text-[10.5px] font-mono text-gray-500 font-semibold text-center bg-white border border-gray-100 rounded">
                                    2 x 6d ({12 * (parseDiameter(formStirrupDia).size)} mm)
                                  </div>
                                </div>
                              </div>
                            )}
                          </div>

                          {/* Editor Actions */}
                          <div className="flex justify-end gap-3 pt-2">
                            <button
                              type="button"
                              onClick={() => setEditingElementId(null)}
                              className="px-4 py-2 text-xs font-semibold text-gray-600 bg-gray-100 hover:bg-gray-200 rounded-lg transition-colors"
                            >
                              Batal
                            </button>
                            <button
                              type="button"
                              onClick={handleSaveElement}
                              className="px-4 py-2 text-xs font-semibold text-white bg-slate-800 hover:bg-slate-900 rounded-lg shadow transition-colors"
                            >
                              Simpan Elemen Penampang
                            </button>
                          </div>
                        </div>

                        {/* Right Preview Panel */}
                        <div className="flex flex-col gap-4">
                          {renderConcreteSvg()}
                          
                          {/* Breakdown */}
                          {(() => {
                            const res = getSteelFormTotals()
                            const totalMainQty = formMainRebarRows.reduce((sum, r) => sum + (parseInt(r.qty) || 0), 0)
                            return (
                              <div className="bg-amber-50/60 border border-amber-100 p-4 rounded-xl text-xs space-y-2.5 shadow-sm font-sans">
                                <span className="font-bold text-slate-800 text-[10.5px] uppercase tracking-wider block">Rincian Hasil Elemen Ini:</span>
                                <div className="flex justify-between">
                                  <span className="text-gray-600">Besi Utama ({totalMainQty} btg):</span>
                                  <span className="font-mono font-semibold text-slate-800">{res.mainWeight.toFixed(3)} kg</span>
                                </div>
                                <div className="flex justify-between">
                                  <span className="text-gray-600">Besi Begel ({res.stirrupCount} btg @{res.stirrupLengthM.toFixed(3)}m):</span>
                                  <span className="font-mono font-semibold text-slate-800">{res.stirrupWeight.toFixed(3)} kg</span>
                                </div>
                                <div className="border-t border-amber-200/50 my-1" />
                                <div className="flex justify-between font-bold text-primary-800 text-sm">
                                  <span>Total Berat Elemen:</span>
                                  <span className="font-mono">{res.totalWeight.toFixed(3)} kg</span>
                                </div>
                              </div>
                            )
                          })()}
                        </div>
                      </div>
                    </div>
                  )}
                </div>
              )}

              {/* Batang 12m Breakdown */}
              {(() => {
                const bdn = getRebarBarBreakdown()
                if (bdn.length === 0) return null
                return (
                  <div className="bg-slate-50 p-4 rounded-xl border border-gray-200 space-y-3 mt-4">
                    <div className="flex items-center gap-2 text-slate-800 font-bold text-xs uppercase tracking-wide">
                      <span>📋</span> Estimasi Kebutuhan Batang Besi (Panjang Standar 12 Meter)
                    </div>
                    <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-3">
                      {bdn.map((item) => {
                        const barsNeeded = item.totalLength / 12
                        const roundedBars = Math.ceil(barsNeeded)
                        return (
                          <div key={item.diameter} className="bg-white border border-gray-150 rounded-lg p-3 flex flex-col justify-between shadow-sm">
                            <div className="flex justify-between items-center border-b border-gray-100 pb-1.5 mb-1.5">
                              <span className="font-bold text-sm text-primary-800">{item.diameter}</span>
                              <span className="font-mono text-[10.5px] text-gray-500 font-medium">{item.totalWeight.toFixed(2)} kg</span>
                            </div>
                            <div className="flex justify-between items-baseline">
                              <span className="text-[10px] text-gray-400 font-medium">Panjang: {item.totalLength.toFixed(1)} m</span>
                              <div className="text-right">
                                <div className="font-mono font-bold text-slate-800 text-xs">
                                  {barsNeeded.toFixed(2)} btg
                                </div>
                                <div className="text-[9.5px] text-emerald-600 font-bold">
                                  ≈ {roundedBars} btg (12m)
                                </div>
                              </div>
                            </div>
                          </div>
                        )
                      })}
                    </div>
                    <div className="text-[9.5px] text-gray-400 font-sans leading-relaxed">
                      * Catatan: Normalisasi diasumsikan menggunakan panjang pasar standar 12 meter per batang rebar baja. Angka pembulatan ke atas disarankan untuk pemesanan material dilapangan.
                    </div>
                  </div>
                )
              })()}

              <div className="p-4 bg-slate-50 border border-gray-200 rounded-xl flex items-center justify-between shadow-inner mt-4">
                <span className="text-gray-500 font-medium text-sm">Total Berat Besi Beton:</span>
                <span className="text-2xl font-extrabold text-primary-800 font-mono">{getSteelTotal().toLocaleString('id-ID', { minimumFractionDigits: 0, maximumFractionDigits: 3 })} kg</span>
              </div>
            </div>
          )}

          {/* TAB 4: WALL AREA MINUS OPENINGS */}
          {activeTab === 'wall' && (
            <div className="space-y-6">
              
              {/* Dinding Utama (Multiple) */}
              <div className="space-y-3">
                <div className="flex justify-between items-center">
                  <h4 className="font-bold text-sm text-slate-800">1. Luas Dinding Kotor (Gross Area)</h4>
                  <button
                    type="button"
                    onClick={() => setWallRows([...wallRows, { id: String(Date.now()), description: '', length: '', height: '', qty: '1' }])}
                    className="btn-primary text-xs px-3 py-1.5 bg-slate-800 hover:bg-slate-900"
                  >
                    + Tambah Dinding
                  </button>
                </div>

                <table className="w-full text-xs">
                  <thead>
                    <tr className="bg-slate-50 border-b border-gray-200 text-gray-500 font-semibold uppercase">
                      <th className="px-3 py-2 text-left">Deskripsi / Bagian Dinding</th>
                      <th className="px-3 py-2 text-right w-32">Panjang (m)</th>
                      <th className="px-3 py-2 text-right w-32">Tinggi (m)</th>
                      <th className="px-3 py-2 text-right w-24">Jumlah (Qty)</th>
                      <th className="px-3 py-2 text-right w-32">Luas Kotor (m²)</th>
                      <th className="px-2 py-2 text-center w-10">Aksi</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-100">
                    {wallRows.map((row, idx) => {
                      const rowArea = getWallRowArea(row)
                      return (
                        <tr key={row.id}>
                          <td className="py-2 pr-2">
                            <input
                              type="text"
                              value={row.description}
                              onChange={e => {
                                const newRows = [...wallRows]
                                newRows[idx].description = e.target.value
                                setWallRows(newRows)
                              }}
                              placeholder="Contoh: Dinding Utama Depan"
                              className="w-full px-2.5 py-1 border border-gray-200 rounded text-xs focus:ring-1 focus:ring-primary-500"
                            />
                          </td>
                          <td className="py-2 px-1">
                            <input
                              type="number"
                              step="any"
                              value={row.length}
                              onChange={e => {
                                const newRows = [...wallRows]
                                newRows[idx].length = e.target.value
                                setWallRows(newRows)
                              }}
                              placeholder="Panjang (m)"
                              className="w-full px-2 py-1 border border-gray-200 rounded text-right font-mono text-xs"
                            />
                          </td>
                          <td className="py-2 px-1">
                            <input
                              type="number"
                              step="any"
                              value={row.height}
                              onChange={e => {
                                const newRows = [...wallRows]
                                newRows[idx].height = e.target.value
                                setWallRows(newRows)
                              }}
                              placeholder="Tinggi (m)"
                              className="w-full px-2 py-1 border border-gray-200 rounded text-right font-mono text-xs"
                            />
                          </td>
                          <td className="py-2 px-1">
                            <input
                              type="number"
                              step="any"
                              value={row.qty}
                              onChange={e => {
                                const newRows = [...wallRows]
                                newRows[idx].qty = e.target.value
                                setWallRows(newRows)
                              }}
                              placeholder="1"
                              className="w-full px-2 py-1 border border-gray-200 rounded text-right font-mono text-xs"
                            />
                          </td>
                          <td className="py-2 pl-2 text-right font-mono font-semibold text-slate-700">
                            {rowArea.toFixed(3)}
                          </td>
                          <td className="py-2 text-center">
                            <button
                              type="button"
                              disabled={wallRows.length === 1}
                              onClick={() => setWallRows(wallRows.filter(r => r.id !== row.id))}
                              className="text-red-500 hover:text-red-700 disabled:opacity-30 p-1 rounded"
                            >
                              &times;
                            </button>
                          </td>
                        </tr>
                      )
                    })}
                  </tbody>
                </table>
              </div>

              {/* Bukaan/Deductions */}
              <div className="space-y-3">
                <div className="flex justify-between items-center">
                  <h4 className="font-bold text-sm text-slate-800">2. Pengurangan Bukaan (Pintu, Jendela, dst)</h4>
                  <button
                    type="button"
                    onClick={() => setOpenings([...openings, { id: String(Date.now()), name: '', width: '', height: '', qty: '1' }])}
                    className="btn-primary text-xs px-3 py-1 bg-slate-800 hover:bg-slate-900"
                  >
                    + Tambah Bukaan
                  </button>
                </div>

                <table className="w-full text-xs">
                  <thead>
                    <tr className="bg-slate-50 border-b border-gray-200 text-gray-500 font-semibold uppercase">
                      <th className="px-3 py-2 text-left">Nama Bukaan</th>
                      <th className="px-3 py-2 text-right w-32">Lebar Bukaan (m)</th>
                      <th className="px-3 py-2 text-right w-32">Tinggi Bukaan (m)</th>
                      <th className="px-3 py-2 text-right w-24">Jumlah (Qty)</th>
                      <th className="px-3 py-2 text-right w-32">Total Luas Bukaan (m²)</th>
                      <th className="px-2 py-2 text-center w-10">Aksi</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-100">
                    {openings.map((op, idx) => {
                      const opArea = getOpeningArea(op)
                      return (
                        <tr key={op.id}>
                          <td className="py-2 pr-2">
                            <input
                              type="text"
                              value={op.name}
                              onChange={e => {
                                const newOps = [...openings]
                                newOps[idx].name = e.target.value
                                setOpenings(newOps)
                              }}
                              placeholder="Contoh: Pintu P1"
                              className="w-full px-2.5 py-1 border border-gray-200 rounded text-xs focus:ring-1 focus:ring-primary-500"
                            />
                          </td>
                          <td className="py-2 px-1">
                            <input
                              type="number"
                              step="any"
                              value={op.width}
                              onChange={e => {
                                const newOps = [...openings]
                                newOps[idx].width = e.target.value
                                setOpenings(newOps)
                              }}
                              placeholder="0.9"
                              className="w-full px-2 py-1 border border-gray-200 rounded text-right font-mono text-xs"
                            />
                          </td>
                          <td className="py-2 px-1">
                            <input
                              type="number"
                              step="any"
                              value={op.height}
                              onChange={e => {
                                const newOps = [...openings]
                                newOps[idx].height = e.target.value
                                setOpenings(newOps)
                              }}
                              placeholder="2.1"
                              className="w-full px-2 py-1 border border-gray-200 rounded text-right font-mono text-xs"
                            />
                          </td>
                          <td className="py-2 px-1">
                            <input
                              type="number"
                              step="any"
                              value={op.qty}
                              onChange={e => {
                                const newOps = [...openings]
                                newOps[idx].qty = e.target.value
                                setOpenings(newOps)
                              }}
                              placeholder="1"
                              className="w-full px-2 py-1 border border-gray-200 rounded text-right font-mono text-xs"
                            />
                          </td>
                          <td className="py-2 pl-2 text-right font-mono font-semibold text-red-500">
                            -{opArea.toFixed(3)}
                          </td>
                          <td className="py-2 text-center">
                            <button
                              type="button"
                              onClick={() => setOpenings(openings.filter(o => o.id !== op.id))}
                              className="text-red-500 hover:text-red-700 p-1 rounded"
                            >
                              &times;
                            </button>
                          </td>
                        </tr>
                      )
                    })}
                  </tbody>
                </table>
              </div>

              {/* Total Bersih */}
              <div className="bg-slate-50 border border-gray-200 rounded-xl p-4 flex flex-col gap-2 shadow-inner">
                <div className="flex justify-between text-xs text-gray-500 font-medium">
                  <span>Luas Kotor Dinding:</span>
                  <span className="font-mono">{getWallGrossArea().toFixed(3)} m²</span>
                </div>
                <div className="flex justify-between text-xs text-red-500 font-medium">
                  <span>Total Pengurangan (Bukaan):</span>
                  <span className="font-mono">-{getWallTotalOpenings().toFixed(3)} m²</span>
                </div>
                <hr className="border-gray-200" />
                <div className="flex justify-between items-center pt-1">
                  <span className="text-gray-700 font-bold text-sm">Luas Bersih Akhir:</span>
                  <span className="text-2xl font-extrabold text-primary-800 font-mono">
                    {getWallNetArea().toLocaleString('id-ID', { minimumFractionDigits: 0, maximumFractionDigits: 3 })} {unit || 'm²'}
                  </span>
                </div>
              </div>

            </div>
          )}

          {activeTab === 'project-volume' && (
            <div className="space-y-4 font-sans pb-4">
              <div className="flex justify-between items-center bg-blue-50/50 p-3 rounded-lg border border-blue-100">
                <div>
                  <h4 className="font-bold text-xs text-blue-950">Gunakan Volume Bersama (Shared Volumes)</h4>
                  <p className="text-[10px] text-blue-700 mt-0.5">Pilih volume master tingkat proyek untuk dihubungkan ke pekerjaan ini, atau kelola volume bersama langsung dari sini.</p>
                </div>
                <button
                  type="button"
                  onClick={async () => {
                    if (projectId) {
                      await upsertSharedVolume(projectId, {
                        name: `Volume Bersama ${loadedProjectVolumes.length + 1}`,
                        unit: 'm3',
                        value: 0,
                        notes: '',
                        formula: ''
                      })
                      loadByProject(projectId)
                    }
                  }}
                  className="px-2.5 py-1.5 bg-blue-600 hover:bg-blue-700 text-white rounded font-bold text-xs shadow-sm flex items-center gap-1 transition-all"
                >
                  + Tambah Volume Bersama
                </button>
              </div>

              {/* Shared Volumes List Table */}
              {loadedProjectVolumes.length === 0 ? (
                <div className="p-8 text-center text-gray-400 italic text-xs bg-slate-50 border border-slate-100 rounded-lg">
                  Belum ada volume bersama. Klik "+ Tambah Volume Bersama" untuk membuat baru.
                </div>
              ) : (
                <div className="border border-slate-200 rounded-lg overflow-hidden bg-white shadow-sm">
                  <table className="w-full text-left text-xs border-collapse">
                    <thead>
                      <tr className="bg-slate-50 border-b border-slate-200 text-slate-700 font-semibold uppercase text-[10px]">
                        <th className="py-2.5 px-3">Nama Volume</th>
                        <th className="py-2.5 px-3 text-center w-16">Satuan</th>
                        <th className="py-2.5 px-3">Rumus / Formula</th>
                        <th className="py-2.5 px-3 text-right w-24">Nilai Volume</th>
                        <th className="py-2.5 px-3 text-center w-40">Aksi</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100">
                      {evaluateProjectVolumes(loadedProjectVolumes).map(pv => {
                        const isCurrentLink = currentProjectVolumeId === pv.id
                        const hasFormula = pv.formula && pv.formula.trim().startsWith('{')
                        
                        // Parse simple formula string for easy inline editing
                        let displayFormula = ''
                        if (pv.formula) {
                          try {
                            const parsed = JSON.parse(pv.formula)
                            if (parsed.type === 'simple') {
                              displayFormula = parsed.data?.formula || ''
                            } else {
                              displayFormula = `[${parsed.type}]`
                            }
                          } catch {
                            displayFormula = pv.formula
                          }
                        }

                        return (
                          <tr key={pv.id} className={`hover:bg-slate-50/50 ${isCurrentLink ? 'bg-blue-50/30' : ''}`}>
                            {/* Name */}
                            <td className="py-2 px-3">
                              <input
                                type="text"
                                defaultValue={pv.name}
                                onBlur={async (e) => {
                                  if (projectId && e.target.value.trim()) {
                                    await upsertSharedVolume(projectId, {
                                      ...pv,
                                      name: e.target.value.trim()
                                    })
                                    loadByProject(projectId)
                                  }
                                }}
                                className="w-full bg-transparent border-b border-transparent hover:border-slate-200 focus:border-blue-500 font-semibold text-slate-800 focus:outline-none focus:bg-white px-1 py-0.5 rounded"
                              />
                            </td>
                            {/* Unit */}
                            <td className="py-2 px-3 text-center">
                              <input
                                type="text"
                                defaultValue={pv.unit}
                                onBlur={async (e) => {
                                  if (projectId) {
                                    await upsertSharedVolume(projectId, {
                                      ...pv,
                                      unit: e.target.value.trim()
                                    })
                                    loadByProject(projectId)
                                  }
                                }}
                                className="w-10 text-center bg-slate-50 border border-slate-100 rounded text-[10px] font-semibold text-slate-600 focus:outline-none px-0.5 py-0.5"
                              />
                            </td>
                            {/* Formula */}
                            <td className="py-2 px-3">
                              <input
                                type="text"
                                defaultValue={displayFormula}
                                placeholder="Input manual (kosongkan)"
                                onBlur={async (e) => {
                                  if (projectId) {
                                    const formulaVal = e.target.value.trim()
                                    let newFormula = ''
                                    if (formulaVal) {
                                      newFormula = JSON.stringify({
                                        type: 'simple',
                                        data: { formula: formulaVal }
                                      })
                                    }
                                    
                                    await upsertSharedVolume(projectId, {
                                      ...pv,
                                      formula: newFormula
                                    })
                                    loadByProject(projectId)
                                  }
                                }}
                                className="w-full bg-transparent border-b border-transparent hover:border-slate-200 focus:border-blue-500 font-mono text-[10px] text-blue-700 focus:outline-none focus:bg-white px-1 py-0.5 rounded"
                                title="Ketik rumus matematika (misal: 25 * 0.4) atau variabel volume lain [Nama Volume]"
                              />
                            </td>
                            {/* Value */}
                            <td className="py-2 px-3 text-right">
                              {hasFormula ? (
                                <span className="font-bold font-mono text-blue-700 bg-blue-50/50 px-1.5 py-0.5 rounded border border-blue-100 text-[11px]" title={pv.value.toString()}>
                                  {pv.value.toLocaleString('id-ID', { minimumFractionDigits: 0, maximumFractionDigits: 3 })}
                                </span>
                              ) : (
                                <input
                                  type="number"
                                  step="any"
                                  defaultValue={pv.value}
                                  onBlur={async (e) => {
                                    if (projectId) {
                                      await upsertSharedVolume(projectId, {
                                        ...pv,
                                        value: parseFloat(e.target.value) || 0
                                      })
                                      loadByProject(projectId)
                                    }
                                  }}
                                  className="w-16 px-1.5 py-0.5 border border-slate-200 rounded text-right font-mono font-semibold text-slate-800 focus:outline-none focus:ring-1 focus:ring-blue-500"
                                />
                              )}
                            </td>
                            {/* Action */}
                            <td className="py-2 px-3 text-center">
                              <div className="flex items-center justify-center gap-1.5">
                                {isCurrentLink ? (
                                  <button
                                    type="button"
                                    onClick={() => {
                                      setCurrentProjectVolumeId(null)
                                    }}
                                    className="px-2.5 py-1 bg-red-600 hover:bg-red-700 text-white rounded font-bold text-[10px] shadow-sm transition-colors"
                                  >
                                    Putuskan
                                  </button>
                                ) : (
                                  <button
                                    type="button"
                                    onClick={() => {
                                      setCurrentProjectVolumeId(pv.id)
                                      // Directly apply and close
                                      onApply(parseFloat(pv.value.toFixed(4)), '', `Dihubungkan ke Volume Bersama: ${pv.name}`, pv.id)
                                      onClose()
                                    }}
                                    className="px-2.5 py-1 bg-blue-600 hover:bg-blue-700 text-white rounded font-bold text-[10px] shadow-sm transition-colors"
                                  >
                                    Hubungkan
                                  </button>
                                )}
                                <button
                                  type="button"
                                  onClick={async () => {
                                    if (confirm(`Hapus volume bersama "${pv.name}"?`)) {
                                      await deleteSharedVolume(pv.id)
                                      loadByProject(projectId)
                                    }
                                  }}
                                  className="p-1 border border-red-100 rounded hover:bg-red-50 text-red-500 hover:text-red-700 text-[10px] shadow-sm"
                                  title="Hapus"
                                >
                                  ✕
                                </button>
                              </div>
                            </td>
                          </tr>
                        )
                      })}
                    </tbody>
                  </table>
                </div>
              )}
            </div>
          )}

        </div>

        {/* Footer */}
        <div className="p-4 border-t border-gray-200 flex justify-end gap-2 bg-slate-50 rounded-b-xl">
          <button
            type="button"
            onClick={onClose}
            className="btn-secondary text-xs px-4 py-2"
          >
            Batal
          </button>
          <button
            type="button"
            onClick={handleApply}
            className="btn-primary text-xs px-5 py-2 flex items-center gap-1.5"
          >
            ✔️ Terapkan Ke Volume
          </button>
        </div>

      </div>
    </div>
  )
}
