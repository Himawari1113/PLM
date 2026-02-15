import { PrismaClient, type ColorType, type CostStatus, type MaterialCategory, type MaterialType, type ProductStatus, type SampleStatus, type SampleType } from '@prisma/client'
import { hash } from 'bcryptjs'
import { randomUUID } from 'crypto'

const prisma = new PrismaClient()

const PRODUCT_TARGET = 5000
const SAMPLE_TARGET = 5000
const SUPPLIER_TARGET = 100
const COLOR_TARGET = 60
const MATERIAL_TARGET = 420

const DIVISIONS = ['Mens', 'Womens', 'Kids'] as const
const STATUS_POOL = ['DRAFT', 'IN_REVIEW', 'APPROVED', 'IN_PRODUCTION', 'COMPLETED'] as const
const SAMPLE_TYPE_POOL = ['PROTO', 'SALES_SAMPLE', 'PP_SAMPLE', 'TOP', 'OTHER'] as const
const SAMPLE_STATUS_POOL = ['PENDING', 'IN_PROGRESS', 'SUBMITTED', 'APPROVED', 'REJECTED'] as const

const CATEGORY_BY_DIVISION: Record<(typeof DIVISIONS)[number], string[]> = {
  Mens: ['TOPS', 'BOTTOMS', 'OUTERWEAR', 'KNITWEAR', 'OTHER'],
  Womens: ['TOPS', 'BOTTOMS', 'DRESSES', 'OUTERWEAR', 'KNITWEAR'],
  Kids: ['TOPS', 'BOTTOMS', 'OUTERWEAR', 'DRESSES', 'OTHER'],
}

const SIZE_BY_CATEGORY: Record<string, string[]> = {
  TOPS: ['XS', 'S', 'M', 'L', 'XL'],
  OUTERWEAR: ['S', 'M', 'L', 'XL'],
  KNITWEAR: ['S', 'M', 'L', 'XL'],
  DRESSES: ['XS', 'S', 'M', 'L', 'XL'],
  BOTTOMS: ['W26', 'W28', 'W30', 'W32', 'W34', 'W36'],
  OTHER: ['ONE'],
}

const PARTS_BY_CATEGORY: Record<string, string[]> = {
  TOPS: ['Body Length', 'Chest', 'Shoulder Width', 'Sleeve Length'],
  OUTERWEAR: ['Body Length', 'Chest', 'Shoulder Width', 'Sleeve Length'],
  KNITWEAR: ['Body Length', 'Chest', 'Sleeve Length'],
  DRESSES: ['Body Length', 'Bust', 'Waist', 'Hip'],
  BOTTOMS: ['Waist', 'Hip', 'Inseam', 'Hem Width'],
  OTHER: ['Length', 'Width'],
}

