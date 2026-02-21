'use client'

import { useEffect, useState, useMemo, useCallback, useRef } from 'react'
import { Link } from '@/lib/navigation'
import { Receipt, Search, Filter } from 'lucide-react'
import { useTranslations } from 'next-intl'
import { useDebounce } from '@/hooks/useDebounce'
import { useSort } from '@/hooks/useSort'
import { BpPageHeader } from '@/components/common'
import { useYearFilter } from '@/contexts/YearFilterContext'

const PAGE_SIZE = 60

interface CostItem {
    id: string
    sampleNumber: string
    sampleName: string
    year: number | null
    season: { seasonName?: string | null } | null
    division: string | null
    subCategory: string | null
    supplierName: string | null
    planQty: number | null
    originalPrice: number | null
    product: { styleNumber: string; name: string }
    costs: Array<{
        id: string
        fobPrice: string | null
        materialCost: string | null
        processingCost: string | null
        trimCost: string | null
        status: string
        currency: string
    }>
}

export default function CostsPage() {
    const tCommon = useTranslations('common')
    const tConstants = useTranslations('constants')
    const tSamples = useTranslations('samples')
    const { selectedYear, selectedSeason, availableSeasons } = useYearFilter()

    const [samples, setSamples] = useState<CostItem[]>([])
    const [loading, setLoading] = useState(true)
    const [search, setSearch] = useState('')
    const debouncedSearch = useDebounce(search)

    // Infinite scroll state
    const [visibleCount, setVisibleCount] = useState(PAGE_SIZE)
    const visibleCountRef = useRef(PAGE_SIZE)
    const sentinelRef = useRef<HTMLDivElement>(null)

    const fetchSamples = useCallback(() => {
        setLoading(true)
        const params = new URLSearchParams()
        if (selectedYear !== null) params.set('year', String(selectedYear))
        if (selectedSeason !== null) params.set('season', String(selectedSeason))

        fetch(`/api/samples?${params.toString()}`)
            .then((r) => r.json())
            .then((data) => {
                setSamples(Array.isArray(data) ? data : [])
                setLoading(false)
            })
            .catch(() => {
                setSamples([])
                setLoading(false)
            })
    }, [selectedYear, selectedSeason])

    useEffect(() => {
        fetchSamples()
    }, [fetchSamples])

    const filtered = useMemo(() => {
        const q = debouncedSearch.toLowerCase()
        return samples.filter((s) => {
            return (
                !q ||
                s.sampleName.toLowerCase().includes(q) ||
                s.sampleNumber.toLowerCase().includes(q) ||
                (s.product?.styleNumber || '').toLowerCase().includes(q) ||
                (s.product?.name || '').toLowerCase().includes(q)
            )
        })
    }, [samples, debouncedSearch])

    const { sortedData, sortKey, sortDir, toggleSort } = useSort(filtered, 'sampleNumber', 'asc')

    useEffect(() => {
        setVisibleCount(PAGE_SIZE)
    }, [filtered])

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
    const usd = new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD' })

    return (
        <>
            <div style={{ position: 'sticky', top: 48, zIndex: 20, background: 'var(--color-bg)' }}>
                <BpPageHeader
                    title="Cost Management"
                    titleMeta={<span className="bp-page__subtitle">({filtered.length} samples)</span>}
                    actions={
                        <button className="bp-button bp-button--secondary">
                            <Filter style={{ width: 16, height: 16 }} />
                            {tCommon('filter')}
                        </button>
                    }
                />
                <div style={{ background: 'var(--color-surface, #fff)', borderBottom: '1px solid var(--color-border)' }}>
                    {(selectedYear !== null || selectedSeason !== null) && (
                        <div style={{ display: 'flex', alignItems: 'center', gap: 16, padding: '6px 16px', borderBottom: '1px solid var(--color-border)', background: 'var(--color-gray-50)', flexWrap: 'wrap' }}>
                            <span style={{ fontSize: 'var(--font-size-sm)', color: 'var(--color-text-secondary)' }}>
                                {[selectedYear, availableSeasons.find((s) => s.code === selectedSeason)?.label].filter(Boolean).join(' ')}
                            </span>
                            <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                                <Receipt style={{ width: 14, height: 14, color: 'var(--color-primary)' }} />
                                <span style={{ fontSize: 'var(--font-size-sm)', fontWeight: 600 }}>{filtered.length}</span>
                                <span style={{ fontSize: 'var(--font-size-xs)', color: 'var(--color-text-secondary)' }}>samples tracked</span>
                            </div>
                        </div>
                    )}

                    <div className="bp-toolbar">
                        <div className="bp-toolbar__search">
                            <Search className="bp-toolbar__search-icon" />
                            <input
                                className="bp-input"
                                style={{ paddingLeft: 34 }}
                                placeholder={tSamples('searchPlaceholder')}
                                value={search}
                                onChange={(e) => setSearch(e.target.value)}
                            />
                        </div>
                    </div>
                </div>
            </div>

            <div className="bp-card">
                {loading ? (
                    <div className="bp-spinner-wrap"><div className="bp-spinner" /></div>
                ) : filtered.length === 0 ? (
                    <div className="bp-table__empty">
                        <Receipt className="bp-table__empty-icon" />
                        <p>No cost data found.</p>
                    </div>
                ) : (
                    <div className="bp-table-wrap">
                        <table className="bp-table">
                            <thead>
                                <tr>
                                    <th style={{ width: 150, paddingLeft: 16 }} onClick={() => toggleSort('sampleNumber')}>
                                        Sample No {sortKey === 'sampleNumber' && (sortDir === 'asc' ? '▲' : '▼')}
                                    </th>
                                    <th style={{ width: 110 }}>Style No</th>
                                    <th style={{ width: 160 }}>Sample Name</th>
                                    <th style={{ width: 180 }}>Supplier</th>
                                    <th style={{ width: 100 }}>Status</th>
                                    <th style={{ width: 90, textAlign: 'right' }}>Material</th>
                                    <th style={{ width: 90, textAlign: 'right' }}>Labor</th>
                                    <th style={{ width: 90, textAlign: 'right' }}>Trim</th>
                                    <th style={{ width: 100, textAlign: 'right' }}>Total Cost</th>
                                    <th style={{ width: 100, textAlign: 'right' }}>FOB Price</th>
                                    <th style={{ width: 80, textAlign: 'center', paddingRight: 16 }}>Cost%</th>
                                </tr>
                            </thead>
                            <tbody>
                                {visibleData.map((s) => {
                                    const c = s.costs[0]
                                    const material = parseFloat(c?.materialCost || '0')
                                    const processing = parseFloat(c?.processingCost || '0')
                                    const trim = parseFloat(c?.trimCost || '0')
                                    const total = material + processing + trim
                                    const fob = parseFloat(c?.fobPrice || '0')
                                    const pct = fob > 0 ? (total / fob) * 100 : 0
                                    const color = pct > 80 ? 'var(--color-danger)' : pct > 60 ? 'var(--color-warning)' : 'var(--color-success)'

                                    return (
                                        <tr key={s.id}>
                                            <td style={{ paddingLeft: 16 }}>
                                                <Link href={`/samples/${s.id}`} className="bp-table__link">
                                                    {s.sampleNumber}
                                                </Link>
                                            </td>
                                            <td>{s.product?.styleNumber || '-'}</td>
                                            <td>{s.sampleName}</td>
                                            <td>{s.supplierName || '-'}</td>
                                            <td>
                                                {c?.status ? (
                                                    <span className={`bp-badge bp-badge--${c.status === 'APPROVED' ? 'success' : 'neutral'}`}>
                                                        {tConstants(`costStatus.${c.status}`)}
                                                    </span>
                                                ) : '-'}
                                            </td>
                                            <td style={{ textAlign: 'right' }}>{material > 0 ? usd.format(material) : '-'}</td>
                                            <td style={{ textAlign: 'right' }}>{processing > 0 ? usd.format(processing) : '-'}</td>
                                            <td style={{ textAlign: 'right' }}>{trim > 0 ? usd.format(trim) : '-'}</td>
                                            <td style={{ textAlign: 'right', fontWeight: 600 }}>{total > 0 ? usd.format(total) : '-'}</td>
                                            <td style={{ textAlign: 'right', fontWeight: 600 }}>{fob > 0 ? usd.format(fob) : '-'}</td>
                                            <td style={{ textAlign: 'center', fontWeight: 600, color: total > 0 ? color : 'inherit', paddingRight: 16 }}>
                                                {total > 0 ? `${pct.toFixed(1)}%` : '-'}
                                            </td>
                                        </tr>
                                    )
                                })}
                            </tbody>
                        </table>
                    </div>
                )}
                <div ref={sentinelRef} style={{ height: 1 }} />
            </div>
        </>
    )
}
