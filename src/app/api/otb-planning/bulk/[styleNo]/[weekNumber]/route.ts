import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'

export async function PATCH(
  req: NextRequest,
  { params }: { params: { styleNo: string; weekNumber: string } },
) {
  try {
    const { field, value } = await req.json()
    const weekNumber = parseInt(params.weekNumber)
    const styleNo = decodeURIComponent(params.styleNo)

    const allowedFields = ['salesQty', 'storeInvQty', 'whInvQty', 'intakeQty', 'otb', 'totalPlanQty']
    const fieldMap: Record<string, string> = {
      sales_qty: 'salesQty',
      store_inv_qty: 'storeInvQty',
      wh_inv_qty: 'whInvQty',
      intake_qty: 'intakeQty',
      otb: 'otb',
      total_plan_qty: 'totalPlanQty',
    }
    const dbField = fieldMap[field] || field
    if (!allowedFields.includes(dbField)) {
      return NextResponse.json({ error: `Field not allowed: ${field}` }, { status: 400 })
    }

    const existing = await prisma.otbPlanning.findFirst({
      where: { styleNumber: styleNo, weekNumber },
    })

    if (!existing) {
      return NextResponse.json({ error: 'Record not found' }, { status: 404 })
    }

    const updated = await prisma.otbPlanning.update({
      where: { id: existing.id },
      data: { [dbField]: parseInt(String(value)) || 0 },
    })

    return NextResponse.json(updated)
  } catch (error) {
    console.error('PATCH /api/otb-planning/bulk failed:', error)
    return NextResponse.json({ error: 'Failed to update OTB' }, { status: 500 })
  }
}
