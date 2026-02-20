'use client'

import { useState, useMemo, useEffect, useCallback } from 'react'
import { useYearFilter } from '@/contexts/YearFilterContext'
import { BpPageHeader } from '@/components/common'

const MONTHS = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec']

interface FPItem {
  id: string
  year: number
  seasonCode: number
  divisionName: string
  month: number
  revenue: number
  gmPercent: number
  ebita: number
  inventory: number
}

interface CellSelection {
  id: string
  field: string
}

interface EditState {
  id: string
  field: string
  value: string
}

type MetricDef = {
  key: string
  label: string
  isCurrency: boolean
  editable: boolean
}

const METRIC_DEFS: MetricDef[] = [
  { key: 'revenue', label: 'Revenue', isCurrency: true, editable: true },
  { key: 'cogs', label: 'COGS', isCurrency: true, editable: false },
  { key: 'gm_percent', label: 'GM%', isCurrency: false, editable: true },
  { key: 'expense', label: 'Expense', isCurrency: true, editable: false },
  { key: 'ebita', label: 'EBITA', isCurrency: true, editable: true },
  { key: 'ebitaPercent', label: 'EBITA%', isCurrency: false, editable: false },
  { key: 'inventory', label: 'Inventory', isCurrency: true, editable: true },
]

const getSeasonLabel = (code: number) => (code === 1 ? 'SS' : code === 2 ? 'FW' : '')

const formatCurrency = (v: number) =>
  `$${v.toLocaleString(undefined, { minimumFractionDigits: 0, maximumFractionDigits: 0 })}`

const formatPercent = (v: number) => `${v.toFixed(1)}%`

const getCellColor = (value: number, label: string) => {
  if (label === 'EBITA') return value >= 0 ? '#16a34a' : '#dc2626'
  if (label === 'EBITA%') return value >= 20 ? '#16a34a' : value >= 10 ? '#d97706' : '#dc2626'
  if (label === 'GM%') return value >= 40 ? '#16a34a' : value >= 30 ? '#d97706' : '#dc2626'
  return '#0f172a'
}

