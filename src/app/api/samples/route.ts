import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { createSampleWithNormalizedData } from '@/lib/sample-create'

export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url)
  const yearParam = searchParams.get('year')
  const seasonParam = searchParams.get('season')

  const where: any = {}
  if (yearParam) {
    const year = parseInt(yearParam, 10)
    if (Number.isFinite(year)) {
      where.year = year
    }
  }
  if (seasonParam) {
    const seasonCode = parseInt(seasonParam, 10)
    if (Number.isFinite(seasonCode)) {
      where.season = {
        seasonCode: seasonCode,
      }
    }
  }

  const samples = await prisma.sample.findMany({
    where,
    include: {
      product: { select: { id: true, styleNumber: true, name: true } },
      season: { select: { id: true, seasonName: true, seasonCode: true } },
      supplier: { select: { id: true, name: true } },
      costs: { orderBy: { createdAt: 'desc' }, take: 1 },
      sampleColors: {
        include: { color: { select: { id: true, colorCode: true, colorName: true, colorImage: true } } },
      },
      _count: { select: { sampleColors: true } },
      sizeMeasurements: { select: { sizeCode: true }, distinct: ['sizeCode'] },
    },
    orderBy: [
      { year: 'asc' },
      { season: { seasonCode: 'asc' } },
      { sampleNumber: 'asc' }
    ],
  })

  const result = samples.map((s) => ({
    ...s,
    colorCount: s._count.sampleColors,
    colors: s.sampleColors.map((sc) => ({
      colorCode: sc.color.colorCode,
      colorName: sc.color.colorName,
      colorImage: sc.color.colorImage,
    })),
    supplierName: s.supplier?.name || null,
    sizes: s.sizeMeasurements.map((m) => m.sizeCode).filter(Boolean),
    _count: undefined,
    sampleColors: undefined,
    sizeMeasurements: undefined,
    clo3dFile: undefined,
    patternCadFile: undefined,
    illustratorFile: undefined,
    fittingComment: undefined,
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
