import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'

export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url)
    const divisionId = searchParams.get('divisionId')
    const divisionName = searchParams.get('divisionName')
    const subCategory = searchParams.get('subCategory')

    const where: any = {}
    if (divisionId) where.divisionId = Number(divisionId)
    if (divisionName) where.division = { name: divisionName }
    if (subCategory) where.subCategory = subCategory

    const groups = await prisma.sizeGroup.findMany({
      where,
      include: {
        division: { select: { id: true, name: true } },
        _count: { select: { sizes: true } },
      },
      orderBy: [{ divisionId: 'asc' }, { sortOrder: 'asc' }, { name: 'asc' }],
    })
    return NextResponse.json(groups)
  } catch (error) {
    console.error('GET /api/size-groups failed:', error)
    return NextResponse.json({ error: 'Failed to fetch size groups.' }, { status: 500 })
  }
}

export async function POST(req: NextRequest) {
  try {
    const body = await req.json()
    const group = await prisma.sizeGroup.create({
      data: {
        name: body.name,
        divisionId: Number(body.divisionId),
        sortOrder: Number(body.sortOrder || 0),
        isActive: body.isActive !== false,
      },
      include: {
        division: { select: { id: true, name: true } },
        _count: { select: { sizes: true } },
      },
    })
    return NextResponse.json(group, { status: 201 })
  } catch (error) {
    console.error('POST /api/size-groups failed:', error)
    return NextResponse.json({ error: 'Failed to create size group.' }, { status: 500 })
  }
}
