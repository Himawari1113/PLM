'use client'

import { useEffect, useMemo, useRef, useState } from 'react'
import { Link } from '@/lib/navigation'
import { Palette, Plus, Search } from 'lucide-react'
import { useTranslations } from 'next-intl'
import { BpPageHeader } from '@/components/common'
import { useYearFilter } from '@/contexts/YearFilterContext'

const PAGE_SIZE = 60

const TEMPERATURE_STYLES: Record<string, { bg: string; color: string; icon: string }> = {
  WARM:    { bg: '#fff0e8', color: '#c05010', icon: '🔥' },
  COOL:    { bg: '#e8f0ff', color: '#1060c0', icon: '❄️' },
  NEUTRAL: { bg: '#f0f0f0', color: '#606060', icon: '⚪' },
}

interface ColorItem {
  id: string
  colorCode: string
  colorName: string
  pantoneCode: string | null
  pantoneName: string | null
  rgbValue: string | null
  colorImage: string | null
  colorType: 'SOLID' | 'PATTERN'
  cmykC: number | null
  cmykM: number | null
  cmykY: number | null
  cmykK: number | null
  colorTemperature: string | null
  createdAt: string
}

export default function ColorsPage() {
  const t = useTranslations('colors')
  const tCommon = useTranslations('common')
  const { selectedYear, selectedSeason, availableSeasons } = useYearFilter()

  const [colors, setColors] = useState<ColorItem[]>([])
  const [search, setSearch] = useState('')
  const [filterTemperature, setFilterTemperature] = useState('')
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [adoptedCount, setAdoptedCount] = useState<number | null>(null)
  const [adoptedLoading, setAdoptedLoading] = useState(false)

  // Infinite scroll
  const [visibleCount, setVisibleCount] = useState(PAGE_SIZE)
  const visibleCountRef = useRef(PAGE_SIZE)
  const sentinelRef = useRef<HTMLDivElement>(null)

  // Fetch adopted color count for the selected season
  useEffect(() => {
    if (selectedYear === null && selectedSeason === null) {
      setAdoptedCount(null)
      return
    }
    setAdoptedLoading(true)
    const params = new URLSearchParams()
    if (selectedYear !== null) params.set('year', String(selectedYear))
    if (selectedSeason !== null) params.set('season', String(selectedSeason))
    fetch(`/api/samples?${params.toString()}`)
      .then((r) => r.json())
      .then((data) => {
        if (!Array.isArray(data)) { setAdoptedCount(0); return }
        const codes = new Set<string>()
        for (const s of data) {
          if (Array.isArray(s.colors)) {
            for (const c of s.colors) { if (c.colorCode) codes.add(c.colorCode) }
          }
        }
        setAdoptedCount(codes.size)
      })
      .catch(() => setAdoptedCount(null))
      .finally(() => setAdoptedLoading(false))
  }, [selectedYear, selectedSeason])

  const fetchColors = async () => {
    setLoading(true)
    setError('')
    try {
      const res = await fetch('/api/colors')
      if (!res.ok) throw new Error(`Failed to fetch colors: ${res.status}`)
      const data = await res.json()
      setColors(Array.isArray(data) ? data : [])
    } catch {
      setColors([])
      setError('Failed to load colors.')
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => { fetchColors() }, [])

  const filteredColors = useMemo(() => {
    const q = search.trim().toLowerCase()
    return colors.filter((c) => {
      if (filterTemperature && c.colorTemperature !== filterTemperature) return false
      if (!q) return true
      return (
        c.colorCode.toLowerCase().includes(q) ||
        c.colorName.toLowerCase().includes(q) ||
        (c.pantoneCode || '').toLowerCase().includes(q) ||
        (c.pantoneName || '').toLowerCase().includes(q) ||
        (c.rgbValue || '').toLowerCase().includes(q)
      )
    })
  }, [colors, search, filterTemperature])

  // Reset visible count when filter results change
  useEffect(() => {
    setVisibleCount(PAGE_SIZE)
  }, [filteredColors])

  // Keep ref in sync with state (avoids stale closure in observer callback)
  useEffect(() => {
    visibleCountRef.current = visibleCount
  }, [visibleCount])

  // IntersectionObserver for infinite scroll
  useEffect(() => {
    const sentinel = sentinelRef.current
    if (!sentinel) return
    const observer = new IntersectionObserver((entries) => {
      if (entries[0].isIntersecting && visibleCountRef.current < filteredColors.length) {
        setVisibleCount((prev) => Math.min(prev + PAGE_SIZE, filteredColors.length))
      }
    })
    observer.observe(sentinel)
    return () => observer.disconnect()
  }, [filteredColors.length])

  const tempCounts = useMemo(() => {
    const counts: Record<string, number> = { WARM: 0, COOL: 0, NEUTRAL: 0 }
    for (const c of colors) {
      if (c.colorTemperature && counts[c.colorTemperature] !== undefined) counts[c.colorTemperature]++
    }
    return counts
  }, [colors])

  const removeColor = async (id: string) => {
    if (!confirm(t('deleteConfirm'))) return
    const res = await fetch(`/api/colors/${id}`, { method: 'DELETE' })
    if (res.ok) await fetchColors()
  }

  return (
    <>
      {/* Sticky header: title bar + filters */}
      <div style={{ position: 'sticky', top: 48, zIndex: 20, background: 'var(--color-bg)' }}>
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
        <div style={{ background: 'var(--color-surface, #fff)', borderBottom: '1px solid var(--color-border)' }}>
          {/* Season stats banner */}
          {(selectedYear !== null || selectedSeason !== null) && (
            <div style={{ display: 'flex', alignItems: 'center', gap: 16, padding: '6px 16px', borderBottom: '1px solid var(--color-border)', background: 'var(--color-gray-50)', flexWrap: 'wrap' }}>
              <span style={{ fontSize: 'var(--font-size-sm)', color: 'var(--color-text-secondary)' }}>
                {[selectedYear, availableSeasons.find((s) => s.code === selectedSeason)?.label].filter(Boolean).join(' ')}
              </span>
              <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                <Palette style={{ width: 14, height: 14, color: 'var(--color-primary)' }} />
                <span style={{ fontSize: 'var(--font-size-sm)', fontWeight: 600 }}>
                  {adoptedLoading ? '…' : (adoptedCount ?? 0)}
                </span>
                <span style={{ fontSize: 'var(--font-size-xs)', color: 'var(--color-text-secondary)' }}>colors adopted</span>
              </div>
            </div>
          )}

          {/* Search + Temperature filter toolbar */}
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
            {(['WARM', 'COOL', 'NEUTRAL'] as const).map((temp) => {
              const style = TEMPERATURE_STYLES[temp]
              const active = filterTemperature === temp
              return (
                <button
                  key={temp}
                  onClick={() => setFilterTemperature(active ? '' : temp)}
                  style={{
                    fontSize: 'var(--font-size-xs)', padding: '4px 10px', borderRadius: 12,
                    border: `1px solid ${active ? style.color : 'var(--color-border)'}`,
                    background: active ? style.bg : 'transparent',
                    color: active ? style.color : 'var(--color-text-secondary)',
                    cursor: 'pointer', fontWeight: active ? 600 : 400, whiteSpace: 'nowrap',
                  }}
                >
                  {style.icon} {temp} ({tempCounts[temp]})
                </button>
              )
            })}
          </div>
        </div>
      </div>

      <div className="bp-card">
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
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(155px, 155px))', justifyContent: 'start', gap: 12, padding: 12 }}>
            {filteredColors.slice(0, visibleCount).map((item) => {
              const tempStyle = item.colorTemperature ? TEMPERATURE_STYLES[item.colorTemperature] : null
              const hasCmyk = item.cmykC != null && item.cmykM != null && item.cmykY != null && item.cmykK != null
              const swatchBg = item.rgbValue && !item.colorImage ? item.rgbValue : undefined

              return (
                <div key={item.id} className="bp-card" style={{ border: '1px solid var(--color-border)', overflow: 'hidden' }}>
                  <div className="bp-card__content" style={{ display: 'grid', gap: 6, padding: 10 }}>
                    {/* Header */}
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: 4 }}>
                      <div style={{ display: 'grid', gap: 2, minWidth: 0 }}>
                        <strong style={{ fontSize: 'var(--font-size-sm)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{item.colorCode}</strong>
                        <span style={{ fontSize: 'var(--font-size-xs)', color: 'var(--color-gray-600)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{item.colorName}</span>
                      </div>
                      <span className={`bp-badge ${item.colorType === 'SOLID' ? 'bp-badge--success' : 'bp-badge--accent'}`} style={{ flexShrink: 0 }}>
                        {item.colorType === 'SOLID' ? t('solid') : t('pattern')}
                      </span>
                    </div>

                    {/* Swatch */}
                    <div style={{ display: 'flex', justifyContent: 'center' }}>
                      {item.colorImage ? (
                        <img
                          src={item.colorImage}
                          alt={item.colorCode}
                          style={{ width: 110, height: 110, objectFit: 'cover', borderRadius: 'var(--radius-md)', border: '1px solid var(--color-border)' }}
                        />
                      ) : swatchBg ? (
                        <div style={{ width: 110, height: 110, borderRadius: 'var(--radius-md)', border: '1px solid var(--color-border)', background: swatchBg }} />
                      ) : (
                        <div style={{ width: 110, height: 110, borderRadius: 'var(--radius-md)', border: '1px dashed var(--color-border)', display: 'grid', placeItems: 'center', color: 'var(--color-gray-400)' }}>
                          -
                        </div>
                      )}
                    </div>

                    {/* Color data */}
                    <div style={{ display: 'grid', gap: 2 }}>
                      <div style={{ fontSize: 'var(--font-size-xs)', color: 'var(--color-gray-600)', lineHeight: 1.4 }}>
                        <strong>PMS:</strong> {item.pantoneCode || '-'}
                      </div>
                      {hasCmyk ? (
                        <div style={{ fontSize: 'var(--font-size-xs)', color: 'var(--color-gray-600)', lineHeight: 1.4 }}>
                          <strong>CMYK:</strong> {item.cmykC}/{item.cmykM}/{item.cmykY}/{item.cmykK}
                        </div>
                      ) : (
                        <div style={{ fontSize: 'var(--font-size-xs)', color: 'var(--color-gray-600)', lineHeight: 1.4 }}>
                          <strong>RGB:</strong> {item.rgbValue || '-'}
                        </div>
                      )}
                      {tempStyle && (
                        <div style={{
                          marginTop: 2, fontSize: 'var(--font-size-xs)', fontWeight: 600,
                          color: tempStyle.color, background: tempStyle.bg,
                          borderRadius: 8, padding: '1px 6px', width: 'fit-content',
                        }}>
                          {tempStyle.icon} {item.colorTemperature}
                        </div>
                      )}
                    </div>

                    {/* Actions */}
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
              )
            })}
          </div>
        )}

        {/* Sentinel for IntersectionObserver infinite scroll */}
        <div ref={sentinelRef} style={{ height: 1 }} />
      </div>
    </>
  )
}
