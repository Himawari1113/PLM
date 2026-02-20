'use client'

import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { useYearFilter } from '@/contexts/YearFilterContext'
import { BpPageHeader } from '@/components/common'

/* ------------------------------------------------------------------ */
/*  Types                                                             */
/* ------------------------------------------------------------------ */

interface OtbRow {
  id: string
  styleNumber: string
  styleName: string
  category: string
  season: number
  divisionName: string
  totalPlanQty: number
  weekNumber: number
  year: number
  salesQty: number
  storeInvQty: number
  whInvQty: number
  intakeQty: number
  otb: number
  salesStartDate: string | null
  finalAllocDate: string | null
  salesEndDate: string | null
}

interface WeekData {
  weekNumber: number
  salesQty: number
  storeInvQty: number
  whInvQty: number
  intakeQty: number
  otb: number
}

interface StyleGroup {
  styleNumber: string
  styleName: string
  category: string
  season: number
  divisionName: string
  totalPlanQty: number
  weeks: Record<number, WeekData>
}

type MetricKey = 'salesQty' | 'storeInvQty' | 'storeWks' | 'whInvQty' | 'whWks' | 'intakeQty' | 'otb'

const METRIC_LABELS: { key: MetricKey; label: string }[] = [
  { key: 'salesQty', label: 'Sales Qty' },
  { key: 'storeInvQty', label: 'Store Inv Qty' },
  { key: 'storeWks', label: 'Store Wks' },
  { key: 'whInvQty', label: 'WH Inv Qty' },
  { key: 'whWks', label: 'WH Wks' },
  { key: 'intakeQty', label: 'Intake Qty' },
  { key: 'otb', label: 'OTB' },
]

const EDITABLE_METRICS: MetricKey[] = ['salesQty', 'storeInvQty', 'intakeQty', 'otb']

const API_FIELD_MAP: Record<string, string> = {
  salesQty: 'sales_qty',
  storeInvQty: 'store_inv_qty',
  intakeQty: 'intake_qty',
  otb: 'otb',
}

const VISIBLE_WEEKS = 10
const PAGE_SIZE = 50

/* ------------------------------------------------------------------ */
/*  Week label generation                                             */
/* ------------------------------------------------------------------ */

const generateWeekLabels = (startWeek: number, numWeeks: number): string[] => {
  const baseDate = new Date(2026, 0, 1)
  return Array.from({ length: numWeeks }, (_, i) => {
    const weekNumber = startWeek + i - 1
    const weekDate = new Date(baseDate)
    weekDate.setDate(baseDate.getDate() + weekNumber * 7)
    return `${weekDate.getMonth() + 1}/${weekDate.getDate()}`
  })
}

/* ------------------------------------------------------------------ */
/*  Helpers                                                           */
/* ------------------------------------------------------------------ */

function getCurrentWeekNumber(): number {
  const now = new Date()
  const start = new Date(now.getFullYear(), 0, 1)
  const diff = now.getTime() - start.getTime()
  return Math.ceil(diff / (7 * 24 * 60 * 60 * 1000))
}

function groupByStyle(rows: OtbRow[]): StyleGroup[] {
  const map = new Map<string, StyleGroup>()
  for (const r of rows) {
    let group = map.get(r.styleNumber)
    if (!group) {
      group = {
        styleNumber: r.styleNumber,
        styleName: r.styleName,
        category: r.category,
        season: r.season,
        divisionName: r.divisionName,
        totalPlanQty: r.totalPlanQty,
        weeks: {},
      }
      map.set(r.styleNumber, group)
    }
    group.weeks[r.weekNumber] = {
      weekNumber: r.weekNumber,
      salesQty: r.salesQty,
      storeInvQty: r.storeInvQty,
      whInvQty: r.whInvQty,
      intakeQty: r.intakeQty,
      otb: r.otb,
    }
  }
  return Array.from(map.values())
}

/* ------------------------------------------------------------------ */
/*  Computed metric values                                            */
/* ------------------------------------------------------------------ */

