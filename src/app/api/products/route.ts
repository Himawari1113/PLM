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

export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url)
    const search = searchParams.get('search') || ''
    const category = searchParams.get('category') || ''
    const status = searchParams.get('status') || ''
    const divisionId = searchParams.get('divisionId') || ''
    const seasonCode = searchParams.get('season') || ''

    const where: any = {}
    if (search) {
      where.OR = [
        { name: { contains: search, mode: 'insensitive' } },
        { styleNumber: { contains: search, mode: 'insensitive' } },
      ]
    }
    if (category) where.category = category
    if (status) where.status = status
    if (divisionId) where.divisionId = Number(divisionId)
    if (seasonCode) {
      where.collection = {
        season: {
          seasonCode: parseInt(seasonCode),
        },
      }
    }

    const products = await prisma.product.findMany({
      where,
      include: {
        collection: { include: { season: true } },
        division: true,
        supplier: true,
        _count: { select: { samples: true } },
      },
      orderBy: { updatedAt: 'desc' },
    })
    return NextResponse.json(products)
  } catch (error) {
    console.error('GET /api/products failed:', error)
    return NextResponse.json(
      { error: 'Failed to fetch products. Please run prisma generate and restart app.' },
      { status: 500 },
    )
  }
}

export async function POST(req: NextRequest) {
  try {
    const body = await req.json()
    const cleanedName = sanitizeProductName(body.name || '')
    const product = await prisma.product.create({
      data: {
        styleNumber: body.styleNumber,
        name: cleanedName,
        divisionId: body.divisionId ? Number(body.divisionId) : null,
        category: body.category,
        description: body.description || null,
        status: body.status || 'DRAFT',
        targetPrice: body.targetPrice ? parseFloat(body.targetPrice) : null,
        collectionId: body.collectionId || null,
        supplierId: body.supplierId || null,
      },
    })
    return NextResponse.json(product, { status: 201 })
  } catch (error) {
    console.error('POST /api/products failed:', error)
    return NextResponse.json({ error: 'Failed to create product.' }, { status: 500 })
  }
}
