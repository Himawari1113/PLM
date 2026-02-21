import { NextRequest, NextResponse } from 'next/server'

// POST /api/quality/inspection/[inspectionId]/care-labels - Add care labels
export async function POST(
    req: NextRequest,
    { params }: { params: { inspectionId: string } }
) {
    const { PrismaClient } = await import('@prisma/client')
    const prisma = new PrismaClient()
    try {
        const { inspectionId } = params
        const body = await req.json()

        const model = (prisma as any).qualityCareLabel
        if (Array.isArray(body.labels)) {
            if (model) {
                const maxOrder = await model.aggregate({
                    where: { inspectionId },
                    _max: { sortOrder: true },
                })
                const startOrder = (maxOrder._max.sortOrder ?? -1) + 1

                const created = await model.createMany({
                    data: body.labels.map((label: any, idx: number) => ({
                        inspectionId,
                        category: label.category,
                        symbolCode: label.symbolCode,
                        symbolName: label.symbolName,
                        symbolSvg: label.symbolSvg || null,
                        description: label.description || null,
                        sortOrder: startOrder + idx,
                    })),
                })
                return NextResponse.json({ count: created.count }, { status: 201 })
            } else {
                console.warn('qualityCareLabel model missing, using raw SQL fallback')
                const now = new Date()
                for (const [idx, label] of body.labels.entries()) {
                    const id = `clcl_${Math.random().toString(36).substring(2, 15)}`
                    await prisma.$executeRawUnsafe(
                        `INSERT INTO "QualityCareLabel" ("id", "inspectionId", "category", "symbolCode", "symbolName", "description", "sortOrder", "createdAt", "updatedAt") 
                         VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $8)`,
                        id, inspectionId, label.category, label.symbolCode, label.symbolName, label.description || null, idx, now
                    )
                }
                return NextResponse.json({ count: body.labels.length }, { status: 201 })
            }
        }

        return NextResponse.json({ error: 'labels array required' }, { status: 400 })
    } catch (error) {
        console.error('POST care-labels error:', error)
        return NextResponse.json({ error: 'Failed to add care labels' }, { status: 500 })
    }
}

// DELETE /api/quality/inspection/[inspectionId]/care-labels - Remove a care label
export async function DELETE(
    req: NextRequest,
    { params }: { params: { inspectionId: string } }
) {
    const { PrismaClient } = await import('@prisma/client')
    const prisma = new PrismaClient()
    try {
        const { searchParams } = new URL(req.url)
        const labelId = searchParams.get('id')
        if (!labelId) return NextResponse.json({ error: 'id is required' }, { status: 400 })

        const model = (prisma as any).qualityCareLabel
        if (model) {
            await model.delete({ where: { id: labelId } })
        } else {
            await prisma.$executeRawUnsafe(`DELETE FROM "QualityCareLabel" WHERE id = $1`, labelId)
        }
        return NextResponse.json({ ok: true })
    } catch (error) {
        console.error('DELETE care-labels error:', error)
        return NextResponse.json({ error: 'Failed to remove care label' }, { status: 500 })
    }
}
