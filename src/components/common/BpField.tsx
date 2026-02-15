'use client'

import { memo, type ReactNode } from 'react'

interface BpFieldProps {
  label: string
  children: ReactNode
}

export const BpField = memo(function BpField({ label, children }: BpFieldProps) {
  return (
    <div>
      <div className="bp-field__label">{label}</div>
      <div className="bp-field__value">{children}</div>
    </div>
  )
})

interface BpFieldGridProps {
  children: ReactNode
  columns?: 2 | 3
}

export const BpFieldGrid = memo(function BpFieldGrid({ children, columns = 2 }: BpFieldGridProps) {
  return (
    <div
      className="bp-field-grid"
      style={columns === 3 ? { gridTemplateColumns: 'repeat(3, 1fr)' } : undefined}
    >
      {children}
    </div>
  )
})
