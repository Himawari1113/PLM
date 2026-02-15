import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'

export async function GET(
  _req: NextRequest,
  { params }: { params: { id: string; sampleId: string } }
) {
  const costs = await prisma.cost.findMany({
    where: { sampleId: params.sampleId },
    orderBy: { createdAt: 'desc' },
  })
  return NextResponse.json(costs)
}

export async function POST(
  req: NextRequest,
  { params }: { params: { id: string; sampleId: string } }
) {
  const body = await req.json()
  const cost = await prisma.cost.create({
    data: {
      sampleId: params.sampleId,
      costVersion: body.costVersion,
      status: body.status || 'ESTIMATING',
      currency: body.currency || 'USD',
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
  return NextResponse.json(cost, { status: 201 })
}
