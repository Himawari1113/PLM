import { NextRequest, NextResponse } from 'next/server'

// GET /api/quality/[sampleId] - Get all inspections for a sample
export async function GET(
    _req: NextRequest,
    { params }: { params: { sampleId: string } }
) {
    const { PrismaClient } = await import('@prisma/client')
    const prisma = new PrismaClient()
    try {
        const { sampleId } = params

        let inspections: any[] = []
        try {
            const model = (prisma as any).qualityInspection
            if (model) {
                inspections = await model.findMany({
                    where: { sampleId },
                    include: {
                        items: { orderBy: { sortOrder: 'asc' } },
                        photos: { orderBy: { sortOrder: 'asc' } },
                        careLabels: { orderBy: [{ category: 'asc' }, { sortOrder: 'asc' }] },
                    },
                    orderBy: { createdAt: 'desc' },
                })
            } else {
                console.warn('qualityInspection model missing from Prisma client, using $queryRaw fallback')
                const rows: any[] = await prisma.$queryRawUnsafe(`SELECT * FROM "QualityInspection" WHERE "sampleId" = $1 ORDER BY "createdAt" DESC`, sampleId)

                // Fetch items and care labels for each inspection
                for (const row of rows) {
                    const items = await prisma.$queryRawUnsafe(`SELECT * FROM "QualityInspectionItem" WHERE "inspectionId" = $1 ORDER BY "sortOrder" ASC`, row.id)
                    const careLabels = await prisma.$queryRawUnsafe(`SELECT * FROM "QualityCareLabel" WHERE "inspectionId" = $1 ORDER BY "category" ASC, "sortOrder" ASC`, row.id)
                    inspections.push({
                        ...row,
                        items: items || [],
                        careLabels: careLabels || [],
                        photos: [] // Placeholder
                    })
                }
            }
        } catch (e) {
            console.error('Failed to fetch inspections:', e)
        }

        const sample = await prisma.sample.findUnique({
            where: { id: sampleId },
            select: {
                id: true,
                sampleName: true,
                sampleNumber: true,
                sampleType: true,
                division: true,
                subCategory: true,
                supplier: { select: { name: true } },
                product: { select: { styleNumber: true, name: true } },
                sampleMaterials: {
                    select: {
                        materialName: true,
                        kind: true,
                        materialCode: true,
                    },
                },
                sampleColors: {
                    include: {
                        color: true
                    }
                }
            },
        })

        return NextResponse.json({ sample, inspections })
    } catch (error) {
        console.error('GET /api/quality/[sampleId] error:', error)
        return NextResponse.json({ error: 'Failed to fetch quality data' }, { status: 500 })
    }
}

// POST /api/quality/[sampleId] - Create a new inspection
export async function POST(
    req: NextRequest,
    { params }: { params: { sampleId: string } }
) {
    const { PrismaClient } = await import('@prisma/client')
    const prisma = new PrismaClient()
    try {
        const { sampleId } = params
        const body = await req.json()

        const model = (prisma as any).qualityInspection
        if (model) {
            const inspection = await model.create({
                data: {
                    sampleId,
                    inspectionType: body.inspectionType || 'FINAL',
                    inspectionDate: body.inspectionDate ? new Date(body.inspectionDate) : null,
                    inspector: body.inspector || null,
                    remarks: body.remarks || null,
                    items: body.items?.length
                        ? {
                            create: body.items.map((item: any, idx: number) => ({
                                category: item.category,
                                itemName: item.itemName,
                                standard: item.standard || null,
                                result: 'NOT_TESTED',
                                sortOrder: idx,
                                isAiGenerated: item.isAiGenerated || false,
                            })),
                        }
                        : undefined,
                },
                include: {
                    items: { orderBy: { sortOrder: 'asc' } },
                    photos: true,
                    careLabels: true,
                },
            })
            return NextResponse.json(inspection, { status: 201 })
        } else {
            console.warn('qualityInspection model missing, using raw SQL fallback for creation')
            const id = `cli_${Math.random().toString(36).substring(2, 15)}`
            const inspectionType = body.inspectionType || 'FINAL'
            const now = new Date()

            await prisma.$executeRawUnsafe(
                `INSERT INTO "QualityInspection" ("id", "sampleId", "inspectionType", "status", "overallResult", "createdAt", "updatedAt") 
                 VALUES ($1, $2, $3, 'DRAFT', 'NOT_TESTED', $4, $4)`,
                id, sampleId, inspectionType, now
            )

            if (body.items?.length) {
                for (const [idx, item] of body.items.entries()) {
                    const itemId = `clii_${Math.random().toString(36).substring(2, 15)}`
                    await prisma.$executeRawUnsafe(
                        `INSERT INTO "QualityInspectionItem" ("id", "inspectionId", "category", "itemName", "standard", "result", "sortOrder", "isAiGenerated", "createdAt", "updatedAt") 
                         VALUES ($1, $2, $3, $4, $5, 'NOT_TESTED', $6, $7, $8, $8)`,
                        itemId, id, item.category, item.itemName, item.standard || null, idx, item.isAiGenerated || false, now
                    )
                }
            }

            const [inspection]: any = await prisma.$queryRawUnsafe(`SELECT * FROM "QualityInspection" WHERE id = $1`, id)
            const items: any = await prisma.$queryRawUnsafe(`SELECT * FROM "QualityInspectionItem" WHERE "inspectionId" = $1 ORDER BY "sortOrder" ASC`, id)

            return NextResponse.json({ ...inspection, items, photos: [], careLabels: [] }, { status: 201 })
        }
    } catch (error) {
        console.error('POST /api/quality/[sampleId] error:', error)
        return NextResponse.json({ error: 'Failed to create inspection', details: (error as any).message }, { status: 500 })
    }
}
