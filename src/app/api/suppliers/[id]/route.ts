import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'

export async function GET(_req: NextRequest, { params }: { params: { id: string } }) {
  const supplier = await prisma.supplier.findUnique({
    where: { id: params.id },
    include: {
      products: { orderBy: { updatedAt: 'desc' } },
      supplierMaterials: { include: { material: true } },
    },
  })
  if (!supplier) return NextResponse.json({ error: 'Not found' }, { status: 404 })
  return NextResponse.json(supplier)
}

export async function PUT(req: NextRequest, { params }: { params: { id: string } }) {
  const body = await req.json()
  const supplier = await prisma.supplier.update({
    where: { id: params.id },
    data: {
      name: body.name,
      contactPerson: body.contactPerson || null,
      email: body.email || null,
      phone: body.phone || null,
      address: body.address || null,
      country: body.country || null,
      description: body.description || null,
    },
  })
  return NextResponse.json(supplier)
}

export async function DELETE(_req: NextRequest, { params }: { params: { id: string } }) {
  await prisma.supplier.delete({ where: { id: params.id } })
  return NextResponse.json({ success: true })
}
