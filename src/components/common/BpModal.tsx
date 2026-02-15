'use client'

import { memo, useEffect, useCallback, type ReactNode } from 'react'

interface BpModalProps {
  open: boolean
  onClose: () => void
  title: string
  children: ReactNode
  actions?: ReactNode
}

export const BpModal = memo(function BpModal({
  open,
  onClose,
  title,
  children,
  actions,
}: BpModalProps) {
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
    <div className="bp-modal__overlay" onClick={onClose}>
      <div className="bp-modal" onClick={(e) => e.stopPropagation()}>
        <h2 className="bp-modal__title">{title}</h2>
        <div className="bp-modal__body">{children}</div>
        {actions && <div className="bp-modal__actions">{actions}</div>}
      </div>
    </div>
  )
})
