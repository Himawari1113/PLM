/**
 * Pantone Color Import Script
 * - Source: pantone-colors npm package (MIT license, community approximations)
 * - CMYK: converted from RGB (not official Pantone press values)
 * - colorTemperature: classified from HSL hue
 * - Existing colors (matched by pantoneCode) are SKIPPED
 */

import { createRequire } from 'module'
import { PrismaClient } from '@prisma/client'

const require = createRequire(import.meta.url)
const pantoneColors = require('pantone-colors').default

const prisma = new PrismaClient()

// ── Colour math helpers ────────────────────────────────────────────────────

/** hex "#rrggbb" → { r, g, b } (0-255) */
function hexToRgb(hex) {
  const h = hex.replace('#', '')
  return {
    r: parseInt(h.substring(0, 2), 16),
    g: parseInt(h.substring(2, 4), 16),
    b: parseInt(h.substring(4, 6), 16),
  }
}

/** { r, g, b } (0-255) → { c, m, y, k } (0-100 integers) */
function rgbToCmyk({ r, g, b }) {
  const rn = r / 255
  const gn = g / 255
  const bn = b / 255
  const k = 1 - Math.max(rn, gn, bn)
  if (k === 1) return { c: 0, m: 0, y: 0, k: 100 }
  const c = (1 - rn - k) / (1 - k)
  const m = (1 - gn - k) / (1 - k)
  const y = (1 - bn - k) / (1 - k)
  return {
    c: Math.round(c * 100),
    m: Math.round(m * 100),
    y: Math.round(y * 100),
    k: Math.round(k * 100),
  }
}

/** { r, g, b } (0-255) → hue degrees (0-360), saturation %, lightness % */
function rgbToHsl({ r, g, b }) {
  const rn = r / 255, gn = g / 255, bn = b / 255
  const max = Math.max(rn, gn, bn)
  const min = Math.min(rn, gn, bn)
  const l = (max + min) / 2
  if (max === min) return { h: 0, s: 0, l: Math.round(l * 100) }
  const d = max - min
  const s = l > 0.5 ? d / (2 - max - min) : d / (max + min)
  let h
  switch (max) {
    case rn: h = ((gn - bn) / d + (gn < bn ? 6 : 0)) / 6; break
    case gn: h = ((bn - rn) / d + 2) / 6; break
    default: h = ((rn - gn) / d + 4) / 6; break
  }
  return { h: Math.round(h * 360), s: Math.round(s * 100), l: Math.round(l * 100) }
}

/**
 * Classify temperature:
 *   NEUTRAL  – very low saturation (achromatic / near-neutral)
 *   WARM     – reds, oranges, yellows  (hue 0-60 or 330-360)
 *   COOL     – greens, blues, purples  (hue 60-330, excluding warm)
 */
function classifyTemperature({ h, s }) {
  if (s < 15) return 'NEUTRAL'
  if (h <= 60 || h >= 330) return 'WARM'
  return 'COOL'
}

/** Upper-case first letter, rest lower (e.g. "WARM RED" → "Warm Red") */
function titleCase(str) {
  return str.replace(/\w\S*/g, (w) => w.charAt(0).toUpperCase() + w.slice(1).toLowerCase())
}

// ── Main ──────────────────────────────────────────────────────────────────

async function main() {
  const entries = Object.entries(pantoneColors)
  console.log(`Total Pantone entries in dataset: ${entries.length}`)

  // Fetch all existing pantone codes so we can skip them
  const existing = await prisma.color.findMany({ select: { pantoneCode: true } })
  const existingCodes = new Set(existing.map((c) => c.pantoneCode).filter(Boolean))
  console.log(`Existing colors with pantoneCode in DB: ${existingCodes.size}`)

  let inserted = 0
  let skipped = 0

  for (const [code, hex] of entries) {
    // Skip if already registered
    if (existingCodes.has(code)) {
      skipped++
      continue
    }

    const rgb = hexToRgb(hex)
    const cmyk = rgbToCmyk(rgb)
    const hsl = rgbToHsl(rgb)
    const temperature = classifyTemperature(hsl)

    // colorCode = "PMS-<code>", colorName = "Pantone <code>"
    const colorCode = `PMS-${code}`
    const colorName = `Pantone ${code}`
    const rgbValue = `rgb(${rgb.r}, ${rgb.g}, ${rgb.b})`

    try {
      await prisma.color.create({
        data: {
          colorCode,
          colorName,
          pantoneCode: code,
          pantoneName: `Pantone ${code}`,
          rgbValue,
          colorType: 'SOLID',
          cmykC: cmyk.c,
          cmykM: cmyk.m,
          cmykY: cmyk.y,
          cmykK: cmyk.k,
          colorTemperature: temperature,
        },
      })
      inserted++
    } catch (err) {
      console.error(`  Failed to insert ${code}:`, err.message)
    }
  }

  console.log(`\nDone. Inserted: ${inserted}, Skipped (already existed): ${skipped}`)
}

main()
  .catch((e) => { console.error(e); process.exit(1) })
  .finally(() => prisma.$disconnect())
