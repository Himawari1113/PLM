'use client'

import { memo, type ReactNode } from 'react'

export interface BpColumn<T> {
  key: string
  label: string
  render?: (item: T, index: number) => ReactNode
  sortable?: boolean
  width?: string
}

interface BpTableProps<T> {
  columns: BpColumn<T>[]
  data: T[]
  sortKey?: string
  sortDir?: 'asc' | 'desc'
  onSort?: (key: string) => void
  onRowClick?: (item: T) => void
  loading?: boolean
  emptyIcon?: ReactNode
  emptyMessage?: string
  emptyAction?: ReactNode
}

function BpTableInner<T extends { id?: string }>({
  columns,
  data,
  sortKey,
  sortDir,
  onSort,
  onRowClick,
  loading,
  emptyIcon,
  emptyMessage,
  emptyAction,
}: BpTableProps<T>) {
  if (loading) {
    return (
      <div className="bp-spinner-wrap">
        <div className="bp-spinner" />
      </div>
    )
  }

  if (data.length === 0) {
    return (
      <div className="bp-table__empty">
        {emptyIcon && <div className="bp-table__empty-icon">{emptyIcon}</div>}
        <p>{emptyMessage || 'No data'}</p>
        {emptyAction}
      </div>
    )
  }

  return (
    <div className="bp-table-wrap">
      <table className="bp-table">
        <thead>
          <tr>
            {columns.map((col) => (
              <th
                key={col.key}
                style={col.width ? { width: col.width } : undefined}
                onClick={() => col.sortable && onSort?.(col.key)}
              >
                {col.label}
                {col.sortable && (
                  <span
                    className={`bp-sort-icon${sortKey === col.key ? ' bp-sort-icon--active' : ''}`}
                  >
                    {sortKey === col.key ? (sortDir === 'asc' ? '▲' : '▼') : '⇅'}
                  </span>
                )}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {data.map((item, index) => (
            <tr
              key={item.id || index}
              onClick={() => onRowClick?.(item)}
              style={{ cursor: onRowClick ? 'pointer' : undefined }}
            >
              {columns.map((col) => (
                <td key={col.key}>
                  {col.render
                    ? col.render(item, index)
                    : String((item as Record<string, unknown>)[col.key] ?? '-')}
                </td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  )
}

export const BpTable = memo(BpTableInner) as typeof BpTableInner
