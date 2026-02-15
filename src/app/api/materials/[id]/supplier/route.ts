import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'

export async function PUT(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const materialId = params.id
    const { supplierId } = await request.json()

    // Remove existing supplier-material links for this material
    await prisma.supplierMaterial.deleteMany({
      where: { materialId },
    })

    // If supplierId is provided, create a new link
    if (supplierId) {
      const link = await prisma.supplierMaterial.create({
        data: {
          materialId,
          supplierId,
        },
        include: {
          supplier: { select: { id: true, name: true } },
        },
      })
      return NextResponse.json(link)
    }

    return NextResponse.json({ ok: true })
  } catch (error) {
    console.error('Error updating material supplier:', error)
    return NextResponse.json(
      { error: 'Failed to update supplier' },
      { status: 500 }
    )
  }
}
