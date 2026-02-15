import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { createSampleWithNormalizedData } from '@/lib/sample-create'

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

  const samples = await prisma.sample.findMany({
    where,
    include: {
      product: { select: { id: true, styleNumber: true, name: true } },
      season: { select: { id: true, term: true, year: true } },
      costs: { orderBy: { createdAt: 'desc' }, take: 1 },
      _count: { select: { sampleColors: true } },
      sizeMeasurements: { select: { sizeCode: true }, distinct: ['sizeCode'] },
    },
    orderBy: { updatedAt: 'desc' },
  })

  const result = samples.map((s) => ({
    ...s,
    colorCount: s._count.sampleColors,
    sizes: s.sizeMeasurements.map((m) => m.sizeCode).filter(Boolean),
    _count: undefined,
    sizeMeasurements: undefined,
  }))

  return NextResponse.json(result)
}

export async function POST(req: NextRequest) {
  const body = await req.json()
  const sample = await prisma.$transaction((tx) =>
    createSampleWithNormalizedData(tx, body.productId || null, body.newSampleData || {}),
  )
  return NextResponse.json(sample, { status: 201 })
}
