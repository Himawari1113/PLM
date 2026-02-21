import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { Prisma } from '@prisma/client'

interface Params {
  params: { id: string }
}

const SELECT_FIELDS = Prisma.sql`
  id,
  "colorCode",
  "colorName",
  "pantoneCode",
  "pantoneName",
  "rgbValue",
  "colorImage",
  "colorType",
  "cmykC",
  "cmykM",
  "cmykY",
  "cmykK",
  "colorTemperature",
  "createdAt",
  "updatedAt"
`

export async function GET(_req: NextRequest, { params }: Params) {
  try {
    const rows = await prisma.$queryRaw<Array<Record<string, unknown>>>(Prisma.sql`
      SELECT ${SELECT_FIELDS}
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
    const cmykC = body.cmykC != null ? parseInt(body.cmykC) : null
    const cmykM = body.cmykM != null ? parseInt(body.cmykM) : null
    const cmykY = body.cmykY != null ? parseInt(body.cmykY) : null
    const cmykK = body.cmykK != null ? parseInt(body.cmykK) : null
    const colorTemperature = body.colorTemperature || null

    const rows = await prisma.$queryRaw<Array<Record<string, unknown>>>(Prisma.sql`
      UPDATE "Color"
      SET
        "colorCode" = ${colorCode},
        "colorName" = ${colorName},
        "pantoneCode" = ${body.pantoneCode ? String(body.pantoneCode).trim() : null},
        "pantoneName" = ${body.pantoneName ? String(body.pantoneName).trim() : null},
        "rgbValue" = ${body.rgbValue ? String(body.rgbValue).trim() : null},
        "colorImage" = ${body.colorImage ? String(body.colorImage).trim() : null},
        "colorType" = ${colorType}::"ColorType",
        "cmykC" = ${cmykC},
        "cmykM" = ${cmykM},
        "cmykY" = ${cmykY},
        "cmykK" = ${cmykK},
        "colorTemperature" = ${colorTemperature},
        "updatedAt" = NOW()
      WHERE id = ${params.id}
      RETURNING ${SELECT_FIELDS}
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
