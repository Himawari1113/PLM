'use client'

import { useEffect, useState } from 'react'
import { Twitter, Heart, MessageCircle, Repeat2, TrendingUp, Calendar } from 'lucide-react'
import { BpPageHeader } from '@/components/common'

interface Tweet {
  id: string
  text: string
  author_id: string
  created_at: string
  public_metrics?: {
    retweet_count: number
    reply_count: number
    like_count: number
    quote_count: number
  }
  author?: {
    username: string
    name: string
    profile_image_url?: string
  }
}

interface TweetAnalytics {
  totalTweets: number
  totalEngagement: number
  averageLikes: number
  topHashtags: Array<{ tag: string; count: number }>
}

export default function TwitterPage() {
  const [tweets, setTweets] = useState<Tweet[]>([])
  const [analytics, setAnalytics] = useState<TweetAnalytics | null>(null)
  const [loading, setLoading] = useState(true)
  const [searchQuery, setSearchQuery] = useState('fashion apparel')

  const fetchTweets = async (query: string) => {
    setLoading(true)
    try {
      const response = await fetch(`/api/twitter/search?query=${encodeURIComponent(query)}`)
      const data = await response.json()
      
      if (data.tweets) {
        setTweets(data.tweets)
        
        // Calculate analytics
        const totalEngagement = data.tweets.reduce((sum: number, t: Tweet) => {
          return sum + (t.public_metrics?.like_count || 0) + 
                 (t.public_metrics?.retweet_count || 0) + 
                 (t.public_metrics?.reply_count || 0)
        }, 0)
        
        const avgLikes = data.tweets.length > 0 
          ? data.tweets.reduce((sum: number, t: Tweet) => sum + (t.public_metrics?.like_count || 0), 0) / data.tweets.length 
          : 0
        
        // Extract hashtags
        const hashtagCounts: Record<string, number> = {}
        data.tweets.forEach((t: Tweet) => {
          const hashtags = t.text.match(/#\w+/g) || []
          hashtags.forEach(tag => {
            hashtagCounts[tag] = (hashtagCounts[tag] || 0) + 1
          })
        })
        
        const topHashtags = Object.entries(hashtagCounts)
          .map(([tag, count]) => ({ tag, count }))
          .sort((a, b) => b.count - a.count)
          .slice(0, 10)
        
        setAnalytics({
          totalTweets: data.tweets.length,
          totalEngagement,
          averageLikes: Math.round(avgLikes),
          topHashtags,
        })
      }
    } catch (error) {
      console.error('Failed to fetch tweets:', error)
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    fetchTweets(searchQuery)
  }, [])

  const formatDate = (dateString: string) => {
    const date = new Date(dateString)
    const now = new Date()
    const diffMs = now.getTime() - date.getTime()
    const diffHours = Math.floor(diffMs / (1000 * 60 * 60))
    
    if (diffHours < 1) return 'Just now'
    if (diffHours < 24) return `${diffHours}h ago`
    const diffDays = Math.floor(diffHours / 24)
    if (diffDays < 7) return `${diffDays}d ago`
    return date.toLocaleDateString()
  }

  return (
    <div style={{ display: 'flex', flexDirection: 'column', height: '100%' }}>
      <BpPageHeader
        title="Twitter Insights"
        subtitle="Social Media Trends and Customer Sentiment"
      />

      <div style={{ display: 'flex', flexDirection: 'column', gap: 20, padding: '0 24px 24px' }}>
        {/* Search Bar */}
        <div style={{ display: 'flex', gap: 12, alignItems: 'center' }}>
          <input
            type="text"
            className="bp-input"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            onKeyPress={(e) => {
              if (e.key === 'Enter') {
                fetchTweets(searchQuery)
              }
            }}
            placeholder="Search tweets..."
            style={{ flex: 1, maxWidth: 500 }}
          />
          <button
            className="bp-button bp-button--primary"
            onClick={() => fetchTweets(searchQuery)}
            disabled={loading}
          >
            Search
          </button>
        </div>

        {loading ? (
          <div className="bp-spinner-wrap">
            <div className="bp-spinner" />
          </div>
        ) : (
          <>
            {/* Analytics Cards */}
            {analytics && (
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: 16 }}>
                <div className="bp-card" style={{ padding: 20 }}>
                  <div style={{ fontSize: 13, color: 'var(--color-text-secondary)', marginBottom: 8 }}>Total Tweets</div>
                  <div style={{ fontSize: 28, fontWeight: 600, color: 'var(--color-text)' }}>
                    {analytics.totalTweets}
                  </div>
                </div>
                
                <div className="bp-card" style={{ padding: 20 }}>
                  <div style={{ fontSize: 13, color: 'var(--color-text-secondary)', marginBottom: 8 }}>Total Engagement</div>
                  <div style={{ fontSize: 28, fontWeight: 600, color: '#1da1f2' }}>
                    {analytics.totalEngagement.toLocaleString()}
                  </div>
                </div>
                
                <div className="bp-card" style={{ padding: 20 }}>
                  <div style={{ fontSize: 13, color: 'var(--color-text-secondary)', marginBottom: 8 }}>Avg Likes</div>
                  <div style={{ fontSize: 28, fontWeight: 600, color: '#e0245e' }}>
                    {analytics.averageLikes}
                  </div>
                </div>
              </div>
            )}

            <div style={{ display: 'grid', gridTemplateColumns: '2fr 1fr', gap: 20 }}>
              {/* Tweets List */}
              <div className="bp-card" style={{ padding: 20 }}>
                <h3 style={{ fontSize: 16, fontWeight: 600, marginBottom: 16 }}>Recent Tweets</h3>
                <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
                  {tweets.length === 0 ? (
                    <div style={{ textAlign: 'center', padding: 40, color: 'var(--color-text-secondary)' }}>
                      No tweets found. Try a different search query.
                    </div>
                  ) : (
                    tweets.map((tweet) => (
                      <div
                        key={tweet.id}
                        style={{
                          padding: 16,
                          border: '1px solid var(--color-border)',
                          borderRadius: 8,
                          background: '#fff',
                        }}
                      >
                        <div style={{ display: 'flex', gap: 12, marginBottom: 12 }}>
                          <div style={{ 
                            width: 40, 
                            height: 40, 
                            borderRadius: '50%', 
                            background: 'linear-gradient(135deg, #1da1f2 0%, #0d8bd9 100%)',
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                            color: '#fff',
                            fontWeight: 600,
                            fontSize: 16,
                          }}>
                            {tweet.author?.name?.charAt(0) || 'T'}
                          </div>
                          <div style={{ flex: 1 }}>
                            <div style={{ fontWeight: 600, fontSize: 14 }}>
                              {tweet.author?.name || 'Twitter User'}
                            </div>
                            <div style={{ fontSize: 13, color: 'var(--color-text-secondary)' }}>
                              @{tweet.author?.username || 'user'} · {formatDate(tweet.created_at)}
                            </div>
                          </div>
                        </div>
                        
                        <div style={{ fontSize: 14, lineHeight: 1.5, marginBottom: 12, whiteSpace: 'pre-wrap' }}>
                          {tweet.text}
                        </div>
                        
                        {tweet.public_metrics && (
                          <div style={{ display: 'flex', gap: 16, fontSize: 13, color: 'var(--color-text-secondary)' }}>
                            <div style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
                              <MessageCircle style={{ width: 16, height: 16 }} />
                              {tweet.public_metrics.reply_count}
                            </div>
                            <div style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
                              <Repeat2 style={{ width: 16, height: 16 }} />
                              {tweet.public_metrics.retweet_count}
                            </div>
                            <div style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
                              <Heart style={{ width: 16, height: 16 }} />
                              {tweet.public_metrics.like_count}
                            </div>
                          </div>
                        )}
                      </div>
                    ))
                  )}
                </div>
              </div>

              {/* Trending Hashtags */}
              {analytics && analytics.topHashtags.length > 0 && (
                <div className="bp-card" style={{ padding: 20 }}>
                  <h3 style={{ fontSize: 16, fontWeight: 600, marginBottom: 16, display: 'flex', alignItems: 'center', gap: 8 }}>
                    <TrendingUp style={{ width: 18, height: 18 }} />
                    Trending Hashtags
                  </h3>
                  <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
                    {analytics.topHashtags.map((item, idx) => (
                      <div
                        key={item.tag}
                        style={{
                          display: 'flex',
                          justifyContent: 'space-between',
                          alignItems: 'center',
                          padding: 12,
                          background: '#f8f9fa',
                          borderRadius: 6,
                        }}
                      >
                        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                          <span style={{ 
                            fontSize: 12, 
                            fontWeight: 600, 
                            color: '#6b7280',
                            minWidth: 20,
                          }}>
                            #{idx + 1}
                          </span>
                          <span style={{ 
                            fontSize: 14, 
                            fontWeight: 500, 
                            color: '#1da1f2',
                          }}>
                            {item.tag}
                          </span>
                        </div>
                        <span style={{ 
                          fontSize: 13, 
                          fontWeight: 600, 
                          color: 'var(--color-text-secondary)',
                        }}>
                          {item.count}
                        </span>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
          </>
        )}
      </div>
    </div>
  )
}
