import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'

export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url)
    const sizeGroupId = searchParams.get('sizeGroupId')
    const division = searchParams.get('division')

    const where: any = {}
    if (sizeGroupId) where.sizeGroupId = sizeGroupId
    if (division) {
      where.sizeGroup = { division: { name: division } }
    }

    const sizes = await prisma.sizeMaster.findMany({
      where,
      include: {
        sizeGroup: {
          include: { division: { select: { id: true, name: true } } },
        },
      },
      orderBy: [{ sortOrder: 'asc' }, { sizeCode: 'asc' }],
    })

    return NextResponse.json(sizes)
  } catch (error) {
    console.error('GET /api/size-masters failed:', error)
    return NextResponse.json(
      { error: 'Failed to fetch size masters.' },
      { status: 500 },
    )
  }
}

export async function POST(req: NextRequest) {
  try {
    const body = await req.json()
    const size = await prisma.sizeMaster.create({
      data: {
        sizeGroupId: body.sizeGroupId,
        sizeCode: body.sizeCode,
        sizeName: body.sizeName || '',
        sortOrder: Number(body.sortOrder || 0),
        isActive: body.isActive !== false,
      },
      include: {
        sizeGroup: {
          include: { division: { select: { id: true, name: true } } },
        },
      },
    })
    return NextResponse.json(size, { status: 201 })
  } catch (error) {
    console.error('POST /api/size-masters failed:', error)
    return NextResponse.json(
      { error: 'Failed to create size master.' },
      { status: 500 },
    )
  }
}
