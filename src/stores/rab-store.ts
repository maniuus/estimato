import { createStore } from 'zustand/vanilla'
import { useStore } from 'zustand'
import { rabService } from '../services/rab-service'
import type { RabSnapshot } from '../types/models'

export interface RabLineItem {
  wbsItemId: string
  wbsPath: string
  wbsCode: string
  wbsName: string
  ahsId: string | null
  ahsCode: string
  ahsName: string
  unit: string
  volume: number
  unitPrice: number
  totalPrice: number
}

export interface RabCalculation {
  lineItems: RabLineItem[]
  totalPrice: number
  ppnPercent: number
  ppnAmount: number
  overheadPercent: number
  overheadAmount: number
  grandTotal: number
}

interface RabState {
  calculation: RabCalculation | null
  snapshots: RabSnapshot[]
  latestSnapshot: RabSnapshot | null
  loading: boolean
  error: string | null
}

interface RabActions {
  calculate: (projectId: string, ppn: number, overhead: number) => Promise<void>
  saveSnapshot: (projectId: string, ppn: number, overhead: number) => Promise<boolean>
  loadHistory: (projectId: string) => Promise<void>
  loadLatest: (projectId: string) => Promise<void>
}

export type RabStore = RabState & RabActions

const rabStore = createStore<RabStore>((set) => ({
  calculation: null,
  snapshots: [],
  latestSnapshot: null,
  loading: false,
  error: null,

  calculate: async (projectId, ppn, overhead) => {
    set({ loading: true, error: null })
    const result = await rabService.calculate(projectId, ppn, overhead)
    if (result.success) {
      set({ calculation: result.data!, loading: false })
    } else {
      set({ error: result.error, loading: false })
    }
  },

  saveSnapshot: async (projectId, ppn, overhead) => {
    const result = await rabService.saveSnapshot(projectId, ppn, overhead)
    if (result.success) return true
    set({ error: result.error })
    return false
  },

  loadHistory: async (projectId) => {
    const result = await rabService.getHistory(projectId)
    if (result.success) {
      set({ snapshots: result.data ?? [] })
    } else {
      set({ error: result.error })
    }
  },

  loadLatest: async (projectId) => {
    const result = await rabService.getLatest(projectId)
    if (result.success) {
      set({ latestSnapshot: result.data ?? null })
    } else {
      set({ error: result.error })
    }
  }
}))

export function useRabStore(): RabStore {
  return useStore(rabStore)
}
