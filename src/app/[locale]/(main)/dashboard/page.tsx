'use client'

import { useEffect, useState } from 'react'
import { Link } from '@/lib/navigation'
import { PRODUCT_STATUS_COLORS } from '@/lib/constants'
import { Plus, ArrowUpRight } from 'lucide-react'
import { useTranslations } from 'next-intl'
import { BpSummaryPanel, BpPageHeader } from '@/components/common'
import { DashboardCharts } from '@/components/dashboard/DashboardCharts'
import { useYearFilter } from '@/contexts/YearFilterContext'

interface DashboardStats {
  counts: {
    products: number
    samples: number
    materials: number
    suppliers: number
    seasons: number
  }
  productsByStatus: { name: string; value: number }[]
  productsByCategory: { name: string; value: number }[]
  samplesByStatus: { name: string; value: number }[]
  samplesByType: { name: string; value: number }[]
  recentProducts: {
    id: string
    styleNumber: string
    name: string
    status: string
    season: string | null
    updatedAt: string
  }[]
}

export default function DashboardPage() {
  const t = useTranslations('dashboard')
  const tProducts = useTranslations('products')
  const tConstants = useTranslations('constants')

  const { selectedYear } = useYearFilter()
  const [stats, setStats] = useState<DashboardStats | null>(null)

  useEffect(() => {
    const params = new URLSearchParams()
    if (selectedYear !== null) params.set('year', String(selectedYear))
    fetch(`/api/dashboard/stats?${params.toString()}`)
      .then((r) => r.json())
      .then(setStats)
  }, [selectedYear])

  if (!stats) {
    return (
      <div className="bp-spinner-wrap">
        <div className="bp-spinner" />
      </div>
    )
  }

  const statusLabels: Record<string, string> = {}
  const categoryLabels: Record<string, string> = {}
  const sampleStatusLabels: Record<string, string> = {}
  const sampleTypeLabels: Record<string, string> = {}

  for (const s of stats.productsByStatus) {
    statusLabels[s.name] = tConstants(`productStatus.${s.name}`)
  }
  for (const c of stats.productsByCategory) {
    categoryLabels[c.name] = tConstants(`categories.${c.name}`)
  }
  for (const s of stats.samplesByStatus) {
    sampleStatusLabels[s.name] = tConstants(`sampleStatus.${s.name}`)
  }
  for (const s of stats.samplesByType) {
    sampleTypeLabels[s.name] = tConstants(`sampleTypes.${s.name}`)
  }

  return (
    <>
      <BpPageHeader
        title={t('title')}
        subtitle={t('subtitle')}
        actions={
          <Link href="/products/new">
            <button className="bp-button bp-button--primary">
              <Plus style={{ width: 16, height: 16 }} />
              {tProducts('newProduct')}
            </button>
          </Link>
        }
      />

      <BpSummaryPanel
        items={[
          { label: t('productCount'), value: stats.counts.products },
          { label: 'Samples', value: stats.counts.samples },
          { label: t('materialCount'), value: stats.counts.materials },
          { label: t('supplierCount'), value: stats.counts.suppliers },
          { label: t('seasonCount'), value: stats.counts.seasons },
        ]}
      />

      <DashboardCharts
        productsByStatus={stats.productsByStatus}
        productsByCategory={stats.productsByCategory}
        samplesByStatus={stats.samplesByStatus}
        samplesByType={stats.samplesByType}
        statusLabels={statusLabels}
        categoryLabels={categoryLabels}
        sampleStatusLabels={sampleStatusLabels}
        sampleTypeLabels={sampleTypeLabels}
      />

      <div className="bp-card">
        <div className="bp-card__header">
          <h2 className="bp-card__title">{t('recentProducts')}</h2>
          <Link href="/products" style={{ textDecoration: 'none' }}>
            <span style={{ fontSize: 'var(--font-size-sm)', fontWeight: 600, color: 'var(--color-accent)', display: 'inline-flex', alignItems: 'center', gap: 4 }}>
              {t('viewAll')} <ArrowUpRight style={{ width: 14, height: 14 }} />
            </span>
          </Link>
        </div>
        {stats.recentProducts.length === 0 ? (
          <div className="bp-table__empty">
            <p>{t('noProducts')}</p>
          </div>
        ) : (
          <div className="bp-table-wrap">
            <table className="bp-table">
              <thead>
                <tr>
                  <th>{tProducts('styleNumber')}</th>
                  <th>{tProducts('productName')}</th>
                  <th>{tProducts('season')}</th>
                  <th>{tProducts('status')}</th>
                  <th>{t('updateDate')}</th>
                </tr>
              </thead>
              <tbody>
                {stats.recentProducts.map((p) => (
                  <tr key={p.id}>
                    <td>
                      <Link href={`/products/${p.id}`} className="bp-table__link">
                        {p.styleNumber}
                      </Link>
                    </td>
                    <td style={{ fontWeight: 600 }}>{p.name}</td>
                    <td>{p.season || '-'}</td>
                    <td>
                      <span className={`bp-badge ${PRODUCT_STATUS_COLORS[p.status]}`}>
                        {tConstants(`productStatus.${p.status}`)}
                      </span>
                    </td>
                    <td>{new Date(p.updatedAt).toLocaleDateString()}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </>
  )
}
