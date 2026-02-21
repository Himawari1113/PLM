'use client'

import { useEffect, useState, useMemo, useCallback, useRef } from 'react'
import { Link } from '@/lib/navigation'
import { SAMPLE_TYPE_LABELS } from '@/lib/constants'
import { Plus, Search, FlaskConical, LayoutGrid, List } from 'lucide-react'
import { useTranslations } from 'next-intl'
import { useDebounce } from '@/hooks/useDebounce'
import { usePagination } from '@/hooks/usePagination'
import { useSort } from '@/hooks/useSort'
import { BpTable, BpPagination, BpPageHeader } from '@/components/common'
import type { BpColumn } from '@/components/common'
import { useYearFilter } from '@/contexts/YearFilterContext'

interface SampleListItem {
  id: string
  sampleName: string
  sampleNumber: string
  imageUrl?: string | null
  year?: number | null
  season?: { seasonName?: string | null } | null
  sampleType: string
  status: string
  mainFactoryCode: string | null
  dueDate: string | null
  division?: string | null
  subCategory?: string | null
  colorCount?: number
  colors?: Array<{ colorCode: string; colorName: string; colorImage?: string | null }>
  supplierName?: string | null
  sizes?: string[]
  product: { id: string; styleNumber: string; name: string }
  costs: { fobPrice: string | null; materialCost?: string | null; processingCost?: string | null; trimCost?: string | null; currency: string }[]
  updatedAt: string
  __draft?: boolean
}

interface ProductOption {
  id: string
  styleNumber: string
  name: string
  category?: string | null
  division?: { name?: string | null } | null
  collection?: { season?: { year?: number | null; term?: string | null } | null } | null
}

interface StyleNoComboboxProps {
  row: SampleListItem
  products: ProductOption[]
  onSelect: (product: ProductOption) => void
}

