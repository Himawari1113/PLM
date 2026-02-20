'use client'

import { createContext, useContext, useEffect, useMemo, useState } from 'react'

interface YearFilterContextValue {
  /** Selected year. null means "All years" (no filter). */
  selectedYear: number | null
  setSelectedYear: (year: number | null) => void
  /** Available years for the dropdown */
  availableYears: number[]
  /** Selected season. null means "All seasons" (no filter). */
  selectedSeason: number | null
  setSelectedSeason: (season: number | null) => void
  /** Available seasons (1: SS, 2: FW) */
  availableSeasons: Array<{ code: number; label: string }>
}

const YEAR_STORAGE_KEY = 'plm-year-filter'
const SEASON_STORAGE_KEY = 'plm-season-filter'

const YearFilterContext = createContext<YearFilterContextValue | undefined>(undefined)

/** Generate default available years: current year ± 2 */
function defaultYears(): number[] {
  const now = new Date().getFullYear()
  return [now - 2, now - 1, now, now + 1, now + 2]
}

const SEASONS = [
  { code: 1, label: 'SS' },
  { code: 2, label: 'FW' },
]

export function YearFilterProvider({ children }: { children: React.ReactNode }) {
  const [selectedYear, setSelectedYearState] = useState<number | null>(null)
  const [selectedSeason, setSelectedSeasonState] = useState<number | null>(null)
  const [availableYears] = useState<number[]>(defaultYears)
  const [availableSeasons] = useState(SEASONS)
  const [hydrated, setHydrated] = useState(false)

  // Restore from localStorage on mount
  useEffect(() => {
    const savedYear = localStorage.getItem(YEAR_STORAGE_KEY)
    if (savedYear === 'all' || savedYear === null) {
      setSelectedYearState(null)
    } else {
      const parsed = parseInt(savedYear, 10)
      if (Number.isFinite(parsed)) {
        setSelectedYearState(parsed)
      }
    }

    const savedSeason = localStorage.getItem(SEASON_STORAGE_KEY)
    if (savedSeason === 'all' || savedSeason === null) {
      setSelectedSeasonState(null)
    } else {
      const parsed = parseInt(savedSeason, 10)
      if (Number.isFinite(parsed)) {
        setSelectedSeasonState(parsed)
      }
    }

    setHydrated(true)
  }, [])

  const setSelectedYear = (year: number | null) => {
    setSelectedYearState(year)
    localStorage.setItem(YEAR_STORAGE_KEY, year === null ? 'all' : String(year))
  }

  const setSelectedSeason = (season: number | null) => {
    setSelectedSeasonState(season)
    localStorage.setItem(SEASON_STORAGE_KEY, season === null ? 'all' : String(season))
  }

  const value = useMemo(
    () => ({ selectedYear, setSelectedYear, availableYears, selectedSeason, setSelectedSeason, availableSeasons }),
    [selectedYear, availableYears, selectedSeason, availableSeasons],
  )

  // Avoid flash of wrong year on SSR hydration
  if (!hydrated) {
    return <YearFilterContext.Provider value={{ selectedYear: null, setSelectedYear: () => {}, availableYears, selectedSeason: null, setSelectedSeason: () => {}, availableSeasons }}>{children}</YearFilterContext.Provider>
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
