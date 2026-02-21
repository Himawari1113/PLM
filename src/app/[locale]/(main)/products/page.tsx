'use client'

import { useEffect, useState, useMemo, useCallback, useRef } from 'react'
import { Link } from '@/lib/navigation'
import { PRODUCT_CATEGORIES, PRODUCT_STATUS_LABELS } from '@/lib/constants'
import { Plus, Search } from 'lucide-react'
import { useTranslations } from 'next-intl'
import { useYearFilter } from '@/contexts/YearFilterContext'
import { BpPageHeader } from '@/components/common'

/* ── Types ─────────────────────────────────────────── */

interface Product {
  id: string
  styleNumber: string
  name: string
  divisionId: number | null
  division: { id: number; name: string } | null
  category: string
  description: string | null
  status: string
  targetPrice: number | null
  salesStart: string | null
  originalPrice: number | null
  planQty: number | null
  collectionId: string | null
  collection: { name: string; season: { name: string; seasonName?: string } } | null
  supplierId: string | null
  supplier: { id: string; name: string } | null
  _count: { samples: number }
  updatedAt: string
}

interface Division {
  id: number
  name: string
}

interface Supplier {
  id: string
  name: string
}

interface CellSelection {
  id: string
  field: string
}

interface EditState {
  id: string
  field: string
  value: string
}

/* ── Column definitions ───────────────────────────── */

interface ProdCol {
  k: string
  l: string
  w: number
  editable: boolean
  type?: 'number' | 'text' | 'select'
  align?: 'left' | 'center' | 'right'
  calculated?: boolean
}

const usd = new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD' })

/* ── Component ──────────────────────────────────────── */

