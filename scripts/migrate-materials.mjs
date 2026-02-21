/**
 * Material Migration Script
 * 1. Delete dummy MAIN_FABRIC records ("Main Fabric NNN")
 * 2. Insert comprehensive real fabric list for MAIN_FABRIC
 * 3. Update SUB_MATERIAL → TRIM
 * 4. Assign Material Codes in hex (M-XXXXX / S-XXXXX / T-XXXXX)
 */

import { PrismaClient } from '@prisma/client'

const prisma = new PrismaClient()

// ── Helpers ────────────────────────────────────────────────────────────────

/** Return prefix-NNNNN (5-digit uppercase hex) */
function hexCode(prefix, n) {
  return `${prefix}-${n.toString(16).toUpperCase().padStart(5, '0')}`
}

// ── Comprehensive MAIN_FABRIC list ─────────────────────────────────────────
// Natural (plant) → Semi-synthetic (regenerated) → Synthetic → Blends → Specialty

const MAIN_FABRICS = [
  // ── Natural – Plant ──────────────────────────────────────────────────────
  { name: 'Cotton',              composition: '100% Cotton' },
  { name: 'Organic Cotton',      composition: '100% Organic Cotton' },
  { name: 'Linen',               composition: '100% Linen' },
  { name: 'Hemp',                composition: '100% Hemp' },
  { name: 'Bamboo',              composition: '100% Bamboo' },
  { name: 'Ramie',               composition: '100% Ramie' },
  { name: 'Jute',                composition: '100% Jute' },
  { name: 'Nettle',              composition: '100% Nettle' },
  { name: 'Pineapple Fiber (Piña)', composition: '100% Pineapple Fiber' },

  // ── Natural – Animal ─────────────────────────────────────────────────────
  { name: 'Silk',                composition: '100% Silk' },
  { name: 'Wool',                composition: '100% Wool' },
  { name: 'Merino Wool',         composition: '100% Merino Wool' },
  { name: 'Cashmere',            composition: '100% Cashmere' },
  { name: 'Mohair',              composition: '100% Mohair' },
  { name: 'Angora',              composition: '100% Angora' },
  { name: 'Alpaca',              composition: '100% Alpaca' },
  { name: 'Camel Hair',          composition: '100% Camel Hair' },
  { name: 'Qiviut',              composition: '100% Qiviut' },
  { name: 'Leather',             composition: '100% Leather' },
  { name: 'Suede',               composition: '100% Suede' },
  { name: 'Nubuck',              composition: '100% Nubuck Leather' },

  // ── Semi-synthetic (Regenerated Cellulose) ───────────────────────────────
  { name: 'Viscose (Rayon)',     composition: '100% Viscose' },
  { name: 'Modal',               composition: '100% Modal' },
  { name: 'Lyocell (Tencel)',    composition: '100% Lyocell' },
  { name: 'Cupro',               composition: '100% Cupro' },
  { name: 'Acetate',             composition: '100% Acetate' },
  { name: 'Triacetate',          composition: '100% Triacetate' },
  { name: 'Bamboo Lyocell',      composition: '100% Bamboo Lyocell' },
  { name: 'Bamboo Viscose',      composition: '100% Bamboo Viscose' },

  // ── Synthetic ────────────────────────────────────────────────────────────
  { name: 'Polyester',           composition: '100% Polyester' },
  { name: 'Recycled Polyester',  composition: '100% Recycled Polyester' },
  { name: 'Nylon (Polyamide)',   composition: '100% Nylon' },
  { name: 'Recycled Nylon',      composition: '100% Recycled Nylon' },
  { name: 'Acrylic',             composition: '100% Acrylic' },
  { name: 'Spandex (Elastane)',  composition: '100% Elastane' },
  { name: 'Polypropylene',       composition: '100% Polypropylene' },
  { name: 'PU Faux Leather',     composition: '100% Polyurethane' },
  { name: 'PVC Vinyl',           composition: '100% PVC' },
  { name: 'ECONYL Nylon',        composition: '100% Regenerated Nylon' },

  // ── Cotton Blends ────────────────────────────────────────────────────────
  { name: 'Cotton Polyester',    composition: '60% Cotton, 40% Polyester' },
  { name: 'Cotton Elastane',     composition: '97% Cotton, 3% Elastane' },
  { name: 'Cotton Linen',        composition: '55% Cotton, 45% Linen' },
  { name: 'Cotton Modal',        composition: '50% Cotton, 50% Modal' },
  { name: 'Cotton Silk',         composition: '70% Cotton, 30% Silk' },
  { name: 'Cotton Nylon',        composition: '80% Cotton, 20% Nylon' },
  { name: 'Cotton Viscose',      composition: '65% Cotton, 35% Viscose' },
  { name: 'Cotton Lyocell',      composition: '70% Cotton, 30% Lyocell' },
  { name: 'Cotton Cashmere',     composition: '90% Cotton, 10% Cashmere' },

  // ── Wool Blends ──────────────────────────────────────────────────────────
  { name: 'Wool Polyester',      composition: '55% Wool, 45% Polyester' },
  { name: 'Wool Nylon',          composition: '80% Wool, 20% Nylon' },
  { name: 'Wool Silk',           composition: '80% Wool, 20% Silk' },
  { name: 'Wool Cashmere',       composition: '90% Wool, 10% Cashmere' },
  { name: 'Wool Elastane',       composition: '97% Wool, 3% Elastane' },

  // ── Polyester / Nylon Blends ─────────────────────────────────────────────
  { name: 'Polyester Elastane',  composition: '92% Polyester, 8% Elastane' },
  { name: 'Polyester Viscose',   composition: '65% Polyester, 35% Viscose' },
  { name: 'Nylon Elastane',      composition: '80% Nylon, 20% Elastane' },
  { name: 'Viscose Elastane',    composition: '95% Viscose, 5% Elastane' },
  { name: 'Viscose Polyester',   composition: '60% Viscose, 40% Polyester' },
  { name: 'Ponte (Poly-Vis-El)', composition: '60% Polyester, 35% Viscose, 5% Elastane' },

  // ── Specialty / Structured Fabrics ──────────────────────────────────────
  { name: 'Denim',               composition: '100% Cotton' },
  { name: 'Stretch Denim',       composition: '98% Cotton, 2% Elastane' },
  { name: 'Jersey',              composition: '100% Cotton' },
  { name: 'French Terry',        composition: '100% Cotton' },
  { name: 'Piqué',               composition: '100% Cotton' },
  { name: 'Oxford Weave',        composition: '100% Cotton' },
  { name: 'Poplin',              composition: '100% Cotton' },
  { name: 'Twill',               composition: '100% Cotton' },
  { name: 'Canvas',              composition: '100% Cotton' },
  { name: 'Corduroy',            composition: '100% Cotton' },
  { name: 'Waffle Knit',         composition: '100% Cotton' },
  { name: 'Rib Knit',            composition: '95% Cotton, 5% Elastane' },
  { name: 'Interlock',           composition: '100% Cotton' },
  { name: 'Fleece',              composition: '100% Polyester' },
  { name: 'Polar Fleece',        composition: '100% Recycled Polyester' },
  { name: 'Scuba',               composition: '95% Polyester, 5% Elastane' },
  { name: 'Neoprene',            composition: '100% Polyester' },
  { name: 'Velvet',              composition: '80% Polyester, 20% Nylon' },
  { name: 'Velour',              composition: '100% Polyester' },
  { name: 'Satin',               composition: '100% Polyester' },
  { name: 'Silk Satin',          composition: '100% Silk' },
  { name: 'Chiffon',             composition: '100% Polyester' },
  { name: 'Silk Chiffon',        composition: '100% Silk' },
  { name: 'Organza',             composition: '100% Polyester' },
  { name: 'Georgette',           composition: '100% Polyester' },
  { name: 'Crepe',               composition: '100% Polyester' },
  { name: 'Tweed',               composition: '80% Wool, 20% Acrylic' },
  { name: 'Herringbone',         composition: '80% Wool, 20% Polyester' },
  { name: 'Houndstooth',         composition: '100% Wool' },
  { name: 'Jacquard',            composition: '55% Cotton, 45% Polyester' },
  { name: 'Brocade',             composition: '70% Polyester, 30% Cotton' },
  { name: 'Lace Fabric',         composition: '100% Nylon' },
  { name: 'Mesh',                composition: '100% Polyester' },
  { name: 'Faux Fur',            composition: '100% Acrylic' },
  { name: 'Sherpa',              composition: '100% Polyester' },
  { name: 'Down Padding',        composition: '90% Down, 10% Feather' },
  { name: 'Wadding (Batting)',   composition: '100% Polyester' },
  { name: 'Gore-Tex® Laminate',  composition: '100% Polyester (PTFE laminate)' },
  { name: 'Softshell',           composition: '94% Polyester, 6% Elastane' },
  { name: 'Ripstop Nylon',       composition: '100% Nylon' },
  { name: 'Taffeta',             composition: '100% Polyester' },
]

