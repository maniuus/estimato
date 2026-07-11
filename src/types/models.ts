export interface Project {
  id: string
  name: string
  projectNumber: string
  location: string
  year: number
  buildingType: string
  buildingArea: number
  floors: number
  status: 'draft' | 'active' | 'completed' | 'archived'
  ppn: number
  overhead: number
  note: string
  companyName?: string
  companyLogo?: string
  reportHeader?: string
  ownerName?: string
  ownerParaf?: string
  createdAt: string
  updatedAt: string
  grandTotal?: number
}

export interface Material {
  id: string
  code: string
  name: string
  specification: string
  category: string
  unit: string
  unitPrice: number
  supplier: string
  createdAt: string
  updatedAt: string
}

export interface Wage {
  id: string
  type: string
  dailyWage: number
  unit: string
  createdAt: string
  updatedAt: string
}

export interface Equipment {
  id: string
  name: string
  type: string
  capacity: string
  rentalPrice: number
  unit: string
  createdAt: string
  updatedAt: string
}

export interface WbsItem {
  id: string
  projectId: string
  parentId: string | null
  code: string
  name: string
  unit: string
  type: 'group' | 'item'
  sortOrder: number
  wbsPath: string
  createdAt: string
  updatedAt: string
}

export interface Ahs {
  id: string
  code: string
  name: string
  unit: string
  category: 'sni' | 'kustom'
  source: string
  totalPrice: number
  projectId: string | null
  createdAt: string
  updatedAt: string
}

export interface AhsComponentMaterial {
  id: string
  ahsId: string
  materialId: string
  coefficient: number
  totalPrice: number
  materialName?: string
  materialUnit?: string
  unitPrice?: number
}

export interface AhsComponentWage {
  id: string
  ahsId: string
  wageId: string
  coefficient: number
  totalPrice: number
  wageType?: string
  dailyWage?: number
  wageUnit?: string
}

export interface AhsComponentEquipment {
  id: string
  ahsId: string
  equipmentId: string
  coefficient: number
  totalPrice: number
  equipmentName?: string
  rentalPrice?: number
  equipmentUnit?: string
}

export interface VolumeItem {
  id: string
  wbsItemId: string
  ahsId: string | null
  volume: number
  unit: string
  formula: string
  notes: string
  projectVolumeId: string | null
  createdAt: string
  updatedAt: string
}

export interface ProjectVolume {
  id: string
  projectId: string
  name: string
  unit: string
  value: number
  formula: string
  notes: string
  createdAt?: string
  updatedAt?: string
}

export interface RabSnapshot {
  id: string
  projectId: string
  calculatedAt: string
  totalPrice: number
  ppn: number
  overhead: number
  grandTotal: number
  data: string
}

export interface AppSetting {
  id: string
  companyName: string
  companyLogo: string
  reportHeader: string
  ownerName: string
  ownerParaf: string
  ppnDefault: number
  createdAt: string
  updatedAt: string
}

export interface ServiceResult<T> {
  success: boolean
  data?: T
  error?: string
}
