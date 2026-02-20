import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'

export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url)
  const yearParam = searchParams.get('year')
  const seasonParam = searchParams.get('season')
  const yearFilter = yearParam ? parseInt(yearParam, 10) : null
  const seasonFilter = seasonParam ? parseInt(seasonParam, 10) : null

  // Build where clauses
  const productWhere: any = {}
  if (seasonFilter) {
    productWhere.collection = {
      season: {
        seasonCode: seasonFilter,
      },
    }
  }
  const sampleWhere: any = yearFilter ? { year: yearFilter } : {}
  if (seasonFilter) {
    sampleWhere.season = {
      seasonCode: seasonFilter,
    }
  }
  const seasonWhere: any = {}

  const [
    productCount,
    sampleCount,
    materialCount,
    supplierCount,
    seasonCount,
    productsByStatus,
    productsByCategory,
    samplesByStatus,
    samplesByType,
    recentProducts,
  ] = await Promise.all([
    prisma.product.count({ where: productWhere }),
    prisma.sample.count({ where: sampleWhere }),
    prisma.material.count(),
    prisma.supplier.count(),
    prisma.seasonMaster.count({ where: seasonWhere }),
    prisma.product.groupBy({ by: ['status'], _count: true, where: productWhere }),
    prisma.product.groupBy({ by: ['category'], _count: true, where: productWhere }),
    prisma.sample.groupBy({ by: ['status'], _count: true, where: sampleWhere }),
    prisma.sample.groupBy({ by: ['sampleType'], _count: true, where: sampleWhere }),
    prisma.product.findMany({
      where: productWhere,
      take: 10,
      orderBy: { updatedAt: 'desc' },
      include: { collection: { include: { season: true } } },
    }),
  ])

  return NextResponse.json({
    counts: {
      products: productCount,
      samples: sampleCount,
      materials: materialCount,
      suppliers: supplierCount,
      seasons: seasonCount,
    },
    productsByStatus: productsByStatus.map((g) => ({
      name: g.status,
      value: g._count,
    })),
    productsByCategory: productsByCategory.map((g) => ({
      name: g.category,
      value: g._count,
    })),
    samplesByStatus: samplesByStatus.map((g) => ({
      name: g.status,
      value: g._count,
    })),
    samplesByType: samplesByType.map((g) => ({
      name: g.sampleType,
      value: g._count,
    })),
    recentProducts: recentProducts.map((p) => ({
      id: p.id,
      styleNumber: p.styleNumber,
      name: p.name,
      status: p.status,
      season: p.collection?.season?.name || null,
      updatedAt: p.updatedAt.toISOString(),
    })),
  })
}
