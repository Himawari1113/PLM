'use client'

import { useEffect, useState, useMemo } from 'react'
import { Link } from '@/lib/navigation'
import { useParams } from 'next/navigation'
import { SAMPLE_STATUS_COLORS } from '@/lib/constants'
import { Plus, Search, ArrowLeft, FlaskConical } from 'lucide-react'
import { useTranslations } from 'next-intl'
import { useDebounce } from '@/hooks/useDebounce'
import { usePagination } from '@/hooks/usePagination'
import { useSort } from '@/hooks/useSort'
import { BpTable, BpPagination, BpPageHeader } from '@/components/common'
import type { BpColumn } from '@/components/common'

interface SampleListItem {
  id: string
  sampleName: string
  sampleNumber: string
  imageUrl?: string | null
  sampleType: string
  status: string
  mainFactoryCode: string | null
  dueDate: string | null
  costs: { fobPrice: string | null; currency: string }[]
  _count: { costs: number }
  updatedAt: string
}

interface ProductInfo {
  id: string
  styleNumber: string
  name: string
}

export default function SamplesPage() {
  const params = useParams()
  const productId = params.id as string
  const t = useTranslations('samples')
  const tCommon = useTranslations('common')
  const tConstants = useTranslations('constants')

  const [samples, setSamples] = useState<SampleListItem[]>([])
  const [product, setProduct] = useState<ProductInfo | null>(null)
  const [search, setSearch] = useState('')
  const [loading, setLoading] = useState(true)

  const debouncedSearch = useDebounce(search)

  useEffect(() => {
    fetch(`/api/products/${productId}`).then((r) => r.json()).then(setProduct)
    fetch(`/api/products/${productId}/samples`).then((r) => r.json()).then((data) => {
      setSamples(data)
      setLoading(false)
    })
  }, [productId])

  const filtered = useMemo(() => {
    const q = debouncedSearch.toLowerCase()
    return samples.filter((s) =>
      !q ||
      s.sampleName.toLowerCase().includes(q) ||
      s.sampleNumber.toLowerCase().includes(q)
    )
  }, [samples, debouncedSearch])

  const { sortedData, sortKey, sortDir, toggleSort } = useSort(filtered, 'updatedAt', 'desc')
  const { paginatedData, currentPage, totalPages, pageSize, goToPage } = usePagination(sortedData)

  const columns: BpColumn<SampleListItem>[] = useMemo(() => [
    {
      key: 'sampleNumber',
      label: t('sampleNumber'),
      sortable: true,
      render: (s) => (
        <Link href={`/samples/${s.id}`} className="bp-table__link">
          {s.sampleNumber}
        </Link>
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
            style={{ width: 60, height: 60, objectFit: 'cover', borderRadius: 6, border: '1px solid var(--color-border)' }}
          />
        ) : (
          <div style={{ width: 60, height: 60, borderRadius: 6, border: '1px solid var(--color-border-light)' }} />
        ),
    },
    { key: 'sampleName', label: t('sampleName'), sortable: true, render: (s) => <span style={{ fontWeight: 600 }}>{s.sampleName}</span> },
    {
      key: 'sampleType',
      label: t('sampleType'),
      sortable: true,
      render: (s) => <span className="bp-badge bp-badge--neutral">{tConstants(`sampleTypes.${s.sampleType}`)}</span>,
    },
    {
      key: 'status',
      label: t('status'),
      sortable: true,
      render: (s) => <span className={`bp-badge ${SAMPLE_STATUS_COLORS[s.status]}`}>{tConstants(`sampleStatus.${s.status}`)}</span>,
    },
    { key: 'color', label: t('color'), render: (s) => s.color || '-' },
    { key: 'mainFactoryCode', label: 'Main Factory Code', render: (s) => s.mainFactoryCode || '-' },
    {
      key: 'dueDate',
      label: t('dueDate'),
      sortable: true,
      render: (s) => s.dueDate ? new Date(s.dueDate).toLocaleDateString() : '-',
    },
    {
      key: 'fob',
      label: t('latestFob'),
      render: (s) =>
        s.costs[0]?.fobPrice
          ? `${s.costs[0].currency} ${parseFloat(s.costs[0].fobPrice).toLocaleString()}`
          : '-',
    },
  ], [t, tConstants, productId])

  return (
    <>
      <BpPageHeader
        title={t('title')}
        subtitle={product ? `${product.styleNumber} - ${product.name}` : ''}
        actions={
          <>
            <Link href={`/products/${productId}`}>
              <button className="bp-button bp-button--ghost bp-button--icon">
                <ArrowLeft style={{ width: 18, height: 18 }} />
              </button>
            </Link>
            <Link href={`/products/${productId}/samples/new`}>
              <button className="bp-button bp-button--primary">
                <Plus style={{ width: 16, height: 16 }} />
                {t('newSample')}
              </button>
            </Link>
          </>
        }
      />

      <div className="bp-card">
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
        </div>

        <BpTable
          columns={columns}
          data={paginatedData}
          sortKey={sortKey}
          sortDir={sortDir}
          onSort={toggleSort}
          loading={loading}
          emptyIcon={<FlaskConical style={{ width: 48, height: 48 }} />}
          emptyMessage={t('noSamples')}
          emptyAction={
            <Link href={`/products/${productId}/samples/new`}>
              <button className="bp-button bp-button--primary" style={{ marginTop: 16 }}>
                {t('newSample')}
              </button>
            </Link>
          }
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
