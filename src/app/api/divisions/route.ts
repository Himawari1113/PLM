import { NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'

const FALLBACK_DIVISIONS = [
  { id: 1, name: 'Mens' },
  { id: 2, name: 'Womens' },
  { id: 3, name: 'Kids/Baby' },
]

export async function GET() {
  try {
    const rows = await prisma.divisionMaster.findMany({
      orderBy: { id: 'asc' },
      select: { id: true, name: true },
    })
    if (rows.length === 0) return NextResponse.json(FALLBACK_DIVISIONS)
    return NextResponse.json(rows)
  } catch {
    return NextResponse.json(FALLBACK_DIVISIONS)
  }
}
