import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { Prisma } from '@prisma/client'

interface Params {
  params: { id: string }
}

export async function PUT(req: NextRequest, { params }: Params) {
  const body = await req.json()
  const name = String(body.name || '').trim()
  if (!name) {
    return NextResponse.json({ error: 'name is required' }, { status: 400 })
  }

  const rows = await prisma.$queryRaw<Array<{
    id: string
    name: string
    description: string | null
    sortOrder: number
    isActive: boolean
    createdAt: Date
    updatedAt: Date
  }>>(Prisma.sql`
    UPDATE "Milestone"
    SET
      name = ${name},
      description = ${body.description ? String(body.description).trim() : null},
      "sortOrder" = ${typeof body.sortOrder === 'number' ? body.sortOrder : 0},
      "isActive" = ${body.isActive !== false},
      "updatedAt" = NOW()
    WHERE id = ${params.id}
    RETURNING id, name, description, "sortOrder", "isActive", "createdAt", "updatedAt"
  `)
  return NextResponse.json(rows[0] || null)
}

export async function DELETE(_req: NextRequest, { params }: Params) {
  await prisma.$executeRaw(Prisma.sql`DELETE FROM "Milestone" WHERE id = ${params.id}`)
  return NextResponse.json({ ok: true })
}
