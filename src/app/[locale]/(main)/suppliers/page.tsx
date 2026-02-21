'use client'

import { useEffect, useState, useMemo, useCallback, useRef } from 'react'
import { Link } from '@/lib/navigation'
import { Plus, Search, Network } from 'lucide-react'
import { useTranslations } from 'next-intl'
import { useDebounce } from '@/hooks/useDebounce'
import { useSort } from '@/hooks/useSort'
import { BpPageHeader } from '@/components/common'
import { useYearFilter } from '@/contexts/YearFilterContext'

const PAGE_SIZE = 60

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
  const { selectedYear, selectedSeason, availableSeasons } = useYearFilter()

  const [suppliers, setSuppliers] = useState<Supplier[]>([])
  const [search, setSearch] = useState('')
  const [loading, setLoading] = useState(true)
  const debouncedSearch = useDebounce(search)

  // Infinite scroll state
  const [visibleCount, setVisibleCount] = useState(PAGE_SIZE)
  const visibleCountRef = useRef(PAGE_SIZE)
  const sentinelRef = useRef<HTMLDivElement>(null)

  const fetchSuppliers = useCallback(async () => {
    setLoading(true)
    const params = new URLSearchParams()
    if (debouncedSearch) params.set('search', debouncedSearch)
    // Suppliers usually don't filter by year/season globally in this app's current API, 
    // but we can include them if the API supports it or for future-proofing.
    const res = await fetch(`/api/suppliers?${params}`)
    setSuppliers(await res.json())
    setLoading(false)
  }, [debouncedSearch])

  useEffect(() => { fetchSuppliers() }, [fetchSuppliers])

  const { sortedData, sortKey, sortDir, toggleSort } = useSort(suppliers, 'name')

  // infinite scroll logic
  useEffect(() => {
    setVisibleCount(PAGE_SIZE)
  }, [sortedData])

  useEffect(() => {
    visibleCountRef.current = visibleCount
  }, [visibleCount])

  useEffect(() => {
    const sentinel = sentinelRef.current
    if (!sentinel) return
    const observer = new IntersectionObserver((entries) => {
      if (entries[0].isIntersecting && visibleCountRef.current < sortedData.length) {
        setVisibleCount((prev) => Math.min(prev + PAGE_SIZE, sortedData.length))
      }
    })
    observer.observe(sentinel)
    return () => observer.disconnect()
  }, [sortedData.length])

  const visibleData = useMemo(() => sortedData.slice(0, visibleCount), [sortedData, visibleCount])

  return (
    <>
      <div style={{ position: 'sticky', top: 48, zIndex: 20, background: 'var(--color-bg)' }}>
        <BpPageHeader
          title={t('title')}
          titleMeta={<span className="bp-page__subtitle">({sortedData.length} {tCommon('items')})</span>}
          actions={
            <Link href="/suppliers/new">
              <button className="bp-button bp-button--primary">
                <Plus style={{ width: 16, height: 16 }} />
                {t('newSupplier')}
              </button>
            </Link>
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
                <Network style={{ width: 14, height: 14, color: 'var(--color-primary)' }} />
                <span style={{ fontSize: 'var(--font-size-sm)', fontWeight: 600 }}>{sortedData.length}</span>
                <span style={{ fontSize: 'var(--font-size-xs)', color: 'var(--color-text-secondary)' }}>suppliers</span>
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
          </div>
        </div>
      </div>

      <div className="bp-card">
        {loading ? (
          <div className="bp-spinner-wrap">
            <div className="bp-spinner" />
          </div>
        ) : sortedData.length === 0 ? (
          <div className="bp-table__empty">
            <Network className="bp-table__empty-icon" />
            <p>{t('noSuppliersFound')}</p>
          </div>
        ) : (
          <div style={{ overflowX: 'auto' }}>
            <table className="bp-table" style={{ width: '100%', minWidth: 1000, borderCollapse: 'collapse' }}>
              <thead>
                <tr>
                  <th style={{ paddingLeft: 16 }} onClick={() => toggleSort('name')}>
                    {t('companyName')} {sortKey === 'name' && (sortDir === 'asc' ? '▲' : '▼')}
                  </th>
                  <th>{t('contactPerson')}</th>
                  <th>{t('email')}</th>
                  <th>{t('phone')}</th>
                  <th onClick={() => toggleSort('country')}>
                    {t('country')} {sortKey === 'country' && (sortDir === 'asc' ? '▲' : '▼')}
                  </th>
                  <th>{t('productsCount')}</th>
                  <th style={{ paddingRight: 16 }}>{t('materialsCount')}</th>
                </tr>
              </thead>
              <tbody>
                {visibleData.map((s) => (
                  <tr key={s.id}>
                    <td style={{ paddingLeft: 16 }}>
                      <Link href={`/suppliers/${s.id}`} className="bp-table__link">{s.name}</Link>
                    </td>
                    <td>{s.contactPerson || '-'}</td>
                    <td>{s.email || '-'}</td>
                    <td>{s.phone || '-'}</td>
                    <td>{s.country || '-'}</td>
                    <td>{s._count.products} {tCommon('items')}</td>
                    <td style={{ paddingRight: 16 }}>{s._count.supplierMaterials} {tCommon('items')}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
        <div ref={sentinelRef} style={{ height: 1 }} />
      </div>
    </>
  )
}
