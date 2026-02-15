'use client'

import { useState, useMemo, useCallback, useEffect } from 'react'

export function usePagination<T>(data: T[], pageSize = 20) {
  const [currentPage, setCurrentPage] = useState(1)

  const totalPages = Math.max(1, Math.ceil(data.length / pageSize))

  useEffect(() => {
    setCurrentPage(1)
  }, [data.length])

  const paginatedData = useMemo(() => {
    const start = (currentPage - 1) * pageSize
    return data.slice(start, start + pageSize)
  }, [data, currentPage, pageSize])

  const goToPage = useCallback(
    (page: number) => {
      setCurrentPage(Math.max(1, Math.min(page, totalPages)))
    },
    [totalPages]
  )

  const nextPage = useCallback(() => goToPage(currentPage + 1), [currentPage, goToPage])
  const prevPage = useCallback(() => goToPage(currentPage - 1), [currentPage, goToPage])

  return { currentPage, totalPages, pageSize, paginatedData, goToPage, nextPage, prevPage }
}
