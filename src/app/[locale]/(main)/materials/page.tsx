'use client'

import { useEffect, useState, useCallback } from 'react'
import { Plus, Search, Trash2 } from 'lucide-react'
import { useTranslations } from 'next-intl'
import { useDebounce } from '@/hooks/useDebounce'
import { BpPageHeader } from '@/components/common'

const MATERIAL_CATEGORIES = [
  { value: 'MAIN_FABRIC', label: 'Main Fabric' },
  { value: 'SUB_FABRIC', label: 'Sub Fabric' },
  { value: 'SUB_MATERIAL', label: 'Sub Material' },
] as const

const MATERIAL_TYPES = [
  { value: 'FABRIC', label: 'Fabric' },
  { value: 'TRIM', label: 'Trim' },
  { value: 'PACKAGING', label: 'Packaging' },
  { value: 'OTHER', label: 'Other' },
] as const

interface SupplierRef {
  id: string
  supplier: { id: string; name: string }
}

interface Material {
  id: string
  materialCode: string | null
  name: string
  type: string
  materialCategory: string | null
  composition: string | null
  unitPrice: number | null
  unit: string | null
  weight: string | null
  width: string | null
  sampleRefCount: number
  supplierMaterials: SupplierRef[]
  _count: { bomItems: number; supplierMaterials: number; materialColors: number }
}

