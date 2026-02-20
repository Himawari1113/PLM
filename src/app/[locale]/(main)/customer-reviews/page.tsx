'use client'

import { useEffect, useState, useCallback } from 'react'
import { MessageSquare, TrendingUp, TrendingDown, AlertTriangle, Star, Sparkles } from 'lucide-react'
import { BpPageHeader } from '@/components/common'

interface Review {
  id: string
  reviewId: string
  sku: string
  articleNumber: string
  productName: string
  reviewText: string | null
  publishedAt: string
  rating: number
  status: string
  commentCount: number
  orderStatus: string
  ratingMember: boolean
  summaryEn: string | null
  tags: string[]
}

interface ProductStat {
  articleNumber: string
  productName: string
  averageRating: number
  reviewCount: number
  topTags: string[]
}

interface TagStat {
  tag: string
  count: number
}

interface Stats {
  totalReviews: number
  averageRating: number
  ratingDistribution: Array<{ rating: number; count: number }>
  topProducts: ProductStat[]
  bottomProducts: ProductStat[]
  recentLowRatings: Review[]
  tagDistribution: TagStat[]
  analyzedCount: number
  unanalyzedCount: number
}

interface KeywordData {
  keyword: string
  count: number
}

interface KeywordsResponse {
  totalReviewsAnalyzed: number
  keywords: KeywordData[]
}

const TAG_COLORS: Record<string, string> = {
  Quality: '#3b82f6',
  Fit: '#8b5cf6',
  Size: '#8b5cf6',
  Color: '#ec4899',
  Material: '#06b6d4',
  Delivery: '#f97316',
  Value: '#10b981',
  Design: '#a855f7',
  Comfort: '#22c55e',
  Durability: '#0ea5e9',
  Packaging: '#78716c',
  Smell: '#eab308',
  Defect: '#ef4444',
  Satisfaction: '#10b981',
  Disappointment: '#ef4444',
}

function getTagColor(tag: string): string {
  return TAG_COLORS[tag] || '#64748b'
}

function renderStars(rating: number) {
  return (
    <div style={{ display: 'flex', gap: 3 }}>
      {[1, 2, 3, 4, 5].map((i) => (
        <Star
          key={i}
          style={{
            width: 16,
            height: 16,
            fill: i <= rating ? '#fbbf24' : 'none',
            stroke: i <= rating ? '#fbbf24' : '#cbd5e1',
          }}
        />
      ))}
    </div>
  )
}

function TagBadge({ tag }: { tag: string }) {
  const color = getTagColor(tag)
  return (
    <span
      style={{
        display: 'inline-block',
        padding: '2px 8px',
        borderRadius: 12,
        fontSize: 11,
        fontWeight: 500,
        background: `${color}18`,
        color: color,
        border: `1px solid ${color}30`,
        whiteSpace: 'nowrap',
      }}
    >
      {tag}
    </span>
  )
}

