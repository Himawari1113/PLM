import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'

export async function PUT(req: NextRequest, { params }: { params: { id: string } }) {
  const body = await req.json()
  const collection = await prisma.collection.update({
    where: { id: params.id },
    data: {
      name: body.name,
      description: body.description || null,
    },
  })
  return NextResponse.json(collection)
}

export async function DELETE(_req: NextRequest, { params }: { params: { id: string } }) {
  await prisma.collection.delete({ where: { id: params.id } })
  return NextResponse.json({ success: true })
}
