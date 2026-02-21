'use client'

import { useEffect, useState, useCallback, useRef, useMemo } from 'react'
import { Plus, Search, Trash2, ImagePlus, Paperclip, FileText, FlaskConical } from 'lucide-react'
import { useTranslations } from 'next-intl'
import { useDebounce } from '@/hooks/useDebounce'
import { BpPageHeader } from '@/components/common'
import { useYearFilter } from '@/contexts/YearFilterContext'

const PAGE_SIZE = 50

const MATERIAL_CATEGORIES = [
  { value: 'MAIN_FABRIC', code: 1, label: 'Main' },
  { value: 'SUB_FABRIC', code: 2, label: 'Sub' },
  { value: 'TRIM', code: 3, label: 'Trim' },
] as const

const TRIM_TYPES = [
  { value: 'BUTTON', label: 'Button' },
  { value: 'ZIPPER', label: 'Zipper' },
  { value: 'WAPPEN', label: 'Wappen' },
  { value: 'YARN', label: 'Yarn' },
  { value: 'HANG_TAG', label: 'Hang Tag' },
  { value: 'PACKING', label: 'Packing' },
] as const

const COUNTRIES = [
  'Afghanistan', 'Albania', 'Algeria', 'Andorra', 'Angola', 'Antigua and Barbuda', 'Argentina', 'Armenia', 'Australia', 'Austria',
  'Azerbaijan', 'Bahamas', 'Bahrain', 'Bangladesh', 'Barbados', 'Belarus', 'Belgium', 'Belize', 'Benin', 'Bhutan',
  'Bolivia', 'Bosnia and Herzegovina', 'Botswana', 'Brazil', 'Brunei Darussalam', 'Bulgaria', 'Burkina Faso', 'Burundi',
  'Cambodia', 'Cameroon', 'Canada', 'Central African Republic', 'Chad', 'Chile', 'China', 'Colombia', 'Comoros', 'Congo',
  'Costa Rica', 'Croatia', 'Cuba', 'Cyprus', 'Czechia', 'Denmark', 'Djibouti', 'Dominica', 'Dominican Republic', 'Ecuador',
  'Egypt', 'El Salvador', 'Equatorial Guinea', 'Eritrea', 'Estonia', 'Eswatini', 'Ethiopia', 'Fiji', 'Finland', 'France',
  'Gabon', 'Gambia', 'Georgia', 'Germany', 'Ghana', 'Greece', 'Grenada', 'Guatemala', 'Guinea', 'Guinea-Bissau', 'Guyana',
  'Haiti', 'Honduras', 'Hungary', 'Iceland', 'India', 'Indonesia', 'Iran', 'Iraq', 'Ireland', 'Israel', 'Italy', 'Jamaica',
  'Japan', 'Jordan', 'Kazakhstan', 'Kenya', 'Kiribati', 'Korea, North', 'Korea, South', 'Kuwait', 'Kyrgyzstan', 'Laos',
  'Latvia', 'Lebanon', 'Lesotho', 'Liberia', 'Libya', 'Liechtenstein', 'Lithuania', 'Luxembourg', 'Madagascar', 'Malawi',
  'Malaysia', 'Maldives', 'Mali', 'Malta', 'Mauritania', 'Mauritius', 'Mexico', 'Micronesia', 'Moldova', 'Monaco',
  'Mongolia', 'Montenegro', 'Morocco', 'Mozambique', 'Myanmar', 'Namibia', 'Nauru', 'Nepal', 'Netherlands', 'New Zealand',
  'Nicaragua', 'Niger', 'Nigeria', 'North Macedonia', 'Norway', 'Oman', 'Pakistan', 'Palau', 'Palestine', 'Panama',
  'Papua New Guinea', 'Paraguay', 'Peru', 'Philippines', 'Poland', 'Portugal', 'Qatar', 'Romania', 'Russia', 'Rwanda',
  'Saint Kitts and Nevis', 'Saint Lucia', 'Saint Vincent and the Grenadines', 'Samoa', 'San Marino', 'Sao Tome and Principe',
  'Saudi Arabia', 'Senegal', 'Serbia', 'Seychelles', 'Sierra Leone', 'Singapore', 'Slovakia', 'Slovenia', 'Solomon Islands',
  'Somalia', 'South Africa', 'South Sudan', 'Spain', 'Sri Lanka', 'Sudan', 'Suriname', 'Sweden', 'Switzerland', 'Syria',
  'Taiwan', 'Tajikistan', 'Tanzania', 'Thailand', 'Timor-Leste', 'Togo', 'Tonga', 'Trinidad and Tobago', 'Tunisia', 'Turkey',
  'Turkmenistan', 'Tuvalu', 'Uganda', 'Ukraine', 'United Arab Emirates', 'United Kingdom', 'United States', 'Uruguay',
  'Uzbekistan', 'Vanuatu', 'Vatican City', 'Venezuela', 'Vietnam', 'Yemen', 'Zambia', 'Zimbabwe'
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
  imageUrl: string | null
  originCountry: string | null
  docs: Array<{ name: string; url: string }> | null
  sampleRefCount: number
  supplierMaterials: SupplierRef[]
  _count: { bomItems: number; supplierMaterials: number; materialColors: number }
}

