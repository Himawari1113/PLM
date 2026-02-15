'use client'

import { useEffect, useMemo, useState } from 'react'
import { useTranslations } from 'next-intl'
import { BpPageHeader } from '@/components/common'

interface Milestone {
  id: string
  name: string
  isActive: boolean
}

const STORAGE_KEY = 'plm-schedule-draft-v1'

function formatDateKey(date: Date): string {
  const y = date.getFullYear()
  const m = String(date.getMonth() + 1).padStart(2, '0')
  const d = String(date.getDate()).padStart(2, '0')
  return `${y}-${m}-${d}`
}

export default function SchedulePage() {
  const t = useTranslations('schedule')

  const [monthCursor, setMonthCursor] = useState(() => new Date())
  const [selectedDate, setSelectedDate] = useState(() => new Date())
  const [milestones, setMilestones] = useState<Milestone[]>([])
  const [assignments, setAssignments] = useState<Record<string, string[]>>({})

  useEffect(() => {
    fetch('/api/milestones')
      .then((r) => r.json())
      .then((data) => setMilestones((Array.isArray(data) ? data : []).filter((m) => m.isActive)))
  }, [])

  useEffect(() => {
    const raw = localStorage.getItem(STORAGE_KEY)
    if (!raw) return
    try {
      const parsed = JSON.parse(raw) as Record<string, string[]>
      setAssignments(parsed || {})
    } catch {
      // ignore invalid draft payload
    }
  }, [])

  useEffect(() => {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(assignments))
  }, [assignments])

  const monthLabel = useMemo(
    () =>
      new Intl.DateTimeFormat(undefined, {
        year: 'numeric',
        month: 'long',
      }).format(monthCursor),
    [monthCursor],
  )

  const days = useMemo(() => {
    const first = new Date(monthCursor.getFullYear(), monthCursor.getMonth(), 1)
    const start = new Date(first)
    start.setDate(1 - first.getDay())
    return Array.from({ length: 42 }, (_, i) => {
      const d = new Date(start)
      d.setDate(start.getDate() + i)
      return d
    })
  }, [monthCursor])

  const selectedKey = formatDateKey(selectedDate)
  const selectedAssignments = assignments[selectedKey] || []

  const toggleMilestone = (milestoneId: string) => {
    setAssignments((prev) => {
      const current = prev[selectedKey] || []
      const next = current.includes(milestoneId)
        ? current.filter((id) => id !== milestoneId)
        : [...current, milestoneId]
      return { ...prev, [selectedKey]: next }
    })
  }

  return (
    <>
      <BpPageHeader title={t('title')} subtitle={t('subtitle')} />

      <div className="bp-card" style={{ marginBottom: 16 }}>
        <div className="bp-card__content" style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
          <button
            className="bp-button bp-button--secondary"
            onClick={() => setMonthCursor(new Date(monthCursor.getFullYear(), monthCursor.getMonth() - 1, 1))}
          >
            {t('previousMonth')}
          </button>
          <h2 className="bp-card__title">{monthLabel}</h2>
          <button
            className="bp-button bp-button--secondary"
            onClick={() => setMonthCursor(new Date(monthCursor.getFullYear(), monthCursor.getMonth() + 1, 1))}
          >
            {t('nextMonth')}
          </button>
        </div>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: '2fr 1fr', gap: 16 }}>
        <div className="bp-card">
          <div className="bp-card__content">
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(7, 1fr)', gap: 8 }}>
              {days.map((d) => {
                const inMonth = d.getMonth() === monthCursor.getMonth()
                const key = formatDateKey(d)
                const isSelected = key === selectedKey
                const count = assignments[key]?.length || 0
                return (
                  <button
                    key={key}
                    className={`bp-button ${isSelected ? 'bp-button--primary' : 'bp-button--secondary'}`}
                    style={{
                      display: 'grid',
                      justifyItems: 'start',
                      gap: 4,
                      height: 72,
                      opacity: inMonth ? 1 : 0.45,
                    }}
                    onClick={() => setSelectedDate(d)}
                  >
                    <span>{d.getDate()}</span>
                    {count > 0 ? <span className="bp-badge bp-badge--info">{count}</span> : null}
                  </button>
                )
              })}
            </div>
          </div>
        </div>

        <div className="bp-card">
          <div className="bp-card__header">
            <h2 className="bp-card__title">{t('milestoneAssignment')}</h2>
          </div>
          <div className="bp-card__content" style={{ display: 'grid', gap: 10 }}>
            <div style={{ fontSize: 'var(--font-size-sm)', color: 'var(--color-gray-600)' }}>
              {t('selectedDate')}: {selectedKey}
            </div>
            {milestones.length === 0 ? (
              <p style={{ color: 'var(--color-gray-500)' }}>{t('noMilestones')}</p>
            ) : (
              milestones.map((m) => (
                <label key={m.id} style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                  <input
                    type="checkbox"
                    checked={selectedAssignments.includes(m.id)}
                    onChange={() => toggleMilestone(m.id)}
                  />
                  <span>{m.name}</span>
                </label>
              ))
            )}
            {selectedAssignments.length === 0 ? (
              <p style={{ color: 'var(--color-gray-400)', fontSize: 'var(--font-size-sm)' }}>{t('noAssignments')}</p>
            ) : null}
          </div>
        </div>
      </div>
    </>
  )
}