export default function CustomerReviewsPage() {
  const [stats, setStats] = useState<Stats | null>(null)
  const [keywords, setKeywords] = useState<KeywordsResponse | null>(null)
  const [loading, setLoading] = useState(true)
  const [selectedTab, setSelectedTab] = useState<'overview' | 'positive' | 'negative' | 'risks'>('overview')
  const [selectedChannel, setSelectedChannel] = useState<string>('ALL')
  const [analyzing, setAnalyzing] = useState(false)
  const [analyzeStatus, setAnalyzeStatus] = useState<string>('')

  const fetchData = useCallback(() => {
    setLoading(true)
    const channelParam = selectedChannel === 'ALL' ? '' : `?channel=${selectedChannel}`

    Promise.all([
      fetch(`/api/customer-reviews/stats${channelParam}`).then((r) => r.json()),
      fetch(`/api/customer-reviews/keywords${channelParam}`).then((r) => r.json()),
    ])
      .then(([statsData, keywordsData]) => {
        setStats(statsData)
        setKeywords(keywordsData)
      })
      .finally(() => setLoading(false))
  }, [selectedChannel])

  useEffect(() => { fetchData() }, [fetchData])

  const handleAnalyze = async () => {
    setAnalyzing(true)
    setAnalyzeStatus('Starting analysis...')
    let totalProcessed = 0

    try {
      // Keep calling until no more remaining
      for (let round = 0; round < 20; round++) {
        const res = await fetch('/api/customer-reviews/analyze', { method: 'POST' })
        if (!res.ok) {
          setAnalyzeStatus('Analysis failed')
          break
        }
        const data = await res.json()
        totalProcessed += data.analyzed

        if (data.remaining === 0 || data.analyzed === 0) {
          setAnalyzeStatus(`Done! ${totalProcessed} reviews analyzed.`)
          break
        }
        setAnalyzeStatus(`Analyzed ${totalProcessed} reviews... (${data.remaining} remaining)`)
      }
    } catch {
      setAnalyzeStatus('Analysis error')
    }

    setAnalyzing(false)
    // Refresh data
    fetchData()
  }

  if (loading) {
    return (
      <div className="bp-spinner-wrap">
        <div className="bp-spinner" />
      </div>
    )
  }

  if (!stats) return null

  const maxTagCount = stats.tagDistribution?.[0]?.count || 1

  return (
    <div style={{ display: 'flex', flexDirection: 'column', height: '100%' }}>
      <BpPageHeader
        title="Customer Reviews"
        subtitle="Product Development Insights from Customer Feedback"
      />

      <div style={{ display: 'flex', flexDirection: 'column', gap: 20, padding: '0 24px 24px' }}>
        {/* Channel Filter */}
        <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
          <label style={{ fontSize: 14, fontWeight: 500, color: 'var(--color-text)' }}>Channel:</label>
          <select
            className="bp-select"
            value={selectedChannel}
            onChange={(e) => {
              setSelectedChannel(e.target.value)
              setLoading(true)
            }}
            style={{ width: 200 }}
          >
            <option value="ALL">All Channels</option>
            <option value="OZON">OZON</option>
            <option value="WILDBERRIES">Wildberries</option>
          </select>
          {stats.analyzedCount > 0 && (
            <span style={{ fontSize: 12, color: 'var(--color-text-secondary)', marginLeft: 8 }}>
              {stats.analyzedCount} / {stats.totalReviews} analyzed
            </span>
          )}
        </div>

        {/* Summary Cards */}
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: 16 }}>
          <div className="bp-card" style={{ padding: 20 }}>
            <div style={{ fontSize: 13, color: 'var(--color-text-secondary)', marginBottom: 8 }}>Total Reviews</div>
            <div style={{ fontSize: 28, fontWeight: 600, color: 'var(--color-text)' }}>
              {(stats.totalReviews || 0).toLocaleString()}
            </div>
          </div>

          <div className="bp-card" style={{ padding: 20 }}>
            <div style={{ fontSize: 13, color: 'var(--color-text-secondary)', marginBottom: 8 }}>Average Rating</div>
            <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
              <div style={{ fontSize: 28, fontWeight: 600, color: '#fbbf24' }}>
                {(stats.averageRating || 0).toFixed(2)}
              </div>
              {renderStars(Math.round(stats.averageRating || 0))}
            </div>
          </div>

          <div className="bp-card" style={{ padding: 20 }}>
            <div style={{ fontSize: 13, color: 'var(--color-text-secondary)', marginBottom: 8 }}>5-Star Reviews</div>
            <div style={{ fontSize: 28, fontWeight: 600, color: '#10b981' }}>
              {stats.totalReviews > 0
                ? (((stats.ratingDistribution?.find(r => r.rating === 5)?.count || 0) / stats.totalReviews) * 100).toFixed(1)
                : '0.0'}%
            </div>
          </div>

          <div className="bp-card" style={{ padding: 20 }}>
            <div style={{ fontSize: 13, color: 'var(--color-text-secondary)', marginBottom: 8 }}>Quality Risks (1-2★)</div>
            <div style={{ fontSize: 28, fontWeight: 600, color: '#ef4444' }}>
              {(stats.ratingDistribution?.filter(r => r.rating <= 2).reduce((sum, r) => sum + r.count, 0) || 0)}
            </div>
          </div>
        </div>

        {/* Tabs */}
        <div style={{ display: 'flex', gap: 8, borderBottom: '1px solid var(--color-border)' }}>
          {[
            { id: 'overview', label: 'Overview', icon: MessageSquare },
            { id: 'positive', label: 'Top Products', icon: TrendingUp },
            { id: 'negative', label: 'Low Rated', icon: TrendingDown },
            { id: 'risks', label: 'Quality Risks', icon: AlertTriangle },
          ].map((tab) => (
            <button
              key={tab.id}
              onClick={() => setSelectedTab(tab.id as any)}
              style={{
                padding: '12px 20px',
                background: 'none',
                border: 'none',
                borderBottom: selectedTab === tab.id ? '2px solid var(--color-primary)' : '2px solid transparent',
                color: selectedTab === tab.id ? 'var(--color-primary)' : 'var(--color-text-secondary)',
                fontWeight: selectedTab === tab.id ? 600 : 400,
                cursor: 'pointer',
                display: 'flex',
                alignItems: 'center',
                gap: 8,
                fontSize: 14,
              }}
            >
              <tab.icon style={{ width: 16, height: 16 }} />
              {tab.label}
            </button>
          ))}
        </div>

        {/* Tab Content */}
        {selectedTab === 'overview' && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>
            {/* Keyword Cloud */}
            {keywords && keywords.keywords && keywords.keywords.length > 0 && (
              <div className="bp-card" style={{ padding: '12px 20px' }}>
                <div style={{ display: 'flex', alignItems: 'baseline', gap: 12, marginBottom: 8 }}>
                  <h3 style={{ fontSize: 15, fontWeight: 600 }}>Customer Feedback Keywords</h3>
                  <span style={{ fontSize: 12, color: 'var(--color-text-secondary)' }}>
                    from {keywords.totalReviewsAnalyzed} reviews
                  </span>
                </div>
                <div style={{
                  display: 'flex',
                  flexWrap: 'wrap',
                  gap: 6,
                  padding: '4px 0 8px',
                  alignItems: 'center',
                  maxHeight: 120,
                  overflow: 'hidden',
                }}>
                  {keywords.keywords.slice(0, 40).map((kw, idx) => {
                    const size = Math.max(12, Math.min(26, 12 + (kw.count / keywords.keywords[0].count) * 14))
                    const opacity = 0.6 + (Math.min(idx, 20) / 20) * 0.4

                    return (
                      <span
                        key={kw.keyword}
                        style={{
                          fontSize: size,
                          fontWeight: idx < 10 ? 600 : 400,
                          color: '#3b82f6',
                          padding: '2px 6px',
                          lineHeight: 1.3,
                          cursor: 'default',
                          opacity: opacity,
                        }}
                        title={`${kw.keyword}: ${kw.count} mentions`}
                      >
                        {kw.keyword}
                      </span>
                    )
                  })}
                </div>
              </div>
            )}

            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 20 }}>
              {/* Rating Distribution */}
              <div className="bp-card" style={{ padding: 20 }}>
                <h3 style={{ fontSize: 16, fontWeight: 600, marginBottom: 16 }}>Rating Distribution</h3>
                <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
                  {(stats.ratingDistribution || []).slice().reverse().map((r) => (
                    <div key={r.rating} style={{ display: 'flex', alignItems: 'center', gap: 16 }}>
                      <div style={{ minWidth: 90, display: 'flex', alignItems: 'center', gap: 4 }}>
                        {renderStars(r.rating)}
                      </div>
                      <div style={{ flex: 1, maxWidth: 450, background: '#f1f5f9', borderRadius: 6, height: 28, position: 'relative', overflow: 'hidden' }}>
                        <div
                          style={{
                            position: 'absolute',
                            left: 0,
                            top: 0,
                            height: '100%',
                            width: stats.totalReviews > 0 ? `${(r.count / stats.totalReviews) * 100}%` : '0%',
                            background: r.rating >= 4 ? '#10b981' : r.rating === 3 ? '#f59e0b' : '#ef4444',
                            transition: 'width 0.3s',
                          }}
                        />
                      </div>
                      <div style={{ minWidth: 100, textAlign: 'right', fontSize: 14, fontWeight: 600 }}>
                        {r.count} {stats.totalReviews > 0 ? `(${((r.count / stats.totalReviews) * 100).toFixed(1)}%)` : ''}
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              {/* Tag Distribution */}
              {stats.tagDistribution && stats.tagDistribution.length > 0 ? (
                <div className="bp-card" style={{ padding: 20 }}>
                  <h3 style={{ fontSize: 16, fontWeight: 600, marginBottom: 8 }}>AI Review Tags</h3>
                  <p style={{ fontSize: 12, color: 'var(--color-text-secondary)', marginBottom: 16 }}>
                    Classification from {stats.analyzedCount} analyzed reviews
                  </p>
                  <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
                    {stats.tagDistribution.slice(0, 12).map((t) => (
                      <div key={t.tag} style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                        <div style={{ minWidth: 100 }}>
                          <TagBadge tag={t.tag} />
                        </div>
                        <div style={{ flex: 1, background: '#f1f5f9', borderRadius: 6, height: 22, position: 'relative', overflow: 'hidden' }}>
                          <div
                            style={{
                              position: 'absolute',
                              left: 0,
                              top: 0,
                              height: '100%',
                              width: `${(t.count / maxTagCount) * 100}%`,
                              background: getTagColor(t.tag),
                              opacity: 0.7,
                              transition: 'width 0.3s',
                              borderRadius: 6,
                            }}
                          />
                        </div>
                        <div style={{ minWidth: 40, textAlign: 'right', fontSize: 13, fontWeight: 600 }}>
                          {t.count}
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              ) : (
                <div className="bp-card" style={{ padding: 20 }}>
                  <h3 style={{ fontSize: 16, fontWeight: 600, marginBottom: 16 }}>Key Insights</h3>
                  <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
                    <div style={{ padding: 12, background: '#f0fdf4', borderRadius: 8, borderLeft: '4px solid #10b981' }}>
                      <div style={{ fontSize: 13, fontWeight: 600, color: '#047857', marginBottom: 4 }}>✓ Positive Signal</div>
                      <div style={{ fontSize: 12, color: '#065f46' }}>
                        {stats.totalReviews > 0
                          ? `${(((stats.ratingDistribution?.filter(r => r.rating >= 4).reduce((sum, r) => sum + r.count, 0) || 0) / stats.totalReviews) * 100).toFixed(1)}% of reviews are 4-5 stars`
                          : 'No reviews yet'}
                      </div>
                    </div>

                    <div style={{ padding: 12, background: '#fef3c7', borderRadius: 8, borderLeft: '4px solid #f59e0b' }}>
                      <div style={{ fontSize: 13, fontWeight: 600, color: '#b45309', marginBottom: 4 }}>⚠ Moderate Issues</div>
                      <div style={{ fontSize: 12, color: '#92400e' }}>
                        {(stats.ratingDistribution?.find(r => r.rating === 3)?.count || 0)} reviews with 3 stars need attention
                      </div>
                    </div>

                    <div style={{ padding: 12, background: '#fee2e2', borderRadius: 8, borderLeft: '4px solid #ef4444' }}>
                      <div style={{ fontSize: 13, fontWeight: 600, color: '#b91c1c', marginBottom: 4 }}>✗ Quality Risks</div>
                      <div style={{ fontSize: 12, color: '#7f1d1d' }}>
                        {(stats.recentLowRatings?.length || 0)} low-rated reviews in the last 30 days
                      </div>
                    </div>

                    <div style={{ padding: 12, background: '#eff6ff', borderRadius: 8, borderLeft: '4px solid #3b82f6' }}>
                      <div style={{ fontSize: 13, fontWeight: 600, color: '#1d4ed8', marginBottom: 4 }}>AI Analysis</div>
                      <div style={{ fontSize: 12, color: '#1e40af' }}>
                        Click &quot;Analyze Reviews&quot; to generate English summaries and classification tags
                      </div>
                    </div>
                  </div>
                </div>
              )}
            </div>
          </div>
        )}

        {selectedTab === 'positive' && (
          <div className="bp-card">
            <div style={{ padding: '16px 20px', borderBottom: '1px solid var(--color-border)' }}>
              <h3 style={{ fontSize: 16, fontWeight: 600 }}>Top Performing Products</h3>
              <p style={{ fontSize: 13, color: 'var(--color-text-secondary)', marginTop: 4 }}>
                Products with highest ratings and good review volumes
              </p>
            </div>
            <div className="bp-table-wrap">
              <table className="bp-table">
                <thead>
                  <tr>
                    <th style={{ width: 60 }}>Rank</th>
                    <th style={{ width: 120 }}>Article No.</th>
                    <th>Product Name</th>
                    <th style={{ width: 120 }}>Avg Rating</th>
                    <th style={{ width: 100 }}>Reviews</th>
                    <th style={{ width: 250 }}>Key Strengths</th>
                  </tr>
                </thead>
                <tbody>
                  {(stats.topProducts || []).map((product, idx) => (
                    <tr key={product.articleNumber}>
                      <td style={{ textAlign: 'center', fontWeight: 600, color: idx < 3 ? '#10b981' : 'inherit' }}>
                        #{idx + 1}
                      </td>
                      <td style={{ fontFamily: 'var(--font-family-en)', fontSize: 13 }}>{product.articleNumber}</td>
                      <td style={{ fontSize: 13 }}>{product.productName}</td>
                      <td>
                        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                          {renderStars(Math.round(product.averageRating || 0))}
                          <span style={{ fontSize: 13, fontWeight: 600, color: '#fbbf24' }}>
                            {(product.averageRating || 0).toFixed(2)}
                          </span>
                        </div>
                      </td>
                      <td style={{ textAlign: 'center', fontSize: 13 }}>{product.reviewCount}</td>
                      <td>
                        <div style={{ display: 'flex', gap: 4, flexWrap: 'wrap' }}>
                          {product.topTags?.length > 0
                            ? product.topTags.map((tag) => <TagBadge key={tag} tag={tag} />)
                            : <span style={{ fontSize: 12, color: 'var(--color-text-secondary)' }}>Not analyzed yet</span>
                          }
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {selectedTab === 'negative' && (
          <div className="bp-card">
            <div style={{ padding: '16px 20px', borderBottom: '1px solid var(--color-border)' }}>
              <h3 style={{ fontSize: 16, fontWeight: 600 }}>Products Needing Attention</h3>
              <p style={{ fontSize: 13, color: 'var(--color-text-secondary)', marginTop: 4 }}>
                Products with low average ratings requiring improvement
              </p>
            </div>
            <div className="bp-table-wrap">
              <table className="bp-table">
                <thead>
                  <tr>
                    <th style={{ width: 120 }}>Article No.</th>
                    <th>Product Name</th>
                    <th style={{ width: 120 }}>Avg Rating</th>
                    <th style={{ width: 100 }}>Reviews</th>
                    <th style={{ width: 250 }}>Potential Issues</th>
                  </tr>
                </thead>
                <tbody>
                  {(stats.bottomProducts || []).map((product) => (
                    <tr key={product.articleNumber}>
                      <td style={{ fontFamily: 'var(--font-family-en)', fontSize: 13 }}>{product.articleNumber}</td>
                      <td style={{ fontSize: 13 }}>{product.productName}</td>
                      <td>
                        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                          {renderStars(Math.round(product.averageRating || 0))}
                          <span style={{ fontSize: 13, fontWeight: 600, color: '#ef4444' }}>
                            {(product.averageRating || 0).toFixed(2)}
                          </span>
                        </div>
                      </td>
                      <td style={{ textAlign: 'center', fontSize: 13 }}>{product.reviewCount}</td>
                      <td>
                        <div style={{ display: 'flex', gap: 4, flexWrap: 'wrap' }}>
                          {product.topTags?.length > 0
                            ? product.topTags.map((tag) => <TagBadge key={tag} tag={tag} />)
                            : <span style={{ fontSize: 12, color: 'var(--color-text-secondary)' }}>Not analyzed yet</span>
                          }
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {selectedTab === 'risks' && (
          <div className="bp-card">
            <div style={{ padding: '16px 20px', borderBottom: '1px solid var(--color-border)' }}>
              <h3 style={{ fontSize: 16, fontWeight: 600 }}>Recent Quality Risks (Last 30 Days)</h3>
              <p style={{ fontSize: 13, color: 'var(--color-text-secondary)', marginTop: 4 }}>
                Low-rated reviews (1-2 stars) that may indicate quality or design issues
              </p>
            </div>
            <div style={{ padding: 20 }}>
              {(stats.recentLowRatings || []).length === 0 ? (
                <div style={{ textAlign: 'center', padding: 40, color: 'var(--color-text-secondary)' }}>
                  No quality risks detected in the last 30 days
                </div>
              ) : (
                <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
                  {(stats.recentLowRatings || []).map((review) => (
                    <div
                      key={review.id}
                      style={{
                        padding: 16,
                        background: '#fef2f2',
                        border: '1px solid #fecaca',
                        borderRadius: 8,
                      }}
                    >
                      <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 8 }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                          <span style={{ fontSize: 13, fontWeight: 600, fontFamily: 'var(--font-family-en)' }}>
                            {review.articleNumber}
                          </span>
                          {renderStars(review.rating)}
                          {review.tags && review.tags.length > 0 && (
                            <div style={{ display: 'flex', gap: 4 }}>
                              {review.tags.map((tag) => <TagBadge key={tag} tag={tag} />)}
                            </div>
                          )}
                        </div>
                        <span style={{ fontSize: 12, color: 'var(--color-text-secondary)' }}>
                          {new Date(review.publishedAt).toLocaleDateString()}
                        </span>
                      </div>
                      <div style={{ fontSize: 12, color: 'var(--color-text-secondary)', marginBottom: 4 }}>
                        {review.productName}
                      </div>
                      {review.summaryEn && (
                        <div style={{ fontSize: 13, color: '#1e40af', marginTop: 8, padding: '8px 12px', background: '#eff6ff', borderRadius: 6 }}>
                          {review.summaryEn}
                        </div>
                      )}
                      {review.reviewText && !review.summaryEn && (
                        <div style={{ fontSize: 13, color: '#7f1d1d', marginTop: 8, fontStyle: 'italic' }}>
                          &quot;{review.reviewText}&quot;
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        )}
      </div>
    </div>
  )
}