function getMetricValue(
  style: StyleGroup,
  metric: MetricKey,
  weekNumber: number,
  allWeekNumbers: number[],
): number | string {
  const wd = style.weeks[weekNumber]
  if (!wd) return metric === 'storeWks' || metric === 'whWks' ? '-' : 0

  switch (metric) {
    case 'salesQty':
      return wd.salesQty
    case 'storeInvQty':
      return wd.storeInvQty
    case 'storeWks':
      return wd.salesQty > 0 ? (wd.storeInvQty / wd.salesQty).toFixed(1) : '-'
    case 'whInvQty': {
      const sorted = allWeekNumbers.filter((w) => w <= weekNumber).sort((a, b) => a - b)
      let cumulative = 0
      for (const w of sorted) {
        const d = style.weeks[w]
        if (!d) continue
        if (w === sorted[0]) {
          cumulative = d.whInvQty
        } else {
          cumulative = cumulative + d.intakeQty - d.storeInvQty
        }
      }
      return cumulative
    }
    case 'whWks': {
      const whInv = getMetricValue(style, 'whInvQty', weekNumber, allWeekNumbers)
      if (typeof whInv === 'string') return '-'
      return wd.salesQty > 0 ? (Number(whInv) / wd.salesQty).toFixed(1) : '-'
    }
    case 'intakeQty':
      return wd.intakeQty
    case 'otb': {
      const salesWTD = allWeekNumbers
        .filter((w) => w <= weekNumber)
        .reduce((sum, w) => sum + (style.weeks[w]?.salesQty ?? 0), 0)
      return style.totalPlanQty - (salesWTD + wd.storeInvQty + wd.whInvQty + wd.intakeQty)
    }
    default:
      return 0
  }
}

/* ------------------------------------------------------------------ */
/*  Frozen-column widths                                              */
/* ------------------------------------------------------------------ */

const COL_STYLE_NO = 80
const COL_STYLE_NAME = 100
const COL_TOTAL_PLAN = 80
const COL_SALES_SUM = 80
const COL_METRIC = 110
const FROZEN_TOTAL = COL_STYLE_NO + COL_STYLE_NAME + COL_TOTAL_PLAN + COL_SALES_SUM + COL_METRIC
const WEEK_COL_WIDTH = 80

/* ------------------------------------------------------------------ */
/*  Component                                                         */
/* ------------------------------------------------------------------ */

