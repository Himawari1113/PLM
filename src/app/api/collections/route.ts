import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'

export async function POST(req: NextRequest) {
  const body = await req.json()
  const collection = await prisma.collection.create({
    data: {
      name: body.name,
      description: body.description || null,
      seasonId: body.seasonId,
    },
  })
  return NextResponse.json(collection, { status: 201 })
}
