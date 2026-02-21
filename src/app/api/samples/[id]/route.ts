import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { updateSampleWithNormalizedData } from '@/lib/sample-create'

export async function GET(_req: NextRequest, { params }: { params: { id: string } }) {
  try {
    const sample = await prisma.sample.findUnique({
      where: { id: params.id },
      include: {
        product: { select: { id: true, styleNumber: true, name: true } },
        season: { select: { id: true, seasonName: true, seasonCode: true, name: true } },
        supplier: { select: { id: true, name: true } },
        sampleColors: {
          include: {
            color: {
              select: {
                id: true,
                colorCode: true,
                colorName: true,
                pantoneCode: true,
                rgbValue: true,
                colorImage: true,
              },
            },
          },
        },
        sizeMeasurements: true,
        sampleMaterials: true,
      },
    })

    if (!sample) {
      return NextResponse.json({ error: 'Not found' }, { status: 404 })
    }
    return NextResponse.json(sample)
  } catch (error) {
    console.error(`GET /api/samples/${params.id} failed:`, error)
    return NextResponse.json({ error: 'Failed to fetch sample.' }, { status: 500 })
  }
}

export async function PUT(req: NextRequest, { params }: { params: { id: string } }) {
  try {
    const body = await req.json()
    const sample = await prisma.$transaction((tx) =>
      updateSampleWithNormalizedData(tx, params.id, body.productId || null, body.newSampleData || {}),
    )
    return NextResponse.json(sample)
  } catch (error) {
    console.error(`PUT /api/samples/${params.id} failed:`, error)
    return NextResponse.json({ error: 'Failed to update sample.' }, { status: 500 })
  }
}

export async function PATCH(req: NextRequest, { params }: { params: { id: string } }) {
  try {
    const body = await req.json()
    const data: any = {}
    const current = await prisma.sample.findUnique({
      where: { id: params.id },
      select: { year: true },
    })

    if (typeof body.sampleName === 'string') data.sampleName = body.sampleName
    if (typeof body.sampleType === 'string') data.sampleType = body.sampleType
    if (typeof body.status === 'string') data.status = body.status
    if (typeof body.mainFactoryCode === 'string') data.mainFactoryCode = body.mainFactoryCode
    if (typeof body.division === 'string') data.division = body.division
    if (typeof body.subCategory === 'string') data.subCategory = body.subCategory
    if (typeof body.productId === 'string' && body.productId) data.productId = body.productId

    if (body.dueDate === null || typeof body.dueDate === 'string') {
      data.dueDate = body.dueDate ? new Date(body.dueDate) : null
    }
    if (body.salesStart === null || typeof body.salesStart === 'string') {
      data.salesStart = body.salesStart ? new Date(body.salesStart) : null
    }
    if (body.poDeadline === null || typeof body.poDeadline === 'string') {
      data.poDeadline = body.poDeadline ? new Date(body.poDeadline) : null
    }

    if (typeof body.year === 'number' || typeof body.year === 'string') {
      const parsedYear = Number(body.year)
      if (Number.isFinite(parsedYear)) data.year = parsedYear
    }

    if (typeof body.seasonTerm === 'string') {
      const seasonTerm = body.seasonTerm.toUpperCase()
      if (seasonTerm === 'SS' || seasonTerm === 'FW') {
        const season = await prisma.seasonMaster.findFirst({
          where: { seasonName: seasonTerm },
          select: { id: true },
        })
        if (season) data.seasonId = season.id
      }
    }

    if (Object.keys(data).length === 0) {
      return NextResponse.json({ error: 'No fields to update' }, { status: 400 })
    }

    const sample = await prisma.sample.update({
      where: { id: params.id },
      data,
      include: {
        product: { select: { id: true, styleNumber: true, name: true } },
        season: { select: { id: true, seasonName: true, seasonCode: true, name: true } },
        costs: { orderBy: { createdAt: 'desc' }, take: 1 },
      },
    })

    return NextResponse.json(sample)
  } catch (error) {
    console.error(`PATCH /api/samples/${params.id} failed:`, error)
    return NextResponse.json({ error: 'Failed to patch sample.' }, { status: 500 })
  }
}

export async function DELETE(_req: NextRequest, { params }: { params: { id: string } }) {
  try {
    await prisma.sample.delete({ where: { id: params.id } })
    return NextResponse.json({ success: true })
  } catch (error) {
    console.error(`DELETE /api/samples/${params.id} failed:`, error)
    return NextResponse.json({ error: 'Failed to delete sample.' }, { status: 500 })
  }
}
