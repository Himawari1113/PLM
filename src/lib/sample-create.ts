import type { Prisma } from '@prisma/client'

function mapSampleStatus(statusUi?: string, status?: string) {
  if (statusUi === 'APPROVED') return 'APPROVED'
  if (statusUi === 'DROPPED') return 'REJECTED'
  if (status && ['PENDING', 'IN_PROGRESS', 'SUBMITTED', 'APPROVED', 'REJECTED'].includes(status)) {
    return status
  }
  return 'PENDING'
}

function normalizeSeasonTerm(term?: string) {
  if (!term) return 'SS'
  if (term === 'AW') return 'FW'
  return term.toUpperCase()
}

function hasMaterialData(input: any) {
  if (!input) return false
  return Boolean(input.materialCode || input.materialName || input.costPerUnit || input.fabricSupplier)
}

async function generateSampleNumber(tx: Prisma.TransactionClient, year: number, seasonTerm: string) {
  const suffix = `-${year}-${seasonTerm}`
  const existing = await tx.sample.findMany({
    where: { sampleNumber: { endsWith: suffix } },
    select: { sampleNumber: true },
  })

  let max = 0
  for (const row of existing) {
    const prefix = row.sampleNumber.split('-')[0]
    const serial = Number(prefix)
    if (Number.isFinite(serial)) {
      max = Math.max(max, serial)
    }
  }
  return `${String(max + 1).padStart(6, '0')}-${year}-${seasonTerm}`
}

async function saveNormalizedRelations(tx: Prisma.TransactionClient, sampleId: string, body: any) {
  const specInfo = body.specInfo || {}
  const materials = body.materials || {}

  const colorRows = Array.isArray(specInfo.colors) ? specInfo.colors : []
  for (const row of colorRows) {
    if (!row?.colorId) continue
    await tx.sampleColor.create({
      data: {
        sampleId,
        colorId: row.colorId,
        status: row.status || 'IN_PROGRESS',
      },
    })
  }

  const measurementRows = Array.isArray(specInfo.sizeMeasurements) ? specInfo.sizeMeasurements : []
  for (const row of measurementRows) {
    if (!row?.part || !row?.value) continue
    await tx.sampleMeasurement.create({
      data: {
        sampleId,
        sizeMasterId: row.sizeMasterId || null,
        sizeCode: row.size || '',
        part: row.part,
        value: row.value,
      },
    })
  }

  const materialRows: Array<{ kind: Prisma.SampleMaterialUncheckedCreateInput['kind']; item: any }> = []
  if (hasMaterialData(materials.mainFabric)) {
    materialRows.push({ kind: 'MAIN_FABRIC', item: materials.mainFabric })
  }
  for (const item of Array.isArray(materials.subFabrics) ? materials.subFabrics : []) {
    if (!hasMaterialData(item)) continue
    materialRows.push({ kind: 'SUB_FABRIC', item })
  }
  for (const item of Array.isArray(materials.subMaterials) ? materials.subMaterials : []) {
    if (!hasMaterialData(item)) continue
    materialRows.push({ kind: 'SUB_MATERIAL', item })
  }

  for (const row of materialRows) {
    await tx.sampleMaterial.create({
      data: {
        sampleId,
        kind: row.kind,
        materialCode: row.item.materialCode || null,
        materialName: row.item.materialName || null,
        costPerUnit: row.item.costPerUnit ? Number(row.item.costPerUnit) : null,
        fabricSupplier: row.item.fabricSupplier || null,
      },
    })
  }
}

async function ensureUnassignedProductId(tx: Prisma.TransactionClient) {
  const existing = await tx.product.findUnique({
    where: { styleNumber: 'UNASSIGNED-SAMPLE' },
    select: { id: true },
  })
  if (existing) return existing.id

  const created = await tx.product.create({
    data: {
      styleNumber: 'UNASSIGNED-SAMPLE',
      name: 'Unassigned Sample Product',
      category: 'OTHER',
      status: 'DRAFT',
      description: 'Temporary placeholder for samples without product link.',
      targetPrice: 0,
    },
    select: { id: true },
  })
  return created.id
}

