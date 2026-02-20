import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'

export async function GET(
  req: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const sampleId = params.id

    const comments = await prisma.sampleComment.findMany({
      where: { sampleId },
      orderBy: { createdAt: 'asc' }
    })

    return NextResponse.json(comments)
  } catch (error) {
    console.error('GET /api/samples/[id]/comments failed:', error)
    return NextResponse.json({ error: 'Failed to fetch comments' }, { status: 500 })
  }
}

export async function POST(
  req: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const sampleId = params.id
    const body = await req.json()
    
    const comment = await prisma.sampleComment.create({
      data: {
        sampleId,
        userId: body.userId || 'system',
        userName: body.userName || 'Admin User',
        comment: body.comment
      }
    })

    return NextResponse.json(comment, { status: 201 })
  } catch (error) {
    console.error('POST /api/samples/[id]/comments failed:', error)
    return NextResponse.json({ error: 'Failed to create comment' }, { status: 500 })
  }
}
