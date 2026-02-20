import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'

export async function GET(req: NextRequest) {
  const seasons = await prisma.seasonMaster.findMany({
    include: {
      collections: {
        include: { _count: { select: { products: true } } },
      },
    },
    orderBy: [{ seasonCode: 'asc' }],
  })
  return NextResponse.json(seasons)
}

export async function POST(req: NextRequest) {
  const body = await req.json()
  const season = await prisma.seasonMaster.create({
    data: {
      name: body.name,
      seasonCode: body.seasonCode,
      seasonName: body.seasonName,
      description: body.description || null,
      startDate: body.startDate ? new Date(body.startDate) : null,
      endDate: body.endDate ? new Date(body.endDate) : null,
    },
  })
  return NextResponse.json(season, { status: 201 })
}
