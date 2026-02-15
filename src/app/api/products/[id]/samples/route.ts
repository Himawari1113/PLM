import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { createSampleWithNormalizedData } from '@/lib/sample-create'

export async function GET(_req: NextRequest, { params }: { params: { id: string } }) {
  const samples = await prisma.sample.findMany({
    where: { productId: params.id },
    include: {
      costs: { orderBy: { createdAt: 'desc' }, take: 1 },
      _count: { select: { costs: true } },
    },
    orderBy: { updatedAt: 'desc' },
  })
  return NextResponse.json(samples)
}

export async function POST(req: NextRequest, { params }: { params: { id: string } }) {
  const body = await req.json()
  const sample = await prisma.$transaction((tx) =>
    createSampleWithNormalizedData(tx, params.id, body.newSampleData || {}),
  )
  return NextResponse.json(sample, { status: 201 })
}
