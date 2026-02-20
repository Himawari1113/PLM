import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'

export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url)
    const articleNumber = searchParams.get('articleNumber')
    const minRating = searchParams.get('minRating')
    const maxRating = searchParams.get('maxRating')
    const hasText = searchParams.get('hasText')
    const limit = searchParams.get('limit')
    const offset = searchParams.get('offset')

    const where: any = {}
    
    if (articleNumber) {
      where.articleNumber = { contains: articleNumber, mode: 'insensitive' }
    }
    
    if (minRating) {
      where.rating = { ...where.rating, gte: parseInt(minRating) }
    }
    
    if (maxRating) {
      where.rating = { ...where.rating, lte: parseInt(maxRating) }
    }
    
    if (hasText === 'true') {
      where.reviewText = { not: null }
      where.NOT = { reviewText: '' }
    }

    const reviews = await prisma.productReview.findMany({
      where,
      orderBy: { publishedAt: 'desc' },
      take: limit ? parseInt(limit) : 100,
      skip: offset ? parseInt(offset) : 0,
    })

    return NextResponse.json(reviews)
  } catch (error) {
    console.error('GET /api/customer-reviews failed:', error)
    return NextResponse.json({ error: 'Failed to fetch reviews' }, { status: 500 })
  }
}
