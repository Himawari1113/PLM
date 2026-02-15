'use client'

import { useEffect, useState } from 'react'
import { GripVertical, Plus, Trash2 } from 'lucide-react'
import { useTranslations } from 'next-intl'
import { BpPageHeader } from '@/components/common'

interface Milestone {
  id: string
  name: string
  description: string | null
  sortOrder: number
  isActive: boolean
}

export default function MilestonesPage() {
  const t = useTranslations('milestones')
  const tCommon = useTranslations('common')

  const [milestones, setMilestones] = useState<Milestone[]>([])
  const [loading, setLoading] = useState(true)
  const [draggingId, setDraggingId] = useState<string | null>(null)
  const [form, setForm] = useState({ name: '', description: '' })

  const fetchMilestones = async () => {
    setLoading(true)
    const res = await fetch('/api/milestones')
    const data = await res.json()
    setMilestones(Array.isArray(data) ? data : [])
    setLoading(false)
  }

  useEffect(() => {
    fetchMilestones()
  }, [])

  const addMilestone = async (e: React.FormEvent) => {
    e.preventDefault()
    await fetch('/api/milestones', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(form),
    })
    setForm({ name: '', description: '' })
    fetchMilestones()
  }

  const updateMilestone = async (id: string, patch: Partial<Milestone>) => {
    const current = milestones.find((m) => m.id === id)
    if (!current) return
    const payload = { ...current, ...patch }
    await fetch(`/api/milestones/${id}`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload),
    })
    fetchMilestones()
  }

  const deleteMilestone = async (id: string) => {
    if (!confirm(t('deleteConfirm'))) return
    await fetch(`/api/milestones/${id}`, { method: 'DELETE' })
    fetchMilestones()
  }

  const reorderMilestones = async (fromId: string, toId: string) => {
    if (fromId === toId) return
    const fromIndex = milestones.findIndex((m) => m.id === fromId)
    const toIndex = milestones.findIndex((m) => m.id === toId)
    if (fromIndex < 0 || toIndex < 0) return

    const reordered = [...milestones]
    const [moved] = reordered.splice(fromIndex, 1)
    reordered.splice(toIndex, 0, moved)
    const withOrder = reordered.map((m, idx) => ({ ...m, sortOrder: idx + 1 }))
    setMilestones(withOrder)

    await Promise.all(
      withOrder.map((m) =>
        fetch(`/api/milestones/${m.id}`, {
          method: 'PUT',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(m),
        }),
      ),
    )
  }

  return (
    <>
      <BpPageHeader
        title={t('title')}
        titleMeta={<span className="bp-page__subtitle">({milestones.length})</span>}
      />

      <div className="bp-card" style={{ marginBottom: 16 }}>
        <div className="bp-card__content">
          <form onSubmit={addMilestone} style={{ display: 'grid', gridTemplateColumns: '1fr 1fr auto', gap: 8 }}>
            <input
              className="bp-input"
              placeholder={t('name')}
              value={form.name}
              onChange={(e) => setForm({ ...form, name: e.target.value })}
              required
            />
            <input
              className="bp-input"
              placeholder={t('description')}
              value={form.description}
              onChange={(e) => setForm({ ...form, description: e.target.value })}
            />
            <button type="submit" className="bp-button bp-button--primary">
              <Plus style={{ width: 16, height: 16 }} />
              {t('addMilestone')}
            </button>
          </form>
        </div>
      </div>

      <div className="bp-card">
        {loading ? (
          <div className="bp-spinner-wrap"><div className="bp-spinner" /></div>
        ) : milestones.length === 0 ? (
          <div className="bp-table__empty"><p>{t('noMilestones')}</p></div>
        ) : (
          <div className="bp-table-wrap">
            <table className="bp-table">
              <thead>
                <tr>
                  <th>{t('order')}</th>
                  <th>{t('name')}</th>
                  <th>{t('description')}</th>
                  <th>{t('active')}</th>
                  <th />
                </tr>
              </thead>
              <tbody>
                {milestones.map((m) => (
                  <tr
                    key={m.id}
                    onDragOver={(e) => e.preventDefault()}
                    onDrop={() => {
                      if (draggingId) reorderMilestones(draggingId, m.id)
                    }}
                    style={{
                      opacity: draggingId === m.id ? 0.5 : 1,
                      cursor: 'grab',
                    }}
                  >
                    <td style={{ width: 80 }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                        <button
                          type="button"
                          draggable
                          onDragStart={() => setDraggingId(m.id)}
                          onDragEnd={() => setDraggingId(null)}
                          className="bp-button bp-button--ghost bp-button--icon bp-button--sm"
                          title={t('dragToReorder')}
                          aria-label={t('dragToReorder')}
                          style={{ cursor: 'grab' }}
                        >
                          <GripVertical style={{ width: 14, height: 14 }} />
                        </button>
                        <span style={{ fontSize: 'var(--font-size-xs)', color: 'var(--color-gray-500)' }}>{m.sortOrder}</span>
                      </div>
                    </td>
                    <td style={{ width: 220 }}>
                      <input
                        className="bp-input"
                        value={m.name}
                        onChange={(e) => updateMilestone(m.id, { name: e.target.value })}
                      />
                    </td>
                    <td>
                      <input
                        className="bp-input"
                        value={m.description || ''}
                        onChange={(e) => updateMilestone(m.id, { description: e.target.value })}
                      />
                    </td>
                    <td style={{ width: 90 }}>
                      <input
                        type="checkbox"
                        checked={m.isActive}
                        onChange={(e) => updateMilestone(m.id, { isActive: e.target.checked })}
                      />
                    </td>
                    <td style={{ width: 64 }}>
                      <button className="bp-button bp-button--danger bp-button--sm" onClick={() => deleteMilestone(m.id)}>
                        <Trash2 style={{ width: 14, height: 14 }} />
                        {tCommon('delete')}
                      </button>
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
