import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'

export async function PUT(req: NextRequest, { params }: { params: { id: string } }) {
  try {
    const body = await req.json()
    const size = await prisma.sizeMaster.update({
      where: { id: params.id },
      data: {
        sizeGroupId: body.sizeGroupId,
        sizeCode: body.sizeCode,
        sizeName: body.sizeName || '',
        sortOrder: Number(body.sortOrder || 0),
        isActive: Boolean(body.isActive),
      },
    })
    return NextResponse.json(size)
  } catch (error) {
    console.error(`PUT /api/size-masters/${params.id} failed:`, error)
    return NextResponse.json({ error: 'Failed to update size master.' }, { status: 500 })
  }
}

export async function DELETE(_req: NextRequest, { params }: { params: { id: string } }) {
  try {
    await prisma.sizeMaster.delete({ where: { id: params.id } })
    return NextResponse.json({ success: true })
  } catch (error) {
    console.error(`DELETE /api/size-masters/${params.id} failed:`, error)
    return NextResponse.json({ error: 'Failed to delete size master.' }, { status: 500 })
  }
}
