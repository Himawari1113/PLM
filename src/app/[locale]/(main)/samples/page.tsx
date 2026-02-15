'use client'

import { useEffect, useState, useMemo } from 'react'
import { Link } from '@/lib/navigation'
import { SAMPLE_TYPE_LABELS } from '@/lib/constants'
import { Plus, Search, FlaskConical } from 'lucide-react'
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
  season?: { term?: string | null; year?: number | null } | null
  sampleType: string
  status: string
  factoryName: string | null
  dueDate: string | null
  color: string | null
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

  const { selectedYear } = useYearFilter()
  const [samples, setSamples] = useState<SampleListItem[]>([])
  const [search, setSearch] = useState('')
  const [statusFilter, setStatusFilter] = useState('')
  const [typeFilter, setTypeFilter] = useState('')
  const [loading, setLoading] = useState(true)
  const [draftRow, setDraftRow] = useState<SampleListItem | null>(null)
  const [creatingDraft, setCreatingDraft] = useState(false)
  const [products, setProducts] = useState<ProductOption[]>([])

  const debouncedSearch = useDebounce(search)

  const fetchSamples = () => {
    const params = new URLSearchParams()
    if (selectedYear !== null) params.set('year', String(selectedYear))
    fetch(`/api/samples?${params.toString()}`)
      .then((r) => r.json())
      .then((data) => {
        setSamples(Array.isArray(data) ? data : [])
        setLoading(false)
      })
  }

  useEffect(() => {
    setLoading(true)
    fetchSamples()
    const productParams = new URLSearchParams()
    if (selectedYear !== null) productParams.set('year', String(selectedYear))
    fetch(`/api/products?${productParams.toString()}`).then((r) => r.json()).then((data) => setProducts(Array.isArray(data) ? data : []))
  }, [selectedYear])

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

  const { sortedData, sortKey, sortDir, toggleSort } = useSort(filtered, 'updatedAt', 'desc')
  const { paginatedData, currentPage, totalPages, pageSize, goToPage } = usePagination(sortedData)

  const patchSample = async (id: string, patch: Record<string, any>) => {
    setSamples((prev) => prev.map((x) => (x.id === id ? { ...x, ...patch } : x)))
    const res = await fetch(`/api/samples/${id}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(patch),
    })
    if (!res.ok) return
    const updated = await res.json()
    setSamples((prev) => prev.map((x) => (x.id === id ? { ...x, ...updated, updatedAt: x.updatedAt } : x)))
  }

  useEffect(() => {
    if (!draftRow || !draftRow.__draft) return
    const year = Number(draftRow.year)
    const seasonTerm = draftRow.season?.term
    const draftDivision = draftRow.division
    const draftSubCategory = draftRow.subCategory
    // All 4 fields must be filled before creating draft (triggering Sample No assignment)
    if (!Number.isFinite(year) || !seasonTerm || !draftDivision || !draftSubCategory || creatingDraft) return

    const createDraftSample = async () => {
      setCreatingDraft(true)
      const payload = {
        productId: '',
        newSampleData: {
          sampleInfo: {
            year,
            seasonTerm,
            sampleNameEn: draftRow.sampleName || '',
            sampleType: draftRow.sampleType || 'PROTO',
            statusUi: 'REGISTERED',
            division: draftDivision,
            subCategory: draftSubCategory,
            productOverride: '',
          },
          specInfo: { colors: [], sizeInfo: '', sizeMeasurements: [] },
          productionInfo: { supplierId: '', supplierName: '', factoryName: draftRow.factoryName || '', originCountry: '' },
          materials: { mainFabric: {}, subFabrics: [], subMaterials: [] },
          others: { remark: '' },
        },
      }

      const res = await fetch('/api/samples', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      })

      setCreatingDraft(false)
      if (!res.ok) return
      setDraftRow(null)
      fetchSamples()
    }

    createDraftSample()
  }, [draftRow, creatingDraft])

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
    const term = row.season?.term || ''
    const q = String(query || '').trim().toLowerCase()
    return products
      .filter((p) => {
        const pDivision = p.division?.name || ''
        const pCategory = p.category || ''
        const pYear = p.collection?.season?.year
        const pTerm = p.collection?.season?.term || ''
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
        // Lock only when sampleNumber is assigned (all 4 fields were filled and registration completed)
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
                setDraftRow((prev) => (prev ? { ...prev, year: value } : prev))
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
          return <span style={{ padding: '0 6px', fontSize: 'calc(var(--font-size-sm))' }}>{s.season?.term || '-'}</span>
        }
        return (
          <select
            className="bp-select"
            value={s.season?.term || ''}
            onChange={(e) => {
              const term = e.target.value
              if (s.__draft) {
                setDraftRow((prev) => (prev ? { ...prev, season: { ...(prev.season || {}), term } } : prev))
              } else {
                patchSample(s.id, { seasonTerm: term })
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
                setDraftRow((prev) => (prev ? { ...prev, division: value, subCategory: '', product: { ...prev.product, id: '', styleNumber: '', name: '' } } : prev))
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
                setDraftRow((prev) => (prev ? { ...prev, subCategory: value, product: { ...prev.product, id: '', styleNumber: '', name: '' } } : prev))
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
      key: 'factoryName',
      label: t('factoryName'),
      render: (s) => (
        <input
          className="bp-input"
          value={s.factoryName || ''}
          onChange={(e) => {
            const value = e.target.value
            if (s.__draft) {
              setDraftRow((prev) => (prev ? { ...prev, factoryName: value } : prev))
            } else {
              setSamples((prev) => prev.map((x) => (x.id === s.id ? { ...x, factoryName: value } : x)))
            }
          }}
          onBlur={() => {
            if (!s.__draft) patchSample(s.id, { factoryName: s.factoryName || '' })
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
  ], [t, tConstants, creatingDraft, divisionOptions, subCategoryOptionsByDivision, products])

  return (
    <>
      <BpPageHeader
        title={t('title')}
        titleMeta={<span className="bp-page__subtitle">({filtered.length})</span>}
        actions={
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
                season: { term: '' },
                sampleType: 'PROTO',
                status: 'PENDING',  // DB value: PENDING = Registered
                division: '',
                subCategory: '',
                factoryName: '',
                dueDate: null,
                color: null,
                product: { id: '', styleNumber: '', name: '' },
                costs: [],
                updatedAt: new Date().toISOString(),
              })
            }}
          >
            <Plus style={{ width: 16, height: 16 }} />
            {t('newSample')}
          </button>
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
      </div>
    </>
  )
}