function ImageCell({ material, onUpload }: { material: Material; onUpload: (id: string, dataUrl: string | null) => void }) {
  const fileInputRef = useRef<HTMLInputElement>(null)

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return
    const reader = new FileReader()
    reader.onload = (ev) => { onUpload(material.id, ev.target?.result as string) }
    reader.readAsDataURL(file)
    e.target.value = ''
  }

  return (
    <div
      style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer' }}
      onClick={() => fileInputRef.current?.click()}
      title="Click to upload image"
    >
      <input ref={fileInputRef} type="file" accept="image/*" style={{ display: 'none' }} onChange={handleFileChange} />
      {material.imageUrl ? (
        <img
          src={material.imageUrl}
          alt={material.name}
          style={{ width: 90, height: 90, objectFit: 'cover', borderRadius: 'var(--radius-md)', border: '1px solid var(--color-border)' }}
        />
      ) : (
        <div style={{ width: 90, height: 90, borderRadius: 'var(--radius-md)', border: '1px dashed var(--color-border)', display: 'grid', placeItems: 'center', color: 'var(--color-gray-400)' }}>
          <ImagePlus style={{ width: 24, height: 24 }} />
        </div>
      )}
    </div>
  )
}

function DocCell({ material, onUpload }: { material: Material; onUpload: (id: string, file: { name: string, url: string }) => void }) {
  const fileInputRef = useRef<HTMLInputElement>(null)
  const hasDocs = Array.isArray(material.docs) && material.docs.length > 0

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return
    const reader = new FileReader()
    reader.onload = (ev) => {
      onUpload(material.id, { name: file.name, url: ev.target?.result as string })
    }
    reader.readAsDataURL(file)
    fileInputRef.current && (fileInputRef.current.value = '')
  }

  return (
    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
      <input ref={fileInputRef} type="file" style={{ display: 'none' }} onChange={handleFileChange} />
      <button
        className="bp-button--icon-only"
        onClick={(e) => { e.stopPropagation(); fileInputRef.current?.click(); }}
        title={hasDocs ? `${material.docs?.length} documents attached` : 'Attach Document'}
        style={{ color: 'var(--color-gray-400)' }}
      >
        {hasDocs ? (
          <FileText style={{ width: 14, height: 14, color: 'var(--color-primary)' }} />
        ) : (
          <Paperclip style={{ width: 14, height: 14 }} />
        )}
      </button>
    </div>
  )
}

