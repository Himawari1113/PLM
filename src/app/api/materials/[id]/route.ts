import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'

export async function PATCH(req: NextRequest, { params }: { params: { id: string } }) {
  try {
    const body = await req.json()
    const data: any = {}
    if (body.materialCode !== undefined) data.materialCode = body.materialCode || null
    if (body.name !== undefined) data.name = body.name
    if (body.type !== undefined) data.type = body.type
    if (body.materialCategory !== undefined) data.materialCategory = body.materialCategory || null
    if (body.composition !== undefined) data.composition = body.composition || null
    if (body.unitPrice !== undefined) data.unitPrice = body.unitPrice !== '' ? parseFloat(body.unitPrice) : null
    if (body.unit !== undefined) data.unit = body.unit || null
    if (body.weight !== undefined) data.weight = body.weight || null
    if (body.width !== undefined) data.width = body.width || null

    const material = await prisma.material.update({
      where: { id: params.id },
      data,
    })
    return NextResponse.json(material)
  } catch (error) {
    console.error(`PATCH /api/materials/${params.id} failed:`, error)
    return NextResponse.json({ error: 'Failed to update material.' }, { status: 500 })
  }
}

export async function DELETE(_req: NextRequest, { params }: { params: { id: string } }) {
  try {
    // Check if referenced by SampleMaterial (by name)
    const material = await prisma.material.findUnique({ where: { id: params.id } })
    if (!material) {
      return NextResponse.json({ error: 'Material not found.' }, { status: 404 })
    }

    const sampleRefCount = await prisma.sampleMaterial.count({
      where: { materialName: material.name },
    })
    const bomRefCount = await prisma.bomItem.count({
      where: { materialId: params.id },
    })

    if (sampleRefCount > 0 || bomRefCount > 0) {
      return NextResponse.json(
        { error: `Cannot delete: referenced by ${sampleRefCount} sample(s) and ${bomRefCount} BOM item(s).` },
        { status: 409 },
      )
    }

    await prisma.material.delete({ where: { id: params.id } })
    return NextResponse.json({ success: true })
  } catch (error) {
    console.error(`DELETE /api/materials/${params.id} failed:`, error)
    return NextResponse.json({ error: 'Failed to delete material.' }, { status: 500 })
  }
}
