import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'

function sanitizeProductName(name: string) {
  return name
    .replace(/\bMens\b/gi, '')
    .replace(/\bWomens\b/gi, '')
    .replace(/\bKids\/Baby\b/gi, '')
    .replace(/\bKids\b/gi, '')
    .replace(/\s{2,}/g, ' ')
    .trim()
}

export async function GET(_req: NextRequest, { params }: { params: { id: string } }) {
  try {
    const product = await prisma.product.findUnique({
      where: { id: params.id },
      include: {
        collection: { include: { season: true } },
        division: true,
        supplier: true,
        _count: { select: { samples: true } },
      },
    })
    if (!product) return NextResponse.json({ error: 'Not found' }, { status: 404 })
    return NextResponse.json(product)
  } catch (error) {
    console.error(`GET /api/products/${params.id} failed:`, error)
    return NextResponse.json({ error: 'Failed to fetch product.' }, { status: 500 })
  }
}

export async function PUT(req: NextRequest, { params }: { params: { id: string } }) {
  try {
    const body = await req.json()
    const cleanedName = sanitizeProductName(body.name || '')
    const product = await prisma.product.update({
      where: { id: params.id },
      data: {
        styleNumber: body.styleNumber,
        name: cleanedName,
        divisionId: body.divisionId ? Number(body.divisionId) : null,
        category: body.category,
        description: body.description || null,
        status: body.status,
        targetPrice: body.targetPrice ? parseFloat(body.targetPrice) : null,
        collectionId: body.collectionId || null,
        supplierId: body.supplierId || null,
      },
    })
    return NextResponse.json(product)
  } catch (error) {
    console.error(`PUT /api/products/${params.id} failed:`, error)
    return NextResponse.json({ error: 'Failed to update product.' }, { status: 500 })
  }
}

export async function PATCH(req: NextRequest, { params }: { params: { id: string } }) {
  try {
    const body = await req.json()
    const data: any = {}

    const stringFields = ['styleNumber', 'name', 'category', 'description', 'status']
    for (const f of stringFields) {
      if (typeof body[f] === 'string') {
        data[f] = f === 'name' ? sanitizeProductName(body[f]) : body[f]
      }
    }
    if (body.divisionId !== undefined) {
      data.divisionId = body.divisionId ? Number(body.divisionId) : null
    }
    if (body.targetPrice !== undefined) {
      data.targetPrice = body.targetPrice !== null && body.targetPrice !== '' ? parseFloat(body.targetPrice) : null
    }
    if (body.supplierId !== undefined) {
      data.supplierId = body.supplierId || null
    }
    if (body.collectionId !== undefined) {
      data.collectionId = body.collectionId || null
    }

    if (Object.keys(data).length === 0) {
      return NextResponse.json({ error: 'No fields to update' }, { status: 400 })
    }

    const product = await prisma.product.update({
      where: { id: params.id },
      data,
      include: {
        collection: { include: { season: true } },
        division: true,
        supplier: true,
        _count: { select: { samples: true } },
      },
    })
    return NextResponse.json(product)
  } catch (error) {
    console.error(`PATCH /api/products/${params.id} failed:`, error)
    return NextResponse.json({ error: 'Failed to patch product.' }, { status: 500 })
  }
}

export async function DELETE(_req: NextRequest, { params }: { params: { id: string } }) {
  try {
    await prisma.product.delete({ where: { id: params.id } })
    return NextResponse.json({ success: true })
  } catch (error) {
    console.error(`DELETE /api/products/${params.id} failed:`, error)
    return NextResponse.json({ error: 'Failed to delete product.' }, { status: 500 })
  }
}
