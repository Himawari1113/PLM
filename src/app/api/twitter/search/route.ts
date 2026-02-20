import { NextRequest, NextResponse } from 'next/server'

const TWITTER_BEARER_TOKEN = process.env.TWITTER_BEARER_TOKEN

export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url)
    const query = searchParams.get('query') || 'fashion'
    
    if (!TWITTER_BEARER_TOKEN) {
      return NextResponse.json(
        { error: 'Twitter API token not configured' },
        { status: 500 }
      )
    }

    // Twitter API v2 search endpoint
    const twitterUrl = new URL('https://api.twitter.com/2/tweets/search/recent')
    twitterUrl.searchParams.append('query', query)
    twitterUrl.searchParams.append('max_results', '50')
    twitterUrl.searchParams.append('tweet.fields', 'created_at,public_metrics,author_id')
    twitterUrl.searchParams.append('expansions', 'author_id')
    twitterUrl.searchParams.append('user.fields', 'name,username,profile_image_url')

    const response = await fetch(twitterUrl.toString(), {
      headers: {
        'Authorization': `Bearer ${TWITTER_BEARER_TOKEN}`,
        'Content-Type': 'application/json',
      },
    })

    if (!response.ok) {
      const errorText = await response.text()
      console.error('Twitter API error:', response.status, errorText)
      return NextResponse.json(
        { error: 'Failed to fetch tweets', details: errorText },
        { status: response.status }
      )
    }

    const data = await response.json()
    
    // Merge author data with tweets
    const tweets = data.data || []
    const users = data.includes?.users || []
    
    const enrichedTweets = tweets.map((tweet: any) => {
      const author = users.find((u: any) => u.id === tweet.author_id)
      return {
        ...tweet,
        author,
      }
    })

    return NextResponse.json({
      tweets: enrichedTweets,
      meta: data.meta,
    })
  } catch (error) {
    console.error('Twitter API error:', error)
    return NextResponse.json(
      { error: 'Failed to fetch tweets', details: error instanceof Error ? error.message : 'Unknown error' },
      { status: 500 }
    )
  }
}
