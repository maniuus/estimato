import React, { useState, useEffect, useCallback } from 'react'
import type { 
  TabType, 
  VolumeCalculatorModalProps, 
  DimRow, 
  SteelRow, 
  SectionElement, 
  WallRow, 
  OpeningRow 
} from './types'
import { 
  evaluateMath, 
  getDimTotal, 
  getSteelRowWeight, 
  getSingleElementWeight, 
  getWallNetArea, 
  evaluateProjectVolumes, 
  parseDiameter 
} from './helpers'
import { useProjectVolumeStore } from '../../stores/project-volume-store'
import { SimpleMathTab } from './tabs/SimpleMathTab'
import { DimensionsTab } from './tabs/DimensionsTab'
import { SteelTab } from './tabs/SteelTab'
import { WallTab } from './tabs/WallTab'

export function VolumeCalculatorModal({
  isOpen,
  onClose,
  onApply,
  initialFormula,
  initialNotes,
  unit,
  projectId,
  initialProjectVolumeId = null
}: VolumeCalculatorModalProps): React.ReactElement | null {
  
  const [activeTab, setActiveTab] = useState<TabType>('simple')

  // Project Volume state and linking
  const { items: loadedProjectVolumes, loadByProject, upsert: upsertSharedVolume, deleteItem: deleteSharedVolume } = useProjectVolumeStore()
  const [currentProjectVolumeId, setCurrentProjectVolumeId] = useState<string | null>(null)

  // Load project volumes when projectId changes
  useEffect(() => {
    if (isOpen && projectId) {
      loadByProject(projectId)
    }
  }, [projectId, isOpen])

  // Sync initial linked state
  useEffect(() => {
    if (isOpen) {
      setCurrentProjectVolumeId(initialProjectVolumeId || null)
      if (initialProjectVolumeId) {
        setActiveTab('project-volume')
      }
    }
  }, [initialProjectVolumeId, isOpen])

  // 1. Simple Tab State
  const [simpleFormula, setSimpleFormula] = useState('')
  const [simpleResult, setSimpleResult] = useState(0)
  const [simpleError, setSimpleError] = useState<string | null>(null)

  // 2. Dimensions Tab State
  const [dimRows, setDimRows] = useState<DimRow[]>([
    { id: '1', description: '', length: '', width: '', height: '', qty: '1' }
  ])

  // 3. Steel Tab State
  const [steelRows, setSteelRows] = useState<SteelRow[]>([
    { id: '1', description: '', diameter: 'Ø10', length: '', qty: '', mult: '1' }
  ])
  const [steelMode, setSteelMode] = useState<'table' | 'section'>('table')
  const [sectionElements, setSectionElements] = useState<SectionElement[]>([
    {
      id: '1',
      name: 'Balok B1',
      b: '200',
      h: '300',
      c: '40',
      length: '4',
      qty: '1',
      mainRebarRows: [
        { id: '1', position: 'Atas', diameter: 'D13', qty: '2' },
        { id: '2', position: 'Bawah', diameter: 'D13', qty: '3' }
      ],
      stirrupMode: 'uniform',
      stirrupDia: 'Ø8',
      stirrupSpacing: '150',
      stirrupSpacingTumpuan: '100',
      stirrupSpacingLapangan: '150'
    }
  ])

  // 4. Wall Tab State
  const [wallRows, setWallRows] = useState<WallRow[]>([
    { id: '1', description: 'Dinding Utama', length: '', height: '', qty: '1' }
  ])
  const [openings, setOpenings] = useState<OpeningRow[]>([
    { id: '1', name: 'Pintu P1', width: '0.9', height: '2.1', qty: '1' }
  ])

  // Auto-detect tab based on unit or initialFormula on open
  useEffect(() => {
    if (isOpen) {
      const lowerUnit = (unit || '').toLowerCase()
      if (lowerUnit === 'kg' || lowerUnit === 'kg/m' || lowerUnit === 'besi') {
        setActiveTab('steel')
      } else if (lowerUnit === 'm²' || lowerUnit === 'm2' || lowerUnit === 'hebel' || lowerUnit === 'bata') {
        setActiveTab('wall')
      } else if (lowerUnit === 'm³' || lowerUnit === 'm3') {
        setActiveTab('dimensions')
      } else {
        setActiveTab('simple')
      }

      if (initialFormula) {
        try {
          const parsed = JSON.parse(initialFormula)
          if (parsed.type && ['simple', 'dimensions', 'steel', 'wall'].includes(parsed.type)) {
            setActiveTab(parsed.type)
            if (parsed.type === 'simple') {
              setSimpleFormula(parsed.data.formula || '')
            } else if (parsed.type === 'dimensions') {
              setDimRows(parsed.data.rows || [])
            } else if (parsed.type === 'steel') {
              const mode = parsed.data.steelMode || 'table'
              setSteelMode(mode)
              if (mode === 'section') {
                if (parsed.data.sectionElements) {
                  setSectionElements(parsed.data.sectionElements)
                } else {
                  // Fallback for single section format
                  setSectionElements([{
                    id: '1',
                    name: parsed.data.sectionName || 'Balok B1',
                    b: parsed.data.sectionB || '200',
                    h: parsed.data.sectionH || '300',
                    c: parsed.data.sectionCover || '40',
                    length: parsed.data.elementLength || '4',
                    qty: parsed.data.elementQty || '1',
                    mainRebarRows: parsed.data.mainRebarRows || [
                      { id: '1', position: 'Atas', diameter: parsed.data.mainDia || 'D13', qty: parsed.data.mainQtyTop || '2' },
                      { id: '2', position: 'Bawah', diameter: parsed.data.mainDia || 'D13', qty: parsed.data.mainQtyBottom || '3' }
                    ],
                    stirrupMode: parsed.data.stirrupMode || 'uniform',
                    stirrupDia: parsed.data.stirrupDia || 'Ø8',
                    stirrupSpacing: parsed.data.stirrupSpacing || '150',
                    stirrupSpacingTumpuan: parsed.data.stirrupSpacingTumpuan || '100',
                    stirrupSpacingLapangan: parsed.data.stirrupSpacingLapangan || '150'
                  }])
                }
              } else {
                const loadedRows = (parsed.data.rows || []).map((row: any) => ({
                  ...row,
                  diameter: /^[0-9.]+$/.test(String(row.diameter)) ? 'D' + row.diameter : String(row.diameter)
                }))
                setSteelRows(loadedRows.length > 0 ? loadedRows : [{ id: '1', description: '', diameter: 'Ø10', length: '', qty: '', mult: '1' }])
              }
            } else if (parsed.type === 'wall') {
              if (parsed.data.wallRows) {
                setWallRows(parsed.data.wallRows)
              } else {
                // Fallback for old single wall format
                setWallRows([{
                  id: '1',
                  description: 'Dinding Utama',
                  length: parsed.data.wallLength || '',
                  height: parsed.data.wallHeight || '',
                  qty: parsed.data.wallMult || '1'
                }])
              }
              setOpenings(parsed.data.openings || [])
            }
          }
        } catch {
          // If not JSON, it's a plain string formula
          setSimpleFormula(initialFormula)
          setActiveTab('simple')
        }
      } else {
        // Reset states to default if empty
        setSimpleFormula('')
        setDimRows([{ id: '1', description: '', length: '', width: '', height: '', qty: '1' }])
        setSteelRows([{ id: '1', description: '', diameter: 'Ø10', length: '', qty: '', mult: '1' }])
        setSteelMode('table')
        setSectionElements([
          {
            id: '1',
            name: 'Balok B1',
            b: '200',
            h: '300',
            c: '40',
            length: '4',
            qty: '1',
            mainRebarRows: [
              { id: '1', position: 'Atas', diameter: 'D13', qty: '2' },
              { id: '2', position: 'Bawah', diameter: 'D13', qty: '3' }
            ],
            stirrupMode: 'uniform',
            stirrupDia: 'Ø8',
            stirrupSpacing: '150',
            stirrupSpacingTumpuan: '100',
            stirrupSpacingLapangan: '150'
          }
        ])
        setWallRows([{ id: '1', description: 'Dinding Utama', length: '', height: '', qty: '1' }])
        setOpenings([{ id: '1', name: 'Pintu P1', width: '0.9', height: '2.1', qty: '1' }])
      }
    }
  }, [isOpen, initialFormula, unit])

  // Simple tab live math solver
  useEffect(() => {
    if (activeTab === 'simple') {
      try {
        const val = evaluateMath(simpleFormula, loadedProjectVolumes)
        setSimpleResult(val)
        setSimpleError(null)
      } catch (err: any) {
        setSimpleResult(0)
        setSimpleError(err.message || 'Error formula')
      }
    }
  }, [simpleFormula, activeTab, loadedProjectVolumes])

  const handleApply = () => {
    /* Bypass project volume link apply as per user's hold request */
    if (false && currentProjectVolumeId) {
      const matched = loadedProjectVolumes.find(pv => pv.id === currentProjectVolumeId)
      const val = matched ? matched.value : 0
      const name = matched ? matched.name : 'Volume Bersama'
      onApply(parseFloat(val.toFixed(4)), '', `Dihubungkan ke Volume Bersama: ${name}`, currentProjectVolumeId)
      onClose()
      return
    }

    let finalVolume = 0
    let formulaJson = ''
    let calculatedNotes = ''

    if (activeTab === 'simple') {
      finalVolume = simpleResult
      formulaJson = JSON.stringify({
        type: 'simple',
        data: { formula: simpleFormula }
      })
      calculatedNotes = `Rumus: ${simpleFormula} = ${simpleResult.toFixed(3)}`
    } else if (activeTab === 'dimensions') {
      finalVolume = getDimTotal(dimRows)
      formulaJson = JSON.stringify({
        type: 'dimensions',
        data: { rows: dimRows }
      })
      const details = dimRows
        .filter(r => r.length || r.width || r.height)
        .map(r => `${r.description || 'Pek'}: ${r.length || '1'}x${r.width || '1'}x${r.height || '1'} (${r.qty}x)`)
        .join(', ')
      calculatedNotes = `Dimensi: ${details}`
    } else if (activeTab === 'steel') {
      if (steelMode === 'section') {
        finalVolume = sectionElements.reduce((sum, el) => sum + getSingleElementWeight(el).totalWeight, 0)
        formulaJson = JSON.stringify({
          type: 'steel',
          data: {
            steelMode,
            sectionElements
          }
        })
        const details = sectionElements.map(el => {
          const w = getSingleElementWeight(el).totalWeight
          return `${el.name} (${w.toFixed(1)} kg)`
        }).join(', ')
        calculatedNotes = `Rekap Elemen Struktur Besi: ${details}`
      } else {
        finalVolume = steelRows.reduce((sum, r) => sum + getSteelRowWeight(r), 0)
        formulaJson = JSON.stringify({
          type: 'steel',
          data: { steelMode, rows: steelRows }
        })
        const details = steelRows
          .filter(r => r.length && r.qty)
          .map(r => `${r.diameter} L${r.length}m (${r.qty}x)`)
          .join(', ')
        calculatedNotes = `Pembesian: ${details}`
      }
    } else if (activeTab === 'wall') {
      finalVolume = getWallNetArea(wallRows, openings)
      formulaJson = JSON.stringify({
        type: 'wall',
        data: { wallRows, openings }
      })
      const wallDetails = wallRows
        .filter(r => r.length && r.height)
        .map(r => `${r.description || 'Dinding'}: ${r.length}x${r.height} (${r.qty}x)`)
        .join(', ')
      const openingDetails = openings
        .filter(o => o.width && o.height && o.qty !== '0')
        .map(o => `${o.name || 'Lubang'}: ${o.width}x${o.height} (${o.qty}x)`)
        .join(', ')
      calculatedNotes = `Gross: [${wallDetails}] dikurangi bukaan [${openingDetails || 'tidak ada'}]`
    }

    onApply(parseFloat(finalVolume.toFixed(4)), formulaJson, calculatedNotes, null)
    onClose()
  }

  if (!isOpen) return null

  return (
    <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4 backdrop-blur-sm">
      <div className="bg-white rounded-xl shadow-2xl w-full max-w-4xl mx-4 my-8 flex flex-col max-h-[85vh] border border-gray-100">
        
        {/* Header */}
        <div className="p-5 border-b border-gray-200 flex justify-between items-center bg-slate-50 rounded-t-xl">
          <div>
            <h3 className="text-lg font-bold text-slate-800 flex items-center gap-2">
              🧮 Backup Kalkulator Volume Pekerjaan
            </h3>
            <p className="text-xs text-gray-500 mt-1">
              Gunakan kalkulator ini untuk menghitung secara terinci. Hasil perhitungan akan mengisi kolom volume utama.
            </p>
          </div>
          <button type="button" onClick={onClose} className="text-gray-400 hover:text-gray-600 text-2xl font-semibold leading-none">&times;</button>
        </div>

        {/* Tabs */}
        <div className="flex border-b border-gray-200 bg-gray-100 text-sm">
          <button
            onClick={() => setActiveTab('simple')}
            className={`flex-1 py-3 text-center font-medium border-b-2 transition-all ${
              activeTab === 'simple'
                ? 'border-primary-800 text-primary-800 bg-white font-bold'
                : 'border-transparent text-gray-500 hover:text-gray-700 hover:bg-gray-50'
            }`}
          >
            🧮 Formula Matematika
          </button>
          <button
            onClick={() => setActiveTab('dimensions')}
            className={`flex-1 py-3 text-center font-medium border-b-2 transition-all ${
              activeTab === 'dimensions'
                ? 'border-primary-800 text-primary-800 bg-white font-bold'
                : 'border-transparent text-gray-500 hover:text-gray-700 hover:bg-gray-50'
            }`}
          >
            📏 Daftar Dimensi (P x L x T)
          </button>
          <button
            onClick={() => setActiveTab('steel')}
            className={`flex-1 py-3 text-center font-medium border-b-2 transition-all ${
              activeTab === 'steel'
                ? 'border-primary-800 text-primary-800 bg-white font-bold'
                : 'border-transparent text-gray-500 hover:text-gray-700 hover:bg-gray-50'
            }`}
          >
            ⛓️ Pembesian (kg)
          </button>
          <button
            onClick={() => setActiveTab('wall')}
            className={`flex-1 py-3 text-center font-medium border-b-2 transition-all ${
              activeTab === 'wall'
                ? 'border-primary-800 text-primary-800 bg-white font-bold'
                : 'border-transparent text-gray-500 hover:text-gray-700 hover:bg-gray-50'
            }`}
          >
            🧱 Dinding & Bukaan
          </button>
          
          {/* Hide Volume Bersama tab button as per user's hold request */}
          {false && projectId && (
            <button
              onClick={() => setActiveTab('project-volume')}
              className={`flex-1 py-3 text-center font-medium border-b-2 transition-all ${
                activeTab === 'project-volume'
                  ? 'border-primary-800 text-primary-800 bg-white font-bold'
                  : 'border-transparent text-gray-500 hover:text-gray-700 hover:bg-gray-50'
              }`}
            >
              🔗 Volume Bersama
            </button>
          )}
        </div>

        {/* Content Body */}
        <div className="p-6 flex-1 overflow-y-auto min-h-[300px]">
          
          {/* Hide Linked Volume Banner as per user's hold request */}
          {false && currentProjectVolumeId && activeTab !== 'project-volume' && (
            <div className="mb-4 p-3 bg-blue-50 border border-blue-200 rounded-lg flex items-center justify-between text-xs text-blue-800 font-sans shadow-sm">
              <div className="flex items-center gap-2">
                <span className="text-lg">🔗</span>
                <div>
                  <span className="font-bold">Terhubung ke Volume Bersama: </span>
                  <span className="font-semibold text-blue-900 bg-blue-100 px-2 py-0.5 rounded ml-1">
                    {loadedProjectVolumes.find(pv => pv.id === currentProjectVolumeId)?.name || 'Volume Bersama'} 
                    {' '}
                    ({loadedProjectVolumes.find(pv => pv.id === currentProjectVolumeId)?.value} {loadedProjectVolumes.find(pv => pv.id === currentProjectVolumeId)?.unit})
                  </span>
                </div>
              </div>
              <button
                type="button"
                onClick={() => {
                  setCurrentProjectVolumeId(null)
                }}
                className="text-red-600 hover:text-red-800 font-bold bg-white px-2.5 py-1 border border-red-200 rounded shadow-sm hover:bg-red-50 transition-colors"
              >
                Putuskan Hubungan (Ubah ke Manual)
              </button>
            </div>
          )}

          {activeTab === 'simple' && (
            <SimpleMathTab
              simpleFormula={simpleFormula}
              setSimpleFormula={setSimpleFormula}
              simpleResult={simpleResult}
              simpleError={simpleError}
              loadedProjectVolumes={loadedProjectVolumes}
            />
          )}

          {activeTab === 'dimensions' && (
            <DimensionsTab
              dimRows={dimRows}
              setDimRows={setDimRows}
              unit={unit}
            />
          )}

          {activeTab === 'steel' && (
            <SteelTab
              steelRows={steelRows}
              setSteelRows={setSteelRows}
              steelMode={steelMode}
              setSteelMode={setSteelMode}
              sectionElements={sectionElements}
              setSectionElements={setSectionElements}
              unit={unit}
            />
          )}

          {activeTab === 'wall' && (
            <WallTab
              wallRows={wallRows}
              setWallRows={setWallRows}
              openings={openings}
              setOpenings={setOpenings}
              unit={unit}
            />
          )}

          {/* Hide Project Volume management body as per user's hold request */}
          {false && activeTab === 'project-volume' && (
            <div className="text-xs text-gray-500 italic">Volume Bersama ditangguhkan.</div>
          )}

        </div>

        {/* Footer */}
        <div className="p-4 border-t border-gray-200 flex justify-end gap-2 bg-slate-50 rounded-b-xl">
          <button
            type="button"
            onClick={onClose}
            className="btn-secondary text-xs px-4 py-2"
          >
            Batal
          </button>
          <button
            type="button"
            onClick={handleApply}
            className="btn-primary text-xs px-5 py-2 flex items-center gap-1.5"
          >
            ✔️ Terapkan Ke Volume
          </button>
        </div>

      </div>
    </div>
  )
}
