import React from 'react'
import type { MainRebarRow } from '../types'
import { parseDiameter } from '../helpers'

interface ConcreteSectionSvgProps {
  bVal: string
  hVal: string
  cVal: string
  mainRebarRows: MainRebarRow[]
  stirrupDia: string
}

export function ConcreteSectionSvg({
  bVal,
  hVal,
  cVal,
  mainRebarRows,
  stirrupDia
}: ConcreteSectionSvgProps): React.ReactElement {
  const b = parseFloat(bVal) || 200
  const h = parseFloat(hVal) || 300
  const c = parseFloat(cVal) || 40

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

  const drawRebars: Array<{ cx: number; cy: number; r: number }> = []

  mainRebarRows.forEach((row) => {
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
