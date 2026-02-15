'use client'

import { memo, type ReactNode } from 'react'

interface SummaryItem {
  label: string
  value: string | number
  sub?: string
  icon?: ReactNode
}

interface BpSummaryPanelProps {
  items: SummaryItem[]
}

export const BpSummaryPanel = memo(function BpSummaryPanel({ items }: BpSummaryPanelProps) {
  return (
    <div className="bp-summary">
      {items.map((item) => (
        <div key={item.label} className="bp-summary__item">
          <div className="bp-summary__label">{item.label}</div>
          <div className="bp-summary__value">{item.value}</div>
          {item.sub && <div className="bp-summary__sub">{item.sub}</div>}
        </div>
      ))}
    </div>
  )
})
