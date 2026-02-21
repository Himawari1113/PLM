'use client'

import { useEffect, useState, useRef, useMemo } from 'react'
import { Link } from '@/lib/navigation'
import { useTranslations } from 'next-intl'
import { BpPageHeader } from '@/components/common'
import { useYearFilter } from '@/contexts/YearFilterContext'
import { Activity } from 'lucide-react'

const PAGE_SIZE = 60

interface Milestone {
  id: string
  name: string
  sortOrder: number
}

interface SampleRow {
  id: string
  sampleNumber: string
  sampleName: string
  status: string
  product: { id: string; styleNumber: string; name: string }
  progressByMilestone: Record<string, { completed: boolean; completedAt: string | null }>
  completionRate: number
}

export default function ProgressManagementPage() {
  const t = useTranslations('progress')
  const tSamples = useTranslations('samples')
  const { selectedYear, selectedSeason, availableSeasons } = useYearFilter()

  const [milestones, setMilestones] = useState<Milestone[]>([])
  const [rows, setRows] = useState<SampleRow[]>([])
  const [loading, setLoading] = useState(true)

  // Infinite scroll
  const [visibleCount, setVisibleCount] = useState(PAGE_SIZE)
  const visibleCountRef = useRef(PAGE_SIZE)
  const sentinelRef = useRef<HTMLDivElement>(null)

  const fetchData = async () => {
    setLoading(true)
    const params = new URLSearchParams()
    if (selectedYear !== null) params.set('year', String(selectedYear))
    if (selectedSeason !== null) params.set('season', String(selectedSeason))
    const res = await fetch(`/api/progress/samples?${params.toString()}`)
    const data = await res.json()
    setMilestones(Array.isArray(data.milestones) ? data.milestones : [])
    setRows(Array.isArray(data.rows) ? data.rows : [])
    setLoading(false)
  }

  useEffect(() => {
    fetchData()
  }, [selectedYear, selectedSeason])

  // infinite scroll logic
  useEffect(() => {
    setVisibleCount(PAGE_SIZE)
  }, [rows])

  useEffect(() => {
    visibleCountRef.current = visibleCount
  }, [visibleCount])

  useEffect(() => {
    const sentinel = sentinelRef.current
    if (!sentinel) return
    const observer = new IntersectionObserver((entries) => {
      if (entries[0].isIntersecting && visibleCountRef.current < rows.length) {
        setVisibleCount((prev) => Math.min(prev + PAGE_SIZE, rows.length))
      }
    })
    observer.observe(sentinel)
    return () => observer.disconnect()
  }, [rows.length])

  const visibleData = useMemo(() => rows.slice(0, visibleCount), [rows, visibleCount])

  const toggle = async (sampleId: string, milestoneId: string, checked: boolean) => {
    await fetch('/api/progress', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ sampleId, milestoneId, completed: checked }),
    })
    setRows((prev) =>
      prev.map((r) =>
        r.id !== sampleId
          ? r
          : {
            ...r,
            progressByMilestone: {
              ...r.progressByMilestone,
              [milestoneId]: { completed: checked, completedAt: checked ? new Date().toISOString() : null },
            },
            completionRate: milestones.length
              ? Math.round(
                (Object.entries({
                  ...r.progressByMilestone,
                  [milestoneId]: { completed: checked, completedAt: null },
                }).filter(([, value]) => value.completed).length /
                  milestones.length) *
                100,
              )
              : 0,
          },
      ),
    )
  }

  return (
    <>
      <div style={{ position: 'sticky', top: 48, zIndex: 20, background: 'var(--color-bg)' }}>
        <BpPageHeader
          title={t('title')}
          titleMeta={<span className="bp-page__subtitle">({rows.length} {tSamples('samples')})</span>}
          actions={
            <Link href="/milestones">
              <button className="bp-button bp-button--secondary">{t('manageMilestones')}</button>
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
                <Activity style={{ width: 14, height: 14, color: 'var(--color-primary)' }} />
                <span style={{ fontSize: 'var(--font-size-sm)', fontWeight: 600 }}>{rows.length}</span>
                <span style={{ fontSize: 'var(--font-size-xs)', color: 'var(--color-text-secondary)' }}>samples tracked</span>
              </div>
            </div>
          )}
        </div>
      </div>

      <div className="bp-card">
        {loading ? (
          <div className="bp-spinner-wrap"><div className="bp-spinner" /></div>
        ) : rows.length === 0 ? (
          <div className="bp-table__empty"><p>{t('noSamples')}</p></div>
        ) : (
          <div style={{ overflowX: 'auto' }}>
            <table className="bp-table" style={{ width: '100%', minWidth: 1000, borderCollapse: 'collapse' }}>
              <thead>
                <tr>
                  <th style={{ paddingLeft: 16 }}>{tSamples('sampleNumber')}</th>
                  <th>{tSamples('sampleName')}</th>
                  <th>Style No.</th>
                  {milestones.map((m) => (
                    <th key={m.id} style={{ textAlign: 'center' }}>{m.name}</th>
                  ))}
                  <th style={{ paddingRight: 16, textAlign: 'center' }}>{t('completion')}</th>
                </tr>
              </thead>
              <tbody>
                {visibleData.map((row) => (
                  <tr key={row.id}>
                    <td style={{ paddingLeft: 16 }}>
                      <Link href={`/products/${row.product.id}/samples/${row.id}`} className="bp-table__link">
                        {row.sampleNumber}
                      </Link>
                    </td>
                    <td>{row.sampleName}</td>
                    <td>
                      <Link href={`/products/${row.product.id}`} className="bp-table__link">
                        {row.product.styleNumber}
                      </Link>
                    </td>
                    {milestones.map((m) => {
                      const checked = !!row.progressByMilestone[m.id]?.completed
                      return (
                        <td key={m.id} style={{ textAlign: 'center' }}>
                          <input
                            type="checkbox"
                            checked={checked}
                            onChange={(e) => toggle(row.id, m.id, e.target.checked)}
                          />
                        </td>
                      )
                    })}
                    <td style={{ paddingRight: 16, textAlign: 'center' }}>
                      <span className="bp-badge bp-badge--info">{row.completionRate}%</span>
                    </td>
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