const COLOR_SWATCHES = [
  ['Black', '#111827'], ['White', '#F9FAFB'], ['Ivory', '#FFF8E7'], ['Stone', '#A8A29E'], ['Charcoal', '#364152'],
  ['Navy', '#1E3A8A'], ['Royal Blue', '#2563EB'], ['Sky Blue', '#38BDF8'], ['Teal', '#0F766E'], ['Mint', '#86EFAC'],
  ['Forest', '#166534'], ['Olive', '#4D7C0F'], ['Lime', '#84CC16'], ['Yellow', '#EAB308'], ['Mustard', '#CA8A04'],
  ['Amber', '#F59E0B'], ['Orange', '#F97316'], ['Coral', '#FB7185'], ['Red', '#DC2626'], ['Burgundy', '#7F1D1D'],
  ['Wine', '#881337'], ['Magenta', '#DB2777'], ['Fuchsia', '#C026D3'], ['Purple', '#7C3AED'], ['Violet', '#6D28D9'],
  ['Lavender', '#C4B5FD'], ['Blush', '#F9A8D4'], ['Rose', '#FB7185'], ['Peach', '#FDBA74'], ['Salmon', '#FCA5A5'],
  ['Sand', '#D6D3D1'], ['Camel', '#B45309'], ['Taupe', '#8B7355'], ['Chocolate', '#78350F'], ['Coffee', '#6F4E37'],
  ['Khaki', '#A3A380'], ['Denim', '#1D4ED8'], ['Indigo', '#4338CA'], ['Cobalt', '#1D4ED8'], ['Aqua', '#06B6D4'],
  ['Turquoise', '#14B8A6'], ['Emerald', '#10B981'], ['Pine', '#065F46'], ['Moss', '#4D7C0F'], ['Sage', '#84CC16'],
  ['Plum', '#7E22CE'], ['Orchid', '#D946EF'], ['Lilac', '#C084FC'], ['Berry', '#BE123C'], ['Crimson', '#B91C1C'],
  ['Rust', '#C2410C'], ['Terracotta', '#EA580C'], ['Copper', '#B45309'], ['Gold', '#CA8A04'], ['Silver', '#9CA3AF'],
  ['Graphite', '#374151'], ['Ocean', '#0284C7'], ['Petrol', '#0F766E'], ['Ice Blue', '#BAE6FD'], ['Cloud Gray', '#D1D5DB'],
] as const

function chunk<T>(arr: T[], size: number): T[][] {
  const out: T[][] = []
  for (let i = 0; i < arr.length; i += size) out.push(arr.slice(i, i + size))
  return out
}

function pick<T>(arr: readonly T[], idx: number): T {
  return arr[idx % arr.length]
}

function rand(min: number, max: number) {
  return Math.floor(Math.random() * (max - min + 1)) + min
}

function toSwatchDataUrl(hex: string) {
  const svg = `<svg xmlns='http://www.w3.org/2000/svg' width='120' height='120'><rect width='120' height='120' fill='${hex}'/></svg>`
  return `data:image/svg+xml;utf8,${encodeURIComponent(svg)}`
}

function toSketchDataUrl(category: string, idx: number) {
  const stroke = '#111827'
  const bg = '#FFFFFF'
  const accent = ['#6B7280', '#2563EB', '#D97706', '#059669'][idx % 4]

  let bodyPath = "M80 55 L120 40 L200 40 L240 55 L226 248 L196 328 L124 328 L94 248 Z"
  let extra = `<path d='M120 86 L200 86 M114 120 L206 120' fill='none' stroke='${stroke}' stroke-width='2' />`
  if (category === 'BOTTOMS') {
    bodyPath = 'M110 36 L210 36 L226 142 L196 330 L158 330 L144 206 L130 330 L92 330 L78 142 Z'
    extra = `<path d='M110 78 L210 78 M144 206 L158 206' fill='none' stroke='${stroke}' stroke-width='2' />`
  } else if (category === 'OUTERWEAR') {
    bodyPath = 'M70 70 L120 36 L200 36 L250 70 L236 252 L202 330 L118 330 L84 252 Z'
    extra = `<path d='M160 36 L160 330 M108 106 L212 106' fill='none' stroke='${stroke}' stroke-width='2' />`
  } else if (category === 'DRESSES') {
    bodyPath = 'M128 46 L192 46 L228 128 L252 332 L68 332 L92 128 Z'
    extra = `<path d='M128 46 L160 92 L192 46 M98 158 L222 158' fill='none' stroke='${stroke}' stroke-width='2' />`
  }

  const svg = `<svg xmlns='http://www.w3.org/2000/svg' width='360' height='360' viewBox='0 0 320 360'>
  <rect x='0' y='0' width='320' height='360' fill='${bg}'/>
  <path d='${bodyPath}' fill='none' stroke='${stroke}' stroke-width='3' stroke-linejoin='round' />
  ${extra}
  <rect x='18' y='18' width='284' height='324' fill='none' stroke='${accent}' stroke-width='2' stroke-dasharray='6 6' />
  </svg>`
  return `data:image/svg+xml;utf8,${encodeURIComponent(svg)}`
}

