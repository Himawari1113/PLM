import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'

export async function GET(_req: NextRequest, { params }: { params: { id: string } }) {
  const season = await prisma.seasonMaster.findUnique({
    where: { id: params.id },
    include: {
      collections: {
        include: {
          products: { orderBy: { updatedAt: 'desc' } },
          _count: { select: { products: true } },
        },
      },
      trendItems: true,
    },
  })
  if (!season) return NextResponse.json({ error: 'Not found' }, { status: 404 })
  return NextResponse.json(season)
}

export async function PUT(req: NextRequest, { params }: { params: { id: string } }) {
  const body = await req.json()
  const season = await prisma.seasonMaster.update({
    where: { id: params.id },
    data: {
      name: body.name,
      seasonCode: body.seasonCode,
      seasonName: body.seasonName,
      description: body.description || null,
      startDate: body.startDate ? new Date(body.startDate) : null,
      endDate: body.endDate ? new Date(body.endDate) : null,
    },
  })
  return NextResponse.json(season)
}

export async function DELETE(_req: NextRequest, { params }: { params: { id: string } }) {
  await prisma.seasonMaster.delete({ where: { id: params.id } })
  return NextResponse.json({ success: true })
}
