import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'

export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url)
    const year = searchParams.get('year')
    const season = searchParams.get('season')

    const where: any = {}
    if (year) where.year = parseInt(year)
    if (season) where.seasonCode = parseInt(season)

    const items = await prisma.financialPlanning.findMany({
      where,
      orderBy: [{ divisionName: 'asc' }, { month: 'asc' }],
    })
    return NextResponse.json(items)
  } catch (error) {
    console.error('GET /api/financial-planning failed:', error)
    return NextResponse.json({ error: 'Failed to fetch financial planning data' }, { status: 500 })
  }
}

export async function POST(req: NextRequest) {
  try {
    const body = await req.json()
    const item = await prisma.financialPlanning.upsert({
      where: {
        year_seasonCode_divisionName_month: {
          year: body.year,
          seasonCode: parseInt(body.season_code || body.seasonCode || '1'),
          divisionName: body.divisionName || body.division_name || '',
          month: body.month,
        },
      },
      update: {
        revenue: body.revenue ?? undefined,
        gmPercent: body.gm_percent ?? body.gmPercent ?? undefined,
        ebita: body.ebita ?? undefined,
        inventory: body.inventory ?? undefined,
      },
      create: {
        year: body.year,
        seasonCode: parseInt(body.season_code || body.seasonCode || '1'),
        divisionName: body.divisionName || body.division_name || '',
        month: body.month,
        revenue: body.revenue || 0,
        gmPercent: body.gm_percent || body.gmPercent || 0,
        ebita: body.ebita || 0,
        inventory: body.inventory || 0,
      },
    })
    return NextResponse.json(item, { status: 201 })
  } catch (error) {
    console.error('POST /api/financial-planning failed:', error)
    return NextResponse.json({ error: 'Failed to create/update FP item' }, { status: 500 })
  }
}
