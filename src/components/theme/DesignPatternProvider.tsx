'use client'

import { createContext, useContext, useEffect, useMemo, useState } from 'react'
import {
  DEFAULT_DESIGN_PATTERN,
  DESIGN_PATTERNS,
  isDesignPattern,
  type DesignPattern,
} from '@/config/design-patterns'


interface DesignPatternContextValue {
  pattern: DesignPattern
  setPattern: (pattern: DesignPattern) => void
}

const STORAGE_KEY = 'plm-design-pattern'

const DesignPatternContext = createContext<DesignPatternContextValue | undefined>(undefined)

export function DesignPatternProvider({ children }: { children: React.ReactNode }) {
  const [pattern, setPatternState] = useState<DesignPattern>(DEFAULT_DESIGN_PATTERN)

  const applyPattern = (next: DesignPattern) => {
    const resource = DESIGN_PATTERNS.find((item) => item.id === next)
    document.documentElement.setAttribute(
      'data-design-pattern',
      resource?.dataAttribute ?? DEFAULT_DESIGN_PATTERN,
    )
  }

  useEffect(() => {
    const saved = localStorage.getItem(STORAGE_KEY)
    if (saved && isDesignPattern(saved)) {
      setPatternState(saved)
      applyPattern(saved)
      return
    }
    applyPattern(DEFAULT_DESIGN_PATTERN)
  }, [])

  const setPattern = (next: DesignPattern) => {
    setPatternState(next)
    localStorage.setItem(STORAGE_KEY, next)
    applyPattern(next)
  }

  const value = useMemo(() => ({ pattern, setPattern }), [pattern])

  return <DesignPatternContext.Provider value={value}>{children}</DesignPatternContext.Provider>
}

export function useDesignPattern() {
  const context = useContext(DesignPatternContext)
  if (!context) {
    throw new Error('useDesignPattern must be used within DesignPatternProvider')
  }
  return context
}
