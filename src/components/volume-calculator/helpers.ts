import type { ProjectVolume, DimRow, SteelRow, SectionElement, WallRow, OpeningRow } from './types'

export const diameterOptions = [
  'Ø6', 'Ø8', 'Ø10', 'Ø12', 'Ø14', 'Ø16', 'Ø19', 'Ø22', 'Ø25',
  'D10', 'D13', 'D16', 'D19', 'D22', 'D25', 'D29', 'D32'
]

export const parseDiameter = (val: string): { size: number, type: 'polos' | 'ulir' } => {
  if (!val) return { size: 0, type: 'polos' }
  const size = parseFloat(val.replace(/[^\d.]/g, '')) || 0
  const type = val.includes('Ø') ? 'polos' : 'ulir'
  return { size, type }
}

export const getSteelWeightPerMeter = (diameter: string): number => {
  const { size } = parseDiameter(diameter)
  return 0.006165 * size * size
}

export const getHookLength = (stirrupDia: string): number => {
  const { size } = parseDiameter(stirrupDia)
  return (12 * size) / 1000
}

export const getSteelRowWeight = (r: SteelRow): number => {
  const l = parseFloat(r.length) || 0
  const q = parseFloat(r.qty) || 0
  const m = parseFloat(r.mult) || 1
  const w = getSteelWeightPerMeter(r.diameter)
  return w * l * q * m
}