export default function MaterialsPage() {
  const t = useTranslations('materials')
  const tCommon = useTranslations('common')
  const [materials, setMaterials] = useState<Material[]>([])
  const [suppliers, setSuppliers] = useState<Array<{ id: string; name: string }>>([])
  const [search, setSearch] = useState('')
  const [filterCategory, setFilterCategory] = useState('')
  const [filterType, setFilterType] = useState('')
  const [loading, setLoading] = useState(true)

  const debouncedSearch = useDebounce(search)

  useEffect(() => {
    fetch('/api/suppliers').then((r) => r.json()).then((d) => setSuppliers(Array.isArray(d) ? d : []))
  }, [])

  const fetchMaterials = useCallback(async () => {
    setLoading(true)
    try {
      const params = new URLSearchParams()
      if (debouncedSearch) params.set('search', debouncedSearch)
      if (filterCategory) params.set('materialCategory', filterCategory)
      if (filterType) params.set('type', filterType)
      const res = await fetch(`/api/materials?${params}`)
      const data = await res.json()
      setMaterials(Array.isArray(data) ? data : [])
    } catch {
      setMaterials([])
    }
    setLoading(false)
  }, [debouncedSearch, filterCategory, filterType])

  useEffect(() => { fetchMaterials() }, [fetchMaterials])

  const patchMaterial = async (id: string, patch: Record<string, any>) => {
    try {
      const res = await fetch(`/api/materials/${id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(patch),
      })
      if (!res.ok) return
      const updated = await res.json()
      setMaterials((prev) => prev.map((m) => (m.id === id ? { ...m, ...updated } : m)))
    } catch { /* ignore */ }
  }

  const linkSupplierToMaterial = async (materialId: string, supplierId: string) => {
    try {
      const res = await fetch(`/api/materials/${materialId}/supplier`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ supplierId }),
      })
      if (!res.ok) return
      const result = await res.json()
      setMaterials((prev) =>
        prev.map((m) =>
          m.id === materialId
            ? {
                ...m,
                supplierMaterials: supplierId
                  ? [{ id: result.id || 'temp', supplier: suppliers.find((s) => s.id === supplierId) || { id: supplierId, name: '' } }]
                  : [],
              }
            : m
        )
      )
    } catch { /* ignore */ }
  }

  const deleteMaterial = async (id: string) => {
    const mat = materials.find((m) => m.id === id)
    if (!mat) return
    if (mat.sampleRefCount > 0 || mat._count.bomItems > 0) {
      alert(`Cannot delete: referenced by ${mat.sampleRefCount} sample(s).`)
      return
    }
    if (!confirm(`Delete "${mat.name}"?`)) return
    try {
      const res = await fetch(`/api/materials/${id}`, { method: 'DELETE' })
      if (!res.ok) {
        const data = await res.json().catch(() => ({}))
        alert(data.error || 'Failed to delete')
        return
      }
      setMaterials((prev) => prev.filter((m) => m.id !== id))
    } catch { /* ignore */ }
  }

  const addNew = async () => {
    try {
      const res = await fetch('/api/materials', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: '',
          materialCode: '',
          type: 'FABRIC',
          materialCategory: 'MAIN_FABRIC',
        }),
      })
      if (!res.ok) return
      const created = await res.json()
      setMaterials((prev) => [{ ...created, sampleRefCount: 0, supplierMaterials: [], _count: { bomItems: 0, supplierMaterials: 0, materialColors: 0 } }, ...prev])
    } catch { /* ignore */ }
  }

  return (
    <>
      <BpPageHeader
        title={t('title')}
        titleMeta={<span className="bp-page__subtitle">{materials.length} {tCommon('items')}</span>}
        actions={
          <button className="bp-button bp-button--primary" onClick={addNew}>
            <Plus style={{ width: 16, height: 16 }} />
            {t('newMaterial')}
          </button>
        }
      />

      <div className="bp-card samples-sheet">
        {/* Filters */}
        <div className="bp-toolbar">
          <div className="bp-toolbar__search">
            <Search className="bp-toolbar__search-icon" />
            <input
              className="bp-input"
              style={{ paddingLeft: 34 }}
              placeholder={t('searchPlaceholder')}
              value={search}
              onChange={(e) => setSearch(e.target.value)}
            />
          </div>
          <select className="bp-select" style={{ width: 140 }} value={filterCategory} onChange={(e) => setFilterCategory(e.target.value)}>
            <option value="">All Categories</option>
            {MATERIAL_CATEGORIES.map((c) => <option key={c.value} value={c.value}>{c.label}</option>)}
          </select>
          <select className="bp-select" style={{ width: 120 }} value={filterType} onChange={(e) => setFilterType(e.target.value)}>
            <option value="">All Types</option>
            {MATERIAL_TYPES.map((t) => <option key={t.value} value={t.value}>{t.label}</option>)}
          </select>
        </div>

        {/* Table */}
        {loading ? (
          <div className="bp-spinner-wrap">
            <div className="bp-spinner" />
          </div>
        ) : (
          <div className="bp-table-wrap">
            <table className="bp-table">
              <thead>
                <tr>
                  <th style={{ width: 120, paddingLeft: 12 }}>Material Code</th>
                  <th style={{ width: 190 }}>{t('name')}</th>
                  <th style={{ width: 120 }}>Category</th>
                  <th style={{ width: 95 }}>{t('type')}</th>
                  <th style={{ width: 150 }}>Supplier</th>
                  <th style={{ width: 160 }}>{t('composition')}</th>
                  <th style={{ width: 90 }}>{t('unitPrice')}</th>
                  <th style={{ width: 60 }}>Unit</th>
                  <th style={{ width: 80 }}>Weight</th>
                  <th style={{ width: 70 }}>Width</th>
                  <th style={{ width: 60 }}>Samples</th>
                  <th style={{ width: 40 }} />
                </tr>
              </thead>
              <tbody>
                {materials.length === 0 ? (
                  <tr><td colSpan={12} style={{ textAlign: 'center', padding: 40, color: 'var(--color-gray-400)' }}>{t('noMaterialsFound')}</td></tr>
                ) : materials.map((m) => {
                  const isReferenced = m.sampleRefCount > 0 || m._count.bomItems > 0
                  return (
                    <tr key={m.id}>
                      <td>
                        <input
                          className="bp-input"
                          style={{ paddingLeft: 12 }}
                          value={m.materialCode || ''}
                          onChange={(e) => setMaterials((prev) => prev.map((x) => (x.id === m.id ? { ...x, materialCode: e.target.value } : x)))}
                          onBlur={(e) => patchMaterial(m.id, { materialCode: e.target.value })}
                        />
                      </td>
                      <td>
                        <input
                          className="bp-input"
                          value={m.name}
                          onChange={(e) => setMaterials((prev) => prev.map((x) => (x.id === m.id ? { ...x, name: e.target.value } : x)))}
                          onBlur={(e) => patchMaterial(m.id, { name: e.target.value })}
                        />
                      </td>
                      <td>
                        <select
                          className="bp-select"
                          value={m.materialCategory || ''}
                          onChange={(e) => {
                            const val = e.target.value
                            setMaterials((prev) => prev.map((x) => (x.id === m.id ? { ...x, materialCategory: val } : x)))
                            patchMaterial(m.id, { materialCategory: val })
                          }}
                        >
                          <option value="">--</option>
                          {MATERIAL_CATEGORIES.map((c) => <option key={c.value} value={c.value}>{c.label}</option>)}
                        </select>
                      </td>
                      <td>
                        <select
                          className="bp-select"
                          value={m.type}
                          onChange={(e) => {
                            const val = e.target.value
                            setMaterials((prev) => prev.map((x) => (x.id === m.id ? { ...x, type: val } : x)))
                            patchMaterial(m.id, { type: val })
                          }}
                        >
                          {MATERIAL_TYPES.map((t) => <option key={t.value} value={t.value}>{t.label}</option>)}
                        </select>
                      </td>
                      <td>
                        <select
                          className="bp-select"
                          value={m.supplierMaterials?.[0]?.supplier?.id || ''}
                          onChange={(e) => {
                            const supplierId = e.target.value
                            linkSupplierToMaterial(m.id, supplierId)
                          }}
                        >
                          <option value="">--</option>
                          {suppliers.map((s) => <option key={s.id} value={s.id}>{s.name}</option>)}
                        </select>
                      </td>
                      <td>
                        <input
                          className="bp-input"
                          value={m.composition || ''}
                          onChange={(e) => setMaterials((prev) => prev.map((x) => (x.id === m.id ? { ...x, composition: e.target.value } : x)))}
                          onBlur={(e) => patchMaterial(m.id, { composition: e.target.value })}
                        />
                      </td>
                      <td>
                        <input
                          className="bp-input"
                          type="number"
                          value={m.unitPrice != null ? m.unitPrice : ''}
                          onChange={(e) => setMaterials((prev) => prev.map((x) => (x.id === m.id ? { ...x, unitPrice: e.target.value === '' ? null : Number(e.target.value) } : x)))}
                          onBlur={(e) => patchMaterial(m.id, { unitPrice: e.target.value })}
                        />
                      </td>
                      <td>
                        <input
                          className="bp-input"
                          value={m.unit || ''}
                          style={{ width: '100%' }}
                          onChange={(e) => setMaterials((prev) => prev.map((x) => (x.id === m.id ? { ...x, unit: e.target.value } : x)))}
                          onBlur={(e) => patchMaterial(m.id, { unit: e.target.value })}
                        />
                      </td>
                      <td>
                        <input
                          className="bp-input"
                          value={m.weight || ''}
                          onChange={(e) => setMaterials((prev) => prev.map((x) => (x.id === m.id ? { ...x, weight: e.target.value } : x)))}
                          onBlur={(e) => patchMaterial(m.id, { weight: e.target.value })}
                        />
                      </td>
                      <td>
                        <input
                          className="bp-input"
                          value={m.width || ''}
                          onChange={(e) => setMaterials((prev) => prev.map((x) => (x.id === m.id ? { ...x, width: e.target.value } : x)))}
                          onBlur={(e) => patchMaterial(m.id, { width: e.target.value })}
                        />
                      </td>
                      <td style={{ textAlign: 'center', fontSize: 'var(--font-size-sm)', padding: '0 6px' }}>
                        {m.sampleRefCount > 0 ? (
                          <span style={{ color: 'var(--color-primary)', fontWeight: 600 }}>{m.sampleRefCount}</span>
                        ) : (
                          <span style={{ color: 'var(--color-gray-300)' }}>0</span>
                        )}
                      </td>
                      <td style={{ textAlign: 'center', padding: '0 4px' }}>
                        <button
                          className="bp-button--icon-only"
                          onClick={() => deleteMaterial(m.id)}
                          disabled={isReferenced}
                          title={isReferenced ? 'Referenced by samples' : 'Delete'}
                          style={{ opacity: isReferenced ? 0.3 : 1, cursor: isReferenced ? 'not-allowed' : 'pointer' }}
                        >
                          <Trash2 style={{ width: 15, height: 15 }} />
                        </button>
                      </td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </>
  )
}
