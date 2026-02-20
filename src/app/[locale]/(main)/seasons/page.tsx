'use client'

import { useEffect, useState } from 'react'
import { Link } from '@/lib/navigation'
import { SEASON_TERMS } from '@/lib/constants'
import { Plus, Calendar, ChevronRight } from 'lucide-react'
import { useTranslations } from 'next-intl'
import { BpPageHeader } from '@/components/common'

interface Season {
  id: string
  name: string
  seasonCode: number
  seasonName: string
  description: string | null
  collections: { id: string; name: string; _count: { products: number } }[]
}

export default function SeasonsPage() {
  const t = useTranslations('seasons')
  const tCommon = useTranslations('common')
  const tConstants = useTranslations('constants')
  const [seasons, setSeasons] = useState<Season[]>([])
  const [showForm, setShowForm] = useState(false)
  const [form, setForm] = useState({ name: '', seasonCode: 0, seasonName: 'SS', description: '' })

  const fetchSeasons = async () => {
    const res = await fetch('/api/seasons')
    setSeasons(await res.json())
  }

  useEffect(() => { fetchSeasons() }, [])

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    await fetch('/api/seasons', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(form),
    })
    setForm({ name: '', seasonCode: 0, seasonName: 'SS', description: '' })
    setShowForm(false)
    fetchSeasons()
  }

  return (
    <>
      <BpPageHeader
        title="Season Master"
        titleMeta={<span className="bp-page__subtitle">{seasons.length} {tCommon('items')}</span>}
        actions={
          <button className="bp-button bp-button--primary" onClick={() => setShowForm(!showForm)}>
            <Plus style={{ width: 16, height: 16 }} />
            {t('newSeason')}
          </button>
        }
      />

      {showForm && (
        <div className="bp-card" style={{ marginBottom: 24 }}>
          <div className="bp-card__header">
            <h2 className="bp-card__title">{t('registerSeason')}</h2>
          </div>
          <div className="bp-card__content">
            <form onSubmit={handleSubmit} style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: 16 }}>
              <div className="bp-form-group">
                <label className="bp-label">{t('seasonName')}</label>
                <input
                  className="bp-input"
                  value={form.name}
                  onChange={(e) => setForm({ ...form, name: e.target.value })}
                  placeholder={t('namePlaceholder')}
                  required
                />
              </div>
              <div className="bp-form-group">
                <label className="bp-label">Season Code</label>
                <input
                  className="bp-input"
                  type="number"
                  value={form.seasonCode}
                  onChange={(e) => setForm({ ...form, seasonCode: parseInt(e.target.value) || 0 })}
                  required
                />
              </div>
              <div className="bp-form-group">
                <label className="bp-label">Season Name</label>
                <select className="bp-select" value={form.seasonName} onChange={(e) => setForm({ ...form, seasonName: e.target.value })}>
                  {SEASON_TERMS.map((term) => (
                    <option key={term.value} value={term.value}>{tConstants(`seasonTerms.${term.value}`)}</option>
                  ))}
                </select>
              </div>
              <div className="bp-form-group">
                <label className="bp-label">{t('description')}</label>
                <textarea
                  className="bp-textarea"
                  value={form.description}
                  onChange={(e) => setForm({ ...form, description: e.target.value })}
                />
              </div>
              <div style={{ gridColumn: '1 / -1', display: 'flex', gap: 8 }}>
                <button type="submit" className="bp-button bp-button--primary">{tCommon('save')}</button>
                <button type="button" className="bp-button bp-button--secondary" onClick={() => setShowForm(false)}>{tCommon('cancel')}</button>
              </div>
            </form>
          </div>
        </div>
      )}

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(320px, 1fr))', gap: 16 }}>
        {seasons.map((season) => (
          <Link key={season.id} href={`/seasons/${season.id}`} style={{ textDecoration: 'none' }}>
            <div className="bp-card" style={{ cursor: 'pointer', transition: 'all var(--transition-fast)' }}>
              <div className="bp-card__header">
                <h3 className="bp-card__title">{season.name}</h3>
                <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                  <span style={{ fontSize: 'var(--font-size-sm)', color: 'var(--color-gray-500)' }}>Code: {season.seasonCode}</span>
                  <Calendar style={{ width: 20, height: 20, color: 'var(--color-gray-400)' }} />
                </div>
              </div>
              <div className="bp-card__content">
                {season.description && (
                  <p style={{ fontSize: 'var(--font-size-sm)', color: 'var(--color-gray-500)', marginBottom: 12 }}>{season.description}</p>
                )}
                <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
                  {season.collections.map((col) => (
                    <div key={col.id} style={{ display: 'flex', justifyContent: 'space-between', fontSize: 'var(--font-size-sm)' }}>
                      <span>{col.name}</span>
                      <span style={{ color: 'var(--color-gray-400)' }}>{col._count.products} {tCommon('items')}</span>
                    </div>
                  ))}
                  {season.collections.length === 0 && (
                    <p style={{ fontSize: 'var(--font-size-sm)', color: 'var(--color-gray-400)' }}>{t('noCollections')}</p>
                  )}
                </div>
                <div style={{ marginTop: 12, display: 'flex', alignItems: 'center', fontSize: 'var(--font-size-sm)', color: 'var(--color-accent)' }}>
                  {tCommon('viewDetails')} <ChevronRight style={{ width: 16, height: 16, marginLeft: 4 }} />
                </div>
              </div>
            </div>
          </Link>
        ))}
        {seasons.length === 0 && (
          <p style={{ gridColumn: '1 / -1', color: 'var(--color-gray-400)', textAlign: 'center', padding: 40 }}>{t('noSeasons')}</p>
        )}
      </div>
    </>
  )
}
