'use client'

import { memo, useMemo } from 'react'

interface BpPaginationProps {
  currentPage: number
  totalPages: number
  totalItems: number
  pageSize: number
  onPageChange: (page: number) => void
}

export const BpPagination = memo(function BpPagination({
  currentPage,
  totalPages,
  totalItems,
  pageSize,
  onPageChange,
}: BpPaginationProps) {
  const pages = useMemo(() => {
    const p: number[] = []
    const maxVisible = 5
    let start = Math.max(1, currentPage - Math.floor(maxVisible / 2))
    const end = Math.min(totalPages, start + maxVisible - 1)
    start = Math.max(1, end - maxVisible + 1)
    for (let i = start; i <= end; i++) p.push(i)
    return p
  }, [currentPage, totalPages])

  if (totalPages <= 1) return null

  const from = (currentPage - 1) * pageSize + 1
  const to = Math.min(currentPage * pageSize, totalItems)

  return (
    <div className="bp-pagination">
      <span className="bp-pagination__info">
        {from}-{to} / {totalItems}
      </span>
      <div className="bp-pagination__controls">
        <button
          className="bp-pagination__btn"
          disabled={currentPage <= 1}
          onClick={() => onPageChange(currentPage - 1)}
        >
          ‹
        </button>
        {pages.map((p) => (
          <button
            key={p}
            className={`bp-pagination__page${p === currentPage ? ' bp-pagination__page--active' : ''}`}
            onClick={() => onPageChange(p)}
          >
            {p}
          </button>
        ))}
        <button
          className="bp-pagination__btn"
          disabled={currentPage >= totalPages}
          onClick={() => onPageChange(currentPage + 1)}
        >
          ›
        </button>
      </div>
    </div>
  )
})
