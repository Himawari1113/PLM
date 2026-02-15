'use client'

import { useState, useMemo, useCallback } from 'react'

type FilterConfig<T> = {
  [K in keyof T]?: (value: T[K], filterValue: string) => boolean
}

export function useFilters<T>(data: T[], config: FilterConfig<T>) {
  const [filters, setFiltersState] = useState<Record<string, string>>({})

  const setFilter = useCallback((key: string, value: string) => {
    setFiltersState((prev) => ({ ...prev, [key]: value }))
  }, [])

  const filteredData = useMemo(() => {
    return data.filter((item) => {
      return Object.entries(config).every(([key, fn]) => {
        const filterValue = filters[key] || ''
        if (!filterValue) return true
        return (fn as (value: unknown, filterValue: string) => boolean)(
          item[key as keyof T],
          filterValue
        )
      })
    })
  }, [data, filters, config])

  return { filteredData, filters, setFilter }
}
