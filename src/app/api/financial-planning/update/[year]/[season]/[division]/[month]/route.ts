import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'

export async function PATCH(
  req: NextRequest,
  { params }: { params: { year: string; season: string; division: string; month: string } },
) {
  try {
    const { field, value } = await req.json()
    const year = parseInt(params.year)
    const seasonCode = parseInt(params.season)
    const divisionName = decodeURIComponent(params.division)
    const month = parseInt(params.month)

    const fieldMap: Record<string, string> = {
      revenue: 'revenue',
      gm_percent: 'gmPercent',
      ebita: 'ebita',
      inventory: 'inventory',
    }
    const dbField = fieldMap[field] || field
    const allowedFields = ['revenue', 'gmPercent', 'ebita', 'inventory']
    if (!allowedFields.includes(dbField)) {
      return NextResponse.json({ error: `Field not allowed: ${field}` }, { status: 400 })
    }

    const item = await prisma.financialPlanning.upsert({
      where: {
        year_seasonCode_divisionName_month: { year, seasonCode, divisionName, month },
      },
      update: { [dbField]: parseFloat(String(value)) || 0 },
      create: {
        year,
        seasonCode,
        divisionName,
        month,
        [dbField]: parseFloat(String(value)) || 0,
      },
    })

    return NextResponse.json(item)
  } catch (error) {
    console.error('PATCH /api/financial-planning/update failed:', error)
    return NextResponse.json({ error: 'Failed to update' }, { status: 500 })
  }
}
