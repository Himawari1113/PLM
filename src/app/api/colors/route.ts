import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { Prisma } from '@prisma/client'

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

export async function GET(req: NextRequest) {
  try {
    const search = req.nextUrl.searchParams.get('search')?.trim()
    const colors = search
      ? await prisma.$queryRaw<Array<Record<string, unknown>>>(Prisma.sql`
          SELECT ${SELECT_FIELDS}
          FROM "Color"
          WHERE
            "colorCode" ILIKE ${'%' + search + '%'}
            OR "colorName" ILIKE ${'%' + search + '%'}
            OR COALESCE("pantoneCode", '') ILIKE ${'%' + search + '%'}
          ORDER BY "createdAt" DESC
        `)
      : await prisma.$queryRaw<Array<Record<string, unknown>>>(Prisma.sql`
          SELECT ${SELECT_FIELDS}
          FROM "Color"
          ORDER BY "createdAt" DESC
        `)
    return NextResponse.json(colors)
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Failed to fetch colors' },
      { status: 500 },
    )
  }
}

export async function POST(req: NextRequest) {
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
    const id = crypto.randomUUID()

    const cmykC = body.cmykC != null ? parseInt(body.cmykC) : null
    const cmykM = body.cmykM != null ? parseInt(body.cmykM) : null
    const cmykY = body.cmykY != null ? parseInt(body.cmykY) : null
    const cmykK = body.cmykK != null ? parseInt(body.cmykK) : null
    const colorTemperature = body.colorTemperature || null

    const created = await prisma.$queryRaw<Array<Record<string, unknown>>>(Prisma.sql`
      INSERT INTO "Color" (
        "id", "colorCode", "colorName", "pantoneCode", "pantoneName",
        "rgbValue", "colorImage", "colorType",
        "cmykC", "cmykM", "cmykY", "cmykK", "colorTemperature",
        "createdAt", "updatedAt"
      )
      VALUES (
        ${id},
        ${colorCode},
        ${colorName},
        ${body.pantoneCode ? String(body.pantoneCode).trim() : null},
        ${body.pantoneName ? String(body.pantoneName).trim() : null},
        ${body.rgbValue ? String(body.rgbValue).trim() : null},
        ${body.colorImage ? String(body.colorImage).trim() : null},
        ${colorType}::"ColorType",
        ${cmykC}, ${cmykM}, ${cmykY}, ${cmykK},
        ${colorTemperature},
        NOW(), NOW()
      )
      RETURNING ${SELECT_FIELDS}
    `)

    return NextResponse.json(created[0], { status: 201 })
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Failed to create color' },
      { status: 500 },
    )
  }
}
