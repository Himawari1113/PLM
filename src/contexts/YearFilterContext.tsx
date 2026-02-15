'use client'

import { createContext, useContext, useEffect, useMemo, useState } from 'react'

interface YearFilterContextValue {
  /** Selected year. null means "All years" (no filter). */
  selectedYear: number | null
  setSelectedYear: (year: number | null) => void
  /** Available years for the dropdown */
  availableYears: number[]
}

const STORAGE_KEY = 'plm-year-filter'

const YearFilterContext = createContext<YearFilterContextValue | undefined>(undefined)

/** Generate default available years: current year ± 2 */
function defaultYears(): number[] {
  const now = new Date().getFullYear()
  return [now - 2, now - 1, now, now + 1, now + 2]
}

export function YearFilterProvider({ children }: { children: React.ReactNode }) {
  const [selectedYear, setSelectedYearState] = useState<number | null>(null)
  const [availableYears] = useState<number[]>(defaultYears)
  const [hydrated, setHydrated] = useState(false)

  // Restore from localStorage on mount
  useEffect(() => {
    const saved = localStorage.getItem(STORAGE_KEY)
    if (saved === 'all' || saved === null) {
      setSelectedYearState(null)
    } else {
      const parsed = parseInt(saved, 10)
      if (Number.isFinite(parsed)) {
        setSelectedYearState(parsed)
      }
    }
    setHydrated(true)
  }, [])

  const setSelectedYear = (year: number | null) => {
    setSelectedYearState(year)
    localStorage.setItem(STORAGE_KEY, year === null ? 'all' : String(year))
  }

  const value = useMemo(
    () => ({ selectedYear, setSelectedYear, availableYears }),
    [selectedYear, availableYears],
  )

  // Avoid flash of wrong year on SSR hydration
  if (!hydrated) {
    return <YearFilterContext.Provider value={{ selectedYear: null, setSelectedYear: () => {}, availableYears }}>{children}</YearFilterContext.Provider>
  }

  return <YearFilterContext.Provider value={value}>{children}</YearFilterContext.Provider>
}

export function useYearFilter() {
  const context = useContext(YearFilterContext)
  if (!context) {
    throw new Error('useYearFilter must be used within YearFilterProvider')
  }
  return context
}
