'use client'

import { useEffect, useState } from 'react'
import { Plus, ExternalLink, Trash2, Tag } from 'lucide-react'
import { useTranslations } from 'next-intl'
import { BpPageHeader } from '@/components/common'
import { useYearFilter } from '@/contexts/YearFilterContext'

interface TrendItem {
  id: string
  title: string
  url: string | null
  imageUrl: string | null
  description: string | null
  tags: string[]
  season: { id: string; name: string } | null
  createdAt: string
}

export default function TrendsPage() {
  const t = useTranslations('trends')
  const tCommon = useTranslations('common')
  const { selectedYear, selectedSeason } = useYearFilter()
  const [trends, setTrends] = useState<TrendItem[]>([])
  const [selectedTag, setSelectedTag] = useState('')
  const [showForm, setShowForm] = useState(false)
  const [form, setForm] = useState({ title: '', url: '', imageUrl: '', description: '', tags: '', seasonId: '' })
  const [seasons, setSeasons] = useState<{ id: string; name: string }[]>([])

  const fetchTrends = async () => {
    const params = new URLSearchParams()
    if (selectedTag) params.set('tag', selectedTag)
    if (selectedYear !== null) params.set('year', String(selectedYear))
    if (selectedSeason !== null) params.set('season', String(selectedSeason))
    const res = await fetch(`/api/trends?${params}`)
    setTrends(await res.json())
  }

  useEffect(() => {
    fetchTrends()
    const seasonParams = new URLSearchParams()
    if (selectedYear !== null) seasonParams.set('year', String(selectedYear))
    if (selectedSeason !== null) seasonParams.set('season', String(selectedSeason))
    fetch(`/api/seasons?${seasonParams.toString()}`).then((r) => r.json()).then(setSeasons)
  }, [selectedTag, selectedYear, selectedSeason])

  const allTags = Array.from(new Set(trends.flatMap((t) => t.tags)))

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    await fetch('/api/trends', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        ...form,
        tags: form.tags.split(',').map((t) => t.trim()).filter(Boolean),
        seasonId: form.seasonId || null,
      }),
    })
    setForm({ title: '', url: '', imageUrl: '', description: '', tags: '', seasonId: '' })
    setShowForm(false)
    fetchTrends()
  }

  const deleteTrend = async (id: string) => {
    if (!confirm(t('deleteConfirm'))) return
    await fetch(`/api/trends/${id}`, { method: 'DELETE' })
    fetchTrends()
  }

  return (
    <>
      <BpPageHeader
        title={t('title')}
        titleMeta={<span className="bp-page__subtitle">{trends.length} {tCommon('items')}</span>}
        actions={
          <button className="bp-button bp-button--primary" onClick={() => setShowForm(!showForm)}>
            <Plus style={{ width: 16, height: 16 }} />
            {t('newTrend')}
          </button>
        }
      />

      {showForm && (
        <div className="bp-card" style={{ marginBottom: 24 }}>
          <div className="bp-card__header">
            <h2 className="bp-card__title">{t('registerTrend')}</h2>
          </div>
          <div className="bp-card__content">
            <form onSubmit={handleSubmit} style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: 16 }}>
              <div className="bp-form-group">
                <label className="bp-label">{t('trendTitle')} *</label>
                <input className="bp-input" value={form.title} onChange={(e) => setForm({ ...form, title: e.target.value })} placeholder={t('placeholderTitle')} required />
              </div>
              <div className="bp-form-group">
                <label className="bp-label">{t('url')}</label>
                <input className="bp-input" value={form.url} onChange={(e) => setForm({ ...form, url: e.target.value })} placeholder={t('placeholderURL')} />
              </div>
              <div className="bp-form-group">
                <label className="bp-label">{t('imageUrl')}</label>
                <input className="bp-input" value={form.imageUrl} onChange={(e) => setForm({ ...form, imageUrl: e.target.value })} placeholder={t('placeholderURL')} />
              </div>
              <div className="bp-form-group">
                <label className="bp-label">{t('season')}</label>
                <select className="bp-select" value={form.seasonId} onChange={(e) => setForm({ ...form, seasonId: e.target.value })}>
                  <option value="">{t('none')}</option>
                  {seasons.map((s) => <option key={s.id} value={s.id}>{s.name}</option>)}
                </select>
              </div>
              <div className="bp-form-group">
                <label className="bp-label">{t('tags')}</label>
                <input className="bp-input" value={form.tags} onChange={(e) => setForm({ ...form, tags: e.target.value })} placeholder={t('placeholderTags')} />
              </div>
              <div className="bp-form-group" style={{ gridColumn: '1 / -1' }}>
                <label className="bp-label">{t('description')}</label>
                <textarea className="bp-textarea" value={form.description} onChange={(e) => setForm({ ...form, description: e.target.value })} rows={3} />
              </div>
              <div style={{ gridColumn: '1 / -1', display: 'flex', gap: 8 }}>
                <button type="submit" className="bp-button bp-button--primary">{tCommon('save')}</button>
                <button type="button" className="bp-button bp-button--secondary" onClick={() => setShowForm(false)}>{tCommon('cancel')}</button>
              </div>
            </form>
          </div>
        </div>
      )}

      {allTags.length > 0 && (
        <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8, marginBottom: 24 }}>
          <button
            className={`bp-button ${selectedTag === '' ? 'bp-button--primary' : 'bp-button--secondary'} bp-button--sm`}
            onClick={() => setSelectedTag('')}
          >
            {t('all')}
          </button>
          {allTags.map((tag) => (
            <button
              key={tag}
              className={`bp-button ${selectedTag === tag ? 'bp-button--primary' : 'bp-button--secondary'} bp-button--sm`}
              onClick={() => setSelectedTag(tag)}
            >
              <Tag style={{ width: 12, height: 12 }} />{tag}
            </button>
          ))}
        </div>
      )}

      {trends.length === 0 ? (
        <p style={{ color: 'var(--color-gray-400)', textAlign: 'center', padding: 40 }}>{t('noTrends')}</p>
      ) : (
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(320px, 1fr))', gap: 16 }}>
          {trends.map((trend) => (
            <div key={trend.id} className="bp-card" style={{ overflow: 'hidden' }}>
              {trend.imageUrl && (
                <div style={{ aspectRatio: '16/9', overflow: 'hidden', background: 'var(--color-gray-100)' }}>
                  <img src={trend.imageUrl} alt={trend.title} style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                </div>
              )}
              <div className="bp-card__content">
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: 8 }}>
                  <h3 style={{ fontWeight: 700, fontSize: 'var(--font-size-base)' }}>{trend.title}</h3>
                  <button
                    className="bp-button bp-button--ghost bp-button--icon bp-button--sm"
                    onClick={() => deleteTrend(trend.id)}
                  >
                    <Trash2 style={{ width: 14, height: 14, color: 'var(--color-gray-400)' }} />
                  </button>
                </div>
                {trend.description && (
                  <p style={{ marginTop: 4, fontSize: 'var(--font-size-sm)', color: 'var(--color-gray-500)', display: '-webkit-box', WebkitLineClamp: 3, WebkitBoxOrient: 'vertical', overflow: 'hidden' }}>
                    {trend.description}
                  </p>
                )}
                {trend.url && (
                  <a href={trend.url} target="_blank" rel="noopener noreferrer" style={{ marginTop: 8, display: 'inline-flex', alignItems: 'center', gap: 4, fontSize: 'var(--font-size-sm)', color: 'var(--color-accent)', textDecoration: 'none' }}>
                    <ExternalLink style={{ width: 12, height: 12 }} />{t('openLink')}
                  </a>
                )}
                <div style={{ marginTop: 12, display: 'flex', flexWrap: 'wrap', gap: 4 }}>
                  {trend.tags.map((tag) => (
                    <span key={tag} className="bp-badge bp-badge--neutral" style={{ cursor: 'pointer' }} onClick={() => setSelectedTag(tag)}>
                      {tag}
                    </span>
                  ))}
                </div>
                <div style={{ marginTop: 8, display: 'flex', justifyContent: 'space-between', fontSize: 'var(--font-size-xs)', color: 'var(--color-gray-400)' }}>
                  {trend.season && <span>{trend.season.name}</span>}
                  <span>{new Date(trend.createdAt).toLocaleDateString()}</span>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </>
  )
}