function StyleNoCombobox({ row, products, onSelect }: StyleNoComboboxProps) {
  const [query, setQuery] = useState(row.product?.styleNumber || '')
  const [open, setOpen] = useState(false)

  // Sync display when the row's product changes externally
  useEffect(() => {
    setQuery(row.product?.styleNumber || '')
  }, [row.product?.styleNumber])

  const options = useMemo(() => {
    const q = query.trim().toLowerCase()
    if (q) {
      // When typing: search across all products by styleNumber / name
      return products
        .filter((p) => `${p.styleNumber} ${p.name}`.toLowerCase().includes(q))
        .slice(0, 30)
    }
    // When focused with no query: show products matching row's Year/Season/Division/SubCategory
    const division = row.division || ''
    const subCategory = row.subCategory || ''
    const year = row.year
    const term = row.season?.seasonName || ''
    return products
      .filter((p) => {
        const pDivision = p.division?.name || ''
        const pCategory = p.category || ''
        const pYear = p.collection?.season?.year
        const pTerm = (p.collection?.season as any)?.seasonName ?? p.collection?.season?.term ?? ''
        const matchDivision = !division || pDivision === division
        const matchCategory = !subCategory || pCategory === subCategory
        const matchYear = !year || pYear === year
        const matchTerm = !term || pTerm === term
        return matchDivision && matchCategory && matchYear && matchTerm
      })
      .slice(0, 30)
  }, [row.division, row.subCategory, row.year, row.season?.seasonName, query, products])

  return (
    <div style={{ position: 'relative' }}>
      <input
        className="bp-input"
        value={query}
        placeholder="--"
        style={{ width: '100%' }}
        onChange={(e) => { setQuery(e.target.value); setOpen(true) }}
        onFocus={() => setOpen(true)}
        onBlur={() => setTimeout(() => setOpen(false), 150)}
      />
      {open && options.length > 0 && (
        <div style={{
          position: 'absolute',
          top: '100%',
          left: 0,
          zIndex: 300,
          background: '#fff',
          border: '1px solid var(--color-border)',
          borderRadius: 4,
          boxShadow: '0 4px 16px rgba(0,0,0,0.15)',
          maxHeight: 240,
          overflowY: 'auto',
          minWidth: 220,
        }}>
          {options.map((p) => (
            <div
              key={p.id}
              onMouseDown={() => {
                setQuery(p.styleNumber)
                setOpen(false)
                onSelect(p)
              }}
              style={{ padding: '6px 10px', cursor: 'pointer', borderBottom: '1px solid var(--color-gray-100)' }}
              onMouseEnter={(e) => { e.currentTarget.style.background = 'var(--color-gray-50)' }}
              onMouseLeave={(e) => { e.currentTarget.style.background = '#fff' }}
            >
              <div style={{ fontWeight: 600, fontSize: 'var(--font-size-sm)' }}>{p.styleNumber}</div>
              <div style={{ fontSize: 'var(--font-size-xs)', color: 'var(--color-gray-500)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{p.name}</div>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}

export default function GlobalSamplesPage() {
  const t = useTranslations('samples')
  const tCommon = useTranslations('common')
  const tConstants = useTranslations('constants')

  const { selectedYear, selectedSeason } = useYearFilter()
  const [samples, setSamples] = useState<SampleListItem[]>([])
  const [search, setSearch] = useState('')
  const [statusFilter, setStatusFilter] = useState('')
  const [typeFilter, setTypeFilter] = useState('')
  const [loading, setLoading] = useState(true)
  const [draftRow, setDraftRow] = useState<SampleListItem | null>(null)
  const [creatingDraft, setCreatingDraft] = useState(false)
  const [products, setProducts] = useState<ProductOption[]>([])
  const [viewMode, setViewMode] = useState<'list' | 'grid'>(() => {
    if (typeof window !== 'undefined') {
      const saved = sessionStorage.getItem('samples-view-mode')
      if (saved === 'list' || saved === 'grid') return saved
    }
    return 'list'
  })

  const [gridVisibleCount, setGridVisibleCount] = useState(50)
  const gridSentinelRef = useRef<HTMLDivElement>(null)
  const gridVisibleCountRef = useRef(50)

  const debouncedSearch = useDebounce(search)

  const fetchSamples = useCallback(() => {
    const params = new URLSearchParams()
    if (selectedYear !== null) params.set('year', String(selectedYear))
    if (selectedSeason !== null) params.set('season', String(selectedSeason))
    fetch(`/api/samples?${params.toString()}`)
      .then((r) => r.json())
      .then((data) => {
        setSamples(Array.isArray(data) ? data : [])
        setLoading(false)
      })
  }, [selectedYear, selectedSeason])

  useEffect(() => {
    setLoading(true)
    fetchSamples()
    const productParams = new URLSearchParams()
    if (selectedYear !== null) productParams.set('year', String(selectedYear))
    if (selectedSeason !== null) productParams.set('season', String(selectedSeason))
    fetch(`/api/products?${productParams.toString()}`).then((r) => r.json()).then((data) => setProducts(Array.isArray(data) ? data : []))
  }, [selectedYear, selectedSeason])

  const filtered = useMemo(() => {
    return samples.filter((s) => {
      const q = debouncedSearch.toLowerCase()
      const matchSearch =
        !q ||
        s.sampleName.toLowerCase().includes(q) ||
        s.sampleNumber.toLowerCase().includes(q) ||
        s.product.styleNumber.toLowerCase().includes(q) ||
        s.product.name.toLowerCase().includes(q)
      const matchStatus = !statusFilter || s.status === statusFilter
      const matchType = !typeFilter || s.sampleType === typeFilter
      return matchSearch && matchStatus && matchType
    })
  }, [samples, debouncedSearch, statusFilter, typeFilter])

  const { sortedData, sortKey, sortDir, toggleSort, resetSort } = useSort(filtered, 'year', 'asc')
  const { paginatedData, currentPage, totalPages, pageSize, goToPage } = usePagination(sortedData)

  // Reset infinite scroll count when filter results change
  useEffect(() => {
    setGridVisibleCount(50)
  }, [filtered])

  // Keep ref in sync with state (avoids stale closure in observer callback)
  useEffect(() => {
    gridVisibleCountRef.current = gridVisibleCount
  }, [gridVisibleCount])

  // IntersectionObserver for grid infinite scroll
  useEffect(() => {
    if (viewMode !== 'grid') return
    const sentinel = gridSentinelRef.current
    if (!sentinel) return
    const observer = new IntersectionObserver((entries) => {
      if (entries[0].isIntersecting && gridVisibleCountRef.current < sortedData.length) {
        setGridVisibleCount((prev) => Math.min(prev + 50, sortedData.length))
      }
    })
    observer.observe(sentinel)
    return () => observer.disconnect()
  }, [viewMode, sortedData.length])

  const patchSample = async (id: string, patch: Record<string, any>) => {
    // Optimistically update UI
    setSamples((prev) => prev.map((x) => (x.id === id ? { ...x, ...patch } : x)))

    const res = await fetch(`/api/samples/${id}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(patch),
    })

    if (!res.ok) {
      // Revert on error
      fetchSamples()
      return
    }

    // Don't update state again to avoid re-sorting during inline edits
    // The current state already has the updated values
  }

  // Register draft when all 4 fields are filled — called explicitly from onChange handlers
  const tryRegisterDraft = useCallback(async (draft: SampleListItem) => {
    const year = Number(draft.year)
    const seasonTerm = draft.season?.seasonName
    const draftDivision = draft.division
    const draftSubCategory = draft.subCategory
    if (!Number.isFinite(year) || !seasonTerm || !draftDivision || !draftSubCategory) return
    if (creatingDraft) return

    setCreatingDraft(true)
    try {
      const payload = {
        productId: '',
        newSampleData: {
          sampleInfo: {
            year,
            seasonTerm,
            sampleNameEn: draft.sampleName || '',
            sampleType: draft.sampleType || 'PROTO',
            statusUi: 'REGISTERED',
            division: draftDivision,
            subCategory: draftSubCategory,
            productOverride: '',
          },
          specInfo: { colors: [], sizeInfo: '', sizeMeasurements: [] },
          productionInfo: { supplierId: '', supplierName: '', mainFactoryCode: draft.mainFactoryCode || '', originCountry: '' },
          materials: { mainFabric: {}, subFabrics: [], subMaterials: [] },
          others: { remark: '' },
        },
      }

      const res = await fetch('/api/samples', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      })

      if (res.ok) {
        setDraftRow(null)
        fetchSamples()
      }
    } finally {
      setCreatingDraft(false)
    }
  }, [creatingDraft, fetchSamples])

  const tableData = useMemo(
    () => (draftRow ? [draftRow, ...paginatedData] : paginatedData),
    [draftRow, paginatedData],
  )

  const divisionOptions = useMemo(
    () => Array.from(new Set(products.map((p) => p.division?.name).filter(Boolean) as string[])).sort(),
    [products],
  )

  const subCategoryOptionsByDivision = useMemo(() => {
    const map = new Map<string, string[]>()
    for (const p of products) {
      const division = p.division?.name || ''
      const category = p.category || ''
      if (!division || !category) continue
      const prev = map.get(division) || []
      if (!prev.includes(category)) prev.push(category)
      map.set(division, prev)
    }
    return map
  }, [products])


  const columns: BpColumn<SampleListItem>[] = useMemo(() => [
    {
      key: 'year',
      label: t('year'),
      width: '68px',
      render: (s) => {
        const isLocked = !s.__draft && !!s.sampleNumber
        if (isLocked) {
          return <span style={{ paddingLeft: 12, paddingRight: 4, fontSize: 'calc(var(--font-size-sm))' }}>{s.year ?? '-'}</span>
        }
        const now = new Date().getFullYear()
        const yearOptions = [now - 2, now - 1, now, now + 1, now + 2]
        return (
          <select
            className="bp-select"
            value={s.year ?? ''}
            onChange={(e) => {
              const value = e.target.value ? Number(e.target.value) : null
              if (s.__draft) {
                const next = { ...s, year: value }
                setDraftRow(next)
                tryRegisterDraft(next)
              } else {
                patchSample(s.id, { year: value })
              }
            }}
          >
            <option value="">--</option>
            {yearOptions.map((y) => (
              <option key={y} value={y}>{y}</option>
            ))}
          </select>
        )
      },
    },
    {
      key: 'season',
      label: 'Ssn',
      width: '36px',
      render: (s) => {
        const isLocked = !s.__draft && !!s.sampleNumber
        if (isLocked) {
          return <span style={{ padding: '0 6px', fontSize: 'calc(var(--font-size-sm))' }}>{s.season?.seasonName || '-'}</span>
        }
        return (
          <select
            className="bp-select"
            value={s.season?.seasonName || ''}
            onChange={(e) => {
              const seasonName = e.target.value
              if (s.__draft) {
                const next = { ...s, season: { ...(s.season || {}), seasonName } }
                setDraftRow(next)
                tryRegisterDraft(next)
              } else {
                patchSample(s.id, { seasonTerm: seasonName })
              }
            }}
          >
            <option value="">--</option>
            <option value="SS">SS</option>
            <option value="FW">FW</option>
          </select>
        )
      },
    },
    {
      key: 'division',
      label: t('division'),
      width: '80px',
      render: (s) => {
        const isLocked = !s.__draft && !!s.sampleNumber
        if (isLocked) {
          return <span style={{ padding: '0 6px', whiteSpace: 'nowrap', fontSize: 'calc(var(--font-size-sm))' }}>{s.division || '-'}</span>
        }
        return (
          <select
            className="bp-select"
            value={s.division || ''}
            onChange={(e) => {
              const value = e.target.value
              if (s.__draft) {
                // Division変更時はSubCategoryリセット → 4項目揃わないので登録は発火しない
                const next = { ...s, division: value, subCategory: '', product: { ...s.product, id: '', styleNumber: '', name: '' } }
                setDraftRow(next)
              } else {
                patchSample(s.id, { division: value, subCategory: '' })
              }
            }}
          >
            <option value="">--</option>
            {divisionOptions.map((d) => (
              <option key={d} value={d}>{d}</option>
            ))}
          </select>
        )
      },
    },
    {
      key: 'subCategory',
      label: t('subCategory'),
      width: '110px',
      render: (s) => {
        const isLocked = !s.__draft && !!s.sampleNumber
        if (isLocked) {
          return <span style={{ padding: '0 6px', whiteSpace: 'nowrap', fontSize: 'calc(var(--font-size-sm))' }}>{s.subCategory || '-'}</span>
        }
        return (
          <select
            className="bp-select"
            value={s.subCategory || ''}
            onChange={(e) => {
              const value = e.target.value
              if (s.__draft) {
                const next = { ...s, subCategory: value, product: { ...s.product, id: '', styleNumber: '', name: '' } }
                setDraftRow(next)
                tryRegisterDraft(next)
              } else {
                patchSample(s.id, { subCategory: value })
              }
            }}
          >
            <option value="">--</option>
            {((s.division ? subCategoryOptionsByDivision.get(s.division) : []) || []).map((c) => (
              <option key={c} value={c}>{c}</option>
            ))}
          </select>
        )
      },
    },
    {
      key: 'sampleNumber',
      label: t('sampleNumber'),
      width: '190px',
      sortable: true,
      render: (s) => (
        <div style={{ paddingLeft: 10 }}>
          {s.__draft ? <span style={{ color: 'var(--color-gray-500)' }}>{creatingDraft ? 'Creating...' : '-'}</span> : (
            <Link href={`/samples/${s.id}`} className="bp-table__link">
              {s.sampleNumber}
            </Link>
          )}
        </div>
      ),
    },
    {
      key: 'image',
      label: 'Image',
      width: '88px',
      render: (s) =>
        s.imageUrl ? (
          <div style={{ width: 80, height: 80, overflow: 'hidden', borderRadius: 4, flexShrink: 0 }}>
            <img
              src={s.imageUrl}
              alt={s.sampleName}
              style={{ width: '100%', height: '100%', objectFit: 'cover', display: 'block' }}
            />
          </div>
        ) : (
          <div style={{ width: 80, height: 80, borderRadius: 4, background: 'var(--color-gray-100)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
            <FlaskConical style={{ width: 24, height: 24, opacity: 0.2, color: '#94a3b8' }} />
          </div>
        ),
    },
    {
      key: 'sampleName',
      label: t('sampleName'),
      width: '260px',
      sortable: true,
      render: (s) => (
        <input
          className="bp-input"
          value={s.sampleName || ''}
          onChange={(e) => {
            const value = e.target.value
            if (s.__draft) {
              setDraftRow((prev) => (prev ? { ...prev, sampleName: value } : prev))
            } else {
              setSamples((prev) => prev.map((x) => (x.id === s.id ? { ...x, sampleName: value } : x)))
            }
          }}
          onBlur={() => {
            if (!s.__draft) patchSample(s.id, { sampleName: s.sampleName || '' })
          }}
        />
      ),
    },
    {
      key: 'product',
      label: 'Style No.',
      width: '170px',
      render: (s) => (
        <StyleNoCombobox
          row={s}
          products={products}
          onSelect={(picked) => {
            if (s.__draft) {
              setDraftRow((prev) => (prev ? {
                ...prev,
                product: { id: picked.id, styleNumber: picked.styleNumber, name: picked.name },
              } : prev))
            } else {
              setSamples((prev) => prev.map((x) => (x.id === s.id ? {
                ...x,
                product: { id: picked.id, styleNumber: picked.styleNumber, name: picked.name },
              } : x)))
              patchSample(s.id, { productId: picked.id })
            }
          }}
        />
      ),
    },
    {
      key: 'sampleType',
      label: t('sampleType'),
      width: '120px',
      sortable: true,
      render: (s) => (
        <select
          className="bp-select"
          value={s.sampleType}
          onChange={(e) => {
            const value = e.target.value
            if (s.__draft) {
              setDraftRow((prev) => (prev ? { ...prev, sampleType: value } : prev))
            } else {
              setSamples((prev) => prev.map((x) => (x.id === s.id ? { ...x, sampleType: value } : x)))
              patchSample(s.id, { sampleType: value })
            }
          }}
        >
          {Object.keys(SAMPLE_TYPE_LABELS).map((k) => (
            <option key={k} value={k}>{tConstants(`sampleTypes.${k}`)}</option>
          ))}
        </select>
      ),
    },
    {
      key: 'status',
      label: t('status'),
      width: '130px',
      sortable: true,
      render: (s) => (
        <select
          className="bp-select"
          value={s.status}
          onChange={(e) => {
            const value = e.target.value
            if (s.__draft) {
              setDraftRow((prev) => (prev ? { ...prev, status: value } : prev))
            } else {
              setSamples((prev) => prev.map((x) => (x.id === s.id ? { ...x, status: value } : x)))
              patchSample(s.id, { status: value })
            }
          }}
        >
          <option value="PENDING">Registered</option>
          <option value="APPROVED">Approved</option>
          <option value="REJECTED">Dropped</option>
        </select>
      ),
    },
    {
      key: 'colorCount',
      label: 'Colors',
      width: '72px',
      render: (s) => {
        const chips = s.colors?.slice(0, 5) || []
        if (chips.length === 0) return <span style={{ color: 'var(--color-gray-400)', fontSize: 'var(--font-size-xs)', paddingLeft: 6 }}>-</span>
        return (
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 18px)', gap: 2, padding: '2px 4px' }}>
            {chips.map((c, i) => (
              <div
                key={i}
                title={`${c.colorCode} - ${c.colorName}`}
                style={{ width: 18, height: 18, borderRadius: 3, border: '1px solid var(--color-border)', overflow: 'hidden', flexShrink: 0 }}
              >
                {c.colorImage
                  ? <img src={c.colorImage} alt={c.colorName} style={{ width: '100%', height: '100%', objectFit: 'cover', display: 'block' }} />
                  : <div style={{ width: '100%', height: '100%', background: '#94a3b8' }} />
                }
              </div>
            ))}
          </div>
        )
      },
    },
    {
      key: 'sizes',
      label: 'Size',
      width: '120px',
      render: (s) => (
        <span style={{ fontSize: 'var(--font-size-xs)' }}>
          {s.sizes && s.sizes.length > 0 ? s.sizes.join(', ') : '-'}
        </span>
      ),
    },
    {
      key: 'supplierName',
      label: 'Supplier',
      width: '130px',
      render: (s) => (
        <span style={{ padding: '0 6px', fontSize: 'var(--font-size-sm)', whiteSpace: 'nowrap' }}>
          {s.supplierName || '-'}
        </span>
      ),
    },
    {
      key: 'fob',
      label: 'Cost',
      width: '80px',
      render: (s) => {
        const c = s.costs[0]
        const total = (parseFloat(c?.materialCost || '0') + parseFloat(c?.processingCost || '0') + parseFloat(c?.trimCost || '0'))
        return <span style={{ paddingLeft: 6, fontSize: 'var(--font-size-sm)' }}>{total > 0 ? `$${total.toFixed(1)}` : '-'}</span>
      },
    },
    {
      key: 'costs',
      label: 'Price',
      width: '80px',
      render: (s) => {
        const fob = parseFloat(s.costs[0]?.fobPrice || '0')
        return <span style={{ paddingLeft: 6, fontSize: 'var(--font-size-sm)' }}>{fob > 0 ? `$${fob.toFixed(1)}` : '-'}</span>
      },
    },
    {
      key: 'updatedAt',
      label: 'Cost%',
      width: '68px',
      render: (s) => {
        const c = s.costs[0]
        const total = (parseFloat(c?.materialCost || '0') + parseFloat(c?.processingCost || '0') + parseFloat(c?.trimCost || '0'))
        const fob = parseFloat(c?.fobPrice || '0')
        if (total <= 0 || fob <= 0) return <span style={{ paddingLeft: 6, color: 'var(--color-gray-400)', fontSize: 'var(--font-size-sm)' }}>-</span>
        const pct = (total / fob) * 100
        const bg = pct > 80 ? '#fef2f2' : pct > 60 ? '#fffbeb' : '#f0fdf4'
        const color = pct > 80 ? '#dc2626' : pct > 60 ? '#d97706' : '#16a34a'
        return (
          <span style={{ paddingLeft: 6, fontSize: 'var(--font-size-sm)', fontWeight: 600, color, background: bg, borderRadius: 4, padding: '2px 6px' }}>
            {pct.toFixed(1)}%
          </span>
        )
      },
    },
  ], [t, tConstants, creatingDraft, divisionOptions, subCategoryOptionsByDivision, products, tryRegisterDraft])

  return (
    <>
      {/* Sticky header: title bar + search/filter toolbar */}
      <div style={{ position: 'sticky', top: 48, zIndex: 20, background: 'var(--color-bg)' }}>
        <BpPageHeader
          title={t('title')}
          titleMeta={<span className="bp-page__subtitle">({filtered.length})</span>}
          actions={
            <>
              <div style={{ display: 'flex', gap: 4, marginRight: 8 }}>
                <button
                  className="bp-button"
                  style={{
                    padding: '6px 10px',
                    background: viewMode === 'list' ? 'var(--color-primary)' : 'transparent',
                    color: viewMode === 'list' ? '#fff' : 'var(--color-text)',
                    border: '1px solid var(--color-border)',
                  }}
                  onClick={() => { setViewMode('list'); sessionStorage.setItem('samples-view-mode', 'list') }}
                  title="List View"
                >
                  <List style={{ width: 18, height: 18 }} />
                </button>
                <button
                  className="bp-button"
                  style={{
                    padding: '6px 10px',
                    background: viewMode === 'grid' ? 'var(--color-primary)' : 'transparent',
                    color: viewMode === 'grid' ? '#fff' : 'var(--color-text)',
                    border: '1px solid var(--color-border)',
                  }}
                  onClick={() => { setViewMode('grid'); sessionStorage.setItem('samples-view-mode', 'grid') }}
                  title="Grid View"
                >
                  <LayoutGrid style={{ width: 18, height: 18 }} />
                </button>
              </div>
              <button
                className="bp-button bp-button--primary"
                onClick={() => {
                  if (draftRow) return
                  setDraftRow({
                    id: 'draft-new',
                    __draft: true,
                    sampleName: '',
                    sampleNumber: '',
                    imageUrl: null,
                    year: null,
                    season: { seasonName: '' },
                    sampleType: 'PROTO',
                    status: 'PENDING',  // DB value: PENDING = Registered
                    division: '',
                    subCategory: '',
                    mainFactoryCode: '',
                    dueDate: null,
                    product: { id: '', styleNumber: '', name: '' },
                    costs: [],
                    updatedAt: new Date().toISOString(),
                  })
                }}
              >
                <Plus style={{ width: 16, height: 16 }} />
                {t('newSample')}
              </button>
            </>
          }
        />
        <div style={{ background: 'var(--color-surface, #fff)', borderBottom: '1px solid var(--color-border)' }}>
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
            <select
              className="bp-select"
              style={{ width: 160 }}
              value={typeFilter}
              onChange={(e) => setTypeFilter(e.target.value)}
            >
              <option value="">{t('sampleType')}</option>
              {Object.keys(SAMPLE_TYPE_LABELS).map((k) => (
                <option key={k} value={k}>{tConstants(`sampleTypes.${k}`)}</option>
              ))}
            </select>
            <select
              className="bp-select"
              style={{ width: 160 }}
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value)}
            >
              <option value="">{tCommon('allStatus')}</option>
              <option value="PENDING">Registered</option>
              <option value="APPROVED">Approved</option>
              <option value="REJECTED">Dropped</option>
            </select>
          </div>
        </div>
      </div>

      <div className="bp-card samples-sheet" style={{ overflowX: 'auto' }}>
        {viewMode === 'list' ? (
          <>
            <BpTable
              columns={columns}
              data={tableData}
              sortKey={sortKey}
              sortDir={sortDir}
              onSort={toggleSort as (key: string) => void}
              loading={loading}
              emptyIcon={<FlaskConical style={{ width: 48, height: 48 }} />}
              emptyMessage={t('noSamples')}
            />

            <BpPagination
              currentPage={currentPage}
              totalPages={totalPages}
              totalItems={sortedData.length}
              pageSize={pageSize}
              onPageChange={goToPage}
            />
          </>
        ) : (
          <>
            {loading ? (
              <div className="bp-spinner-wrap">
                <div className="bp-spinner" />
              </div>
            ) : sortedData.length === 0 ? (
              <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', padding: '80px 20px', color: 'var(--color-text-secondary)' }}>
                <FlaskConical style={{ width: 48, height: 48, marginBottom: 16 }} />
                <div>{t('noSamples')}</div>
              </div>
            ) : (
              <div style={{
                display: 'grid',
                gridTemplateColumns: 'repeat(auto-fill, 201px)',
                gap: 12,
                padding: 16,
              }}>
                {sortedData.slice(0, gridVisibleCount).map((sample) => {
                  const cost = sample.costs?.[0]
                  const fobPrice = cost?.fobPrice ? parseFloat(cost.fobPrice) : 0
                  const materialCost = cost?.materialCost ? parseFloat(cost.materialCost) : 0
                  const processingCost = cost?.processingCost ? parseFloat(cost.processingCost) : 0
                  const trimCost = cost?.trimCost ? parseFloat(cost.trimCost) : 0
                  const totalCost = materialCost + processingCost + trimCost
                  const costPct = fobPrice > 0 && totalCost > 0 ? ((totalCost / fobPrice) * 100).toFixed(1) : null
                  const statusColor = sample.status === 'APPROVED' ? '#10b981' : sample.status === 'REJECTED' ? '#ef4444' : '#f59e0b'
                  const statusLabel = sample.status === 'APPROVED' ? 'Approved' : sample.status === 'REJECTED' ? 'Dropped' : 'Registered'

                  return (
                    <Link
                      key={sample.id}
                      href={`/samples/${sample.id}`}
                      style={{ textDecoration: 'none', color: 'inherit' }}
                    >
                      <div
                        style={{
                          border: '1px solid var(--color-border)',
                          borderRadius: 8,
                          overflow: 'hidden',
                          background: '#fff',
                          position: 'relative',
                          width: 201,
                          height: 240,
                          transition: 'box-shadow 0.15s',
                          cursor: 'pointer',
                        }}
                        onMouseEnter={(e) => { e.currentTarget.style.boxShadow = '0 4px 16px rgba(0,0,0,0.18)' }}
                        onMouseLeave={(e) => { e.currentTarget.style.boxShadow = 'none' }}
                      >
                        {/* Image — fills entire card */}
                        {sample.imageUrl ? (
                          <img
                            src={sample.imageUrl}
                            alt={sample.sampleName || 'Sample'}
                            style={{ position: 'absolute', inset: 0, width: '100%', height: '100%', objectFit: 'contain', objectPosition: 'top' }}
                          />
                        ) : (
                          <div style={{ position: 'absolute', inset: 0, display: 'flex', alignItems: 'center', justifyContent: 'center', background: '#f8fafc' }}>
                            <FlaskConical style={{ width: 36, height: 36, opacity: 0.25, color: '#94a3b8' }} />
                          </div>
                        )}

                        {/* Status badge */}
                        <div style={{
                          position: 'absolute', top: 6, right: 6,
                          padding: '2px 7px', borderRadius: 9,
                          fontSize: 9, fontWeight: 700,
                          background: statusColor, color: '#fff',
                        }}>
                          {statusLabel}
                        </div>

                        {/* Data overlay — gradient from transparent (top) to dark (bottom) */}
                        <div style={{
                          position: 'absolute', bottom: 0, left: 0, right: 0,
                          padding: '32px 10px 8px',
                          background: 'linear-gradient(to top, rgba(0,0,0,0.78) 0%, rgba(0,0,0,0.45) 55%, transparent 100%)',
                        }}>
                          {/* Name */}
                          <div style={{ fontSize: 13, fontWeight: 700, color: '#fff', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', marginBottom: 2 }}>
                            {sample.sampleName || 'Untitled'}
                          </div>

                          {/* Number · Type */}
                          <div style={{ fontSize: 11, color: 'rgba(255,255,255,0.75)', display: 'flex', gap: 3, marginBottom: 3 }}>
                            <span style={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', flex: 1 }}>{sample.sampleNumber}</span>
                            <span style={{ flexShrink: 0 }}>·</span>
                            <span style={{ flexShrink: 0 }}>{sample.sampleType}</span>
                          </div>

                          {/* Style + colors */}
                          <div style={{ display: 'flex', alignItems: 'center', gap: 5, marginBottom: 4 }}>
                            <span style={{ fontSize: 11, color: 'rgba(255,255,255,0.65)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', flex: 1 }}>
                              {sample.product.styleNumber}
                            </span>
                            {sample.colors && sample.colors.length > 0 && (
                              <div style={{ display: 'flex', gap: 2, flexShrink: 0 }}>
                                {sample.colors.slice(0, 5).map((c, ci) => (
                                  <div
                                    key={ci}
                                    title={`${c.colorCode} - ${c.colorName}`}
                                    style={{ width: 12, height: 12, borderRadius: 2, border: '1px solid rgba(255,255,255,0.4)', overflow: 'hidden', background: '#475569' }}
                                  >
                                    {c.colorImage
                                      ? <img src={c.colorImage} alt={c.colorName} style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                                      : <div style={{ width: '100%', height: '100%', background: '#94a3b8' }} />
                                    }
                                  </div>
                                ))}
                              </div>
                            )}
                          </div>

                          {/* Cost */}
                          <div style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: 11 }}>
                            <span style={{ color: 'rgba(255,255,255,0.7)', flex: 1 }}>
                              Cost <strong style={{ color: '#fff' }}>{totalCost > 0 ? `$${totalCost.toFixed(1)}` : '-'}</strong>
                            </span>
                            <span style={{ color: 'rgba(255,255,255,0.7)', flex: 1 }}>
                              Price <strong style={{ color: '#fff' }}>{fobPrice > 0 ? `$${fobPrice.toFixed(1)}` : '-'}</strong>
                            </span>
                            {costPct && (
                              <span style={{
                                padding: '1px 4px', borderRadius: 3, fontSize: 10, fontWeight: 700, flexShrink: 0,
                                background: parseFloat(costPct) > 80 ? 'rgba(220,38,38,0.85)' : parseFloat(costPct) > 60 ? 'rgba(217,119,6,0.85)' : 'rgba(5,150,105,0.85)',
                                color: '#fff',
                              }}>
                                {costPct}%
                              </span>
                            )}
                          </div>
                        </div>
                      </div>
                    </Link>
                  )
                })}
              </div>
            )}
            {/* Sentinel for IntersectionObserver infinite scroll */}
            <div ref={gridSentinelRef} style={{ height: 1 }} />
          </>
        )}
      </div>
    </>
  )
}
