'use client'

import { memo } from 'react'

interface BpSpinnerProps {
  small?: boolean
}

export const BpSpinner = memo(function BpSpinner({ small }: BpSpinnerProps) {
  return (
    <div className="bp-spinner-wrap">
      <div className={`bp-spinner${small ? ' bp-spinner--sm' : ''}`} />
    </div>
  )
})
