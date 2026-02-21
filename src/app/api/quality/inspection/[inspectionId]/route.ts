import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'

// PATCH /api/quality/inspection/[inspectionId] - Update an inspection
export async function PATCH(
    req: NextRequest,
    { params }: { params: { inspectionId: string } }
) {
    try {
        const { inspectionId } = params
        const body = await req.json()

        const updateData: any = {}
        if (body.inspectionType !== undefined) updateData.inspectionType = body.inspectionType
        if (body.inspectionDate !== undefined) updateData.inspectionDate = body.inspectionDate ? new Date(body.inspectionDate) : null
        if (body.inspector !== undefined) updateData.inspector = body.inspector
        if (body.overallResult !== undefined) updateData.overallResult = body.overallResult
        if (body.status !== undefined) updateData.status = body.status
        if (body.remarks !== undefined) updateData.remarks = body.remarks

        const inspection = await prisma.qualityInspection.update({
            where: { id: inspectionId },
            data: updateData,
            include: {
                items: { orderBy: { sortOrder: 'asc' } },
                photos: { orderBy: { sortOrder: 'asc' } },
                careLabels: { orderBy: [{ category: 'asc' }, { sortOrder: 'asc' }] },
            },
        })

        return NextResponse.json(inspection)
    } catch (error) {
        console.error('PATCH /api/quality/inspection error:', error)
        return NextResponse.json({ error: 'Failed to update inspection' }, { status: 500 })
    }
}

// DELETE /api/quality/inspection/[inspectionId] - Delete an inspection
export async function DELETE(
    _req: NextRequest,
    { params }: { params: { inspectionId: string } }
) {
    try {
        await prisma.qualityInspection.delete({ where: { id: params.inspectionId } })
        return NextResponse.json({ ok: true })
    } catch (error) {
        console.error('DELETE /api/quality/inspection error:', error)
        return NextResponse.json({ error: 'Failed to delete inspection' }, { status: 500 })
    }
}
