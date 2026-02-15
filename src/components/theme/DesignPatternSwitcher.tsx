'use client'

import { useTranslations } from 'next-intl'
import { DESIGN_PATTERNS, type DesignPattern } from '@/config/design-patterns'
import { useDesignPattern } from './DesignPatternProvider'

export function DesignPatternSwitcher() {
  const t = useTranslations('designPattern')
  const { pattern, setPattern } = useDesignPattern()

  return (
    <label style={{ display: 'inline-flex', alignItems: 'center', gap: 6 }}>
      <span style={{ fontSize: 'var(--font-size-xs)', color: 'var(--color-gray-500)', fontWeight: 600 }}>
        {t('label')}
      </span>
      <select
        className="bp-select"
        value={pattern}
        onChange={(event) => setPattern(event.target.value as DesignPattern)}
        style={{ minWidth: 150, height: 32, paddingTop: 0, paddingBottom: 0 }}
      >
        {DESIGN_PATTERNS.map((option) => (
          <option key={option.id} value={option.id}>
            {t(option.labelKey)}
          </option>
        ))}
      </select>
    </label>
  )
}
