import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { Prisma } from '@prisma/client'

export async function GET() {
  const milestones = await prisma.$queryRaw<Array<{
    id: string
    name: string
    description: string | null
    sortOrder: number
    isActive: boolean
    createdAt: Date
    updatedAt: Date
  }>>(Prisma.sql`
    SELECT id, name, description, "sortOrder", "isActive", "createdAt", "updatedAt"
    FROM "Milestone"
    ORDER BY "sortOrder" ASC, "createdAt" ASC
  `)
  return NextResponse.json(milestones)
}

export async function POST(req: NextRequest) {
  const body = await req.json()
  const name = String(body.name || '').trim()
  if (!name) {
    return NextResponse.json({ error: 'name is required' }, { status: 400 })
  }

  const maxRows = await prisma.$queryRaw<Array<{ max: number | null }>>(
    Prisma.sql`SELECT MAX("sortOrder")::int as max FROM "Milestone"`,
  )
  const sortOrder =
    typeof body.sortOrder === 'number' ? body.sortOrder : ((maxRows[0]?.max ?? 0) + 1)
  const id = crypto.randomUUID()

  const rows = await prisma.$queryRaw<Array<{
    id: string
    name: string
    description: string | null
    sortOrder: number
    isActive: boolean
    createdAt: Date
    updatedAt: Date
  }>>(Prisma.sql`
    INSERT INTO "Milestone" ("id","name","description","sortOrder","isActive","createdAt","updatedAt")
    VALUES (
      ${id},
      ${name},
      ${body.description ? String(body.description).trim() : null},
      ${sortOrder},
      ${body.isActive !== false},
      NOW(),
      NOW()
    )
    RETURNING id, name, description, "sortOrder", "isActive", "createdAt", "updatedAt"
  `)
  return NextResponse.json(rows[0], { status: 201 })
}
