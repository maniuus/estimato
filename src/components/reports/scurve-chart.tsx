import React from 'react'

interface SCurveChartProps {
  weeklyProgress: number[]
  cumulativeProgress: number[]
  durationWeeks: number
  isPrint?: boolean
}

export function SCurveChart({
  weeklyProgress,
  cumulativeProgress,
  durationWeeks,
  isPrint = false
}: SCurveChartProps): React.ReactElement {
  const maxWeeklyProgVal = Math.max(...weeklyProgress, 10)
  const leftYAxisMax = Math.ceil(maxWeeklyProgVal / 5) * 5
  
  // Chart dimensions
  const svgWidth = isPrint ? 680 : 780
  const svgHeight = isPrint ? 240 : 320
  const padLeft = 50
  const padRight = 50
  const padTop = 30
  const padBottom = 35
  
  const plotWidth = svgWidth - padLeft - padRight
  const plotHeight = svgHeight - padTop - padBottom

  // Smooth path generator function (Catmull-Rom to Cubic Bezier)
  const getSmoothPath = (pts: { x: number, y: number }[], closedBottomY?: number) => {
    if (pts.length === 0) return { linePath: '', areaPath: '' }
    
    let linePathStr = `M ${pts[0].x} ${pts[0].y}`
    const tension = 0.15
    
    for (let i = 0; i < pts.length - 1; i++) {
      const p0 = pts[i - 1] || pts[i]
      const p1 = pts[i]
      const p2 = pts[i + 1]
      const p3 = pts[i + 2] || p2
      
      const cp1x = p1.x + (p2.x - p0.x) * tension
      const cp1y = p1.y + (p2.y - p0.y) * tension
      
      const cp2x = p2.x - (p3.x - p1.x) * tension
      const cp2y = p2.y - (p3.y - p1.y) * tension
      
      linePathStr += ` C ${cp1x} ${cp1y}, ${cp2x} ${cp2y}, ${p2.x} ${p2.y}`
    }
    
    let areaPathStr = linePathStr
    if (closedBottomY !== undefined) {
      areaPathStr += ` L ${pts[pts.length - 1].x} ${closedBottomY} L ${pts[0].x} ${closedBottomY} Z`
    }
    
    return { linePath: linePathStr, areaPath: areaPathStr }
  }

  // Build the array of coordinate points for spline calculation
  const points = [
    { x: padLeft, y: padTop + plotHeight } // Week 0 (0%)
  ]
  
  cumulativeProgress.forEach((pct, w) => {
    points.push({
      x: padLeft + (w + 0.5) * (plotWidth / durationWeeks),
      y: padTop + plotHeight - (pct / 100) * plotHeight
    })
  })
  
  // Add end point at the very right of the chart (100% progress)
  points.push({
    x: padLeft + plotWidth,
    y: padTop + plotHeight - (cumulativeProgress[durationWeeks - 1] / 100) * plotHeight
  })
  
  const { linePath, areaPath } = getSmoothPath(points, padTop + plotHeight)
  const gradId = isPrint ? 'scurve-gradient-print' : 'scurve-gradient-screen'

  return (
    <div className="flex justify-center bg-white p-2 border border-slate-200 rounded shadow-sm">
      <svg width={svgWidth} height={svgHeight} className="font-sans">
        <defs>
          <linearGradient id={gradId} x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor="#d97706" stopOpacity="0.25" />
            <stop offset="100%" stopColor="#d97706" stopOpacity="0" />
          </linearGradient>
        </defs>

        {/* Horizontal Ticks */}
        {Array.from({ length: 5 }).map((_, i) => {
          const yVal = padTop + (plotHeight * i) / 4
          const cumPct = 100 - i * 25
          const weekPct = (leftYAxisMax * (4 - i)) / 4
          return (
            <g key={i}>
              <line 
                x1={padLeft} 
                y1={yVal} 
                x2={padLeft + plotWidth} 
                y2={yVal} 
                stroke="#e2e8f0" 
                strokeWidth="0.5" 
              />
              <text 
                x={padLeft - 6} 
                y={yVal + 2.5} 
                textAnchor="end" 
                className="text-[7.5px] fill-slate-500 font-mono font-semibold"
              >
                {weekPct.toFixed(1)}%
              </text>
              <text 
                x={padLeft + plotWidth + 6} 
                y={yVal + 2.5} 
                textAnchor="start" 
                className="text-[7.5px] fill-amber-700 font-mono font-bold"
              >
                {cumPct}%
              </text>
            </g>
          )
        })}

        {/* Vertical Lines */}
        {Array.from({ length: durationWeeks }).map((_, w) => {
          const xVal = padLeft + (w + 0.5) * (plotWidth / durationWeeks)
          const xLineVal = padLeft + (w + 1) * (plotWidth / durationWeeks)
          return (
            <g key={w}>
              {w < durationWeeks - 1 && (
                <line 
                  x1={xLineVal} 
                  y1={padTop} 
                  x2={xLineVal} 
                  y2={padTop + plotHeight} 
                  stroke="#cbd5e1" 
                  strokeWidth="0.5" 
                  strokeDasharray="2,2"
                />
              )}
              <text 
                x={xVal} 
                y={padTop + plotHeight + 10} 
                textAnchor="middle" 
                className="text-[8px] fill-slate-800 font-extrabold font-mono"
              >
                M{w + 1}
              </text>
            </g>
          )
        })}

        {/* Weekly progress bars */}
        {weeklyProgress.map((prog, w) => {
          const xCenter = padLeft + (w + 0.5) * (plotWidth / durationWeeks)
          const barWidth = Math.max(8, (plotWidth / durationWeeks) * 0.45)
          const barHeight = (prog / leftYAxisMax) * plotHeight
          const yVal = padTop + plotHeight - barHeight
          
          return (
            <g key={w}>
              <rect
                x={xCenter - barWidth / 2}
                y={yVal}
                width={barWidth}
                height={Math.max(0, barHeight)}
                fill="#2563eb"
                rx="1"
                className="opacity-60"
              />
              {!isPrint && (
                <title>{`Progres Mingguan: ${prog.toFixed(2)}%`}</title>
              )}
            </g>
          )
        })}

        {/* Cumulative S-Curve Area under line */}
        <path d={areaPath} fill={`url(#${gradId})`} />

        {/* Cumulative S-Curve Line */}
        <path
          d={linePath}
          fill="none"
          stroke="#d97706"
          strokeWidth="2.5"
          strokeLinecap="round"
          strokeLinejoin="round"
        />

        {/* S-Curve Circle Nodes and percentage text */}
        {cumulativeProgress.map((pct, w) => {
          const xVal = padLeft + (w + 0.5) * (plotWidth / durationWeeks)
          const yVal = padTop + plotHeight - (pct / 100) * plotHeight
          
          return (
            <g key={w} className="group">
              <circle
                cx={xVal}
                cy={yVal}
                r={isPrint ? 2 : 3}
                fill="#ffffff"
                stroke="#d97706"
                strokeWidth={isPrint ? 1.5 : 2}
              />
              <text
                x={xVal}
                y={yVal - 6}
                textAnchor="middle"
                className="text-[7px] font-mono font-bold fill-amber-800"
              >
                {pct.toFixed(1)}%
              </text>
              {!isPrint && (
                <title>{`Minggu ${w + 1}: ${pct.toFixed(2)}% (Kumulatif)`}</title>
              )}
            </g>
          )
        })}
      </svg>
    </div>
  )
}
