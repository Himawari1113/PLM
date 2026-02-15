import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'

export async function PUT(
  req: NextRequest,
  { params }: { params: { id: string; sampleId: string; costId: string } }
) {
  const body = await req.json()
  const cost = await prisma.cost.update({
    where: { id: params.costId },
    data: {
      costVersion: body.costVersion,
      status: body.status,
      currency: body.currency,
      fobPrice: body.fobPrice ? parseFloat(body.fobPrice) : null,
      materialCost: body.materialCost ? parseFloat(body.materialCost) : null,
      processingCost: body.processingCost ? parseFloat(body.processingCost) : null,
      trimCost: body.trimCost ? parseFloat(body.trimCost) : null,
      profitMargin: body.profitMargin ? parseFloat(body.profitMargin) : null,
      moq: body.moq ? parseInt(body.moq) : null,
      leadTimeDays: body.leadTimeDays ? parseInt(body.leadTimeDays) : null,
      remarks: body.remarks || null,
    },
  })
  return NextResponse.json(cost)
}

export async function DELETE(
  _req: NextRequest,
  { params }: { params: { id: string; sampleId: string; costId: string } }
) {
  await prisma.cost.delete({ where: { id: params.costId } })
  return NextResponse.json({ success: true })
}
