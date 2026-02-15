import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'

export async function PUT(req: NextRequest, { params }: { params: { id: string } }) {
  const body = await req.json()
  const trend = await prisma.trendItem.update({
    where: { id: params.id },
    data: {
      title: body.title,
      url: body.url || null,
      imageUrl: body.imageUrl || null,
      description: body.description || null,
      tags: body.tags || [],
      seasonId: body.seasonId || null,
    },
  })
  return NextResponse.json(trend)
}

export async function DELETE(_req: NextRequest, { params }: { params: { id: string } }) {
  await prisma.trendItem.delete({ where: { id: params.id } })
  return NextResponse.json({ success: true })
}
