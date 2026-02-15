import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { Prisma } from '@prisma/client'

export async function POST(req: NextRequest) {
  const body = await req.json()
  const sampleId = String(body.sampleId || '')
  const milestoneId = String(body.milestoneId || '')
  if (!sampleId || !milestoneId) {
    return NextResponse.json({ error: 'sampleId and milestoneId are required' }, { status: 400 })
  }

  const completed = !!body.completed
  const rows = await prisma.$queryRaw<Array<{
    id: string
    sampleId: string
    milestoneId: string
    completed: boolean
    completedAt: Date | null
  }>>(Prisma.sql`
    INSERT INTO "SampleMilestoneProgress" ("id","sampleId","milestoneId","completed","completedAt","createdAt","updatedAt")
    VALUES (
      ${crypto.randomUUID()},
      ${sampleId},
      ${milestoneId},
      ${completed},
      ${completed ? new Date() : null},
      NOW(),
      NOW()
    )
    ON CONFLICT ("sampleId","milestoneId")
    DO UPDATE SET
      completed = EXCLUDED.completed,
      "completedAt" = EXCLUDED."completedAt",
      "updatedAt" = NOW()
    RETURNING id, "sampleId", "milestoneId", completed, "completedAt"
  `)

  return NextResponse.json(rows[0] || null)
}
