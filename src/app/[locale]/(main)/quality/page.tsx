'use client'

import { useEffect, useState, useMemo, useCallback, useRef } from 'react'
import { Link } from '@/lib/navigation'
import { ShieldCheck, Search, CheckCircle2, AlertCircle, Clock } from 'lucide-react'
import { useTranslations } from 'next-intl'
import { useDebounce } from '@/hooks/useDebounce'
import { useSort } from '@/hooks/useSort'
import { BpPageHeader } from '@/components/common'
import { useYearFilter } from '@/contexts/YearFilterContext'

const PAGE_SIZE = 60

interface QualityItem {
    id: string
    sampleNumber: string
    sampleName: string
    sampleType: string
    year: number | null
    season: { seasonName?: string | null } | null
    supplierName: string | null
    product: { styleNumber: string; name: string }
}

export default function QualityPage() {
    const t = useTranslations('nav')
    const tCommon = useTranslations('common')
    const tSamples = useTranslations('samples')
    const { selectedYear, selectedSeason, availableSeasons } = useYearFilter()

    const [samples, setSamples] = useState<QualityItem[]>([])
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
            const matchSearch =
                !q ||
                s.sampleName.toLowerCase().includes(q) ||
                s.sampleNumber.toLowerCase().includes(q) ||
                s.product?.styleNumber.toLowerCase().includes(q) ||
                s.product?.name.toLowerCase().includes(q)
            return matchSearch
        })
    }, [samples, debouncedSearch])

    const { sortedData, sortKey, sortDir, toggleSort } = useSort(filtered, 'sampleNumber', 'asc')

    // infinite scroll logic (Exactly like ColorsPage)
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

    return (
        <>
            {/* Sticky header: Exactly matching ColorsPage header pattern */}
            <div style={{ position: 'sticky', top: 48, zIndex: 20, background: 'var(--color-bg)' }}>
                <BpPageHeader
                    title="Quality Management"
                    titleMeta={<span className="bp-page__subtitle">({filtered.length} inspections)</span>}
                    actions={
                        <button className="bp-button bp-button--primary">
                            <ShieldCheck style={{ width: 16, height: 16 }} />
                            New Inspection
                        </button>
                    }
                />
                <div style={{ background: 'var(--color-surface, #fff)', borderBottom: '1px solid var(--color-border)' }}>
                    {/* Season stats banner (Matched for consistency) */}
                    {(selectedYear !== null || selectedSeason !== null) && (
                        <div style={{ display: 'flex', alignItems: 'center', gap: 16, padding: '6px 16px', borderBottom: '1px solid var(--color-border)', background: 'var(--color-gray-50)', flexWrap: 'wrap' }}>
                            <span style={{ fontSize: 'var(--font-size-sm)', color: 'var(--color-text-secondary)' }}>
                                {[selectedYear, availableSeasons.find((s) => s.code === selectedSeason)?.label].filter(Boolean).join(' ')}
                            </span>
                            <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                                <ShieldCheck style={{ width: 14, height: 14, color: 'var(--color-primary)' }} />
                                <span style={{ fontSize: 'var(--font-size-sm)', fontWeight: 600 }}>{filtered.length}</span>
                                <span style={{ fontSize: 'var(--font-size-xs)', color: 'var(--color-text-secondary)' }}>inspections tracked</span>
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
                    <div className="bp-spinner-wrap">
                        <div className="bp-spinner" />
                    </div>
                ) : filtered.length === 0 ? (
                    <div className="bp-table__empty">
                        <ShieldCheck className="bp-table__empty-icon" />
                        <p>No inspection data found.</p>
                    </div>
                ) : (
                    <div className="bp-table-wrap">
                        <table className="bp-table">
                            <thead>
                                <tr>
                                    <th style={{ width: 160, paddingLeft: 16 }} onClick={() => toggleSort('sampleNumber')}>
                                        Sample No {sortKey === 'sampleNumber' && (sortDir === 'asc' ? '▲' : '▼')}
                                    </th>
                                    <th style={{ width: 120 }}>Style No</th>
                                    <th style={{ width: 200 }}>Sample Name</th>
                                    <th style={{ width: 140 }}>Supplier</th>
                                    <th style={{ width: 140 }}>Inspection Type</th>
                                    <th style={{ width: 120 }}>Date</th>
                                    <th style={{ width: 130 }}>Status</th>
                                    <th style={{ width: 120, paddingRight: 16 }}>Defects</th>
                                </tr>
                            </thead>
                            <tbody>
                                {visibleData.map((s) => {
                                    const statuses = [
                                        { label: 'Passed', icon: CheckCircle2, color: 'var(--color-success)' },
                                        { label: 'Failed', icon: AlertCircle, color: 'var(--color-danger)' },
                                        { label: 'Pending', icon: Clock, color: 'var(--color-warning)' },
                                    ]
                                    const idx = s.id.charCodeAt(s.id.length - 1) % statuses.length
                                    const q = statuses[idx]
                                    const mockDate = new Date(Date.now() - (s.id.length * 86400000)).toLocaleDateString()
                                    const mockDefects = s.id.length % 3

                                    return (
                                        <tr key={s.id}>
                                            <td style={{ paddingLeft: 16 }}>
                                                <Link href={`/quality/${s.id}`} className="bp-table__link">
                                                    {s.sampleNumber}
                                                </Link>
                                            </td>
                                            <td>{s.product?.styleNumber || '-'}</td>
                                            <td>{s.sampleName}</td>
                                            <td>{s.supplierName || '-'}</td>
                                            <td>{s.sampleType} Inspection</td>
                                            <td>{mockDate}</td>
                                            <td>
                                                <div style={{ display: 'flex', alignItems: 'center', gap: 6, color: q.color, fontWeight: 600 }}>
                                                    <q.icon style={{ width: 16, height: 16 }} />
                                                    {q.label}
                                                </div>
                                            </td>
                                            <td style={{ paddingRight: 16 }}>
                                                {mockDefects > 0 ? `${mockDefects} defects` : 'None'}
                                            </td>
                                        </tr>
                                    )
                                })}
                            </tbody>
                        </table>
                    </div>
                )}
                {/* Sentinel for IntersectionObserver infinite scroll */}
                <div ref={sentinelRef} style={{ height: 1 }} />
            </div>
        </>
    )
}
