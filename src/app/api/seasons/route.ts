import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'

export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url)
  const yearParam = searchParams.get('year')

  const where: any = {}
  if (yearParam) {
    const year = parseInt(yearParam, 10)
    if (Number.isFinite(year)) {
      where.year = year
    }
  }

  const seasons = await prisma.season.findMany({
    where,
    include: {
      collections: {
        include: { _count: { select: { products: true } } },
      },
    },
    orderBy: [{ year: 'desc' }, { term: 'asc' }],
  })
  return NextResponse.json(seasons)
}

export async function POST(req: NextRequest) {
  const body = await req.json()
  const season = await prisma.season.create({
    data: {
      name: body.name,
      year: body.year,
      term: body.term,
      description: body.description || null,
      startDate: body.startDate ? new Date(body.startDate) : null,
      endDate: body.endDate ? new Date(body.endDate) : null,
    },
  })
  return NextResponse.json(season, { status: 201 })
}
