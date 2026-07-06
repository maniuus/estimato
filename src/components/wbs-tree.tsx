import React, { useState, useEffect, useCallback } from 'react'
import { useWbsStore } from '../stores/wbs-store'
import type { WbsItem } from '../types/models'

interface WbsTreeProps {
  projectId: string
  onSelectItem?: (item: WbsItem | null) => void
}

interface TreeNodeProps {
  item: WbsItem
  allItems: WbsItem[]
  depth: number
  onSelect: (item: WbsItem) => void
  onDelete: (id: string) => void
  onAddChild: (parentId: string) => void
}

function TreeNode({ item, allItems, depth, onSelect, onDelete, onAddChild }: TreeNodeProps): React.ReactElement {
  const [expanded, setExpanded] = useState(true)
  const children = allItems
    .filter(i => i.parentId === item.id)
    .sort((a, b) => a.sortOrder - b.sortOrder)

  const hasChildren = children.length > 0

  return (
    <div>
      <div
        className="flex items-center gap-2 px-3 py-2 hover:bg-blue-50 rounded-lg cursor-pointer group transition-colors"
        style={{ paddingLeft: `${12 + depth * 24}px` }}
        onClick={() => onSelect(item)}
      >
        <button
          onClick={e => { e.stopPropagation(); setExpanded(!expanded) }}
          className={`w-4 text-center text-xs text-gray-400 transition-transform ${hasChildren ? '' : 'invisible'}`}
        >
          {expanded ? '▼' : '▶'}
        </button>

        <span className={`text-xs font-mono text-gray-500 w-16 shrink-0`}>
          {item.code}
        </span>

        <span className={`text-sm ${item.type === 'group' ? 'font-semibold text-gray-800' : 'text-gray-700'}`}>
          {item.name}
        </span>

        {item.type === 'item' && item.unit && (
          <span className="text-xs text-gray-400 ml-1">[{item.unit}]</span>
        )}

        <span className={`ml-auto text-xs px-2 py-0.5 rounded ${item.type === 'group' ? 'bg-purple-100 text-purple-700' : 'bg-blue-100 text-blue-700'}`}>
          {item.type === 'group' ? 'Grup' : 'Item'}
        </span>

        <div className="hidden group-hover:flex items-center gap-1 ml-2">
          <button
            onClick={e => { e.stopPropagation(); onAddChild(item.id) }}
            className="text-xs px-2 py-1 bg-green-100 text-green-700 rounded hover:bg-green-200"
            title="Tambah sub-item"
          >
            +Sub
          </button>
          <button
            onClick={e => { e.stopPropagation(); onDelete(item.id) }}
            className="text-xs px-2 py-1 bg-red-100 text-red-700 rounded hover:bg-red-200"
            title="Hapus"
          >
            Hapus
          </button>
        </div>
      </div>

      {expanded && hasChildren && (
        <div>
          {children.map(child => (
            <TreeNode
              key={child.id}
              item={child}
              allItems={allItems}
              depth={depth + 1}
              onSelect={onSelect}
              onDelete={onDelete}
              onAddChild={onAddChild}
            />
          ))}
        </div>
      )}
    </div>
  )
}

export function WbsTree({ projectId, onSelectItem }: WbsTreeProps): React.ReactElement {
  const { items, loading, error, loadByProject, createItem, deleteItem } = useWbsStore()
  const [showForm, setShowForm] = useState(false)
  const [formParentId, setFormParentId] = useState<string | null>(null)
  const [formName, setFormName] = useState('')
  const [formType, setFormType] = useState<'group' | 'item'>('item')
  const [formUnit, setFormUnit] = useState('')
  const [addingRoot, setAddingRoot] = useState(false)

  useEffect(() => {
    loadByProject(projectId)
  }, [projectId])

  const roots = items
    .filter(i => i.parentId === null)
    .sort((a, b) => a.sortOrder - b.sortOrder)

  const resetForm = useCallback(() => {
    setShowForm(false)
    setFormParentId(null)
    setFormName('')
    setFormType('item')
    setFormUnit('')
    setAddingRoot(false)
  }, [])

  const handleAddRoot = (): void => {
    setAddingRoot(true)
    setShowForm(true)
    setFormParentId(null)
  }

  const handleAddChild = (parentId: string): void => {
    setAddingRoot(false)
    setShowForm(true)
    setFormParentId(parentId)
  }

  const handleSubmit = async (e: React.FormEvent): Promise<void> => {
    e.preventDefault()
    if (!formName.trim()) return

    await createItem({
      projectId,
      parentId: formParentId,
      name: formName.trim(),
      type: formType,
      unit: formType === 'item' ? formUnit : '',
      sortOrder: 0
    })

    resetForm()
  }

  const handleDelete = async (id: string): Promise<void> => {
    if (confirm('Hapus item ini dan semua sub-item-nya?')) {
      await deleteItem(id)
    }
  }

  const handleSelect = (item: WbsItem): void => {
    onSelectItem?.(item)
  }

  if (loading && items.length === 0) {
    return <div className="text-center py-8 text-gray-500">Memuat WBS...</div>
  }

  if (error) {
    return <div className="text-center py-8 text-red-500">{error}</div>
  }

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between">
        <h3 className="text-sm font-semibold text-gray-700">Struktur Pekerjaan (WBS)</h3>
        <button onClick={handleAddRoot} className="btn-primary text-xs px-3 py-1.5">
          + Tambah Grup
        </button>
      </div>

      {roots.length === 0 && !showForm && (
        <div className="text-center py-8 text-gray-400 text-sm border-2 border-dashed border-gray-200 rounded-xl">
          Belum ada pekerjaan. Klik "Tambah Grup" untuk memulai.
        </div>
      )}

      <div className="card divide-y divide-gray-100">
        {roots.map(root => (
          <TreeNode
            key={root.id}
            item={root}
            allItems={items}
            depth={0}
            onSelect={handleSelect}
            onDelete={handleDelete}
            onAddChild={handleAddChild}
          />
        ))}
      </div>

      {showForm && (
        <form onSubmit={handleSubmit} className="card p-4 space-y-3">
          <h4 className="text-sm font-semibold">
            {addingRoot ? 'Tambah Grup Baru' : 'Tambah Sub-Item'}
          </h4>
          <div className="grid grid-cols-4 gap-3">
            <div className="col-span-2">
              <label className="block text-xs text-gray-500 mb-1">Nama Pekerjaan</label>
              <input
                className="input-field"
                value={formName}
                onChange={e => setFormName(e.target.value)}
                placeholder="Nama pekerjaan..."
                autoFocus
                required
              />
            </div>
            <div>
              <label className="block text-xs text-gray-500 mb-1">Tipe</label>
              <select className="input-field" value={formType} onChange={e => setFormType(e.target.value as 'group' | 'item')}>
                <option value="item">Item</option>
                <option value="group">Grup (induk)</option>
              </select>
            </div>
            <div>
              <label className="block text-xs text-gray-500 mb-1">Satuan</label>
              <input
                className="input-field"
                value={formUnit}
                onChange={e => setFormUnit(e.target.value)}
                placeholder="m², m³, kg..."
                disabled={formType === 'group'}
              />
            </div>
          </div>
          <div className="flex gap-2">
            <button type="submit" className="btn-primary text-xs px-3 py-1.5">Simpan</button>
            <button type="button" onClick={resetForm} className="btn-secondary text-xs px-3 py-1.5">Batal</button>
          </div>
        </form>
      )}
    </div>
  )
}
