'use client'

import { useEffect, useState } from 'react'
import { Link } from '@/lib/navigation'
import { useTranslations } from 'next-intl'
import { BpPageHeader } from '@/components/common'
import { useYearFilter } from '@/contexts/YearFilterContext'

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

  const { selectedYear } = useYearFilter()
  const [milestones, setMilestones] = useState<Milestone[]>([])
  const [rows, setRows] = useState<SampleRow[]>([])
  const [loading, setLoading] = useState(true)

  const fetchData = async () => {
    setLoading(true)
    const params = new URLSearchParams()
    if (selectedYear !== null) params.set('year', String(selectedYear))
    const res = await fetch(`/api/progress/samples?${params.toString()}`)
    const data = await res.json()
    setMilestones(Array.isArray(data.milestones) ? data.milestones : [])
    setRows(Array.isArray(data.rows) ? data.rows : [])
    setLoading(false)
  }

  useEffect(() => {
    fetchData()
  }, [selectedYear])

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
      <BpPageHeader
        title={t('title')}
        actions={
          <Link href="/milestones">
            <button className="bp-button bp-button--secondary">{t('manageMilestones')}</button>
          </Link>
        }
      />

      <div className="bp-card">
        {loading ? (
          <div className="bp-spinner-wrap"><div className="bp-spinner" /></div>
        ) : rows.length === 0 ? (
          <div className="bp-table__empty"><p>{t('noSamples')}</p></div>
        ) : (
          <div className="bp-table-wrap">
            <table className="bp-table">
              <thead>
                <tr>
                  <th>{tSamples('sampleNumber')}</th>
                  <th>{tSamples('sampleName')}</th>
                  <th>Style No.</th>
                  {milestones.map((m) => (
                    <th key={m.id}>{m.name}</th>
                  ))}
                  <th>{t('completion')}</th>
                </tr>
              </thead>
              <tbody>
                {rows.map((row) => (
                  <tr key={row.id}>
                    <td>
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
                    <td>
                      <span className="bp-badge bp-badge--info">{row.completionRate}%</span>
                    </td>
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
