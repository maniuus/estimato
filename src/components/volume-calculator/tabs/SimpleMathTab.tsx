import React from 'react'
import type { ProjectVolume } from '../types'

interface SimpleMathTabProps {
  simpleFormula: string
  setSimpleFormula: React.Dispatch<React.SetStateAction<string>>
  simpleResult: number
  simpleError: string | null
  loadedProjectVolumes: ProjectVolume[]
}

export function SimpleMathTab({
  simpleFormula,
  setSimpleFormula,
  simpleResult,
  simpleError,
  loadedProjectVolumes
}: SimpleMathTabProps): React.ReactElement {
  return (
    <div className="space-y-4 max-w-lg mx-auto py-4">
      <label className="block text-sm font-semibold text-slate-700">Tulis Formula Matematika:</label>
      <input
        type="text"
        value={simpleFormula}
        onChange={e => setSimpleFormula(e.target.value)}
        placeholder="Contoh: (2 * 4.5) + (3 * 1.25) - 0.5"
        className="input-field font-mono text-base focus:ring-2 focus:ring-primary-500 w-full px-3 py-2 border border-gray-300 rounded"
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
        <span className="text-2xl font-extrabold text-primary-800 font-mono">
          {simpleResult.toLocaleString('id-ID', { minimumFractionDigits: 0, maximumFractionDigits: 4 })}
        </span>
      </div>
    </div>
  )
}