export default function MaterialsPage() {
  const t = useTranslations('materials')
  const tCommon = useTranslations('common')
  const { selectedYear, selectedSeason, availableSeasons } = useYearFilter()

  const [materials, setMaterials] = useState<Material[]>([])
  const [suppliers, setSuppliers] = useState<Array<{ id: string; name: string }>>([])
  const [search, setSearch] = useState('')
  const [filterCategory, setFilterCategory] = useState('')
  const [loading, setLoading] = useState(true)

  const debouncedSearch = useDebounce(search)

  // Infinite scroll
  const [visibleCount, setVisibleCount] = useState(PAGE_SIZE)
  const visibleCountRef = useRef(PAGE_SIZE)
  const sentinelRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    fetch('/api/suppliers').then((r) => r.json()).then((d) => setSuppliers(Array.isArray(d) ? d : []))
  }, [])

  const fetchMaterials = useCallback(async () => {
    setLoading(true)
    try {
      const params = new URLSearchParams()
      if (debouncedSearch) params.set('search', debouncedSearch)
      if (filterCategory) params.set('materialCategory', filterCategory)
      const res = await fetch(`/api/materials?${params}`)
      const data = await res.json()
      setMaterials(Array.isArray(data) ? data : [])
    } catch {
      setMaterials([])
    }
    setLoading(false)
  }, [debouncedSearch, filterCategory])

  useEffect(() => { fetchMaterials() }, [fetchMaterials])

  // infinite scroll logic
  useEffect(() => {
    setVisibleCount(PAGE_SIZE)
  }, [materials])

  useEffect(() => {
    visibleCountRef.current = visibleCount
  }, [visibleCount])

  useEffect(() => {
    const sentinel = sentinelRef.current
    if (!sentinel) return
    const observer = new IntersectionObserver((entries) => {
      if (entries[0].isIntersecting && visibleCountRef.current < materials.length) {
        setVisibleCount((prev) => Math.min(prev + PAGE_SIZE, materials.length))
      }
    })
    observer.observe(sentinel)
    return () => observer.disconnect()
  }, [materials.length])

  const visibleData = useMemo(() => materials.slice(0, visibleCount), [materials, visibleCount])

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

  const handleImageUpload = async (id: string, dataUrl: string | null) => {
    setMaterials((prev) => prev.map((m) => (m.id === id ? { ...m, imageUrl: dataUrl } : m)))
    await patchMaterial(id, { imageUrl: dataUrl })
  }

  const handleDocUpload = async (id: string, file: { name: string, url: string }) => {
    setMaterials((prev) => prev.map((m) => {
      if (m.id === id) {
        const nextDocs = Array.isArray(m.docs) ? [...m.docs, file] : [file]
        patchMaterial(id, { docs: nextDocs })
        return { ...m, docs: nextDocs }
      }
      return m
    }))
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
            ? { ...m, supplierMaterials: supplierId ? [{ id: result.id || 'temp', supplier: suppliers.find((s) => s.id === supplierId) || { id: supplierId, name: '' } }] : [] }
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
      if (!res.ok) { const d = await res.json().catch(() => ({})); alert(d.error || 'Failed to delete'); return }
      setMaterials((prev) => prev.filter((m) => m.id !== id))
    } catch { /* ignore */ }
  }

  const addNew = async () => {
    try {
      const res = await fetch('/api/materials', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name: '', materialCode: '', type: 'FABRIC', materialCategory: 'MAIN_FABRIC' }),
      })
      if (!res.ok) return
      const created = await res.json()
      setMaterials((prev) => [{ ...created, sampleRefCount: 0, supplierMaterials: [], _count: { bomItems: 0, supplierMaterials: 0, materialColors: 0 } }, ...prev])
    } catch { /* ignore */ }
  }

  return (
    <>
      <div style={{ position: 'sticky', top: 48, zIndex: 20, background: 'var(--color-bg)' }}>
        <BpPageHeader
          title={t('title')}
          titleMeta={<span className="bp-page__subtitle">({materials.length} {tCommon('items')})</span>}
          actions={
            <button className="bp-button bp-button--primary" onClick={addNew}>
              <Plus style={{ width: 16, height: 16 }} />
              {t('newMaterial')}
            </button>
          }
        />
        <div style={{ background: 'var(--color-surface, #fff)', borderBottom: '1px solid var(--color-border)' }}>
          {/* Season stats banner */}
          {(selectedYear !== null || selectedSeason !== null) && (
            <div style={{ display: 'flex', alignItems: 'center', gap: 16, padding: '6px 16px', borderBottom: '1px solid var(--color-border)', background: 'var(--color-gray-50)', flexWrap: 'wrap' }}>
              <span style={{ fontSize: 'var(--font-size-sm)', color: 'var(--color-text-secondary)' }}>
                {[selectedYear, availableSeasons.find((s) => s.code === selectedSeason)?.label].filter(Boolean).join(' ')}
              </span>
              <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                <FlaskConical style={{ width: 14, height: 14, color: 'var(--color-primary)' }} />
                <span style={{ fontSize: 'var(--font-size-sm)', fontWeight: 600 }}>{materials.length}</span>
                <span style={{ fontSize: 'var(--font-size-xs)', color: 'var(--color-text-secondary)' }}>materials</span>
              </div>
            </div>
          )}

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
            <select className="bp-select" style={{ width: 160 }} value={filterCategory} onChange={(e) => setFilterCategory(e.target.value)}>
              <option value="">All Categories</option>
              {MATERIAL_CATEGORIES.map((c) => (
                <option key={c.value} value={c.value}>{c.code} - {c.label}</option>
              ))}
            </select>
          </div>
        </div>
      </div>

      <div className="bp-card samples-sheet">
        {loading ? (
          <div className="bp-spinner-wrap"><div className="bp-spinner" /></div>
        ) : (
          <div className="bp-table-wrap">
            <table className="bp-table">
              <thead>
                <tr>
                  <th style={{ width: 110, paddingLeft: 12 }}>Material Code</th>
                  <th style={{ width: 190 }}>{t('name')}</th>
                  <th style={{ width: 80 }}>Category Name</th>
                  <th style={{ width: 110 }}>{t('type')}</th>
                  <th style={{ width: 108 }}>Image</th>
                  <th style={{ width: 150 }}>Supplier</th>
                  <th style={{ width: 160 }}>{t('composition')}</th>
                  <th style={{ width: 90 }}>{t('unitPrice')}</th>
                  <th style={{ width: 60 }}>Unit</th>
                  <th style={{ width: 80 }}>Weight</th>
                  <th style={{ width: 70 }}>Width</th>
                  <th style={{ width: 120 }}>Origin Country</th>
                  <th style={{ width: 60 }}>Docs</th>
                  <th style={{ width: 60 }}>Samples</th>
                  <th style={{ width: 40 }} />
                </tr>
              </thead>
              <tbody>
                {visibleData.length === 0 ? (
                  <tr><td colSpan={15} style={{ textAlign: 'center', padding: 40, color: 'var(--color-gray-400)' }}>{t('noMaterialsFound')}</td></tr>
                ) : visibleData.map((m) => {
                  const isReferenced = m.sampleRefCount > 0 || m._count.bomItems > 0
                  const isFabricCat = m.materialCategory === 'MAIN_FABRIC' || m.materialCategory === 'SUB_FABRIC'
                  return (
                    <tr key={m.id}>
                      {/* Material Code */}
                      <td>
                        <div style={{ paddingLeft: 12, fontFamily: 'monospace', fontSize: 'var(--font-size-xs)', color: 'var(--color-text-secondary)' }}>
                          {m.materialCode || '-'}
                        </div>
                      </td>
                      {/* Name */}
                      <td>
                        <input
                          className="bp-input"
                          value={m.name}
                          onChange={(e) => setMaterials((prev) => prev.map((x) => (x.id === m.id ? { ...x, name: e.target.value } : x)))}
                          onBlur={(e) => patchMaterial(m.id, { name: e.target.value })}
                        />
                      </td>
                      {/* Category Name */}
                      <td>
                        <select
                          className="bp-select"
                          value={m.materialCategory === 'SUB_MATERIAL' ? 'TRIM' : (m.materialCategory || '')}
                          onChange={(e) => {
                            const val = e.target.value
                            setMaterials((prev) => prev.map((x) => (x.id === m.id ? { ...x, materialCategory: val } : x)))
                            patchMaterial(m.id, { materialCategory: val })
                          }}
                        >
                          <option value="">--</option>
                          {MATERIAL_CATEGORIES.map((c) => (
                            <option key={c.value} value={c.value}>{c.label}</option>
                          ))}
                        </select>
                      </td>
                      {/* Type */}
                      <td>
                        {isFabricCat ? (
                          <span style={{ fontSize: 'var(--font-size-sm)', color: 'var(--color-text-secondary)', paddingLeft: 8 }}>Fabric</span>
                        ) : (
                          <select
                            className="bp-select"
                            value={m.type}
                            onChange={(e) => {
                              const val = e.target.value
                              setMaterials((prev) => prev.map((x) => (x.id === m.id ? { ...x, type: val } : x)))
                              patchMaterial(m.id, { type: val })
                            }}
                          >
                            <option value="">--</option>
                            {TRIM_TYPES.map((tt) => <option key={tt.value} value={tt.value}>{tt.label}</option>)}
                          </select>
                        )}
                      </td>
                      {/* Image */}
                      <td style={{ padding: '4px 6px' }}>
                        <ImageCell material={m} onUpload={handleImageUpload} />
                      </td>
                      {/* Supplier */}
                      <td>
                        <select
                          className="bp-select"
                          value={m.supplierMaterials?.[0]?.supplier?.id || ''}
                          onChange={(e) => linkSupplierToMaterial(m.id, e.target.value)}
                        >
                          <option value="">--</option>
                          {suppliers.map((s) => <option key={s.id} value={s.id}>{s.name}</option>)}
                        </select>
                      </td>
                      {/* Composition */}
                      <td>
                        <input
                          className="bp-input"
                          value={m.composition || ''}
                          onChange={(e) => setMaterials((prev) => prev.map((x) => (x.id === m.id ? { ...x, composition: e.target.value } : x)))}
                          onBlur={(e) => patchMaterial(m.id, { composition: e.target.value })}
                        />
                      </td>
                      {/* Unit Price */}
                      <td>
                        <input
                          className="bp-input"
                          type="number"
                          value={m.unitPrice != null ? m.unitPrice : ''}
                          onChange={(e) => setMaterials((prev) => prev.map((x) => (x.id === m.id ? { ...x, unitPrice: e.target.value === '' ? null : Number(e.target.value) } : x)))}
                          onBlur={(e) => patchMaterial(m.id, { unitPrice: e.target.value })}
                        />
                      </td>
                      {/* Unit */}
                      <td>
                        <select
                          className="bp-select"
                          value={m.unit || ''}
                          onChange={(e) => {
                            const val = e.target.value
                            setMaterials((prev) => prev.map((x) => (x.id === m.id ? { ...x, unit: val } : x)))
                            patchMaterial(m.id, { unit: val })
                          }}
                        >
                          <option value="">--</option>
                          <option value="m">m</option>
                          <option value="yd">yd</option>
                          <option value="kg">kg</option>
                          <option value="pcs">pcs</option>
                          <option value="set">set</option>
                          <option value="dz">dz</option>
                        </select>
                      </td>
                      {/* Weight */}
                      <td>
                        <input
                          className="bp-input"
                          value={m.weight || ''}
                          onChange={(e) => setMaterials((prev) => prev.map((x) => (x.id === m.id ? { ...x, weight: e.target.value } : x)))}
                          onBlur={(e) => patchMaterial(m.id, { weight: e.target.value })}
                        />
                      </td>
                      {/* Width */}
                      <td>
                        <input
                          className="bp-input"
                          value={m.width || ''}
                          onChange={(e) => setMaterials((prev) => prev.map((x) => (x.id === m.id ? { ...x, width: e.target.value } : x)))}
                          onBlur={(e) => patchMaterial(m.id, { width: e.target.value })}
                        />
                      </td>
                      {/* Origin Country */}
                      <td>
                        <input
                          className="bp-input"
                          list="countries-list"
                          value={m.originCountry || ''}
                          onChange={(e) => setMaterials((prev) => prev.map((x) => (x.id === m.id ? { ...x, originCountry: e.target.value } : x)))}
                          onBlur={(e) => patchMaterial(m.id, { originCountry: e.target.value })}
                        />
                      </td>
                      {/* Docs */}
                      <td>
                        <DocCell material={m} onUpload={handleDocUpload} />
                      </td>
                      {/* Sample refs */}
                      <td style={{ textAlign: 'center', fontSize: 'var(--font-size-sm)', padding: '0 6px' }}>
                        {m.sampleRefCount > 0 ? (
                          <span style={{ color: 'var(--color-primary)', fontWeight: 600 }}>{m.sampleRefCount}</span>
                        ) : (
                          <span style={{ color: 'var(--color-gray-300)' }}>0</span>
                        )}
                      </td>
                      {/* Delete */}
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
        <div ref={sentinelRef} style={{ height: 1 }} />
      </div>

      <datalist id="countries-list">
        {COUNTRIES.map(c => <option key={c} value={c} />)}
      </datalist>
    </>
  )
}
