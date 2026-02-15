import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'

export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url)
  const search = searchParams.get('search') || ''

  const where: any = {}
  if (search) {
    where.OR = [
      { name: { contains: search, mode: 'insensitive' } },
      { contactPerson: { contains: search, mode: 'insensitive' } },
    ]
  }

  const suppliers = await prisma.supplier.findMany({
    where,
    include: {
      _count: { select: { products: true, supplierMaterials: true } },
    },
    orderBy: { updatedAt: 'desc' },
  })
  return NextResponse.json(suppliers)
}

export async function POST(req: NextRequest) {
  const body = await req.json()
  const supplier = await prisma.supplier.create({
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
  return NextResponse.json(supplier, { status: 201 })
}
