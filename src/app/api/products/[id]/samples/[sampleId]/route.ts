import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'

export async function GET(
  _req: NextRequest,
  { params }: { params: { id: string; sampleId: string } }
) {
  const sample = await prisma.sample.findUnique({
    where: { id: params.sampleId },
    include: {
      product: { select: { id: true, styleNumber: true, name: true } },
      bomItems: { include: { material: true } },
      costs: { orderBy: { createdAt: 'desc' } },
    },
  })
  if (!sample || sample.productId !== params.id) {
    return NextResponse.json({ error: 'Not found' }, { status: 404 })
  }
  return NextResponse.json(sample)
}

export async function PUT(
  req: NextRequest,
  { params }: { params: { id: string; sampleId: string } }
) {
  const body = await req.json()
  const sample = await prisma.sample.update({
    where: { id: params.sampleId },
    data: {
      sampleName: body.sampleName,
      sampleNumber: body.sampleNumber,
      sampleType: body.sampleType,
      status: body.status,
      sizeSpec: body.sizeSpec || null,
      remarks: body.remarks || null,
      imageUrl: body.imageUrl || null,
      mainFactoryCode: body.mainFactoryCode || null,
      dueDate: body.dueDate ? new Date(body.dueDate) : null,
      shippingDestination: body.shippingDestination || null,
      fittingComment: body.fittingComment || null,
    },
  })
  return NextResponse.json(sample)
}

export async function DELETE(
  _req: NextRequest,
  { params }: { params: { id: string; sampleId: string } }
) {
  await prisma.sample.delete({ where: { id: params.sampleId } })
  return NextResponse.json({ success: true })
}