export const getSingleElementWeight = (el: SectionElement) => {
  const b = parseFloat(el.b) || 0
  const h = parseFloat(el.h) || 0
  const c = parseFloat(el.c) || 0
  const len = parseFloat(el.length) || 0
  const eqty = parseFloat(el.qty) || 0
  
  // Main rebar weight calculation
  let mainWeight = 0
  el.mainRebarRows.forEach(row => {
    const qty = parseFloat(row.qty) || 0
    const w = getSteelWeightPerMeter(row.diameter)
    const rowWeight = qty * len * w * eqty
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

export const getDimRowTotal = (r: DimRow): number => {
  const l = r.length !== '' ? parseFloat(r.length) || 0 : 1
  const w = r.width !== '' ? parseFloat(r.width) || 0 : 1
  const h = r.height !== '' ? parseFloat(r.height) || 0 : 1
  const q = r.qty !== '' ? parseFloat(r.qty) || 0 : 1
  if (r.length === '' && r.width === '' && r.height === '' && r.qty === '') return 0
  return l * w * h * q
}

export const getDimTotal = (rows: DimRow[]): number => {
  return rows.reduce((sum, r) => sum + getDimRowTotal(r), 0)
}

export const getWallRowArea = (r: WallRow): number => {
  const l = parseFloat(r.length) || 0
  const h = parseFloat(r.height) || 0
  const q = parseFloat(r.qty) || 0
  return l * h * q
}

export const getWallGrossArea = (rows: WallRow[]): number => {
  return rows.reduce((sum, r) => sum + getWallRowArea(r), 0)
}

export const getOpeningArea = (o: OpeningRow): number => {
  const w = parseFloat(o.width) || 0
  const h = parseFloat(o.height) || 0
  const q = parseFloat(o.qty) || 0
  return w * h * q
}

export const getWallTotalOpenings = (openings: OpeningRow[]): number => {
  return openings.reduce((sum, o) => sum + getOpeningArea(o), 0)
}

export const getWallNetArea = (wallRows: WallRow[], openings: OpeningRow[]): number => {
  const gross = getWallGrossArea(wallRows)
  const deductions = getWallTotalOpenings(openings)
  return Math.max(0, gross - deductions)
}

export const evaluateProjectVolumes = (volumes: ProjectVolume[]): ProjectVolume[] => {
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
        } else if (parsed.type === 'structural_profile') {
          const segments = parsed.segments || []
          const totalL = segments.reduce((sum: number, seg: any) => sum + (parseFloat(seg.length) || 0), 0)
          const b = parseFloat(parsed.b) || 0
          const h = parseFloat(parsed.h) || 0
          const betonVolume = (b / 1000) * (h / 1000) * totalL
          
          if (Math.abs(vol.value - betonVolume) > 0.0001) {
            vol.value = betonVolume
            changed = true
          }
        } else if (parsed.type === 'structural_group') {
          const profileIds = parsed.profileIds || []
          let totalBeton = 0
          
          profileIds.forEach((pid: string) => {
            const profVar = resolved.find(v => v.id === pid)
            if (profVar && profVar.formula) {
              try {
                const profData = JSON.parse(profVar.formula)
                if (profData.type === 'structural_profile') {
                  const segments = profData.segments || []
                  const totalL = segments.reduce((sum: number, seg: any) => sum + (parseFloat(seg.length) || 0), 0)
                  const b = parseFloat(profData.b) || 0
                  const h = parseFloat(profData.h) || 0
                  totalBeton += (b / 1000) * (h / 1000) * totalL
                }
              } catch {}
            }
          })
          
          if (Math.abs(vol.value - totalBeton) > 0.0001) {
            vol.value = totalBeton
            changed = true
          }
        } else if (parsed.type === 'wall_area') {
          const walls = parsed.walls || []
          let totalArea = 0
          
          walls.forEach((wall: any) => {
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
          
          if (Math.abs(vol.value - totalArea) > 0.0001) {
            vol.value = totalArea
            changed = true
          }
        } else if (parsed.type === 'room_area') {
          const rooms = parsed.rooms || []
          let totalArea = 0
          
          rooms.forEach((room: any) => {
            const length = parseFloat(room.length) || 0
            const width = parseFloat(room.width) || 0
            totalArea += length * width
          })
          
          if (Math.abs(vol.value - totalArea) > 0.0001) {
            vol.value = totalArea
            changed = true
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

export const evaluateMath = (str: string, projectVolumes: ProjectVolume[]): number => {
  let expression = str
  
  if (projectVolumes && projectVolumes.length > 0) {
    const sortedVars = [...projectVolumes].sort((a, b) => b.name.length - a.name.length)
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
}

export const getProfileSteelWeights = (parsed: any, totalL: number) => {
  const b = parseFloat(parsed.b) || 0
  const h = parseFloat(parsed.h) || 0
  const c = parseFloat(parsed.c) || 0
  const len = totalL
  const eqty = 1

  let ulirWeight = 0
  let polosWeight = 0

  const mainRows = parsed.mainRebarRows || []
  mainRows.forEach((row: any) => {
    const qty = parseFloat(row.qty) || 0
    const w = getSteelWeightPerMeter(row.diameter)
    const weight = qty * len * w * eqty
    if (row.diameter.toUpperCase().startsWith('D')) {
      ulirWeight += weight
    } else {
      polosWeight += weight
    }
  })

  // Sengkang
  const { size: dStirrup } = parseDiameter(parsed.stirrupDia)
  const stirrupLengthMm = (b > 2 * c && h > 2 * c) 
    ? 2 * (b - 2 * c) + 2 * (h - 2 * c) + 12 * dStirrup
    : 0
  const stirrupLengthM = stirrupLengthMm / 1000

  let stirrupCount = 0
  if (parsed.stirrupMode === 'split') {
    const sTumpuan = parseFloat(parsed.stirrupSpacingTumpuan) || 100
    const sLapangan = parseFloat(parsed.stirrupSpacingLapangan) || 150
    const countTumpuan = (sTumpuan > 0 && len > 0) ? Math.floor(((len / 2) * 1000) / sTumpuan) : 0
    const countLapangan = (sLapangan > 0 && len > 0) ? Math.floor(((len / 2) * 1000) / sLapangan) : 0
    stirrupCount = countTumpuan + countLapangan + 1
  } else {
    const spacing = parseFloat(parsed.stirrupSpacing) || 150
    stirrupCount = (spacing > 0 && len > 0) ? Math.floor((len * 1000) / spacing) + 1 : 0
  }

  const stirrupUnitWeight = 0.006165 * dStirrup * dStirrup
  const stirrupWeight = stirrupCount * stirrupLengthM * stirrupUnitWeight * eqty

  if (parsed.stirrupDia.toUpperCase().startsWith('D')) {
    ulirWeight += stirrupWeight
  } else {
    polosWeight += stirrupWeight
  }

  return {
    ulirWeight,
    polosWeight
  }
}

export const resolveLinkedVolume = (
  vol: { projectVolumeId: string | null; volume: number; formula?: string | null },
  projectVolumes: ProjectVolume[]
): number => {
  if (!vol.projectVolumeId) return vol.volume
  const pv = projectVolumes.find(p => p.id === vol.projectVolumeId)
  if (!pv) return vol.volume

  if (pv.formula && pv.formula.trim().startsWith('{')) {
    try {
      const parsed = JSON.parse(pv.formula)
      if (parsed.type === 'structural_group') {
        const profileIds = parsed.profileIds || []
        let total = 0
        
        profileIds.forEach((pid: string) => {
          const profVar = projectVolumes.find(v => v.id === pid)
          if (profVar && profVar.formula) {
            try {
              const profData = JSON.parse(profVar.formula)
              if (profData.type === 'structural_profile') {
                const segments = profData.segments || []
                const totalL = segments.reduce((sum: number, seg: any) => sum + (parseFloat(seg.length) || 0), 0)
                
                if (vol.formula === 'besi') {
                  const w = getProfileSteelWeights(profData, totalL)
                  total += w.ulirWeight + w.polosWeight
                } else {
                  const b = parseFloat(profData.b) || 0
                  const h = parseFloat(profData.h) || 0
                  total += (b / 1000) * (h / 1000) * totalL
                }
              }
            } catch {}
          }
        })
        return total
      } else if (parsed.type === 'structural_profile') {
        const segments = parsed.segments || []
        const totalL = segments.reduce((sum: number, seg: any) => sum + (parseFloat(seg.length) || 0), 0)
        
        if (vol.formula === 'besi') {
          const w = getProfileSteelWeights(parsed, totalL)
          return w.ulirWeight + w.polosWeight
        }
        
        // Default is beton volume
        const b = parseFloat(parsed.b) || 0
        const h = parseFloat(parsed.h) || 0
        return (b / 1000) * (h / 1000) * totalL
      }
    } catch {
      // ignore
    }
  }

  return pv.value
}

export function parseFormulaToText(formulaJson: string): string {
  if (!formulaJson) return ''
  try {
    const data = JSON.parse(formulaJson)
    if (data.type === 'dimensions') {
      const rows = data.rows || []
      return rows
        .map((r: any) => {
          const l = parseFloat(r.length) || 0
          const w = parseFloat(r.width) || 0
          const h = parseFloat(r.height) || 0
          const q = parseFloat(r.qty) || 0
          const dimensions = [
            l > 0 ? `${l}m (P)` : '',
            w > 0 ? `${w}m (L)` : '',
            h > 0 ? `${h}m (T)` : ''
          ].filter(Boolean).join(' x ')
          return `${r.description ? `[${r.description}] ` : ''}${dimensions} x ${q}x = ${((l || 1) * (w || 1) * (h || 1) * q).toFixed(3)}`
        })
        .join('\n')
    }
    if (data.type === 'steel') {
      const rows = data.rows || []
      const mode = data.mode || 'table'
      if (mode === 'table') {
        return rows
          .map((r: any) => {
            const l = parseFloat(r.length) || 0
            const q = parseFloat(r.qty) || 0
            const m = parseFloat(r.mult) || 1
            const weightPerMeter = 0.006165 * Math.pow(parseFloat(r.diameter.replace(/[^\d.]/g, '')) || 0, 2)
            const rowWeight = l * q * m * weightPerMeter
            return `${r.description ? `[${r.description}] ` : ''}${r.diameter} L=${l}m x Qty=${q} x Mult=${m} = ${rowWeight.toFixed(2)} kg`
          })
          .join('\n')
      }
      return `Kalkulator Besi (Section Mode): ${rows.length} Elemen`
    }
    if (data.type === 'wall') {
      const rows = data.rows || []
      return rows
        .map((r: any) => {
          const l = parseFloat(r.length) || 0
          const h = parseFloat(r.height) || 0
          const area = l * h
          return `${r.description ? `[${r.description}] ` : ''}Tebal=${r.thickness || ''} L=${l}m x T=${h}m = ${area.toFixed(2)} m²`
        })
        .join('\n')
    }
    return String(formulaJson)
  } catch (e) {
    return String(formulaJson)
  }
}
