'use client'

import { memo, useEffect, useCallback, type ReactNode } from 'react'

interface BpSlidePanelProps {
  open: boolean
  onClose: () => void
  title: string
  children: ReactNode
  actions?: ReactNode
}

export const BpSlidePanel = memo(function BpSlidePanel({
  open,
  onClose,
  title,
  children,
  actions,
}: BpSlidePanelProps) {
  const handleEsc = useCallback(
    (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose()
    },
    [onClose]
  )

  useEffect(() => {
    if (open) {
      document.addEventListener('keydown', handleEsc)
      document.body.style.overflow = 'hidden'
    }
    return () => {
      document.removeEventListener('keydown', handleEsc)
      document.body.style.overflow = ''
    }
  }, [open, handleEsc])

  if (!open) return null

  return (
    <>
      <div className="bp-slide-panel__overlay" onClick={onClose} />
      <div className="bp-slide-panel">
        <div className="bp-slide-panel__header">
          <h2 className="bp-slide-panel__title">{title}</h2>
          <div style={{ display: 'flex', gap: '8px', alignItems: 'center' }}>
            {actions}
            <button className="bp-button bp-button--ghost bp-button--icon" onClick={onClose}>
              ✕
            </button>
          </div>
        </div>
        <div className="bp-slide-panel__body">{children}</div>
      </div>
    </>
  )
})

// Sub-components for panel content
interface PanelSectionProps {
  title: string
  children: ReactNode
}

export const BpPanelSection = memo(function BpPanelSection({ title, children }: PanelSectionProps) {
  return (
    <div className="bp-panel-section">
      <h3 className="bp-panel-section__title">{title}</h3>
      <div className="bp-panel-section__content">{children}</div>
    </div>
  )
})
