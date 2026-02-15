import type { ReactNode } from 'react'

interface BpPageHeaderProps {
  title: ReactNode
  titleMeta?: ReactNode
  subtitle?: ReactNode
  actions?: ReactNode
}

export function BpPageHeader({ title, titleMeta, subtitle, actions }: BpPageHeaderProps) {
  return (
    <>
      <div className="bp-page__header">
        <div className="bp-page__heading">
          <div className="bp-page__title-row">
            <h1 className="bp-page__title">{title}</h1>
            {titleMeta ? <div className="bp-page__title-meta">{titleMeta}</div> : null}
          </div>
          {subtitle ? <p className="bp-page__subtitle">{subtitle}</p> : null}
        </div>
      </div>
      {actions ? <div className="bp-page__actions">{actions}</div> : null}
    </>
  )
}
