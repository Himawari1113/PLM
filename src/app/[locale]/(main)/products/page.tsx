'use client'

import { useEffect, useState, useMemo, useCallback, memo } from 'react'
import { Link } from '@/lib/navigation'
import { PRODUCT_CATEGORIES, PRODUCT_STATUS_LABELS, PRODUCT_STATUS_COLORS } from '@/lib/constants'
import { Plus, Search, Package2 } from 'lucide-react'
import { useTranslations } from 'next-intl'
import { useDebounce } from '@/hooks/useDebounce'
import { usePagination } from '@/hooks/usePagination'
import { useSort } from '@/hooks/useSort'
import { BpTable, BpPagination, BpSlidePanel, BpPanelSection, BpPageHeader } from '@/components/common'
import { BpField, BpFieldGrid } from '@/components/common'
import type { BpColumn } from '@/components/common'
import { useYearFilter } from '@/contexts/YearFilterContext'

interface Product {
  id: string
  styleNumber: string
  name: string
  division: { id: number; name: string } | null
  category: string
  status: string
  targetPrice: number | null
  collection: { name: string; season: { name: string } } | null
  supplier: { name: string } | null
  _count: { samples: number }
  updatedAt: string
}

const usd = new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD' })

export default function ProductsPage() {
  const t = useTranslations('products')
  const tCommon = useTranslations('common')
  const tConstants = useTranslations('constants')

  const { selectedYear } = useYearFilter()
  const [products, setProducts] = useState<Product[]>([])
  const [search, setSearch] = useState('')
  const [category, setCategory] = useState('')
  const [status, setStatus] = useState('')
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [selectedProduct, setSelectedProduct] = useState<Product | null>(null)

  const debouncedSearch = useDebounce(search)

  const fetchProducts = useCallback(async () => {
    setLoading(true)
    setError('')
    try {
      const params = new URLSearchParams()
      if (debouncedSearch) params.set('search', debouncedSearch)
      if (category) params.set('category', category)
      if (status) params.set('status', status)
      if (selectedYear !== null) params.set('year', String(selectedYear))
      const res = await fetch(`/api/products?${params.toString()}`)
      const data = await res.json()
      if (!res.ok) {
        throw new Error(data?.error || 'Failed to fetch products')
      }
      setProducts(Array.isArray(data) ? data : [])
    } catch (e) {
      setProducts([])
      setError(e instanceof Error ? e.message : 'Failed to fetch products')
    } finally {
      setLoading(false)
    }
  }, [debouncedSearch, category, status, selectedYear])

  useEffect(() => { fetchProducts() }, [fetchProducts])

  const { sortedData, sortKey, sortDir, toggleSort } = useSort(products, 'updatedAt', 'desc')
  const { paginatedData, currentPage, totalPages, pageSize, goToPage } = usePagination(sortedData)

  const columns: BpColumn<Product>[] = useMemo(() => [
    {
      key: 'styleNumber',
      label: t('styleNumber'),
      sortable: true,
      render: (p) => (
        <Link href={`/products/${p.id}`} className="bp-table__link">
          {p.styleNumber}
        </Link>
      ),
    },
    { key: 'name', label: t('productName'), sortable: true, render: (p) => <span style={{ fontWeight: 600 }}>{p.name}</span> },
    {
      key: 'category',
      label: t('category'),
      sortable: true,
      render: (p) => <span className="bp-badge bp-badge--neutral">{tConstants(`categories.${p.category}`)}</span>,
    },
    { key: 'division', label: t('division'), render: (p) => p.division?.name || '-' },
    { key: 'season', label: t('season'), render: (p) => p.collection?.season?.name || '-' },
    { key: 'supplier', label: t('supplier'), render: (p) => p.supplier?.name || '-' },
    {
      key: 'status',
      label: t('status'),
      sortable: true,
      render: (p) => <span className={`bp-badge ${PRODUCT_STATUS_COLORS[p.status]}`}>{tConstants(`productStatus.${p.status}`)}</span>,
    },
    {
      key: 'targetPrice',
      label: t('targetPrice'),
      sortable: true,
      render: (p) => (p.targetPrice != null ? usd.format(p.targetPrice) : '-'),
    },
    {
      key: 'samples',
      label: t('samples'),
      render: (p) => <span className="bp-badge bp-badge--info">{p._count.samples}</span>,
    },
  ], [t, tConstants])

  return (
    <>
      <BpPageHeader
        title={t('title')}
        titleMeta={<span className="bp-page__subtitle">{t('totalProducts', { count: sortedData.length })}</span>}
        actions={
          <Link href="/products/new">
            <button className="bp-button bp-button--primary">
              <Plus style={{ width: 16, height: 16 }} />
              {t('newProduct')}
            </button>
          </Link>
        }
      />

      <div className="bp-card">
        {error ? (
          <div className="bp-table__empty">
            <p>{error}</p>
          </div>
        ) : null}
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
            value={category}
            onChange={(e) => setCategory(e.target.value)}
          >
            <option value="">{tCommon('allCategories')}</option>
            {PRODUCT_CATEGORIES.map((c) => (
              <option key={c.value} value={c.value}>{tConstants(`categories.${c.value}`)}</option>
            ))}
          </select>
          <select
            className="bp-select"
            style={{ width: 160 }}
            value={status}
            onChange={(e) => setStatus(e.target.value)}
          >
            <option value="">{tCommon('allStatus')}</option>
            {Object.keys(PRODUCT_STATUS_LABELS).map((k) => (
              <option key={k} value={k}>{tConstants(`productStatus.${k}`)}</option>
            ))}
          </select>
        </div>

        <BpTable
          columns={columns}
          data={paginatedData}
          sortKey={sortKey}
          sortDir={sortDir}
          onSort={toggleSort}
          onRowClick={setSelectedProduct}
          loading={loading}
          emptyIcon={<Package2 style={{ width: 48, height: 48 }} />}
          emptyMessage={t('noProductsFound')}
        />

        <BpPagination
          currentPage={currentPage}
          totalPages={totalPages}
          totalItems={sortedData.length}
          pageSize={pageSize}
          onPageChange={goToPage}
        />
      </div>

      <BpSlidePanel
        open={!!selectedProduct}
        onClose={() => setSelectedProduct(null)}
        title={selectedProduct?.name || ''}
        actions={
          selectedProduct ? (
            <Link href={`/products/${selectedProduct.id}`}>
              <button className="bp-button bp-button--primary bp-button--sm">{tCommon('viewDetails')}</button>
            </Link>
          ) : undefined
        }
      >
        {selectedProduct && (
          <>
            <BpPanelSection title={t('productName')}>
              <BpFieldGrid>
                <BpField label={t('styleNumber')}>{selectedProduct.styleNumber}</BpField>
                <BpField label={t('productName')}>{selectedProduct.name}</BpField>
                <BpField label={t('category')}>{tConstants(`categories.${selectedProduct.category}`)}</BpField>
                <BpField label={t('division')}>{selectedProduct.division?.name || '-'}</BpField>
                <BpField label={t('status')}>
                  <span className={`bp-badge ${PRODUCT_STATUS_COLORS[selectedProduct.status]}`}>
                    {tConstants(`productStatus.${selectedProduct.status}`)}
                  </span>
                </BpField>
                <BpField label={t('season')}>{selectedProduct.collection?.season?.name || '-'}</BpField>
                <BpField label={t('supplier')}>{selectedProduct.supplier?.name || '-'}</BpField>
                <BpField label={t('targetPrice')}>
                  {selectedProduct.targetPrice != null ? usd.format(selectedProduct.targetPrice) : '-'}
                </BpField>
                <BpField label={t('samples')}>{selectedProduct._count.samples}</BpField>
              </BpFieldGrid>
            </BpPanelSection>
          </>
        )}
      </BpSlidePanel>
    </>
  )
}
