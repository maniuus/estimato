export function calculateSCurveData({
  totalPrice,
  durationWeeks,
  rekapCategories,
  categorySchedules,
  getGroupSubtotal
}: {
  totalPrice: number
  durationWeeks: number
  rekapCategories: any[]
  categorySchedules: Record<string, { startWeek: number, endWeek: number }>
  getGroupSubtotal: (path: string) => number
}) {
  const totalBasePrice = totalPrice || 1 // Avoid divide-by-zero
  const weeklyProgress = Array(durationWeeks).fill(0)
  
  // Calculate weight of each category and distribute
  rekapCategories.forEach(cat => {
    const catTotal = getGroupSubtotal(cat.wbsPath)
    const weight = (catTotal / totalBasePrice) * 100
    
    const sched = categorySchedules[cat.id] || { startWeek: 1, endWeek: Math.min(durationWeeks, 3) }
    const start = Math.max(1, Math.min(durationWeeks, sched.startWeek))
    const end = Math.max(start, Math.min(durationWeeks, sched.endWeek))
    const activeWeeks = end - start + 1
    const weeklyShare = weight / activeWeeks
    
    for (let w = start; w <= end; w++) {
      weeklyProgress[w - 1] += weeklyShare
    }
  })

  // Calculate cumulative progress
  const cumulativeProgress: number[] = []
  let sum = 0
  for (let w = 0; w < durationWeeks; w++) {
    sum += weeklyProgress[w]
    cumulativeProgress.push(Math.min(100, sum))
  }

  return { weeklyProgress, cumulativeProgress }
}