function rgbFromHex(hex: string) {
  const raw = hex.replace('#', '')
  const r = parseInt(raw.slice(0, 2), 16)
  const g = parseInt(raw.slice(2, 4), 16)
  const b = parseInt(raw.slice(4, 6), 16)
  return `rgb(${r}, ${g}, ${b})`
}

async function main() {
  const password = await hash('password', 12)

  console.log('Cleaning existing records...')
  await prisma.sampleMilestoneProgress.deleteMany()
  await prisma.scheduleMilestoneAssignment.deleteMany()
  await prisma.schedule.deleteMany()
  await prisma.milestone.deleteMany()
  await prisma.cost.deleteMany()
  await prisma.bomItem.deleteMany()
  await prisma.sampleMaterial.deleteMany()
  await prisma.sampleMeasurement.deleteMany()
  await prisma.sampleColor.deleteMany()
  await prisma.sample.deleteMany()
  await prisma.product.deleteMany()
  await prisma.collection.deleteMany()
  await prisma.trendItem.deleteMany()
  await prisma.supplierMaterial.deleteMany()
  await prisma.material.deleteMany()
  await prisma.color.deleteMany()
  await prisma.sizeMaster.deleteMany()
  await prisma.sizeGroup.deleteMany()
  await prisma.season.deleteMany()
  await prisma.supplier.deleteMany()
  await prisma.user.deleteMany()

  console.log('Creating users...')
  await prisma.user.createMany({
    data: [
      { email: 'admin@example.com', name: 'Admin User', password, role: 'ADMIN' },
      { email: 'designer@example.com', name: 'Designer User', password, role: 'DESIGNER' },
      { email: 'md@example.com', name: 'Merchandiser User', password, role: 'MERCHANDISER' },
    ],
  })

  console.log('Creating seasons...')
  const seasons = [
    { id: randomUUID(), year: 2025, term: 'SS', name: '2025SS' },
    { id: randomUUID(), year: 2025, term: 'FW', name: '2025FW' },
    { id: randomUUID(), year: 2026, term: 'SS', name: '2026SS' },
    { id: randomUUID(), year: 2026, term: 'FW', name: '2026FW' },
    { id: randomUUID(), year: 2027, term: 'SS', name: '2027SS' },
    { id: randomUUID(), year: 2027, term: 'FW', name: '2027FW' },
  ]
  await prisma.season.createMany({
    data: seasons.map((s) => ({
      id: s.id,
      name: s.name,
      year: s.year,
      term: s.term,
      description: `${s.year} ${s.term} season`,
    })),
  })

  console.log('Creating division masters...')
  const divisionMasters = [
    { id: 1, name: 'Mens' },
    { id: 2, name: 'Womens' },
    { id: 3, name: 'Kids/Baby' },
  ]
  await prisma.divisionMaster.createMany({ data: divisionMasters, skipDuplicates: true })

  console.log('Creating collections...')
  const collections = DIVISIONS.flatMap((division) =>
    seasons.map((season) => ({
      id: randomUUID(),
      seasonId: season.id,
      name: `${division} ${season.term} Core`,
      description: `${division} ${season.year} ${season.term} core collection`,
    })),
  )
  await prisma.collection.createMany({ data: collections })

  console.log('Creating suppliers...')
  const countries = ['United States', 'Japan', 'Italy', 'Vietnam', 'China', 'India', 'Turkey', 'Portugal']
  const suppliers = Array.from({ length: SUPPLIER_TARGET }).map((_, i) => {
    const idx = i + 1
    return {
      id: randomUUID(),
      name: `Supplier ${String(idx).padStart(3, '0')} Ltd.`,
      contactPerson: `Contact ${idx}`,
      email: `supplier${idx}@example.com`,
      phone: `+1-202-555-${String(1000 + idx).slice(-4)}`,
      address: `${100 + idx} Business Park Road`,
      country: pick(countries, i),
      description: `General apparel supplier ${idx}`,
    }
  })
  await prisma.supplier.createMany({ data: suppliers })

  console.log('Creating colors (with swatch images)...')
  const colors = Array.from({ length: COLOR_TARGET }).map((_, i) => {
    const [name, hex] = COLOR_SWATCHES[i]
    return {
      id: randomUUID(),
      colorCode: `CLR-${String(i + 1).padStart(3, '0')}`,
      colorName: name,
      pantoneCode: `P ${100 + i}-${rand(1, 9)} U`,
      pantoneName: `${name} Tone`,
      rgbValue: rgbFromHex(hex),
      colorImage: toSwatchDataUrl(hex),
      colorType: (i % 5 === 0 ? 'PATTERN' : 'SOLID') as ColorType,
    }
  })
  await prisma.color.createMany({ data: colors })

  console.log('Creating materials...')
  const materialTypes: readonly MaterialType[] = ['FABRIC', 'TRIM', 'PACKAGING', 'OTHER']
  const materialPrefixes = {
    FABRIC: ['Main Fabric', 'Interlock Fabric', 'Denim Fabric', 'Jersey Fabric'],
    TRIM: ['Button', 'Zipper', 'Label', 'Tape', 'Elastic', 'Drawcord'],
    PACKAGING: ['Hangtag', 'Polybag', 'Box', 'Sticker'],
    OTHER: ['Thread', 'Adhesive Film', 'Fusible', 'Foam Sheet'],
  }
  const subFabricPrefixes = ['Lining Fabric', 'Interlining', 'Pocket Fabric', 'Rib Fabric']
  const materialCategoryByType = (type: MaterialType, prefix: string): MaterialCategory | null => {
    if (type === 'FABRIC') {
      if (prefix.startsWith('Main') || prefix.startsWith('Denim')) return 'MAIN_FABRIC' as MaterialCategory
      return 'SUB_FABRIC' as MaterialCategory
    }
    return 'SUB_MATERIAL' as MaterialCategory
  }
  const materials = Array.from({ length: MATERIAL_TARGET }).map((_, i) => {
    const type = pick(materialTypes, i)
    // For FABRIC type, mix in sub fabric prefixes
    const prefix = type === 'FABRIC' && i % 3 === 2
      ? pick(subFabricPrefixes as unknown as string[], i)
      : pick(materialPrefixes[type], i)
    const color = pick(colors, i).colorName
    const materialCategory = materialCategoryByType(type, prefix)
    return {
      id: randomUUID(),
      name: `${prefix} ${String(i + 1).padStart(3, '0')}`,
      type,
      materialCategory,
      composition: type === 'FABRIC' ? pick(['Cotton 100%', 'Cotton/Poly 65/35', 'Polyester 100%', 'Nylon/Spandex 90/10'], i) : null,
      color,
      weight: type === 'FABRIC' ? `${rand(120, 380)} gsm` : null,
      width: type === 'FABRIC' ? `${rand(120, 180)} cm` : null,
      unitPrice: Number((rand(80, 9000) / 100).toFixed(2)),
      unit: type === 'FABRIC' ? 'm' : 'pcs',
      description: `${type} material in USD basis`,
    }
  })
  await prisma.material.createMany({ data: materials })

  console.log('Linking supplier-materials...')
  const supplierMaterials = materials.slice(0, 800).map((m, i) => ({
    id: randomUUID(),
    supplierId: pick(suppliers, i).id,
    materialId: m.id,
    leadTime: rand(7, 45),
    moq: rand(100, 5000),
    unitPrice: Number((m.unitPrice || rand(1, 80)).toFixed(2)),
  }))
  for (const set of chunk(supplierMaterials, 300)) {
    await prisma.supplierMaterial.createMany({ data: set, skipDuplicates: true })
  }

  console.log('Creating size groups & size masters...')
  const sizeGroupMap = new Map<string, string>() // key: "division|category" -> sizeGroupId
  const sizeGroupRecords: Array<{ id: string; name: string; divisionId: number; subCategory: string; sortOrder: number; isActive: boolean }> = []
  let sgIdx = 0
  for (const division of DIVISIONS) {
    const divisionId = division === 'Mens' ? 1 : division === 'Womens' ? 2 : 3
    for (const category of CATEGORY_BY_DIVISION[division]) {
      const sgId = randomUUID()
      sizeGroupMap.set(`${division}|${category}`, sgId)
      sizeGroupRecords.push({ id: sgId, name: category, divisionId, subCategory: category, sortOrder: sgIdx++, isActive: true })
    }
  }
  await prisma.sizeGroup.createMany({ data: sizeGroupRecords, skipDuplicates: true })

  const sizeMasters: Array<{
    id: string
    sizeGroupId: string
    sizeCode: string
    sizeName: string
    sortOrder: number
    isActive: boolean
  }> = []
  for (const division of DIVISIONS) {
    for (const category of CATEGORY_BY_DIVISION[division]) {
      const sgId = sizeGroupMap.get(`${division}|${category}`)!
      const sizes = SIZE_BY_CATEGORY[category] || ['ONE']
      sizes.forEach((sizeCode, idx) => {
        sizeMasters.push({
          id: randomUUID(),
          sizeGroupId: sgId,
          sizeCode,
          sizeName: sizeCode,
          sortOrder: idx + 1,
          isActive: true,
        })
      })
    }
  }
  await prisma.sizeMaster.createMany({ data: sizeMasters, skipDuplicates: true })

  console.log('Creating products...')
  const products = Array.from({ length: PRODUCT_TARGET }).map((_, i) => {
    const idx = i + 1
    const division = pick(DIVISIONS, i)
    const divisionId = division === 'Mens' ? 1 : division === 'Womens' ? 2 : 3
    const category = pick(CATEGORY_BY_DIVISION[division], i * 7)
    const season = pick(seasons, i * 5)
    const supplier = pick(suppliers, i * 3)
    const collection = collections.find((c) => c.seasonId === season.id && c.name.startsWith(division)) || collections[0]
    return {
      id: randomUUID(),
      styleNumber: `ST-${String(season.year).slice(2)}${season.term}-${String(idx).padStart(5, '0')}`,
      name: `${category} Style ${String(idx).padStart(4, '0')}`,
      divisionId,
      category,
      description: `${division} ${category.toLowerCase()} product for ${season.year} ${season.term}.`,
      status: pick(STATUS_POOL, i) as ProductStatus,
      targetPrice: Number((rand(1500, 35000) / 100).toFixed(2)),
      collectionId: collection.id,
      supplierId: supplier.id,
      createdAt: new Date(`${season.year}-${String(rand(1, 12)).padStart(2, '0')}-${String(rand(1, 28)).padStart(2, '0')}T00:00:00Z`),
    }
  })
  for (const set of chunk(products, 300)) {
    await prisma.product.createMany({ data: set })
  }

  console.log('Creating samples with 1:N product relationships...')
  const serialBySeason: Record<string, number> = {}
  const samples = Array.from({ length: SAMPLE_TARGET }).map((_, i) => {
    const linkedProduct = products[rand(0, products.length - 1)] // creates natural 1:N variation
    const year = rand(2025, 2027)
    const seasonTerm = Math.random() > 0.5 ? 'SS' : 'FW'
    const serialKey = `${year}-${seasonTerm}`
    serialBySeason[serialKey] = (serialBySeason[serialKey] || 0) + 1
    const sampleNumber = `${String(serialBySeason[serialKey]).padStart(6, '0')}-${year}-${seasonTerm}`

    const division = linkedProduct.name.startsWith('Mens') ? 'Mens' : linkedProduct.name.startsWith('Womens') ? 'Womens' : 'Kids'
    const subCategory = linkedProduct.category
    const supplier = linkedProduct.supplierId ? suppliers.find((s) => s.id === linkedProduct.supplierId) : pick(suppliers, i)
    const season = seasons.find((s) => s.year === year && s.term === seasonTerm) || seasons[0]
    return {
      id: randomUUID(),
      productId: linkedProduct.id,
      sampleName: `${linkedProduct.name} Sample ${String(i + 1).padStart(4, '0')}`,
      sampleNumber,
      sampleType: pick(SAMPLE_TYPE_POOL, i * 2) as SampleType,
      status: pick(SAMPLE_STATUS_POOL, i * 3) as SampleStatus,
      sizeSpec: `Size set: ${(SIZE_BY_CATEGORY[subCategory] || ['ONE']).join(', ')}`,
      remarks: `Generated sample note ${i + 1}`,
      imageUrl: toSketchDataUrl(subCategory, i),
      factoryName: `Factory ${String(rand(1, 100)).padStart(3, '0')}`,
      shippingDestination: pick(countries, i),
      year,
      seasonId: season.id,
      division,
      subCategory,
      supplierId: supplier?.id || null,
      productOverride: '',
      createdAt: new Date(`${year}-${String(rand(1, 12)).padStart(2, '0')}-${String(rand(1, 28)).padStart(2, '0')}T00:00:00Z`),
    }
  })
  for (const set of chunk(samples, 250)) {
    await prisma.sample.createMany({ data: set })
  }

  console.log('Creating sample colors, measurements, materials, and costs...')
  const sampleColors: Array<{ id: string; sampleId: string; colorId: string }> = []
  const sampleMeasurements: Array<{ id: string; sampleId: string; sizeMasterId: string | null; sizeCode: string; part: string; value: string }> = []
  const sampleMaterials: Array<{ id: string; sampleId: string; kind: 'MAIN_FABRIC' | 'SUB_FABRIC' | 'SUB_MATERIAL'; materialCode: string | null; materialName: string | null; costPerUnit: number | null; fabricSupplier: string | null }> = []
  const costs: Array<{ id: string; sampleId: string; costVersion: string; status: 'ESTIMATING' | 'QUOTED' | 'NEGOTIATING' | 'APPROVED' | 'REJECTED'; currency: string; fobPrice: number; materialCost: number; processingCost: number; trimCost: number; profitMargin: number; moq: number; leadTimeDays: number; remarks: string }> = []

  for (let i = 0; i < samples.length; i += 1) {
    const sample = samples[i]
    const colorCount = rand(1, 3)
    for (let c = 0; c < colorCount; c += 1) {
      sampleColors.push({
        id: randomUUID(),
        sampleId: sample.id,
        colorId: pick(colors, i + c * 13).id,
      })
    }

    const sizes = SIZE_BY_CATEGORY[sample.subCategory || 'OTHER'] || ['ONE']
    const parts = PARTS_BY_CATEGORY[sample.subCategory || 'OTHER'] || ['Length']
    const pickSizes = sizes.slice(0, Math.min(sizes.length, sample.subCategory === 'BOTTOMS' ? 4 : 3))
    for (const sizeCode of pickSizes) {
      const sgKey = `${sample.division}|${sample.subCategory}`
      const sgId = sizeGroupMap.get(sgKey)
      const master = sizeMasters.find(
        (m) => m.sizeGroupId === sgId && m.sizeCode === sizeCode,
      )
      for (const part of parts) {
        sampleMeasurements.push({
          id: randomUUID(),
          sampleId: sample.id,
          sizeMasterId: master?.id || null,
          sizeCode,
          part,
          value: String(rand(20, 130)),
        })
      }
    }

    const mainFabric = pick(materials.filter((m) => m.type === 'FABRIC'), i)
    sampleMaterials.push({
      id: randomUUID(),
      sampleId: sample.id,
      kind: 'MAIN_FABRIC',
      materialCode: `MAT-${String(i + 1).padStart(5, '0')}`,
      materialName: mainFabric?.name || null,
      costPerUnit: mainFabric?.unitPrice || null,
      fabricSupplier: pick(suppliers, i).name,
    })

    for (let sf = 0; sf < rand(1, 2); sf += 1) {
      const mat = pick(materials.filter((m) => m.type === 'FABRIC'), i + sf * 5)
      sampleMaterials.push({
        id: randomUUID(),
        sampleId: sample.id,
        kind: 'SUB_FABRIC',
        materialCode: `SFB-${String(i + sf + 1).padStart(5, '0')}`,
        materialName: mat?.name || null,
        costPerUnit: mat?.unitPrice || null,
        fabricSupplier: pick(suppliers, i + sf).name,
      })
    }

    for (let sm = 0; sm < rand(1, 2); sm += 1) {
      const mat = pick(materials.filter((m) => m.type !== 'FABRIC'), i + sm * 7)
      sampleMaterials.push({
        id: randomUUID(),
        sampleId: sample.id,
        kind: 'SUB_MATERIAL',
        materialCode: `SUB-${String(i + sm + 1).padStart(5, '0')}`,
        materialName: mat?.name || null,
        costPerUnit: mat?.unitPrice || null,
        fabricSupplier: pick(suppliers, i + sm + 3).name,
      })
    }

    const fob = Number((rand(1800, 25000) / 100).toFixed(2))
    const materialCost = Number((fob * 0.45).toFixed(2))
    const processingCost = Number((fob * 0.28).toFixed(2))
    const trimCost = Number((fob * 0.12).toFixed(2))
    costs.push({
      id: randomUUID(),
      sampleId: sample.id,
      costVersion: 'v1',
      status: pick(['ESTIMATING', 'QUOTED', 'NEGOTIATING', 'APPROVED', 'REJECTED'] as const, i) as CostStatus,
      currency: 'USD',
      fobPrice: fob,
      materialCost,
      processingCost,
      trimCost,
      profitMargin: Number((rand(12, 35)).toFixed(1)),
      moq: rand(100, 5000),
      leadTimeDays: rand(15, 90),
      remarks: 'Generated in USD',
    })
  }

  for (const set of chunk(sampleColors, 300)) await prisma.sampleColor.createMany({ data: set, skipDuplicates: true })
  for (const set of chunk(sampleMeasurements, 300)) await prisma.sampleMeasurement.createMany({ data: set })
  for (const set of chunk(sampleMaterials, 300)) await prisma.sampleMaterial.createMany({ data: set })
  for (const set of chunk(costs, 300)) await prisma.cost.createMany({ data: set })

  console.log('Creating trend items...')
  const trendItems = seasons.map((season, i) => ({
    id: randomUUID(),
    title: `${season.year} ${season.term} Trend Outlook ${i + 1}`,
    description: `English trend article for ${season.name}`,
    tags: [season.term, String(season.year), 'market', 'style'],
    seasonId: season.id,
  }))
  await prisma.trendItem.createMany({ data: trendItems })

  console.log('Creating default milestones...')
  const milestoneNames = [
    'Design Brief',
    'Tech Pack Ready',
    'Proto Sample',
    'Fit Review',
    'PP Sample',
    'Salesman Sample',
    'Cost Approval',
    'Production Handover',
  ]
  await prisma.milestone.createMany({
    data: milestoneNames.map((name, idx) => ({
      id: randomUUID(),
      name,
      description: `${name} milestone`,
      sortOrder: idx + 1,
      isActive: true,
    })),
  })

  console.log(`Seed completed:
  - Products: ${PRODUCT_TARGET}
  - Samples: ${SAMPLE_TARGET}
  - Suppliers: ${SUPPLIER_TARGET}
  - Colors: ${COLOR_TARGET}
  - Materials: ${MATERIAL_TARGET}
  - Size masters: ${sizeMasters.length}`)
}

main()
  .catch((e) => {
    console.error(e)
    process.exit(1)
  })
  .finally(async () => {
    await prisma.$disconnect()
  })
