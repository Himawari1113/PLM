import { NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'

const GEMINI_URL =
  'https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash:generateContent'
const BATCH_SIZE = 10 // reviews per Gemini call
const MAX_BATCHES = 5 // up to 50 reviews per POST request

interface ReviewAnalysis {
  id: string
  summary: string
  tags: string[]
}

function extractJsonArray(text: string): ReviewAnalysis[] | null {
  const fenced = text.match(/```json\s*([\s\S]*?)```/i)
  const raw = fenced ? fenced[1] : text
  const start = raw.indexOf('[')
  const end = raw.lastIndexOf(']')
  if (start === -1 || end === -1 || end <= start) return null
  try {
    return JSON.parse(raw.slice(start, end + 1))
  } catch {
    return null
  }
}

async function analyzeWithGemini(
  apiKey: string,
  reviews: Array<{ id: string; reviewText: string; rating: number }>,
): Promise<ReviewAnalysis[]> {
  const reviewList = reviews
    .map(
      (r, i) =>
        `[${i + 1}] ID: ${r.id}\nRating: ${r.rating}/5\nText: ${r.reviewText}`,
    )
    .join('\n\n')

  const prompt = [
    'You are a product review analyst for a fashion/apparel company.',
    'Analyze each customer review below. For each review:',
    '1. Write a concise English summary (1-2 sentences) of the review content.',
    '2. Assign 1-4 classification tags from this list:',
    '   Quality, Fit, Size, Color, Material, Delivery, Value, Design, Comfort, Durability, Packaging, Smell, Defect, Satisfaction, Disappointment',
    '',
    'Return strict JSON array only (no markdown fences, no explanations):',
    '[{"id":"<review_id>","summary":"<english summary>","tags":["Tag1","Tag2"]}]',
    '',
    '--- REVIEWS ---',
    reviewList,
  ].join('\n')

  const res = await fetch(`${GEMINI_URL}?key=${apiKey}`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      contents: [{ parts: [{ text: prompt }] }],
      generationConfig: {
        temperature: 0.3,
        maxOutputTokens: 4096,
      },
    }),
  })

  if (!res.ok) {
    const err = await res.text()
    console.error('Gemini API error:', res.status, err)
    return []
  }

  const data = await res.json()
  const text =
    data.candidates?.[0]?.content?.parts?.map((p: any) => p.text || '').join('\n') || ''

  const parsed = extractJsonArray(text)
  if (!parsed || !Array.isArray(parsed)) {
    console.error('Failed to parse Gemini response:', text.slice(0, 500))
    return []
  }

  return parsed.filter(
    (item) =>
      item.id && typeof item.summary === 'string' && Array.isArray(item.tags),
  )
}

export async function POST() {
  try {
    const apiKey = process.env.GEMINI_API_KEY
    if (!apiKey) {
      return NextResponse.json(
        { error: 'GEMINI_API_KEY is not configured' },
        { status: 500 },
      )
    }

    // Get unanalyzed reviews (have reviewText but no summaryEn)
    const unanalyzed = await prisma.productReview.findMany({
      where: {
        summaryEn: null,
        reviewText: { not: null },
        NOT: { reviewText: '' },
      },
      select: { id: true, reviewText: true, rating: true },
      take: BATCH_SIZE * MAX_BATCHES,
      orderBy: { publishedAt: 'desc' },
    })

    if (unanalyzed.length === 0) {
      const totalRemaining = await prisma.productReview.count({
        where: { summaryEn: null, reviewText: { not: null }, NOT: { reviewText: '' } },
      })
      return NextResponse.json({ analyzed: 0, remaining: totalRemaining })
    }

    let totalAnalyzed = 0

    // Process in batches
    for (let i = 0; i < unanalyzed.length; i += BATCH_SIZE) {
      const batch = unanalyzed.slice(i, i + BATCH_SIZE)
      const results = await analyzeWithGemini(
        apiKey,
        batch as Array<{ id: string; reviewText: string; rating: number }>,
      )

      // Update each review in DB
      for (const result of results) {
        try {
          await prisma.productReview.update({
            where: { id: result.id },
            data: {
              summaryEn: result.summary,
              tags: result.tags,
            },
          })
          totalAnalyzed++
        } catch (e) {
          console.error(`Failed to update review ${result.id}:`, e)
        }
      }
    }

    const remaining = await prisma.productReview.count({
      where: { summaryEn: null, reviewText: { not: null }, NOT: { reviewText: '' } },
    })

    return NextResponse.json({ analyzed: totalAnalyzed, remaining })
  } catch (error) {
    console.error('POST /api/customer-reviews/analyze failed:', error)
    return NextResponse.json(
      { error: 'Failed to analyze reviews' },
      { status: 500 },
    )
  }
}
