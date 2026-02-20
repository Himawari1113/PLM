const { PrismaClient } = require('@prisma/client')
const prisma = new PrismaClient()

async function main() {
  // Find all samples with old sizeSpec format
  const samples = await prisma.sample.findMany({
    where: {
      sizeSpec: {
        contains: 'Size set:'
      }
    },
    select: {
      id: true,
      sampleNumber: true,
      division: true,
      subCategory: true,
      sizeSpec: true
    }
  })

  console.log(`Found ${samples.length} samples with old sizeSpec format`)

  // For each sample, find the matching SizeGroup and update
  let updated = 0
  let notFound = 0

  for (const sample of samples) {
    if (!sample.division || !sample.subCategory) {
      console.log(`SKIP ${sample.sampleNumber}: missing division or subCategory`)
      notFound++
      continue
    }

    // Find matching size group
    const sizeGroup = await prisma.sizeGroup.findFirst({
      where: {
        division: {
          name: sample.division
        },
        subCategory: sample.subCategory
      },
      select: {
        name: true
      }
    })

    if (sizeGroup) {
      await prisma.sample.update({
        where: { id: sample.id },
        data: { sizeSpec: sizeGroup.name }
      })
      console.log(`✓ ${sample.sampleNumber}: ${sample.division} ${sample.subCategory} -> ${sizeGroup.name}`)
      updated++
    } else {
      console.log(`✗ ${sample.sampleNumber}: No size group found for ${sample.division} ${sample.subCategory}`)
      notFound++
    }
  }

  console.log(`\nSummary:`)
  console.log(`  Updated: ${updated}`)
  console.log(`  Not found: ${notFound}`)
  console.log(`  Total: ${samples.length}`)
}

main()
  .catch(console.error)
  .finally(() => prisma.$disconnect())
