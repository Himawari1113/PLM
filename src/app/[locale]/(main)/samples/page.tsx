'use client'

import { useEffect, useState, useMemo, useCallback } from 'react'
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
  sizes?: string[]
  product: { id: string; styleNumber: string; name: string }
  costs: { fobPrice: string | null; currency: string }[]
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
  const [viewMode, setViewMode] = useState<'list' | 'grid'>('list')

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

  const getStyleOptions = (row: SampleListItem, query?: string) => {
    const division = row.division || ''
    const subCategory = row.subCategory || ''
    const year = row.year
    const term = row.season?.seasonName || ''
    const q = String(query || '').trim().toLowerCase()
    return products
      .filter((p) => {
        const pDivision = p.division?.name || ''
        const pCategory = p.category || ''
        const pYear = p.collection?.season?.year
        const pTerm = p.collection?.season?.seasonName || ''
        const matchDivision = !division || pDivision === division
        const matchCategory = !subCategory || pCategory === subCategory
        const matchYear = !year || pYear === year
        const matchTerm = !term || pTerm === term
        const matchQuery = !q || `${p.styleNumber} ${p.name}`.toLowerCase().includes(q)
        return matchDivision && matchCategory && matchYear && matchTerm && matchQuery
      })
      .slice(0, 100)
  }

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
      label: t('season'),
      width: '46px',
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
      render: (s) =>
        s.imageUrl ? (
          <img
            src={s.imageUrl}
            alt={s.sampleName}
            style={{ width: 60, height: 60, objectFit: 'cover' }}
          />
        ) : (
          <span style={{ color: 'var(--color-gray-400)' }}>-</span>
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
      render: (s) => {
        const options = getStyleOptions(s)
        return (
          <select
            className="bp-select"
            value={s.product?.id || ''}
            onChange={(e) => {
              const productId = e.target.value
              const picked = products.find((p) => p.id === productId)
              if (s.__draft) {
                setDraftRow((prev) => (prev ? {
                  ...prev,
                  product: {
                    id: picked?.id || '',
                    styleNumber: picked?.styleNumber || '',
                    name: picked?.name || '',
                  },
                } : prev))
              } else {
                setSamples((prev) => prev.map((x) => (x.id === s.id ? {
                  ...x,
                  product: {
                    id: picked?.id || '',
                    styleNumber: picked?.styleNumber || '',
                    name: picked?.name || '',
                  },
                } : x)))
                if (productId) {
                  patchSample(s.id, { productId })
                }
              }
            }}
          >
            <option value="">--</option>
            {options.map((p) => (
              <option key={p.id} value={p.id}>{p.styleNumber}</option>
            ))}
          </select>
        )
      },
    },
    {
      key: 'sampleType',
      label: t('sampleType'),
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
      width: '70px',
      render: (s) => (
        <span style={{ textAlign: 'center', display: 'block' }}>
          {s.colorCount ?? 0}
        </span>
      ),
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
      key: 'mainFactoryCode',
      label: t('mainFactoryCode'),
      render: (s) => (
        <input
          className="bp-input"
          value={s.mainFactoryCode || ''}
          onChange={(e) => {
            const value = e.target.value
            if (s.__draft) {
              setDraftRow((prev) => (prev ? { ...prev, mainFactoryCode: value } : prev))
            } else {
              setSamples((prev) => prev.map((x) => (x.id === s.id ? { ...x, mainFactoryCode: value } : x)))
            }
          }}
          onBlur={() => {
            if (!s.__draft) patchSample(s.id, { mainFactoryCode: s.mainFactoryCode || '' })
          }}
        />
      ),
    },
    {
      key: 'fob',
      label: t('latestFob'),
      render: (s) =>
        s.costs[0]?.fobPrice
          ? `$${parseFloat(s.costs[0].fobPrice).toFixed(1)}`
          : '-',
    },
  ], [t, tConstants, creatingDraft, divisionOptions, subCategoryOptionsByDivision, products, tryRegisterDraft])

  return (
    <>
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
                onClick={() => setViewMode('list')}
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
                onClick={() => setViewMode('grid')}
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

      <div className="bp-card samples-sheet">
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

        {viewMode === 'list' ? (
          <>
            <BpTable
              columns={columns}
              data={tableData}
              sortKey={sortKey}
              sortDir={sortDir}
              onSort={toggleSort}
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
            ) : paginatedData.length === 0 ? (
              <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', padding: '80px 20px', color: 'var(--color-text-secondary)' }}>
                <FlaskConical style={{ width: 48, height: 48, marginBottom: 16 }} />
                <div>{t('noSamples')}</div>
              </div>
            ) : (
              <div style={{ 
                display: 'grid', 
                gridTemplateColumns: 'repeat(auto-fill, minmax(220px, 1fr))', 
                gap: 16, 
                padding: 20 
              }}>
                {paginatedData.map((sample) => {
                  const cost = sample.costs?.[0]
                  const price = cost ? `${cost.currency || '$'}${cost.fobPrice || '0'}` : '-'
                  
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
                          transition: 'all 0.2s',
                          cursor: 'pointer',
                          height: '100%',
                          display: 'flex',
                          flexDirection: 'column',
                        }}
                        onMouseEnter={(e) => {
                          e.currentTarget.style.boxShadow = '0 4px 12px rgba(0,0,0,0.1)'
                          e.currentTarget.style.transform = 'translateY(-2px)'
                        }}
                        onMouseLeave={(e) => {
                          e.currentTarget.style.boxShadow = 'none'
                          e.currentTarget.style.transform = 'translateY(0)'
                        }}
                      >
                        {/* Image */}
                        <div
                          style={{
                            width: '100%',
                            height: 200,
                            background: 'linear-gradient(135deg, #f5f7fa 0%, #c3cfe2 100%)',
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                            position: 'relative',
                            overflow: 'hidden',
                          }}
                        >
                          {sample.imageUrl ? (
                            <img
                              src={sample.imageUrl}
                              alt={sample.sampleName || 'Sample'}
                              style={{
                                width: '100%',
                                height: '100%',
                                objectFit: 'cover',
                              }}
                            />
                          ) : (
                            <FlaskConical style={{ width: 40, height: 40, opacity: 0.3, color: '#94a3b8' }} />
                          )}
                          {/* Status Badge */}
                          <div
                            style={{
                              position: 'absolute',
                              top: 8,
                              right: 8,
                              padding: '3px 8px',
                              borderRadius: 10,
                              fontSize: 10,
                              fontWeight: 600,
                              background: sample.status === 'APPROVED' 
                                ? '#10b981' 
                                : sample.status === 'REJECTED' 
                                ? '#ef4444' 
                                : '#f59e0b',
                              color: '#fff',
                            }}
                          >
                            {sample.status === 'APPROVED' ? 'Approved' : sample.status === 'REJECTED' ? 'Dropped' : 'Registered'}
                          </div>
                        </div>

                        {/* Info */}
                        <div style={{ padding: 12, flex: 1, display: 'flex', flexDirection: 'column', gap: 6 }}>
                          <div style={{ fontSize: 12, fontWeight: 600, color: 'var(--color-text)', lineHeight: 1.3, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                            {sample.sampleName || 'Untitled'}
                          </div>
                          <div style={{ fontSize: 11, color: 'var(--color-text-secondary)' }}>
                            {sample.sampleNumber}
                          </div>
                          
                          <div style={{ fontSize: 11, color: 'var(--color-text-secondary)', marginTop: 2, lineHeight: 1.5 }}>
                            <div><strong>Style:</strong> {sample.product.styleNumber}</div>
                            <div><strong>Type:</strong> {tConstants(`sampleTypes.${sample.sampleType}`)}</div>
                            {sample.season?.seasonName && (
                              <div><strong>Season:</strong> {sample.season.seasonName}</div>
                            )}
                            <div><strong>Colors:</strong> {sample.colorCount || 0}</div>
                            <div><strong>Price:</strong> {price}</div>
                          </div>
                        </div>
                      </div>
                    </Link>
                  )
                })}
              </div>
            )}

            <BpPagination
              currentPage={currentPage}
              totalPages={totalPages}
              totalItems={sortedData.length}
              pageSize={pageSize}
              onPageChange={goToPage}
            />
          </>
        )}
      </div>
    </>
  )
}
