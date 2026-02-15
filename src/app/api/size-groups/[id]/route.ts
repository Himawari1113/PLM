import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'

export async function PUT(req: NextRequest, { params }: { params: { id: string } }) {
  try {
    const body = await req.json()
    const group = await prisma.sizeGroup.update({
      where: { id: params.id },
      data: {
        name: body.name,
        divisionId: Number(body.divisionId),
        sortOrder: Number(body.sortOrder || 0),
        isActive: Boolean(body.isActive),
      },
    })
    return NextResponse.json(group)
  } catch (error) {
    console.error(`PUT /api/size-groups/${params.id} failed:`, error)
    return NextResponse.json({ error: 'Failed to update size group.' }, { status: 500 })
  }
}

export async function DELETE(_req: NextRequest, { params }: { params: { id: string } }) {
  try {
    await prisma.sizeGroup.delete({ where: { id: params.id } })
    return NextResponse.json({ success: true })
  } catch (error) {
    console.error(`DELETE /api/size-groups/${params.id} failed:`, error)
    return NextResponse.json({ error: 'Failed to delete size group.' }, { status: 500 })
  }
}