export async function createSampleWithNormalizedData(tx: Prisma.TransactionClient, productId: string | null | undefined, body: any) {
  const sampleInfo = body.sampleInfo || {}
  const specInfo = body.specInfo || {}
  const productionInfo = body.productionInfo || {}
  const materials = body.materials || {}
  const others = body.others || {}

  const nowYear = new Date().getFullYear()
  const yearValue = Number(sampleInfo.year || nowYear)
  const year = Number.isFinite(yearValue) ? yearValue : nowYear

  let seasonTerm = normalizeSeasonTerm(sampleInfo.seasonTerm)
  let resolvedSeasonId: string | null = sampleInfo.seasonId || null

  if (resolvedSeasonId) {
    const season = await tx.seasonMaster.findUnique({
      where: { id: resolvedSeasonId },
      select: { seasonName: true },
    })
    seasonTerm = normalizeSeasonTerm(season?.seasonName || seasonTerm)
  } else if (seasonTerm) {
    // Look up SeasonMaster by seasonName to auto-resolve seasonId
    const season = await tx.seasonMaster.findFirst({
      where: { seasonName: seasonTerm },
      select: { id: true },
    })
    if (season) resolvedSeasonId = season.id
  }

  const sampleNumber = await generateSampleNumber(tx, year, seasonTerm)
  const sampleName = String(sampleInfo.sampleNameEn || body.sampleName || '').trim()

  const payloadSnapshot = {
    sampleInfo: { ...sampleInfo, sampleNumber },
    specInfo,
    productionInfo,
    materials,
    others,
  }

  const resolvedProductId = productId || await ensureUnassignedProductId(tx)

  const sample = await tx.sample.create({
    data: {
      productId: resolvedProductId,
      sampleName,
      sampleNumber,
      sampleType: sampleInfo.sampleType || body.sampleType || 'PROTO',
      status: mapSampleStatus(sampleInfo.statusUi || body.statusUi, body.status),
      sizeSpec: specInfo.sizeInfo || null,
      remarks: others.remark || null,
      imageUrl: sampleInfo.imageDataUrl || null,
      mainFactoryCode: productionInfo.mainFactoryCode || null,
      dueDate: body.dueDate ? new Date(body.dueDate) : null,
      shippingDestination: productionInfo.originCountry || null,
      fittingComment: JSON.stringify(payloadSnapshot),
      year,
      seasonId: resolvedSeasonId,
      division: sampleInfo.division || null,
      subCategory: sampleInfo.subCategory || null,
      supplierId: productionInfo.supplierId || null,
      illustratorFile: sampleInfo.illustratorDataUrl || null,
      patternCadFile: specInfo.patternCadDataUrl || null,
      clo3dFile: specInfo.clo3dDataUrl || null,
      clo3dFileName: specInfo.clo3dFileName || null,
      productOverride: sampleInfo.productOverride || null,
    },
  })

  await saveNormalizedRelations(tx, sample.id, body)

  return sample
}

export async function updateSampleWithNormalizedData(
  tx: Prisma.TransactionClient,
  sampleId: string,
  productId: string | null | undefined,
  body: any,
) {
  const sampleInfo = body.sampleInfo || {}
  const specInfo = body.specInfo || {}
  const productionInfo = body.productionInfo || {}
  const materials = body.materials || {}
  const others = body.others || {}

  const current = await tx.sample.findUnique({
    where: { id: sampleId },
    select: { sampleNumber: true, year: true, productId: true },
  })
  if (!current) {
    throw new Error('Sample not found')
  }

  const payloadSnapshot = {
    sampleInfo: { ...sampleInfo, sampleNumber: current.sampleNumber },
    specInfo,
    productionInfo,
    materials,
    others,
  }

  const yearValue = Number(sampleInfo.year || current.year || new Date().getFullYear())
  const year = Number.isFinite(yearValue) ? yearValue : new Date().getFullYear()

  const sample = await tx.sample.update({
    where: { id: sampleId },
    data: {
      productId: productId || current.productId,
      sampleName: String(sampleInfo.sampleNameEn || '').trim(),
      sampleType: sampleInfo.sampleType || 'PROTO',
      status: mapSampleStatus(sampleInfo.statusUi, undefined),
      sizeSpec: specInfo.sizeInfo || null,
      remarks: others.remark || null,
      imageUrl: sampleInfo.imageDataUrl || null,
      mainFactoryCode: productionInfo.mainFactoryCode || null,
      shippingDestination: productionInfo.originCountry || null,
      fittingComment: JSON.stringify(payloadSnapshot),
      year,
      division: sampleInfo.division || null,
      subCategory: sampleInfo.subCategory || null,
      supplierId: productionInfo.supplierId || null,
      illustratorFile: sampleInfo.illustratorDataUrl || null,
      patternCadFile: specInfo.patternCadDataUrl || null,
      clo3dFile: specInfo.clo3dDataUrl || null,
      clo3dFileName: specInfo.clo3dFileName || null,
      productOverride: sampleInfo.productOverride || null,
    },
  })

  await tx.sampleColor.deleteMany({ where: { sampleId } })
  await tx.sampleMeasurement.deleteMany({ where: { sampleId } })
  await tx.sampleMaterial.deleteMany({ where: { sampleId } })
  await saveNormalizedRelations(tx, sampleId, body)

  return sample
}
