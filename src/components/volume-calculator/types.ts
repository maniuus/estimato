export type { ProjectVolume } from '../../types/models'

export type TabType = 'simple' | 'dimensions' | 'steel' | 'wall' | 'project-volume'

export interface VolumeCalculatorModalProps {
  isOpen: boolean
  onClose: () => void
  onApply: (volume: number, formulaJson: string, notes: string, projectVolumeId?: string | null) => void
  initialFormula: string
  initialNotes: string
  unit: string
  projectId?: string
  initialProjectVolumeId?: string | null
}

export interface DimRow {
  id: string
  description: string
  length: string
  width: string
  height: string
  qty: string
}

export interface SteelRow {
  id: string
  description: string
  diameter: string
  length: string
  qty: string
  mult: string
}

export interface MainRebarRow {
  id: string
  position: 'Atas' | 'Bawah' | 'Samping'
  diameter: string
  qty: string
}

export interface SectionElement {
  id: string
  name: string
  b: string
  h: string
  c: string
  length: string
  qty: string
  mainRebarRows: MainRebarRow[]
  stirrupMode: 'uniform' | 'split'
  stirrupDia: string
  stirrupSpacing: string
  stirrupSpacingTumpuan: string
  stirrupSpacingLapangan: string
}

export interface WallRow {
  id: string
  description: string
  length: string
  height: string
  qty: string
}

export interface OpeningRow {
  id: string
  name: string
  width: string
  height: string
  qty: string
}
