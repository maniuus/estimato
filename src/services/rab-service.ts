export const rabService = {
  calculate: (projectId: string, ppn: number, overhead: number) => window.api.rab.calculate(projectId, ppn, overhead),
  saveSnapshot: (projectId: string, ppn: number, overhead: number) => window.api.rab.saveSnapshot(projectId, ppn, overhead),
  getHistory: (projectId: string) => window.api.rab.getHistory(projectId),
  getLatest: (projectId: string) => window.api.rab.getLatest(projectId)
}
