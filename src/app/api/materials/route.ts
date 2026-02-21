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
      orderBy: [
        { type: 'desc' },
        { materialCode: 'desc' },
      ],
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

async function generateMaterialCode(tx: any, category: string | null) {
  let prefix = 'M'
  if (category === 'SUB_FABRIC') prefix = 'S'
  else if (category === 'TRIM' || category === 'SUB_MATERIAL') prefix = 'T'

  const pattern = `${prefix}-`
  // Get all codes with this prefix to find the max serial
  const materials = await tx.material.findMany({
    where: { materialCode: { startsWith: pattern } },
    select: { materialCode: true },
  })

  let max = 0
  for (const m of materials) {
    if (!m.materialCode) continue
    const parts = m.materialCode.split('-')
    if (parts.length < 2) continue
    const serial = parseInt(parts[1], 16)
    if (!isNaN(serial)) {
      max = Math.max(max, serial)
    }
  }

  const nextSerial = (max + 1).toString(16).toUpperCase().padStart(5, '0')
  return `${prefix}-${nextSerial}`
}

export async function POST(req: NextRequest) {
  try {
    const body = await req.json()

    const material = await prisma.$transaction(async (tx) => {
      const materialCode = body.materialCode || await generateMaterialCode(tx, body.materialCategory)

      return await tx.material.create({
        data: {
          materialCode,
          name: body.name || '',
          type: body.type || 'FABRIC',
          materialCategory: body.materialCategory || null,
          composition: body.composition || null,
          color: body.color || null,
          weight: body.weight || null,
          width: body.width || null,
          unitPrice: body.unitPrice ? parseFloat(body.unitPrice) : null,
          unit: body.unit || null,
          description: body.description || null,
          originCountry: body.originCountry || null,
          docs: body.docs || null,
        },
      })
    })

    return NextResponse.json(material, { status: 201 })
  } catch (error) {
    console.error('POST /api/materials failed:', error)
    return NextResponse.json({ error: 'Failed to create material.' }, { status: 500 })
  }
}
