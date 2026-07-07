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