export default function FinancialPlanningPage() {
  const { selectedYear, selectedSeason: globalSeasonFilter } = useYearFilter()
  const displayYear = selectedYear || new Date().getFullYear()

  const [data, setData] = useState<FPItem[]>([])
  const [loading, setLoading] = useState(true)
  const [selectedSeason, setSelectedSeason] = useState(1)
  const [divisions, setDivisions] = useState<string[]>([])
  const [selectedDivision, setSelectedDivision] = useState('All')
  const [selectedCell, setSelectedCell] = useState<CellSelection | null>(null)
  const [editState, setEditState] = useState<EditState | null>(null)

  // Use global season filter if set, otherwise use local state
  const activeSeason = globalSeasonFilter !== null ? globalSeasonFilter : selectedSeason

  const fetchData = useCallback(async () => {
    setLoading(true)
    try {
      const [prev, curr] = await Promise.all([
        fetch(`/api/financial-planning?year=${displayYear - 1}&season=${activeSeason}`).then(r => r.json()),
        fetch(`/api/financial-planning?year=${displayYear}&season=${activeSeason}`).then(r => r.json()),
      ])
      const all: FPItem[] = [...prev, ...curr]
      setData(all)
      const divs = [...new Set(all.map((d: FPItem) => d.divisionName).filter(Boolean))].sort()
      setDivisions(divs)
    } catch (e) {
      console.error('Failed to fetch FP data:', e)
    } finally {
      setLoading(false)
    }
  }, [displayYear, activeSeason])

  useEffect(() => { fetchData() }, [fetchData])

  const monthLabels = useMemo(() => {
    const labels: string[] = []
    for (let i = 0; i < 12; i++) labels.push(`${String(i + 1).padStart(2, '0')}/${displayYear - 1}`)
    for (let i = 0; i < 12; i++) labels.push(`${String(i + 1).padStart(2, '0')}/${displayYear}`)
    return labels
  }, [displayYear])

  const displayData = useMemo(() => {
    const filteredDivisions = selectedDivision === 'All' ? divisions : [selectedDivision]

    const rows: Array<{
      division: string
      season: number
      metric: string
      metricDef: MetricDef
      values: number[]
      yearSeasonTotal: number
      total: number
    }> = []

    filteredDivisions.forEach(div => {
      const divData = data.filter(d => d.divisionName === div)

      const allMetrics = Array.from({ length: 24 }, (_, i) => {
        const yr = i < 12 ? displayYear - 1 : displayYear
        const mo = i < 12 ? i + 1 : i - 11
        const item = divData.find(d => d.year === yr && d.month === mo)
        const rev = item?.revenue || 0
        const gmPct = item?.gmPercent || 0
        const cost = rev * ((100 - gmPct) / 100)
        const ebitaVal = item?.ebita || 0
        const gm = rev - cost
        const exp = gm - ebitaVal
        const ebitaPct = rev > 0 ? (ebitaVal / rev) * 100 : 0
        return { revenue: rev, cogs: cost, gm_percent: gmPct, expense: exp, ebita: ebitaVal, ebitaPercent: ebitaPct, inventory: item?.inventory || 0 }
      })

      const yrMetrics = allMetrics.slice(12)
      const yrTotal = {
        revenue: yrMetrics.reduce((s, m) => s + m.revenue, 0),
        cogs: yrMetrics.reduce((s, m) => s + m.cogs, 0),
        gm_percent: 0,
        expense: yrMetrics.reduce((s, m) => s + m.expense, 0),
        ebita: yrMetrics.reduce((s, m) => s + m.ebita, 0),
        ebitaPercent: 0,
        inventory: yrMetrics[yrMetrics.length - 1]?.inventory || 0,
      }
      yrTotal.gm_percent = yrTotal.revenue > 0 ? ((yrTotal.revenue - yrTotal.cogs) / yrTotal.revenue) * 100 : 0
      yrTotal.ebitaPercent = yrTotal.revenue > 0 ? (yrTotal.ebita / yrTotal.revenue) * 100 : 0

      const periodTotal = {
        revenue: allMetrics.reduce((s, m) => s + m.revenue, 0),
        cogs: allMetrics.reduce((s, m) => s + m.cogs, 0),
        gm_percent: 0,
        expense: allMetrics.reduce((s, m) => s + m.expense, 0),
        ebita: allMetrics.reduce((s, m) => s + m.ebita, 0),
        ebitaPercent: 0,
        inventory: allMetrics[allMetrics.length - 1]?.inventory || 0,
      }
      periodTotal.gm_percent = periodTotal.revenue > 0 ? ((periodTotal.revenue - periodTotal.cogs) / periodTotal.revenue) * 100 : 0
      periodTotal.ebitaPercent = periodTotal.revenue > 0 ? (periodTotal.ebita / periodTotal.revenue) * 100 : 0

      METRIC_DEFS.forEach(md => {
        rows.push({
          division: div,
          season: selectedSeason,
          metric: md.label,
          metricDef: md,
          values: allMetrics.map(m => (m as any)[md.key]),
          yearSeasonTotal: (yrTotal as any)[md.key],
          total: (periodTotal as any)[md.key],
        })
      })
    })

    return rows
  }, [data, divisions, selectedDivision, displayYear, selectedSeason])

  const isFirstMetricOfDiv = (idx: number) => {
    if (idx === 0) return true
    return displayData[idx].division !== displayData[idx - 1].division
  }

  const startEdit = (cellId: string, field: string, value: string) => {
    setEditState({ id: cellId, field, value })
  }

  const cancelEdit = () => setEditState(null)

  const handleSave = async () => {
    if (!editState) return
    try {
      const parts = editState.id.split('|||')
      const divisionName = parts[0]
      const monthIndex = parseInt(parts[1])
      const numValue = parseFloat(editState.value) || 0
      const yr = monthIndex < 12 ? displayYear - 1 : displayYear
      const mo = monthIndex < 12 ? monthIndex + 1 : monthIndex - 11

      await fetch(
        `/api/financial-planning/update/${yr}/${selectedSeason}/${encodeURIComponent(divisionName)}/${mo}`,
        {
          method: 'PATCH',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ field: editState.field, value: numValue }),
        },
      )
      await fetchData()
      cancelEdit()
    } catch (e) {
      console.error('Save failed:', e)
      alert('Failed to save')
    }
  }

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      const tgt = e.target as HTMLElement
      if (tgt.tagName === 'INPUT' || tgt.tagName === 'SELECT' || tgt.tagName === 'TEXTAREA') return
      if (!selectedCell) return

      const editableFields = ['revenue', 'gm_percent', 'ebita', 'inventory']

      if (['ArrowLeft', 'ArrowRight', 'ArrowUp', 'ArrowDown'].includes(e.key)) {
        e.preventDefault()
        const parts = selectedCell.id.split('|||')
        const div = parts[0]
        const monthIdx = parseInt(parts[1])
        const divIndex = divisions.indexOf(div)

        if (e.key === 'ArrowRight' && monthIdx < 23) {
          setSelectedCell({ id: `${div}|||${monthIdx + 1}`, field: selectedCell.field })
        } else if (e.key === 'ArrowLeft' && monthIdx > 0) {
          setSelectedCell({ id: `${div}|||${monthIdx - 1}`, field: selectedCell.field })
        } else if (e.key === 'ArrowDown' && divIndex < divisions.length - 1) {
          setSelectedCell({ id: `${divisions[divIndex + 1]}|||${monthIdx}`, field: selectedCell.field })
        } else if (e.key === 'ArrowUp' && divIndex > 0) {
          setSelectedCell({ id: `${divisions[divIndex - 1]}|||${monthIdx}`, field: selectedCell.field })
        }
        return
      }

      if (editableFields.includes(selectedCell.field)) {
        if (e.key === 'Enter') {
          e.preventDefault()
          startEdit(selectedCell.id, selectedCell.field, '')
          return
        }
        if (e.key.length === 1 && !e.ctrlKey && !e.metaKey && !e.altKey) {
          e.preventDefault()
          startEdit(selectedCell.id, selectedCell.field, e.key)
          return
        }
        if (e.key === 'Backspace' || e.key === 'Delete') {
          e.preventDefault()
          startEdit(selectedCell.id, selectedCell.field, '')
          return
        }
      }
    }
    window.addEventListener('keydown', handleKeyDown)
    return () => window.removeEventListener('keydown', handleKeyDown)
  }, [selectedCell, divisions])

  const summaryData = useMemo(() => {
    const totalRev = displayData.filter(r => r.metric === 'Revenue').reduce((s, r) => s + r.yearSeasonTotal, 0)
    const totalEbita = displayData.filter(r => r.metric === 'EBITA').reduce((s, r) => s + r.yearSeasonTotal, 0)
    const avgGm = displayData.filter(r => r.metric === 'GM%').reduce((s, r) => s + r.yearSeasonTotal, 0) / Math.max(1, displayData.filter(r => r.metric === 'GM%').length)
    return { totalRev, totalEbita, avgGm }
  }, [displayData])

  if (loading) {
    return <div className="bp-spinner-wrap"><div className="bp-spinner" /></div>
  }

  return (
    <>
      <BpPageHeader
        title="Financial Plan"
        subtitle={`${displayYear - 1} – ${displayYear} · ${activeSeason === 1 ? 'SS' : 'FW'}`}
      />

      <div className="bp-card" style={{ display: 'flex', flexDirection: 'column', flex: 1, maxHeight: 'calc(100vh - 160px)' }}>
        {/* Toolbar */}
        <div className="bp-toolbar">
          {globalSeasonFilter === null && (
            <select
              className="bp-select"
              style={{ width: 100 }}
              value={selectedSeason}
              onChange={e => setSelectedSeason(parseInt(e.target.value))}
            >
              <option value={1}>SS</option>
              <option value={2}>FW</option>
            </select>
          )}
          <select
            className="bp-select"
            value={selectedDivision}
            onChange={e => setSelectedDivision(e.target.value)}
          >
            <option value="All">All Divisions</option>
            {divisions.map(d => <option key={d} value={d}>{d}</option>)}
          </select>
        </div>

      <div style={{ flex: 1, overflow: 'auto' }}>
        <table className="bp-table" style={{ borderCollapse: 'separate', borderSpacing: 0, width: 'max-content', minWidth: '100%' }}>
          <thead>
            <tr>
              <th style={{ minWidth: 100, position: 'sticky', left: 0, top: 0, zIndex: 10, background: '#f8fafc', borderRight: '1px solid #e2e8f0', padding: '8px', fontSize: 13, fontWeight: 600, fontFamily: 'var(--font-family-en)' }}>Division</th>
              <th style={{ minWidth: 60, position: 'sticky', left: 100, top: 0, zIndex: 10, background: '#f8fafc', borderRight: '1px solid #e2e8f0', padding: '8px', fontSize: 13, fontWeight: 600, textAlign: 'center' }}>Season</th>
              <th style={{ minWidth: 90, position: 'sticky', left: 160, top: 0, zIndex: 10, background: '#f8fafc', borderRight: '1px solid #e2e8f0', padding: '8px', fontSize: 13, fontWeight: 600, textAlign: 'center' }}>Metric</th>
              <th style={{ minWidth: 110, position: 'sticky', left: 250, top: 0, zIndex: 10, background: '#fef3c7', borderRight: '2px solid #cbd5e1', padding: '8px', fontSize: 13, fontWeight: 600, textAlign: 'center' }}>Yr/Ssn Total</th>
              {monthLabels.map((ml, i) => (
                <th key={i} style={{ minWidth: 110, position: 'sticky', top: 0, zIndex: 9, background: i < 12 ? '#f1f5f9' : '#f8fafc', padding: '8px', fontSize: 12, fontWeight: 600, textAlign: 'center' }}>{ml}</th>
              ))}
              <th style={{ minWidth: 120, position: 'sticky', top: 0, zIndex: 9, background: '#f1f5f9', padding: '8px', fontSize: 13, fontWeight: 600, textAlign: 'center' }}>Period Total</th>
            </tr>
          </thead>
          <tbody>
            {displayData.map((row, idx) => {
              const isFirst = isFirstMetricOfDiv(idx)
              const showYrTotal = ['Revenue', 'COGS', 'Expense', 'Inventory'].includes(row.metric)
              const rowBg = row.metricDef.editable ? '#fff' : '#f8fafc'

              return (
                <tr key={idx} style={{ borderTop: isFirst ? '2px solid #cbd5e1' : undefined }}>
                  <td style={{ position: 'sticky', left: 0, zIndex: 5, background: rowBg, fontWeight: 600, textAlign: 'center', borderRight: '1px solid #e2e8f0', borderTop: isFirst ? '2px solid #cbd5e1' : undefined, padding: '6px 8px', fontSize: 13 }}>
                    {row.division}
                  </td>
                  <td style={{ position: 'sticky', left: 100, zIndex: 5, background: rowBg, fontWeight: 500, fontSize: 12, textAlign: 'center', borderRight: '1px solid #e2e8f0', borderTop: isFirst ? '2px solid #cbd5e1' : undefined, padding: '6px 8px' }}>
                    {getSeasonLabel(row.season)}
                  </td>
                  <td style={{ position: 'sticky', left: 160, zIndex: 5, background: rowBg, fontWeight: 600, fontSize: 13, textAlign: 'center', borderRight: '1px solid #e2e8f0', borderTop: isFirst ? '2px solid #cbd5e1' : undefined, padding: '6px 8px', fontStyle: row.metricDef.editable ? 'normal' : 'italic', color: row.metricDef.editable ? '#0f172a' : '#64748b' }}>
                    {row.metric}
                  </td>
                  <td style={{ position: 'sticky', left: 250, zIndex: 5, background: '#fef9e7', fontWeight: 700, textAlign: 'center', borderRight: '2px solid #cbd5e1', borderTop: isFirst ? '2px solid #cbd5e1' : undefined, padding: '6px 8px', fontSize: 13, color: getCellColor(row.yearSeasonTotal, row.metric) }}>
                    {showYrTotal ? (row.metricDef.isCurrency ? formatCurrency(row.yearSeasonTotal) : formatPercent(row.yearSeasonTotal)) : '-'}
                  </td>
                  {row.values.map((value, i) => {
                    const cellId = `${row.division}|||${i}`
                    const fieldKey = row.metricDef.key === 'cogs' || row.metricDef.key === 'expense' || row.metricDef.key === 'ebitaPercent' ? '' : row.metricDef.key
                    const editable = row.metricDef.editable && fieldKey !== ''
                    const isEdit = editState?.id === cellId && editState?.field === fieldKey
                    const isSelected = selectedCell?.id === cellId && selectedCell?.field === fieldKey

                    return (
                      <td
                        key={i}
                        style={{
                          textAlign: 'center',
                          fontWeight: row.metric === 'EBITA' ? 700 : 400,
                          color: getCellColor(value, row.metric),
                          background: editable ? '#fff' : rowBg,
                          borderTop: isFirst ? '2px solid #cbd5e1' : undefined,
                          cursor: editable ? 'pointer' : 'default',
                          outline: isSelected ? '2px solid #0ea5e9' : 'none',
                          outlineOffset: '-2px',
                          padding: '4px 6px',
                          fontSize: 13,
                          fontStyle: row.metricDef.editable ? 'normal' : 'italic',
                        }}
                        onClick={() => editable && setSelectedCell({ id: cellId, field: fieldKey })}
                        onDoubleClick={() => editable && startEdit(cellId, fieldKey, String(value))}
                      >
                        {isEdit ? (
                          <input
                            type="number"
                            step={fieldKey === 'gm_percent' ? '0.1' : '1'}
                            style={{ width: '100%', border: '2px solid #0ea5e9', borderRadius: 4, padding: '4px 6px', fontSize: 13, textAlign: 'right', outline: 'none', background: '#f0f9ff' }}
                            value={editState.value}
                            onChange={e => setEditState({ ...editState, value: e.target.value })}
                            onBlur={handleSave}
                            onKeyDown={e => { if (e.key === 'Enter') handleSave(); if (e.key === 'Escape') cancelEdit() }}
                            autoFocus
                          />
                        ) : (
                          <span>{row.metricDef.isCurrency ? formatCurrency(value) : formatPercent(value)}</span>
                        )}
                      </td>
                    )
                  })}
                  <td style={{ textAlign: 'center', fontWeight: 700, background: '#e2e8f0', color: getCellColor(row.total, row.metric), borderTop: isFirst ? '2px solid #cbd5e1' : undefined, padding: '6px 8px', fontSize: 13 }}>
                    {row.metricDef.isCurrency ? formatCurrency(row.total) : formatPercent(row.total)}
                  </td>
                </tr>
              )
            })}
          </tbody>
        </table>
      </div>
    </div>
    </>
  )
}
