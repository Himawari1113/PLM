import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'

export async function POST(
  req: NextRequest,
  { params }: { params: { id: string; sampleId: string } }
) {
  const body = await req.json()
  const bomItem = await prisma.bomItem.create({
    data: {
      sampleId: params.sampleId,
      materialId: body.materialId,
      quantity: parseFloat(body.quantity),
      unit: body.unit || null,
      note: body.note || null,
    },
    include: { material: true },
  })
  return NextResponse.json(bomItem, { status: 201 })
}

export async function DELETE(req: NextRequest) {
  const { searchParams } = new URL(req.url)
  const bomItemId = searchParams.get('bomItemId')
  if (!bomItemId) return NextResponse.json({ error: 'bomItemId required' }, { status: 400 })

  await prisma.bomItem.delete({ where: { id: bomItemId } })
  return NextResponse.json({ success: true })
}