// ── Main ────────────────────────────────────────────────────────────────────

async function main() {
  console.log('=== Material Migration ===\n')

  // Step 1 – Delete all dummy MAIN_FABRIC records
  console.log('[1] Removing dummy MAIN_FABRIC records…')
  const del = await prisma.material.deleteMany({
    where: {
      materialCategory: 'MAIN_FABRIC',
      name: { startsWith: 'Main Fabric' },
    },
  })
  console.log(`    Deleted ${del.count} dummy records.`)

  // Step 2 – Insert comprehensive real MAIN_FABRIC list
  console.log('[2] Inserting real fabric list…')
  for (const fab of MAIN_FABRICS) {
    // Skip if a material with the same name already exists
    const exists = await prisma.material.findFirst({ where: { name: fab.name, materialCategory: 'MAIN_FABRIC' } })
    if (!exists) {
      await prisma.material.create({
        data: {
          name: fab.name,
          composition: fab.composition,
          materialCategory: 'MAIN_FABRIC',
          type: 'FABRIC',
        },
      })
    }
  }
  const mfCount = await prisma.material.count({ where: { materialCategory: 'MAIN_FABRIC' } })
  console.log(`    MAIN_FABRIC records now: ${mfCount}`)

  // Step 3 – Rename SUB_MATERIAL → TRIM
  console.log('[3] Renaming SUB_MATERIAL → TRIM…')
  const updated = await prisma.material.updateMany({
    where: { materialCategory: 'SUB_MATERIAL' },
    data: { materialCategory: 'TRIM' },
  })
  console.log(`    Updated ${updated.count} records.`)

  // Step 4 – Assign Material Codes
  // Rules: MAIN_FABRIC→M-XXXXX, SUB_FABRIC→S-XXXXX, TRIM→T-XXXXX (5-digit hex, ascending)
  console.log('[4] Assigning Material Codes…')

  const groups = [
    { category: 'MAIN_FABRIC', prefix: 'M' },
    { category: 'SUB_FABRIC',  prefix: 'S' },
    { category: 'TRIM',        prefix: 'T' },
    { category: 'SUB_MATERIAL', prefix: 'T' }, // legacy – shouldn't be any left
  ]

  for (const { category, prefix } of groups) {
    const items = await prisma.material.findMany({
      where: { materialCategory: category },
      orderBy: { createdAt: 'asc' },
      select: { id: true, materialCode: true },
    })
    if (items.length === 0) continue

    let counter = 1
    for (const item of items) {
      // Skip if already has a code with the correct prefix
      if (item.materialCode && item.materialCode.startsWith(prefix + '-')) {
        // Parse existing counter to continue from last
        const n = parseInt(item.materialCode.slice(prefix.length + 1), 16)
        if (!isNaN(n) && n >= counter) counter = n + 1
        continue
      }
      await prisma.material.update({
        where: { id: item.id },
        data: { materialCode: hexCode(prefix, counter) },
      })
      counter++
    }
    console.log(`    ${category}: assigned codes ${prefix}-00001 … ${prefix}-${(counter - 1).toString(16).toUpperCase().padStart(5, '0')}`)
  }

  // Summary
  const total = await prisma.material.count()
  const byCategory = await prisma.material.groupBy({ by: ['materialCategory'], _count: true, orderBy: { materialCategory: 'asc' } })
  console.log('\n=== Summary ===')
  console.log(`Total materials: ${total}`)
  for (const g of byCategory) {
    console.log(`  ${g.materialCategory}: ${g._count}`)
  }
  console.log('\nDone.')
}

main()
  .catch((e) => { console.error(e); process.exit(1) })
  .finally(() => prisma.$disconnect())
