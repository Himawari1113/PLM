import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'

export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url)
    const channelParam = searchParams.get('channel')
    
    // Build where clause for channel filter
    const whereClause: any = {}
    if (channelParam && channelParam !== 'ALL') {
      whereClause.channel = channelParam
    }
    
    // Overall statistics
    const [
      totalReviews,
      avgRatingResult,
      ratingDistribution,
      topProductsRaw,
      bottomProductsRaw,
      recentLowRatings,
      analyzedCount,
      unanalyzedCount,
    ] = await Promise.all([
      // Total count
      prisma.productReview.count({ where: whereClause }),
      
      // Average rating
      prisma.productReview.aggregate({
        where: whereClause,
        _avg: { rating: true },
      }),
      
      // Rating distribution
      prisma.productReview.groupBy({
        where: whereClause,
        by: ['rating'],
        _count: true,
        orderBy: { rating: 'asc' },
      }),
      
      // Top rated products (with reviews) - using raw groupBy without having
      prisma.productReview.groupBy({
        where: whereClause,
        by: ['articleNumber', 'productName'],
        _avg: { rating: true },
        _count: true,
        orderBy: { _avg: { rating: 'desc' } },
        take: 50, // Get more and filter in memory
      }),
      
      // Lowest rated products (with reviews) - using raw groupBy without having
      prisma.productReview.groupBy({
        where: whereClause,
        by: ['articleNumber', 'productName'],
        _avg: { rating: true },
        _count: true,
        orderBy: { _avg: { rating: 'asc' } },
        take: 50, // Get more and filter in memory
      }),
      
      // Recent low ratings (quality risks)
      prisma.productReview.findMany({
        where: {
          ...whereClause,
          rating: { lte: 2 },
          publishedAt: {
            gte: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000), // Last 30 days
          },
        },
        orderBy: { publishedAt: 'desc' },
        take: 20,
      }),

      // Analyzed count
      prisma.productReview.count({
        where: { ...whereClause, summaryEn: { not: null } },
      }),

      // Unanalyzed count (have text but no summary)
      prisma.productReview.count({
        where: {
          ...whereClause,
          summaryEn: null,
          reviewText: { not: null },
          NOT: { reviewText: '' },
        },
      }),
    ])

    // Tag distribution via raw SQL (unnest the tags array)
    let tagDistribution: Array<{ tag: string; count: number }> = []
    try {
      const channelFilter = channelParam && channelParam !== 'ALL'
        ? `WHERE channel = '${channelParam}'`
        : ''
      const tagRows: Array<{ tag: string; count: bigint }> = await prisma.$queryRawUnsafe(
        `SELECT unnest(tags) as tag, COUNT(*) as count FROM "ProductReview" ${channelFilter} GROUP BY tag ORDER BY count DESC LIMIT 30`
      )
      tagDistribution = tagRows.map((r) => ({ tag: r.tag, count: Number(r.count) }))
    } catch (e) {
      console.error('Tag distribution query failed:', e)
    }

    // Product-level tag aggregation for top/bottom products
    let productTagMap: Record<string, string[]> = {}
    try {
      const channelFilter = channelParam && channelParam !== 'ALL'
        ? `WHERE channel = '${channelParam}'`
        : ''
      const productTagRows: Array<{ article_number: string; tag: string; cnt: bigint }> =
        await prisma.$queryRawUnsafe(
          `SELECT "articleNumber" as article_number, unnest(tags) as tag, COUNT(*) as cnt
           FROM "ProductReview" ${channelFilter}
           GROUP BY "articleNumber", tag ORDER BY "articleNumber", cnt DESC`
        )
      for (const row of productTagRows) {
        if (!productTagMap[row.article_number]) productTagMap[row.article_number] = []
        if (productTagMap[row.article_number].length < 3) {
          productTagMap[row.article_number].push(row.tag)
        }
      }
    } catch (e) {
      console.error('Product tag aggregation failed:', e)
    }

    // Filter top products with rating >= 4.5 and sort by review count
    const topProducts = topProductsRaw
      .filter((p) => (p._avg.rating || 0) >= 4.5)
      .sort((a, b) => b._count - a._count)
      .slice(0, 10);

    // Filter bottom products with rating <= 3
    const bottomProducts = bottomProductsRaw
      .filter((p) => (p._avg.rating || 0) <= 3)
      .slice(0, 10);

    return NextResponse.json({
      totalReviews,
      averageRating: avgRatingResult._avg.rating || 0,
      ratingDistribution: ratingDistribution.map((r) => ({
        rating: r.rating,
        count: r._count,
      })),
      topProducts: topProducts.map((p) => ({
        articleNumber: p.articleNumber,
        productName: p.productName,
        averageRating: p._avg.rating,
        reviewCount: p._count,
        topTags: productTagMap[p.articleNumber] || [],
      })),
      bottomProducts: bottomProducts.map((p) => ({
        articleNumber: p.articleNumber,
        productName: p.productName,
        averageRating: p._avg.rating,
        reviewCount: p._count,
        topTags: productTagMap[p.articleNumber] || [],
      })),
      recentLowRatings: recentLowRatings,
      tagDistribution,
      analyzedCount,
      unanalyzedCount,
    })
  } catch (error) {
    console.error('GET /api/customer-reviews/stats failed:', error)
    return NextResponse.json({ error: 'Failed to fetch statistics' }, { status: 500 })
  }
}