export default function ProductsPage() {
  const t = useTranslations('products')
  const tConstants = useTranslations('constants')
  const { selectedYear, selectedSeason } = useYearFilter()

  const [data, setData] = useState<Product[]>([])
  const [loading, setLoading] = useState(true)
  const [search, setSearch] = useState('')
  const [selectedCell, setSelectedCell] = useState<CellSelection | null>(null)
  const [copiedCell, setCopiedCell] = useState<CellSelection | null>(null)
  const [editState, setEditState] = useState<EditState | null>(null)
  const [selectedProduct, setSelectedProduct] = useState<Product | null>(null)
  const [divisions, setDivisions] = useState<Division[]>([])
  const [suppliers, setSuppliers] = useState<Supplier[]>([])

  /* Pagination */
  const [currentPage, setCurrentPage] = useState(1)
  const pageSize = 100

  /* ── Column config ── */
  const columns: ProdCol[] = useMemo(() => [
    { k: 'styleNumber', l: 'Style No', w: 120, editable: true },
    { k: 'name', l: 'Product Name', w: 240, editable: true },
    { k: 'division', l: 'Division', w: 110, editable: true, type: 'select' },
    { k: 'category', l: 'Category', w: 120, editable: true, type: 'select' },
    { k: 'status', l: 'Status', w: 110, editable: true, type: 'select' },
    { k: 'season', l: 'Season', w: 80, editable: false },
    { k: 'supplier', l: 'Supplier', w: 160, editable: true, type: 'select' },
    { k: 'targetPrice', l: 'Target Price', w: 120, editable: true, type: 'number', align: 'right' },
    { k: 'salesStart', l: 'Sales Start', w: 120, editable: true, type: 'text' },
    { k: 'originalPrice', l: 'Original Price', w: 120, editable: true, type: 'number', align: 'right' },
    { k: 'planQty', l: 'Plan Qty', w: 100, editable: true, type: 'number', align: 'right' },
    { k: 'description', l: 'Description', w: 200, editable: true },
    { k: 'samples', l: 'Samples', w: 80, editable: false, align: 'center', calculated: true },
  ], [])

  /* ── Frozen columns ── */
  const getFrozenStyle = (key: string, isHeader = false): React.CSSProperties => {
    const cfg: Record<string, { left: number; zIndex: number }> = {
      '#': { left: 0, zIndex: isHeader ? 7 : 6 },
      'styleNumber': { left: 50, zIndex: isHeader ? 7 : 6 },
    }
    const s = cfg[key]
    if (!s) return isHeader ? { position: 'sticky', top: 0, zIndex: 5, background: '#f8fafc' } : {}
    return {
      position: 'sticky',
      left: s.left,
      zIndex: s.zIndex,
      borderRight: key === 'styleNumber' ? '2px solid #cbd5e1' : '1px solid #e2e8f0',
      top: isHeader ? 0 : undefined,
      background: isHeader ? '#f8fafc' : '#fff',
    }
  }

  /* ── Data fetch ── */
  const fetchProducts = useCallback(async () => {
    setLoading(true)
    try {
      const params = new URLSearchParams()
      if (selectedYear !== null) params.set('year', String(selectedYear))
      if (selectedSeason !== null) params.set('season', String(selectedSeason))
      const res = await fetch(`/api/products?${params}`)
      const json = await res.json()
      setData(Array.isArray(json) ? json : [])
    } catch {
      setData([])
    } finally {
      setLoading(false)
    }
  }, [selectedYear, selectedSeason])

  useEffect(() => { fetchProducts() }, [fetchProducts])

  useEffect(() => {
    fetch('/api/divisions').then(r => r.json()).then(d => setDivisions(Array.isArray(d) ? d : [])).catch(() => { })
    fetch('/api/suppliers').then(r => r.json()).then(d => setSuppliers(Array.isArray(d) ? d : [])).catch(() => { })
  }, [])

  /* ── Filtering ── */
  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase()
    if (!q) return data
    return data.filter(p =>
      `${p.styleNumber} ${p.name} ${p.division?.name || ''} ${p.category}`.toLowerCase().includes(q),
    )
  }, [data, search])

  const totalPages = Math.max(1, Math.ceil(filtered.length / pageSize))
  const paginatedData = useMemo(() => {
    const start = (currentPage - 1) * pageSize
    return filtered.slice(start, start + pageSize)
  }, [filtered, currentPage])

  useEffect(() => { setCurrentPage(1) }, [filtered.length])

  /* ── Summary ── */
  const summary = useMemo(() => {
    const total = filtered.length
    const totalSamples = filtered.reduce((s, p) => s + (p._count?.samples || 0), 0)
    const avgPrice = filtered.length > 0
      ? filtered.reduce((s, p) => s + (p.targetPrice || 0), 0) / filtered.length
      : 0
    const statusCounts: Record<string, number> = {}
    for (const p of filtered) {
      statusCounts[p.status] = (statusCounts[p.status] || 0) + 1
    }
    return { total, totalSamples, avgPrice, statusCounts }
  }, [filtered])

  /* ── Edit helpers ── */
  const startEdit = (id: string, field: string, value: string) => {
    setEditState({ id, field, value })
  }
  const cancelEdit = () => setEditState(null)
  const isEditing = (id: string, field: string) =>
    editState?.id === id && editState?.field === field

  const handleSave = async () => {
    if (!editState) return
    const { id, field, value } = editState

    const numFields = ['targetPrice']
    const isNum = numFields.includes(field)
    let patchBody: any = {}

    if (field === 'division') {
      const div = divisions.find(d => d.name === value)
      patchBody = { divisionId: div ? div.id : null }
    } else if (field === 'supplier') {
      const sup = suppliers.find(s => s.name === value)
      patchBody = { supplierId: sup ? sup.id : null }
    } else if (isNum || ['originalPrice', 'planQty'].includes(field)) {
      patchBody = { [field]: value ? (field === 'planQty' ? parseInt(value) : parseFloat(value)) : null }
    } else if (field === 'salesStart') {
      patchBody = { salesStart: value || null }
    } else {
      patchBody = { [field]: value }
    }

    try {
      const res = await fetch(`/api/products/${id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(patchBody),
      })
      if (res.ok) {
        const updated = await res.json()
        setData(prev => prev.map(p => (p.id === id ? { ...p, ...updated, updatedAt: p.updatedAt } : p)))
      }
    } catch (err) {
      console.error('Save error:', err)
    }
    cancelEdit()
  }

  const handleAdd = async () => {
    try {
      const res = await fetch('/api/products', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          styleNumber: `NEW-${Date.now().toString(36).toUpperCase()}`,
          name: 'New Product',
          category: 'TOPS',
          status: 'DRAFT',
        }),
      })
      if (res.ok) {
        fetchProducts()
      }
    } catch (err) {
      console.error('Add error:', err)
    }
  }

  const handleDelete = async (id: string) => {
    if (!window.confirm('Delete this product?')) return
    try {
      await fetch(`/api/products/${id}`, { method: 'DELETE' })
      setData(prev => prev.filter(p => p.id !== id))
      if (selectedProduct?.id === id) setSelectedProduct(null)
    } catch (err) {
      console.error('Delete error:', err)
    }
  }

  const handleStyleClick = (item: Product) => {
    setSelectedProduct(prev => (prev?.id === item.id ? null : item))
  }

  /* ── Cell value display ── */
  const getCellValue = (item: Product, key: string): string => {
    switch (key) {
      case 'division': return item.division?.name || '-'
      case 'season': return item.collection?.season?.seasonName || item.collection?.season?.name || '-'
      case 'supplier': return item.supplier?.name || '-'
      case 'targetPrice': return item.targetPrice != null ? usd.format(item.targetPrice) : '-'
      case 'originalPrice': return item.originalPrice != null ? usd.format(item.originalPrice) : '-'
      case 'planQty': return item.planQty != null ? String(item.planQty) : '-'
      case 'salesStart': return item.salesStart ? item.salesStart.split('T')[0] : '-'
      case 'samples': return String(item._count?.samples ?? 0)
      case 'status': {
        try { return tConstants(`productStatus.${item.status}`) } catch { return item.status }
      }
      case 'category': {
        try { return tConstants(`categories.${item.category}`) } catch { return item.category }
      }
      default: return (item as any)[key] || '-'
    }
  }

  const getRawValue = (item: Product, key: string): string => {
    switch (key) {
      case 'division': return item.division?.name || ''
      case 'supplier': return item.supplier?.name || ''
      case 'targetPrice': return item.targetPrice != null ? String(item.targetPrice) : ''
      case 'originalPrice': return item.originalPrice != null ? String(item.originalPrice) : ''
      case 'planQty': return item.planQty != null ? String(item.planQty) : ''
      case 'salesStart': return item.salesStart ? item.salesStart.split('T')[0] : ''
      default: return String((item as any)[key] || '')
    }
  }

  /* ── Keyboard navigation ── */
  useEffect(() => {
    const handleKeyDown = async (e: KeyboardEvent) => {
      const target = e.target as HTMLElement
      if (target.tagName === 'INPUT' || target.tagName === 'TEXTAREA' || target.tagName === 'SELECT') return
      if (!selectedCell) return

      if (editState && editState.id === selectedCell.id && editState.field === selectedCell.field) return

      // Tab navigation
      if (e.key === 'Tab') {
        e.preventDefault()
        const rowIdx = paginatedData.findIndex(p => p.id === selectedCell.id)
        const colIdx = columns.findIndex(c => c.k === selectedCell.field)
        if (rowIdx === -1 || colIdx === -1) return

        let nr = rowIdx, nc = colIdx
        if (e.shiftKey) { nc--; if (nc < 0) { nr--; nc = columns.length - 1; if (nr < 0) nr = paginatedData.length - 1 } }
        else { nc++; if (nc >= columns.length) { nr++; nc = 0; if (nr >= paginatedData.length) nr = 0 } }

        const ni = paginatedData[nr]
        const nk = columns[nc]
        if (ni && nk) {
          setSelectedCell({ id: ni.id, field: nk.k })
          setTimeout(() => document.querySelector(`[data-cell-id="${ni.id}-${nk.k}"]`)?.scrollIntoView({ behavior: 'smooth', block: 'nearest', inline: 'nearest' }), 0)
        }
        return
      }

      // Arrow keys
      if (['ArrowUp', 'ArrowDown', 'ArrowLeft', 'ArrowRight'].includes(e.key)) {
        e.preventDefault()
        const rowIdx = paginatedData.findIndex(p => p.id === selectedCell.id)
        const colIdx = columns.findIndex(c => c.k === selectedCell.field)
        if (rowIdx === -1 || colIdx === -1) return

        let nr = rowIdx, nc = colIdx
        if (e.key === 'ArrowUp') nr = Math.max(0, rowIdx - 1)
        if (e.key === 'ArrowDown') nr = Math.min(paginatedData.length - 1, rowIdx + 1)
        if (e.key === 'ArrowLeft') nc = Math.max(0, colIdx - 1)
        if (e.key === 'ArrowRight') nc = Math.min(columns.length - 1, colIdx + 1)

        const ni = paginatedData[nr]
        const nk = columns[nc]
        if (ni && nk) {
          setSelectedCell({ id: ni.id, field: nk.k })
          setTimeout(() => document.querySelector(`[data-cell-id="${ni.id}-${nk.k}"]`)?.scrollIntoView({ behavior: 'smooth', block: 'nearest', inline: 'nearest' }), 0)
        }
        return
      }

      const col = columns.find(c => c.k === selectedCell.field)
      if (!col?.editable) return
      const item = data.find(d => d.id === selectedCell.id)
      if (!item) return

      // Copy
      if ((e.metaKey || e.ctrlKey) && e.key === 'c') {
        e.preventDefault()
        setCopiedCell(selectedCell)
        return
      }

      // Paste
      if ((e.metaKey || e.ctrlKey) && e.key === 'v' && copiedCell) {
        e.preventDefault()
        if (copiedCell.id === selectedCell.id && copiedCell.field === selectedCell.field) return
        const src = data.find(d => d.id === copiedCell.id)
        if (!src) return
        const val = getRawValue(src, copiedCell.field)
        startEdit(selectedCell.id, selectedCell.field, val)
        setEditState({ id: selectedCell.id, field: selectedCell.field, value: val })
        setTimeout(() => handleSave(), 0)
        return
      }

      // Enter: edit with existing value
      if (e.key === 'Enter') {
        e.preventDefault()
        startEdit(selectedCell.id, selectedCell.field, getRawValue(item, selectedCell.field))
        return
      }

      // Delete/Backspace: clear and edit
      if (e.key === 'Backspace' || e.key === 'Delete') {
        e.preventDefault()
        startEdit(selectedCell.id, selectedCell.field, '')
        return
      }

      // Direct typing
      if (e.key.length === 1 && !e.ctrlKey && !e.metaKey && !e.altKey) {
        e.preventDefault()
        startEdit(selectedCell.id, selectedCell.field, e.key)
        return
      }
    }

    window.addEventListener('keydown', handleKeyDown)
    return () => window.removeEventListener('keydown', handleKeyDown)
  }, [selectedCell, copiedCell, data, paginatedData, columns, editState])

  /* ── Render select editor ── */
  const renderSelectEditor = (col: ProdCol) => {
    if (!editState) return null

    let options: { value: string; label: string }[] = []

    if (col.k === 'division') {
      options = divisions.map(d => ({ value: d.name, label: d.name }))
    } else if (col.k === 'category') {
      options = PRODUCT_CATEGORIES.map(c => ({ value: c.value, label: c.value }))
    } else if (col.k === 'status') {
      options = Object.keys(PRODUCT_STATUS_LABELS).map(k => ({ value: k, label: k }))
    } else if (col.k === 'supplier') {
      options = suppliers.map(s => ({ value: s.name, label: s.name }))
    }

    return (
      <select
        className="bp-select"
        value={editState.value}
        onChange={e => {
          setEditState(prev => prev ? { ...prev, value: e.target.value } : null)
          setTimeout(() => handleSave(), 0)
        }}
        onBlur={handleSave}
        onKeyDown={e => e.key === 'Escape' && cancelEdit()}
        autoFocus
        style={{ width: '100%', fontSize: 13, padding: '4px 6px', border: '2px solid var(--color-primary)', borderRadius: 4 }}
      >
        <option value="">--</option>
        {options.map(o => <option key={o.value} value={o.value}>{o.label}</option>)}
      </select>
    )
  }

  /* ── Status badge ── */
  const statusBadge = (status: string) => {
    const colorMap: Record<string, string> = {
      DRAFT: '#94a3b8',
      IN_PROGRESS: '#0ea5e9',
      APPROVED: '#10b981',
      COMPLETED: '#10b981',
      CANCELLED: '#ef4444',
    }
    const bg = colorMap[status] || '#94a3b8'
    let label = status
    try { label = tConstants(`productStatus.${status}`) } catch { /* fallback */ }
    return (
      <span style={{
        background: `${bg}18`,
        color: bg,
        padding: '2px 8px',
        borderRadius: 4,
        fontSize: 11,
        fontWeight: 600,
        whiteSpace: 'nowrap',
      }}>
        {label}
      </span>
    )
  }

  /* ── Sync selectedProduct with data ── */
  useEffect(() => {
    if (!selectedProduct) return
    const updated = data.find(p => p.id === selectedProduct.id)
    if (updated && updated !== selectedProduct) setSelectedProduct(updated)
  }, [data, selectedProduct])

  if (loading && data.length === 0) {
    return <div className="bp-spinner-wrap"><div className="bp-spinner" /></div>
  }

  return (
    <>
      <BpPageHeader
        title="Line Plan"
        titleMeta={<span className="bp-page__subtitle">({filtered.length})</span>}
        actions={
          <button className="bp-button bp-button--primary" onClick={handleAdd}>
            <Plus style={{ width: 16, height: 16 }} />
            Add Product
          </button>
        }
      />

      <div className="bp-card" style={{ display: 'flex', flexDirection: 'column', flex: 1, maxHeight: 'calc(100vh - 160px)' }}>
        {/* Toolbar */}
        <div className="bp-toolbar">
          <div className="bp-toolbar__search">
            <Search className="bp-toolbar__search-icon" />
            <input
              className="bp-input"
              style={{ paddingLeft: 34 }}
              placeholder="Search by style number or name..."
              value={search}
              onChange={e => setSearch(e.target.value)}
            />
          </div>
        </div>

        {/* Table */}
        <div style={{ flex: 1, overflow: 'auto' }}>
          <table style={{ width: 'max-content', minWidth: '100%', borderCollapse: 'separate', borderSpacing: 0, fontSize: 13, fontFamily: 'var(--font-family-en)' }}>
            <thead>
              <tr>
                <th style={{ ...getFrozenStyle('#', true), minWidth: 50, padding: '8px 6px', textAlign: 'center', fontSize: 11, color: '#64748b', fontWeight: 600, borderBottom: '2px solid #e2e8f0' }}>#</th>
                {columns.map(c => (
                  <th key={c.k} style={{ ...getFrozenStyle(c.k, true), minWidth: c.w, padding: '8px 10px', textAlign: c.align || 'left', fontSize: 11, color: '#64748b', fontWeight: 600, borderBottom: '2px solid #e2e8f0', whiteSpace: 'nowrap' }}>
                    {c.l}
                  </th>
                ))}
                <th style={{ position: 'sticky', top: 0, zIndex: 5, background: '#f8fafc', minWidth: 50, padding: '8px 6px', textAlign: 'center', fontSize: 11, color: '#64748b', fontWeight: 600, borderBottom: '2px solid #e2e8f0' }}>
                  Del
                </th>
              </tr>
            </thead>
            <tbody>
              {paginatedData.map((item, idx) => (
                <tr key={item.id} style={{ height: 38 }}>
                  {/* Row number */}
                  <td style={{ ...getFrozenStyle('#'), textAlign: 'center', fontSize: 11, color: '#94a3b8', padding: '0 6px', borderBottom: '1px solid #f1f5f9' }}>
                    {(currentPage - 1) * pageSize + idx + 1}
                  </td>

                  {columns.map(col => {
                    const isEdit = isEditing(item.id, col.k)
                    const isSelected = selectedCell?.id === item.id && selectedCell?.field === col.k
                    const isCopied = copiedCell?.id === item.id && copiedCell?.field === col.k
                    const frozen = getFrozenStyle(col.k)

                    return (
                      <td
                        key={col.k}
                        data-cell-id={`${item.id}-${col.k}`}
                        style={{
                          ...frozen,
                          padding: '0 8px',
                          borderBottom: '1px solid #f1f5f9',
                          textAlign: col.align || 'left',
                          cursor: col.editable ? 'cell' : 'default',
                          background: isSelected ? '#e0f2fe' : isCopied ? '#fef3c7' : (col.editable ? (Object.keys(frozen).length ? '#fff' : undefined) : '#f8fafc'),
                          outline: isSelected ? '2px solid #0ea5e9' : 'none',
                          outlineOffset: -2,
                          whiteSpace: 'nowrap',
                          overflow: 'hidden',
                          textOverflow: 'ellipsis',
                          maxWidth: col.w,
                        }}
                        onClick={() => {
                          if (col.editable) setSelectedCell({ id: item.id, field: col.k })
                        }}
                        onDoubleClick={() => {
                          if (col.editable) startEdit(item.id, col.k, getRawValue(item, col.k))
                        }}
                      >
                        {isEdit ? (
                          col.type === 'select' ? renderSelectEditor(col) : (
                            <input
                              type={col.type === 'number' ? 'number' : 'text'}
                              step={col.k === 'targetPrice' ? '0.01' : '1'}
                              value={editState!.value}
                              onChange={e => setEditState(prev => prev ? { ...prev, value: e.target.value } : null)}
                              onBlur={handleSave}
                              onKeyDown={e => {
                                if (e.key === 'Enter') handleSave()
                                if (e.key === 'Escape') cancelEdit()
                              }}
                              autoFocus
                              style={{ width: '100%', fontSize: 13, padding: '4px 6px', border: '2px solid var(--color-primary)', borderRadius: 4, outline: 'none' }}
                            />
                          )
                        ) : col.k === 'styleNumber' ? (
                          <button
                            type="button"
                            onClick={e => { e.stopPropagation(); handleStyleClick(item) }}
                            style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#0ea5e9', fontWeight: 600, fontSize: 13, padding: 0 }}
                          >
                            {item.styleNumber}
                          </button>
                        ) : col.k === 'status' ? (
                          statusBadge(item.status)
                        ) : col.k === 'name' ? (
                          <span style={{ fontWeight: 500 }}>{item.name || '-'}</span>
                        ) : (
                          <span>{getCellValue(item, col.k)}</span>
                        )}
                      </td>
                    )
                  })}

                  {/* Delete button */}
                  <td style={{ textAlign: 'center', padding: '0 4px', borderBottom: '1px solid #f1f5f9' }}>
                    {(item._count?.samples || 0) === 0 ? (
                      <button
                        onClick={() => handleDelete(item.id)}
                        style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#ef4444', fontSize: 14, padding: '2px 4px' }}
                        title="Delete"
                      >
                        ×
                      </button>
                    ) : (
                      <span style={{ fontSize: 10, color: '#94a3b8' }} title={`${item._count.samples} samples`}>🔒</span>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        {/* Pagination */}
        <div style={{
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          padding: '8px 20px',
          borderTop: '1px solid var(--color-border)',
          background: 'var(--color-surface)',
          fontSize: 12,
          color: '#64748b',
        }}>
          <span>{filtered.length} products</span>
          <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
            <button
              disabled={currentPage <= 1}
              onClick={() => setCurrentPage(p => Math.max(1, p - 1))}
              style={{ padding: '4px 10px', border: '1px solid #e2e8f0', borderRadius: 4, background: '#fff', cursor: currentPage > 1 ? 'pointer' : 'default', opacity: currentPage > 1 ? 1 : 0.4, fontSize: 12 }}
            >
              ← Prev
            </button>
            <span>Page {currentPage} / {totalPages}</span>
            <button
              disabled={currentPage >= totalPages}
              onClick={() => setCurrentPage(p => Math.min(totalPages, p + 1))}
              style={{ padding: '4px 10px', border: '1px solid #e2e8f0', borderRadius: 4, background: '#fff', cursor: currentPage < totalPages ? 'pointer' : 'default', opacity: currentPage < totalPages ? 1 : 0.4, fontSize: 12 }}
            >
              Next →
            </button>
          </div>
        </div>

        {/* Detail Panel */}
        {selectedProduct && (
          <div style={{
            position: 'fixed',
            right: 0,
            top: 0,
            bottom: 0,
            width: 380,
            background: '#fff',
            borderLeft: '1px solid #e2e8f0',
            boxShadow: '-4px 0 20px rgba(0,0,0,0.08)',
            zIndex: 1000,
            display: 'flex',
            flexDirection: 'column',
            overflow: 'auto',
          }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '16px 20px', borderBottom: '1px solid #e2e8f0' }}>
              <h3 style={{ margin: 0, fontSize: 16, fontWeight: 600, color: '#0f172a' }}>Product Details</h3>
              <button onClick={() => setSelectedProduct(null)} style={{ background: 'none', border: 'none', cursor: 'pointer', fontSize: 20, color: '#94a3b8', lineHeight: 1 }}>×</button>
            </div>
            <div style={{ padding: 20, display: 'flex', flexDirection: 'column', gap: 16 }}>
              <DetailField label="Style No" value={selectedProduct.styleNumber} highlight />
              <DetailField label="Product Name" value={selectedProduct.name} />
              <DetailField label="Division" value={selectedProduct.division?.name || '-'} />
              <DetailField label="Category" value={selectedProduct.category} />
              <DetailField label="Status" value={selectedProduct.status} />
              <DetailField label="Season" value={selectedProduct.collection?.season?.seasonName || selectedProduct.collection?.season?.name || '-'} />
              <DetailField label="Supplier" value={selectedProduct.supplier?.name || '-'} />
              <DetailField label="Target Price" value={selectedProduct.targetPrice != null ? usd.format(selectedProduct.targetPrice) : '-'} highlight />
              <DetailField label="Description" value={selectedProduct.description || '-'} />
              <DetailField label="Samples" value={String(selectedProduct._count?.samples ?? 0)} />
              <Link href={`/products/${selectedProduct.id}`}>
                <button className="bp-button bp-button--primary" style={{ width: '100%', marginTop: 8 }}>View Full Details →</button>
              </Link>
            </div>
          </div>
        )}
      </div>
    </>
  )
}

/* ── Detail field ── */
function DetailField({ label, value, highlight }: { label: string; value: string; highlight?: boolean }) {
  return (
    <div>
      <div style={{ fontSize: 10, color: '#64748b', textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: 2 }}>{label}</div>
      <div style={{ fontSize: 14, fontWeight: highlight ? 700 : 400, color: highlight ? '#0ea5e9' : '#0f172a' }}>{value}</div>
    </div>
  )
}
