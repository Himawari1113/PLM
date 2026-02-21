import { NextRequest, NextResponse } from 'next/server'

// POST /api/quality/inspection/[inspectionId]/items - Add inspection items
export async function POST(
    req: NextRequest,
    { params }: { params: { inspectionId: string } }
) {
    const { PrismaClient } = await import('@prisma/client')
    const prisma = new PrismaClient()
    try {
        const { inspectionId } = params
        const body = await req.json()
        const model = (prisma as any).qualityInspectionItem

        if (Array.isArray(body.items)) {
            if (model) {
                const maxOrder = await model.aggregate({
                    where: { inspectionId },
                    _max: { sortOrder: true },
                })
                const startOrder = (maxOrder._max.sortOrder ?? -1) + 1

                const created = await model.createMany({
                    data: body.items.map((item: any, idx: number) => ({
                        inspectionId,
                        category: item.category,
                        itemName: item.itemName,
                        standard: item.standard || null,
                        result: 'NOT_TESTED',
                        sortOrder: startOrder + idx,
                        isAiGenerated: item.isAiGenerated || false,
                    })),
                })
                return NextResponse.json({ count: created.count }, { status: 201 })
            } else {
                const now = new Date()
                for (const [idx, item] of body.items.entries()) {
                    const id = `clii_${Math.random().toString(36).substring(2, 15)}`
                    await prisma.$executeRawUnsafe(
                        `INSERT INTO "QualityInspectionItem" ("id", "inspectionId", "category", "itemName", "standard", "result", "sortOrder", "isAiGenerated", "createdAt", "updatedAt") 
                         VALUES ($1, $2, $3, $4, $5, 'NOT_TESTED', $6, $7, $8, $8)`,
                        id, inspectionId, item.category, item.itemName, item.standard || null, idx, item.isAiGenerated || false, now
                    )
                }
                return NextResponse.json({ count: body.items.length }, { status: 201 })
            }
        }

        // Single item
        if (model) {
            const maxOrder = await model.aggregate({
                where: { inspectionId },
                _max: { sortOrder: true },
            })
            const item = await model.create({
                data: {
                    inspectionId,
                    category: body.category,
                    itemName: body.itemName,
                    standard: body.standard || null,
                    result: 'NOT_TESTED',
                    sortOrder: (maxOrder._max.sortOrder ?? -1) + 1,
                    isAiGenerated: body.isAiGenerated || false,
                },
            })
            return NextResponse.json(item, { status: 201 })
        } else {
            const id = `clii_${Math.random().toString(36).substring(2, 15)}`
            const now = new Date()
            await prisma.$executeRawUnsafe(
                `INSERT INTO "QualityInspectionItem" ("id", "inspectionId", "category", "itemName", "standard", "result", "sortOrder", "isAiGenerated", "createdAt", "updatedAt") 
                 VALUES ($1, $2, $3, $4, $5, 'NOT_TESTED', 0, $6, $7, $7)`,
                id, inspectionId, body.category, body.itemName, body.standard || null, body.isAiGenerated || false, now
            )
            const [item]: any = await prisma.$queryRawUnsafe(`SELECT * FROM "QualityInspectionItem" WHERE id = $1`, id)
            return NextResponse.json(item, { status: 201 })
        }
    } catch (error) {
        console.error('POST items error:', error)
        return NextResponse.json({ error: 'Failed to add items' }, { status: 500 })
    }
}

// PATCH /api/quality/inspection/[inspectionId]/items - Bulk update items
export async function PATCH(
    req: NextRequest,
    { params }: { params: { inspectionId: string } }
) {
    const { PrismaClient } = await import('@prisma/client')
    const prisma = new PrismaClient()
    try {
        const body = await req.json()
        const model = (prisma as any).qualityInspectionItem

        if (Array.isArray(body.items)) {
            if (model) {
                const results = await Promise.all(
                    body.items.map((item: any) =>
                        model.update({
                            where: { id: item.id },
                            data: {
                                ...(item.actualValue !== undefined && { actualValue: item.actualValue }),
                                ...(item.result !== undefined && { result: item.result }),
                                ...(item.remarks !== undefined && { remarks: item.remarks }),
                                ...(item.standard !== undefined && { standard: item.standard }),
                            },
                        })
                    )
                )
                return NextResponse.json(results)
            } else {
                // Raw SQL update
                for (const item of body.items) {
                    await prisma.$executeRawUnsafe(
                        `UPDATE "QualityInspectionItem" SET 
                         "actualValue" = COALESCE($1, "actualValue"),
                         "result" = COALESCE($2, "result"),
                         "remarks" = COALESCE($3, "remarks"),
                         "standard" = COALESCE($4, "standard"),
                         "updatedAt" = $5 
                         WHERE id = $6`,
                        item.actualValue ?? null, item.result ?? null, item.remarks ?? null, item.standard ?? null, new Date(), item.id
                    )
                }
                return NextResponse.json({ ok: true })
            }
        }

        return NextResponse.json({ error: 'items array required' }, { status: 400 })
    } catch (error) {
        console.error('PATCH items error:', error)
        return NextResponse.json({ error: 'Failed to update items' }, { status: 500 })
    }
}
