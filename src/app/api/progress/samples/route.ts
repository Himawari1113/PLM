import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { Prisma } from '@prisma/client'

export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url)
  const yearParam = searchParams.get('year')
  const yearFilter = yearParam ? parseInt(yearParam, 10) : null

  const yearCondition = yearFilter
    ? Prisma.sql`AND s.year = ${yearFilter}`
    : Prisma.empty

  const [milestones, samples, progresses] = await Promise.all([
    prisma.$queryRaw<Array<{ id: string; name: string; sortOrder: number }>>(Prisma.sql`
      SELECT id, name, "sortOrder"
      FROM "Milestone"
      WHERE "isActive" = true
      ORDER BY "sortOrder" ASC, "createdAt" ASC
    `),
    prisma.$queryRaw<Array<{
      id: string
      sampleNumber: string
      sampleName: string
      status: string
      productId: string
      styleNumber: string
      productName: string
    }>>(Prisma.sql`
      SELECT
        s.id,
        s."sampleNumber",
        s."sampleName",
        s.status::text as status,
        p.id as "productId",
        p."styleNumber" as "styleNumber",
        p.name as "productName"
      FROM "Sample" s
      JOIN "Product" p ON p.id = s."productId"
      WHERE 1=1 ${yearCondition}
      ORDER BY s."updatedAt" DESC
    `),
    prisma.$queryRaw<Array<{
      sampleId: string
      milestoneId: string
      completed: boolean
      completedAt: Date | null
    }>>(Prisma.sql`
      SELECT "sampleId", "milestoneId", completed, "completedAt"
      FROM "SampleMilestoneProgress"
    `),
  ])

  const rows = samples.map((sample) => {
    const sampleProgresses = progresses.filter((p) => p.sampleId === sample.id)
    const progressByMilestone = Object.fromEntries(
      sampleProgresses.map((p) => [
        p.milestoneId,
        { completed: p.completed, completedAt: p.completedAt },
      ]),
    )
    const completedCount = milestones.filter((m) => progressByMilestone[m.id]?.completed).length
    const rate = milestones.length ? Math.round((completedCount / milestones.length) * 100) : 0
    return {
      id: sample.id,
      sampleNumber: sample.sampleNumber,
      sampleName: sample.sampleName,
      status: sample.status,
      product: { id: sample.productId, styleNumber: sample.styleNumber, name: sample.productName },
      progressByMilestone,
      completionRate: rate,
    }
  })

  return NextResponse.json({ milestones, rows })
}
