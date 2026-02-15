import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { Prisma } from '@prisma/client'

export async function GET(req: NextRequest) {
  try {
    const search = req.nextUrl.searchParams.get('search')?.trim()
    const colors = search
      ? await prisma.$queryRaw<Array<{
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
          WHERE
            "colorCode" ILIKE ${'%' + search + '%'}
            OR "colorName" ILIKE ${'%' + search + '%'}
            OR COALESCE("pantoneCode", '') ILIKE ${'%' + search + '%'}
          ORDER BY "createdAt" DESC
        `)
      : await prisma.$queryRaw<Array<{
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

    const created = await prisma.$queryRaw<Array<{
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
      INSERT INTO "Color" ("id", "colorCode", "colorName", "pantoneCode", "pantoneName", "rgbValue", "colorImage", "colorType", "createdAt", "updatedAt")
      VALUES (
        ${id},
        ${colorCode},
        ${colorName},
        ${body.pantoneCode ? String(body.pantoneCode).trim() : null},
        ${body.pantoneName ? String(body.pantoneName).trim() : null},
        ${body.rgbValue ? String(body.rgbValue).trim() : null},
        ${body.colorImage ? String(body.colorImage).trim() : null},
        ${colorType}::"ColorType",
        NOW(),
        NOW()
      )
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

    return NextResponse.json(created[0], { status: 201 })
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Failed to create color' },
      { status: 500 },
    )
  }
}
