'use client'

import { useEffect, useMemo, useState } from 'react'
import { Link } from '@/lib/navigation'
import { Palette, Plus } from 'lucide-react'
import { useTranslations } from 'next-intl'
import { BpPageHeader } from '@/components/common'

interface ColorItem {
  id: string
  colorCode: string
  colorName: string
  pantoneCode: string | null
  pantoneName: string | null
  rgbValue: string | null
  colorImage: string | null
  colorType: 'SOLID' | 'PATTERN'
  createdAt: string
}

export default function ColorsPage() {
  const t = useTranslations('colors')
  const tCommon = useTranslations('common')

  const [colors, setColors] = useState<ColorItem[]>([])
  const [search, setSearch] = useState('')
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')

  const fetchColors = async () => {
    setLoading(true)
    setError('')
    try {
      const res = await fetch('/api/colors')
      if (!res.ok) {
        throw new Error(`Failed to fetch colors: ${res.status}`)
      }
      const data = await res.json()
      setColors(Array.isArray(data) ? data : [])
    } catch {
      setColors([])
      setError('Failed to load colors.')
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    fetchColors()
  }, [])

  const filteredColors = useMemo(() => {
    const q = search.trim().toLowerCase()
    if (!q) return colors
    return colors.filter(
      (c) =>
        c.colorCode.toLowerCase().includes(q) ||
        c.colorName.toLowerCase().includes(q) ||
        (c.pantoneCode || '').toLowerCase().includes(q) ||
        (c.pantoneName || '').toLowerCase().includes(q) ||
        (c.rgbValue || '').toLowerCase().includes(q),
    )
  }, [colors, search])

  const removeColor = async (id: string) => {
    if (!confirm(t('deleteConfirm'))) return
    const res = await fetch(`/api/colors/${id}`, { method: 'DELETE' })
    if (res.ok) await fetchColors()
  }

  return (
    <>
      <BpPageHeader
        title={t('title')}
        titleMeta={<span className="bp-page__subtitle">({filteredColors.length})</span>}
        actions={
          <Link href="/colors/new">
            <button className="bp-button bp-button--primary">
              <Plus style={{ width: 16, height: 16 }} />
              {t('newColor')}
            </button>
          </Link>
        }
      />

      <div className="bp-card">
        <div className="bp-toolbar">
          <div className="bp-toolbar__search">
            <input
              className="bp-input"
              placeholder={t('searchPlaceholder')}
              value={search}
              onChange={(e) => setSearch(e.target.value)}
            />
          </div>
        </div>

        {loading ? (
          <div className="bp-spinner-wrap">
            <div className="bp-spinner" />
          </div>
        ) : error ? (
          <div className="bp-table__empty">
            <p>{error}</p>
          </div>
        ) : filteredColors.length === 0 ? (
          <div className="bp-table__empty">
            <Palette className="bp-table__empty-icon" />
            <p>{t('noColors')}</p>
          </div>
        ) : (
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(190px, 190px))', justifyContent: 'start', gap: 12, padding: 12 }}>
            {filteredColors.map((item) => (
              <div key={item.id} className="bp-card" style={{ border: '1px solid var(--color-border)', overflow: 'hidden' }}>
                <div className="bp-card__content" style={{ display: 'grid', gap: 6, padding: 10 }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: 8 }}>
                    <div style={{ display: 'grid', gap: 2 }}>
                      <strong style={{ fontSize: 'var(--font-size-sm)' }}>{item.colorCode}</strong>
                      <span style={{ fontSize: 'var(--font-size-xs)', color: 'var(--color-gray-600)' }}>{item.colorName}</span>
                    </div>
                    <span className={`bp-badge ${item.colorType === 'SOLID' ? 'bp-badge--success' : 'bp-badge--accent'}`}>
                      {item.colorType === 'SOLID' ? t('solid') : t('pattern')}
                    </span>
                  </div>

                  <div style={{ display: 'flex', justifyContent: 'center' }}>
                    {item.colorImage ? (
                      <img
                        src={item.colorImage}
                        alt={item.colorCode}
                        style={{ width: 132, height: 132, objectFit: 'cover', borderRadius: 'var(--radius-md)', border: '1px solid var(--color-border)' }}
                      />
                    ) : (
                      <div style={{ width: 132, height: 132, borderRadius: 'var(--radius-md)', border: '1px dashed var(--color-border)', display: 'grid', placeItems: 'center', color: 'var(--color-gray-400)' }}>
                        -
                      </div>
                    )}
                  </div>

                  <div style={{ display: 'grid', gap: 4 }}>
                    <div style={{ fontSize: 'var(--font-size-xs)', color: 'var(--color-gray-600)', lineHeight: 1.4 }}>
                      <strong>{t('pantoneCode')}:</strong> {item.pantoneCode || '-'}
                    </div>
                    <div style={{ fontSize: 'var(--font-size-xs)', color: 'var(--color-gray-600)', lineHeight: 1.4 }}>
                      <strong>{t('pantoneName')}:</strong> {item.pantoneName || '-'}
                    </div>
                    <div style={{ fontSize: 'var(--font-size-xs)', color: 'var(--color-gray-600)', lineHeight: 1.4 }}>
                      <strong>{t('rgbValue')}:</strong> {item.rgbValue || '-'}
                    </div>
                  </div>

                  <div style={{ display: 'flex', gap: 8 }}>
                    <Link href={`/colors/${item.id}/edit`}>
                      <button className="bp-button bp-button--secondary bp-button--sm">{tCommon('edit')}</button>
                    </Link>
                    <button className="bp-button bp-button--danger bp-button--sm" onClick={() => removeColor(item.id)}>
                      {tCommon('delete')}
                    </button>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </>
  )
}
