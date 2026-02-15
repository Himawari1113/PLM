import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'

export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url)
    const type = searchParams.get('type') || ''
    const category = searchParams.get('materialCategory') || ''
    const search = searchParams.get('search') || ''

    const where: any = {}
    if (type) where.type = type
    if (category) where.materialCategory = category
    if (search) {
      where.OR = [
        { name: { contains: search, mode: 'insensitive' } },
        { composition: { contains: search, mode: 'insensitive' } },
        { materialCode: { contains: search, mode: 'insensitive' } },
      ]
    }

    const materials = await prisma.material.findMany({
      where,
      include: {
        _count: { select: { bomItems: true, supplierMaterials: true, materialColors: true } },
        supplierMaterials: {
          include: { supplier: { select: { id: true, name: true } } },
          take: 5,
        },
      },
      orderBy: { updatedAt: 'desc' },
      take: search ? 50 : undefined,
    })

    // Count SampleMaterial references by materialName match
    const materialNames = materials.map((m) => m.name)
    const sampleRefCounts = materialNames.length > 0
      ? await prisma.sampleMaterial.groupBy({
          by: ['materialName'],
          where: { materialName: { in: materialNames } },
          _count: true,
        })
      : []
    const sampleRefMap = new Map(sampleRefCounts.map((r) => [r.materialName, r._count]))

    const result = materials.map((m) => ({
      ...m,
      sampleRefCount: sampleRefMap.get(m.name) || 0,
    }))

    return NextResponse.json(result)
  } catch (error) {
    console.error('GET /api/materials failed:', error)
    return NextResponse.json({ error: 'Failed to fetch materials.' }, { status: 500 })
  }
}

export async function POST(req: NextRequest) {
  try {
    const body = await req.json()
    const material = await prisma.material.create({
      data: {
        materialCode: body.materialCode || null,
        name: body.name,
        type: body.type || 'FABRIC',
        materialCategory: body.materialCategory || null,
        composition: body.composition || null,
        color: body.color || null,
        weight: body.weight || null,
        width: body.width || null,
        unitPrice: body.unitPrice ? parseFloat(body.unitPrice) : null,
        unit: body.unit || null,
        description: body.description || null,
      },
    })
    return NextResponse.json(material, { status: 201 })
  } catch (error) {
    console.error('POST /api/materials failed:', error)
    return NextResponse.json({ error: 'Failed to create material.' }, { status: 500 })
  }
}
