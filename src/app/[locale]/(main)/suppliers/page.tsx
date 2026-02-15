'use client'

import { useEffect, useState, useMemo, useCallback } from 'react'
import { Link } from '@/lib/navigation'
import { Plus, Search, Network } from 'lucide-react'
import { useTranslations } from 'next-intl'
import { useDebounce } from '@/hooks/useDebounce'
import { usePagination } from '@/hooks/usePagination'
import { useSort } from '@/hooks/useSort'
import { BpTable, BpPagination, BpPageHeader } from '@/components/common'
import type { BpColumn } from '@/components/common'

interface Supplier {
  id: string
  name: string
  contactPerson: string | null
  email: string | null
  phone: string | null
  country: string | null
  _count: { products: number; supplierMaterials: number }
}

export default function SuppliersPage() {
  const t = useTranslations('suppliers')
  const tCommon = useTranslations('common')
  const [suppliers, setSuppliers] = useState<Supplier[]>([])
  const [search, setSearch] = useState('')
  const [loading, setLoading] = useState(true)

  const debouncedSearch = useDebounce(search)

  const fetchSuppliers = useCallback(async () => {
    setLoading(true)
    const params = new URLSearchParams()
    if (debouncedSearch) params.set('search', debouncedSearch)
    const res = await fetch(`/api/suppliers?${params}`)
    setSuppliers(await res.json())
    setLoading(false)
  }, [debouncedSearch])

  useEffect(() => { fetchSuppliers() }, [fetchSuppliers])

  const { sortedData, sortKey, sortDir, toggleSort } = useSort(suppliers, 'name')
  const { paginatedData, currentPage, totalPages, pageSize, goToPage } = usePagination(sortedData)

  const columns: BpColumn<Supplier>[] = useMemo(() => [
    {
      key: 'name',
      label: t('companyName'),
      sortable: true,
      render: (s) => (
        <Link href={`/suppliers/${s.id}`} className="bp-table__link">{s.name}</Link>
      ),
    },
    { key: 'contactPerson', label: t('contactPerson'), render: (s) => s.contactPerson || '-' },
    { key: 'email', label: t('email'), render: (s) => s.email || '-' },
    { key: 'phone', label: t('phone'), render: (s) => s.phone || '-' },
    { key: 'country', label: t('country'), sortable: true, render: (s) => s.country || '-' },
    { key: 'products', label: t('productsCount'), render: (s) => `${s._count.products} ${tCommon('items')}` },
    { key: 'materials', label: t('materialsCount'), render: (s) => `${s._count.supplierMaterials} ${tCommon('items')}` },
  ], [t, tCommon])

  return (
    <>
      <BpPageHeader
        title={t('title')}
        titleMeta={<span className="bp-page__subtitle">{suppliers.length} {tCommon('items')}</span>}
        actions={
          <Link href="/suppliers/new">
            <button className="bp-button bp-button--primary">
              <Plus style={{ width: 16, height: 16 }} />
              {t('newSupplier')}
            </button>
          </Link>
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
          emptyIcon={<Network style={{ width: 48, height: 48 }} />}
          emptyMessage={t('noSuppliersFound')}
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
