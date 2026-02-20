import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'

export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url)
    const year = searchParams.get('year')
    const season = searchParams.get('season')

    const where: any = {}
    if (year) where.year = parseInt(year)
    if (season) where.season = parseInt(season)

    const items = await prisma.otbPlanning.findMany({
      where,
      orderBy: [{ styleNumber: 'asc' }, { weekNumber: 'asc' }],
    })
    return NextResponse.json(items)
  } catch (error) {
    console.error('GET /api/otb-planning failed:', error)
    return NextResponse.json({ error: 'Failed to fetch OTB data' }, { status: 500 })
  }
}

export async function POST(req: NextRequest) {
  try {
    const body = await req.json()
    const item = await prisma.otbPlanning.create({ data: body })
    return NextResponse.json(item, { status: 201 })
  } catch (error) {
    console.error('POST /api/otb-planning failed:', error)
    return NextResponse.json({ error: 'Failed to create OTB item' }, { status: 500 })
  }
}