export default function WssiOtbPage() {
  const { selectedYear, selectedSeason } = useYearFilter()

  const [rawData, setRawData] = useState<OtbRow[]>([])
  const [loading, setLoading] = useState(true)
  const [weekOffset, setWeekOffset] = useState(0)
  const [page, setPage] = useState(0)
  const [styleFilter, setStyleFilter] = useState('')

  /* Cell selection */
  const [selectedCell, setSelectedCell] = useState<{
    styleIdx: number
    metricIdx: number
    weekCol: number
  } | null>(null)
  const [editingCell, setEditingCell] = useState<{
    styleIdx: number
    metricIdx: number
    weekCol: number
  } | null>(null)
  const [editValue, setEditValue] = useState('')
  const [clipboard, setClipboard] = useState<string | null>(null)

  const inputRef = useRef<HTMLInputElement>(null)
  const tableRef = useRef<HTMLDivElement>(null)

  /* ---------------------------------------------------------------- */
  /*  Fetch data                                                      */
  /* ---------------------------------------------------------------- */

  const fetchData = useCallback(async () => {
    setLoading(true)
    try {
      const params = new URLSearchParams()
      const year = selectedYear ?? new Date().getFullYear()
      params.set('year', String(year))
      if (selectedSeason !== null) params.set('season', String(selectedSeason))
      const res = await fetch(`/api/otb-planning?${params.toString()}`)
      const data: OtbRow[] = await res.json()
      setRawData(Array.isArray(data) ? data : [])
    } catch {
      setRawData([])
    } finally {
      setLoading(false)
    }
  }, [selectedYear, selectedSeason])

  useEffect(() => {
    fetchData()
  }, [fetchData])

  /* ---------------------------------------------------------------- */
  /*  Derived data                                                    */
  /* ---------------------------------------------------------------- */

  const allStyles = useMemo(() => groupByStyle(rawData), [rawData])

  const styleNumbers = useMemo(
    () => Array.from(new Set(allStyles.map((s) => s.styleNumber))).sort(),
    [allStyles],
  )

  const filteredStyles = useMemo(() => {
    if (!styleFilter) return allStyles
    return allStyles.filter((s) => s.styleNumber === styleFilter)
  }, [allStyles, styleFilter])

  const totalPages = Math.max(1, Math.ceil(filteredStyles.length / PAGE_SIZE))
  const pagedStyles = useMemo(
    () => filteredStyles.slice(page * PAGE_SIZE, (page + 1) * PAGE_SIZE),
    [filteredStyles, page],
  )

  const allWeekNumbers = useMemo(() => {
    const set = new Set<number>()
    for (const r of rawData) set.add(r.weekNumber)
    return Array.from(set).sort((a, b) => a - b)
  }, [rawData])

  const maxWeeks = allWeekNumbers.length
  const visibleWeekNumbers = useMemo(
    () => allWeekNumbers.slice(weekOffset, weekOffset + VISIBLE_WEEKS),
    [allWeekNumbers, weekOffset],
  )

  const weekLabels = useMemo(() => {
    if (visibleWeekNumbers.length === 0) return []
    return generateWeekLabels(visibleWeekNumbers[0], visibleWeekNumbers.length)
  }, [visibleWeekNumbers])

  const currentWeek = getCurrentWeekNumber()

  /* ---------------------------------------------------------------- */
  /*  Summary                                                         */
  /* ---------------------------------------------------------------- */

  const summary = useMemo(() => {
    let totalPlan = 0
    let periodSales = 0
    let periodStoreInv = 0
    let periodIntake = 0
    for (const s of pagedStyles) {
      totalPlan += s.totalPlanQty
      for (const wn of visibleWeekNumbers) {
        const wd = s.weeks[wn]
        if (!wd) continue
        periodSales += wd.salesQty
        periodStoreInv += wd.storeInvQty
        periodIntake += wd.intakeQty
      }
    }
    return { totalPlan, periodSales, periodStoreInv, periodIntake }
  }, [pagedStyles, visibleWeekNumbers])

  /* ---------------------------------------------------------------- */
  /*  Cell editing                                                    */
  /* ---------------------------------------------------------------- */

  const startEdit = (styleIdx: number, metricIdx: number, weekCol: number) => {
    const metric = METRIC_LABELS[metricIdx].key
    if (!EDITABLE_METRICS.includes(metric)) return
    const wn = visibleWeekNumbers[weekCol]
    if (wn === undefined || wn < currentWeek) return

    const style = pagedStyles[styleIdx]
    if (!style) return
    const val = getMetricValue(style, metric, wn, allWeekNumbers)
    setEditingCell({ styleIdx, metricIdx, weekCol })
    setEditValue(String(val))
    setTimeout(() => inputRef.current?.select(), 0)
  }

  const cancelEdit = () => {
    setEditingCell(null)
    setEditValue('')
  }

  const saveEdit = async () => {
    if (!editingCell) return
    const { styleIdx, metricIdx, weekCol } = editingCell
    const style = pagedStyles[styleIdx]
    const metric = METRIC_LABELS[metricIdx].key
    const wn = visibleWeekNumbers[weekCol]
    if (!style || wn === undefined) {
      cancelEdit()
      return
    }
    const numValue = parseInt(editValue, 10)
    if (isNaN(numValue)) {
      cancelEdit()
      return
    }
    const apiField = API_FIELD_MAP[metric]
    if (!apiField) {
      cancelEdit()
      return
    }
    try {
      await fetch(`/api/otb-planning/bulk/${encodeURIComponent(style.styleNumber)}/${wn}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ field: apiField, value: numValue }),
      })
      setRawData((prev) =>
        prev.map((r) =>
          r.styleNumber === style.styleNumber && r.weekNumber === wn
            ? { ...r, [metric]: numValue }
            : r,
        ),
      )
    } catch {
      /* silently fail */
    }
    cancelEdit()
  }

  /* ---------------------------------------------------------------- */
  /*  Keyboard navigation                                             */
  /* ---------------------------------------------------------------- */

  const handleKeyDown = useCallback(
    (e: React.KeyboardEvent) => {
      if (editingCell) {
        if (e.key === 'Escape') {
          e.preventDefault()
          cancelEdit()
        } else if (e.key === 'Enter') {
          e.preventDefault()
          saveEdit()
        }
        return
      }

      if (!selectedCell) return

      const { styleIdx, metricIdx, weekCol } = selectedCell
      const totalMetricRows = pagedStyles.length * METRIC_LABELS.length

      const move = (dStyle: number, dMetric: number, dWeek: number) => {
        e.preventDefault()
        const newMetric = metricIdx + dMetric
        let newStyleIdx = styleIdx + dStyle
        let finalMetric = newMetric
        if (newMetric < 0) {
          newStyleIdx -= 1
          finalMetric = METRIC_LABELS.length - 1
        } else if (newMetric >= METRIC_LABELS.length) {
          newStyleIdx += 1
          finalMetric = 0
        }
        const newWeek = weekCol + dWeek
        if (newStyleIdx < 0 || newStyleIdx >= pagedStyles.length) return
        if (newWeek < 0 || newWeek >= visibleWeekNumbers.length) return
        setSelectedCell({ styleIdx: newStyleIdx, metricIdx: finalMetric, weekCol: newWeek })
      }

      switch (e.key) {
        case 'ArrowUp':
          move(0, -1, 0)
          break
        case 'ArrowDown':
          move(0, 1, 0)
          break
        case 'ArrowLeft':
          move(0, 0, -1)
          break
        case 'ArrowRight':
          move(0, 0, 1)
          break
        case 'Tab':
          e.preventDefault()
          if (e.shiftKey) {
            move(0, 0, -1)
          } else {
            move(0, 0, 1)
          }
          break
        case 'Enter':
          startEdit(styleIdx, metricIdx, weekCol)
          break
        case 'c':
          if (e.metaKey || e.ctrlKey) {
            e.preventDefault()
            const style = pagedStyles[styleIdx]
            const metric = METRIC_LABELS[metricIdx].key
            const wn = visibleWeekNumbers[weekCol]
            if (style && wn !== undefined) {
              const val = getMetricValue(style, metric, wn, allWeekNumbers)
              setClipboard(String(val))
              navigator.clipboard?.writeText(String(val)).catch(() => {})
            }
          }
          break
        case 'v':
          if (e.metaKey || e.ctrlKey) {
            e.preventDefault()
            if (clipboard !== null) {
              const metric = METRIC_LABELS[metricIdx].key
              if (EDITABLE_METRICS.includes(metric)) {
                const wn = visibleWeekNumbers[weekCol]
                if (wn !== undefined && wn >= currentWeek) {
                  setEditingCell({ styleIdx, metricIdx, weekCol })
                  setEditValue(clipboard)
                  setTimeout(() => {
                    saveEdit()
                  }, 0)
                }
              }
            }
          }
          break
      }
    },
    [selectedCell, editingCell, pagedStyles, visibleWeekNumbers, allWeekNumbers, currentWeek, clipboard],
  )

  /* ---------------------------------------------------------------- */
  /*  Render helpers                                                  */
  /* ---------------------------------------------------------------- */

  const isCellEditable = (metricKey: MetricKey, weekNumber: number): boolean =>
    EDITABLE_METRICS.includes(metricKey) && weekNumber >= currentWeek

  const isCellSelected = (sIdx: number, mIdx: number, wCol: number): boolean =>
    selectedCell?.styleIdx === sIdx &&
    selectedCell?.metricIdx === mIdx &&
    selectedCell?.weekCol === wCol

  const isCellEditing = (sIdx: number, mIdx: number, wCol: number): boolean =>
    editingCell?.styleIdx === sIdx &&
    editingCell?.metricIdx === mIdx &&
    editingCell?.weekCol === wCol

  /* ---------------------------------------------------------------- */
  /*  Styles (inline)                                                 */
  /* ---------------------------------------------------------------- */


  const thStyle = (
    width: number,
    left: number,
    frozen: boolean,
  ): React.CSSProperties => ({
    position: frozen ? 'sticky' : undefined,
    left: frozen ? left : undefined,
    zIndex: frozen ? 3 : 1,
    width,
    minWidth: width,
    maxWidth: width,
    padding: '6px 8px',
    fontSize: 11,
    fontWeight: 600,
    textAlign: 'center',
    whiteSpace: 'nowrap',
    overflow: 'hidden',
    textOverflow: 'ellipsis',
    background: 'var(--color-gray-100, #f3f4f6)',
    borderBottom: '2px solid var(--color-border, #e5e7eb)',
    borderRight: '1px solid var(--color-border, #e5e7eb)',
    fontFamily: 'var(--font-family-en, sans-serif)',
  })

  const frozenCellStyle = (
    width: number,
    left: number,
    isFirstRow: boolean,
  ): React.CSSProperties => ({
    position: 'sticky',
    left,
    zIndex: 2,
    width,
    minWidth: width,
    maxWidth: width,
    padding: '4px 6px',
    fontSize: 11,
    whiteSpace: 'nowrap',
    overflow: 'hidden',
    textOverflow: 'ellipsis',
    borderRight: '1px solid var(--color-border, #e5e7eb)',
    borderBottom: '1px solid var(--color-border, #e5e7eb)',
    background: isFirstRow ? 'var(--color-gray-50, #f9fafb)' : '#fff',
    fontFamily: 'var(--font-family-en, sans-serif)',
  })

  const weekCellStyle = (
    selected: boolean,
    editable: boolean,
    editing: boolean,
  ): React.CSSProperties => ({
    width: WEEK_COL_WIDTH,
    minWidth: WEEK_COL_WIDTH,
    maxWidth: WEEK_COL_WIDTH,
    padding: editing ? 0 : '4px 6px',
    fontSize: 11,
    textAlign: 'right',
    borderRight: '1px solid var(--color-border, #e5e7eb)',
    borderBottom: '1px solid var(--color-border, #e5e7eb)',
    outline: selected ? '2px solid #0ea5e9' : 'none',
    outlineOffset: selected ? -2 : 0,
    background: editing ? '#e0f2fe' : editable ? '#f0f9ff' : '#fff',
    cursor: editable ? 'cell' : 'default',
    fontFamily: 'var(--font-family-en, sans-serif)',
    position: 'relative',
  })

  const paginationStyle: React.CSSProperties = {
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 12,
    padding: '8px 14px',
    borderTop: '1px solid var(--color-border, #e5e7eb)',
  }

  /* ---------------------------------------------------------------- */
  /*  Render                                                          */
  /* ---------------------------------------------------------------- */

  if (loading) {
    return <div className="bp-spinner-wrap"><div className="bp-spinner" /></div>
  }

  return (
    <div onKeyDown={handleKeyDown} tabIndex={0}>
      <BpPageHeader
        title="WSSI / OTB"
        subtitle={`Week ${weekOffset + 1}–${Math.min(weekOffset + VISIBLE_WEEKS, maxWeeks)} of ${maxWeeks}`}
      />

      <div className="bp-card" style={{ display: 'flex', flexDirection: 'column', flex: 1, maxHeight: 'calc(100vh - 160px)' }}>
        {/* Toolbar */}
        <div className="bp-toolbar">
          <select
            className="bp-select"
            value={styleFilter}
            onChange={(e) => {
              setStyleFilter(e.target.value)
              setPage(0)
            }}
          >
            <option value="">All Styles</option>
            {styleNumbers.map((sn) => (
              <option key={sn} value={sn}>{sn}</option>
            ))}
          </select>
          <div style={{ flex: 1 }} />
          <button
            className="bp-button bp-button--secondary"
            style={{ opacity: weekOffset <= 0 ? 0.4 : 1 }}
            disabled={weekOffset <= 0}
            onClick={() => setWeekOffset((o) => Math.max(0, o - VISIBLE_WEEKS))}
          >
            ← Prev
          </button>
          <button
            className="bp-button bp-button--secondary"
            style={{ opacity: weekOffset + VISIBLE_WEEKS >= maxWeeks ? 0.4 : 1 }}
            disabled={weekOffset + VISIBLE_WEEKS >= maxWeeks}
            onClick={() => setWeekOffset((o) => Math.min(maxWeeks - VISIBLE_WEEKS, o + VISIBLE_WEEKS))}
          >
            Next →
          </button>
        </div>

        {/* Table */}
        <div style={{ flex: 1, overflow: 'auto', background: '#fff' }} ref={tableRef}>
        <table
          style={{
            borderCollapse: 'separate',
            borderSpacing: 0,
            width: FROZEN_TOTAL + visibleWeekNumbers.length * WEEK_COL_WIDTH,
            tableLayout: 'fixed',
          }}
        >
          <thead>
            <tr>
              <th style={thStyle(COL_STYLE_NO, 0, true)}>Style No</th>
              <th style={thStyle(COL_STYLE_NAME, COL_STYLE_NO, true)}>Style Name</th>
              <th style={thStyle(COL_TOTAL_PLAN, COL_STYLE_NO + COL_STYLE_NAME, true)}>
                Total Plan
              </th>
              <th
                style={thStyle(
                  COL_SALES_SUM,
                  COL_STYLE_NO + COL_STYLE_NAME + COL_TOTAL_PLAN,
                  true,
                )}
              >
                Sales Sum
              </th>
              <th
                style={thStyle(
                  COL_METRIC,
                  COL_STYLE_NO + COL_STYLE_NAME + COL_TOTAL_PLAN + COL_SALES_SUM,
                  true,
                )}
              >
                Metric
              </th>
              {weekLabels.map((label, i) => (
                <th key={i} style={thStyle(WEEK_COL_WIDTH, 0, false)}>
                  W{visibleWeekNumbers[i]}
                  <br />
                  <span style={{ fontWeight: 400, fontSize: 10, color: 'var(--color-gray-500, #6b7280)' }}>
                    {label}
                  </span>
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {pagedStyles.length === 0 ? (
              <tr>
                <td
                  colSpan={5 + visibleWeekNumbers.length}
                  style={{
                    textAlign: 'center',
                    padding: 40,
                    color: 'var(--color-gray-400, #9ca3af)',
                    fontSize: 14,
                  }}
                >
                  No data available
                </td>
              </tr>
            ) : (
              pagedStyles.map((style, sIdx) => {
                const salesSum = Object.values(style.weeks).reduce(
                  (sum, w) => sum + w.salesQty,
                  0,
                )
                return METRIC_LABELS.map((ml, mIdx) => (
                  <tr key={`${style.styleNumber}-${ml.key}`}>
                    {/* Frozen: Style No */}
                    {mIdx === 0 ? (
                      <td
                        rowSpan={METRIC_LABELS.length}
                        style={{
                          ...frozenCellStyle(COL_STYLE_NO, 0, true),
                          fontWeight: 600,
                          borderBottom: '2px solid var(--color-border, #e5e7eb)',
                          verticalAlign: 'top',
                        }}
                        title={style.styleNumber}
                      >
                        {style.styleNumber}
                      </td>
                    ) : null}

                    {/* Frozen: Style Name */}
                    {mIdx === 0 ? (
                      <td
                        rowSpan={METRIC_LABELS.length}
                        style={{
                          ...frozenCellStyle(COL_STYLE_NAME, COL_STYLE_NO, true),
                          borderBottom: '2px solid var(--color-border, #e5e7eb)',
                          verticalAlign: 'top',
                        }}
                        title={style.styleName}
                      >
                        {style.styleName}
                      </td>
                    ) : null}

                    {/* Frozen: Total Plan */}
                    {mIdx === 0 ? (
                      <td
                        rowSpan={METRIC_LABELS.length}
                        style={{
                          ...frozenCellStyle(COL_TOTAL_PLAN, COL_STYLE_NO + COL_STYLE_NAME, true),
                          textAlign: 'right',
                          borderBottom: '2px solid var(--color-border, #e5e7eb)',
                          verticalAlign: 'top',
                        }}
                      >
                        {style.totalPlanQty.toLocaleString()}
                      </td>
                    ) : null}

                    {/* Frozen: Sales Sum */}
                    {mIdx === 0 ? (
                      <td
                        rowSpan={METRIC_LABELS.length}
                        style={{
                          ...frozenCellStyle(
                            COL_SALES_SUM,
                            COL_STYLE_NO + COL_STYLE_NAME + COL_TOTAL_PLAN,
                            true,
                          ),
                          textAlign: 'right',
                          borderBottom: '2px solid var(--color-border, #e5e7eb)',
                          verticalAlign: 'top',
                        }}
                      >
                        {salesSum.toLocaleString()}
                      </td>
                    ) : null}

                    {/* Frozen: Metric label */}
                    <td
                      style={{
                        ...frozenCellStyle(
                          COL_METRIC,
                          COL_STYLE_NO + COL_STYLE_NAME + COL_TOTAL_PLAN + COL_SALES_SUM,
                          false,
                        ),
                        fontWeight: 500,
                        fontSize: 11,
                        color: EDITABLE_METRICS.includes(ml.key)
                          ? 'var(--color-gray-800, #1f2937)'
                          : 'var(--color-gray-500, #6b7280)',
                        borderBottom:
                          mIdx === METRIC_LABELS.length - 1
                            ? '2px solid var(--color-border, #e5e7eb)'
                            : '1px solid var(--color-border, #e5e7eb)',
                      }}
                    >
                      {ml.label}
                      {!EDITABLE_METRICS.includes(ml.key) && ml.key !== 'otb' ? (
                        <span
                          style={{
                            marginLeft: 4,
                            fontSize: 9,
                            color: 'var(--color-gray-400, #9ca3af)',
                          }}
                        >
                          (calc)
                        </span>
                      ) : null}
                    </td>

                    {/* Week cells */}
                    {visibleWeekNumbers.map((wn, wCol) => {
                      const val = getMetricValue(style, ml.key, wn, allWeekNumbers)
                      const editable = isCellEditable(ml.key, wn)
                      const selected = isCellSelected(sIdx, mIdx, wCol)
                      const editing = isCellEditing(sIdx, mIdx, wCol)

                      return (
                        <td
                          key={wn}
                          style={{
                            ...weekCellStyle(selected, editable, editing),
                            borderBottom:
                              mIdx === METRIC_LABELS.length - 1
                                ? '2px solid var(--color-border, #e5e7eb)'
                                : '1px solid var(--color-border, #e5e7eb)',
                          }}
                          onClick={() => {
                            setSelectedCell({ styleIdx: sIdx, metricIdx: mIdx, weekCol: wCol })
                            if (editingCell) cancelEdit()
                          }}
                          onDoubleClick={() => {
                            if (editable) startEdit(sIdx, mIdx, wCol)
                          }}
                        >
                          {editing ? (
                            <input
                              ref={inputRef}
                              type="number"
                              value={editValue}
                              onChange={(e) => setEditValue(e.target.value)}
                              onBlur={saveEdit}
                              onKeyDown={(e) => {
                                if (e.key === 'Enter') {
                                  e.preventDefault()
                                  saveEdit()
                                } else if (e.key === 'Escape') {
                                  e.preventDefault()
                                  cancelEdit()
                                }
                                e.stopPropagation()
                              }}
                              autoFocus
                              style={{
                                width: '100%',
                                height: '100%',
                                border: 'none',
                                outline: 'none',
                                padding: '4px 6px',
                                fontSize: 11,
                                textAlign: 'right',
                                background: '#e0f2fe',
                                fontFamily: 'var(--font-family-en, sans-serif)',
                              }}
                            />
                          ) : (
                            <span>{typeof val === 'number' ? val.toLocaleString() : val}</span>
                          )}
                        </td>
                      )
                    })}
                  </tr>
                ))
              })
            )}
          </tbody>
        </table>
      </div>

      {/* Pagination */}
      <div style={paginationStyle}>
        <button
          className="bp-button bp-button--secondary"
          style={{ opacity: page <= 0 ? 0.4 : 1 }}
          disabled={page <= 0}
          onClick={() => setPage((p) => p - 1)}
        >
          ← Prev
        </button>
        <span style={{ color: '#64748b', fontSize: 12 }}>
          Page {page + 1} of {totalPages}
        </span>
        <button
          className="bp-button bp-button--secondary"
          style={{ opacity: page + 1 >= totalPages ? 0.4 : 1 }}
          disabled={page + 1 >= totalPages}
          onClick={() => setPage((p) => p + 1)}
        >
          Next →
        </button>
      </div>
    </div>
    </div>
  )
}
