import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { Prisma } from '@prisma/client'

interface Params {
  params: { id: string }
}

export async function GET(_req: NextRequest, { params }: Params) {
  try {
    const rows = await prisma.$queryRaw<Array<{
      id: string
      colorCode: string
      colorName: string
      pantoneCode: string | null
      pantoneName: string | null
      rgbValue: string | null
      colorImage: string | null
      colorType: 'SOLID' | 'PATTERN'
      createdAt: Date
      updatedAt: Date
    }>>(Prisma.sql`
      SELECT
        id,
        "colorCode",
        "colorName",
        "pantoneCode",
        "pantoneName",
        "rgbValue",
        "colorImage",
        "colorType",
        "createdAt",
        "updatedAt"
      FROM "Color"
      WHERE id = ${params.id}
      LIMIT 1
    `)
    if (!rows[0]) {
      return NextResponse.json({ error: 'Color not found' }, { status: 404 })
    }
    return NextResponse.json(rows[0])
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Failed to fetch color' },
      { status: 500 },
    )
  }
}

export async function PUT(req: NextRequest, { params }: Params) {
  try {
    const body = await req.json()
    const colorCode = String(body.colorCode || '').trim()
    const colorName = String(body.colorName || '').trim()
    if (!colorCode) {
      return NextResponse.json({ error: 'colorCode is required' }, { status: 400 })
    }
    if (!colorName) {
      return NextResponse.json({ error: 'colorName is required' }, { status: 400 })
    }
    const colorType = body.colorType === 'PATTERN' ? 'PATTERN' : 'SOLID'

    const rows = await prisma.$queryRaw<Array<{
      id: string
      colorCode: string
      colorName: string
      pantoneCode: string | null
      pantoneName: string | null
      rgbValue: string | null
      colorImage: string | null
      colorType: 'SOLID' | 'PATTERN'
      createdAt: Date
      updatedAt: Date
    }>>(Prisma.sql`
      UPDATE "Color"
      SET
        "colorCode" = ${colorCode},
        "colorName" = ${colorName},
        "pantoneCode" = ${body.pantoneCode ? String(body.pantoneCode).trim() : null},
        "pantoneName" = ${body.pantoneName ? String(body.pantoneName).trim() : null},
        "rgbValue" = ${body.rgbValue ? String(body.rgbValue).trim() : null},
        "colorImage" = ${body.colorImage ? String(body.colorImage).trim() : null},
        "colorType" = ${colorType}::"ColorType",
        "updatedAt" = NOW()
      WHERE id = ${params.id}
      RETURNING
        id,
        "colorCode",
        "colorName",
        "pantoneCode",
        "pantoneName",
        "rgbValue",
        "colorImage",
        "colorType",
        "createdAt",
        "updatedAt"
    `)

    if (!rows[0]) {
      return NextResponse.json({ error: 'Color not found' }, { status: 404 })
    }

    return NextResponse.json(rows[0])
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Failed to update color' },
      { status: 500 },
    )
  }
}

export async function DELETE(_req: NextRequest, { params }: Params) {
  try {
    await prisma.$executeRaw(Prisma.sql`DELETE FROM "Color" WHERE id = ${params.id}`)
    return NextResponse.json({ ok: true })
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Failed to delete color' },
      { status: 500 },
    )
  }
}
