import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'

export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url)
  const tag = searchParams.get('tag') || ''
  const seasonId = searchParams.get('seasonId') || ''

  const yearParam = searchParams.get('year') || ''

  const where: any = {}
  if (tag) where.tags = { has: tag }
  if (seasonId) where.seasonId = seasonId
  if (yearParam) {
    where.season = { year: parseInt(yearParam, 10) }
  }

  const trends = await prisma.trendItem.findMany({
    where,
    include: { season: true },
    orderBy: { createdAt: 'desc' },
  })
  return NextResponse.json(trends)
}

export async function POST(req: NextRequest) {
  const body = await req.json()
  const trend = await prisma.trendItem.create({
    data: {
      title: body.title,
      url: body.url || null,
      imageUrl: body.imageUrl || null,
      description: body.description || null,
      tags: body.tags || [],
      seasonId: body.seasonId || null,
    },
  })
  return NextResponse.json(trend, { status: 201 })
}
