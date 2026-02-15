import { NextRequest, NextResponse } from 'next/server'
import sharp from 'sharp'

interface GeminiResponse {
  candidates?: Array<{
    content?: {
      parts?: Array<{ text?: string }>
    }
  }>
}

interface PantoneCandidate {
  code: string
  name: string
  rgb: [number, number, number]
}

const PANTONE_FALLBACK: PantoneCandidate[] = [
  { code: 'PANTONE 11-0601 TCX', name: 'Bright White', rgb: [244, 244, 244] },
  { code: 'PANTONE 19-0303 TCX', name: 'Jet Black', rgb: [37, 40, 42] },
  { code: 'PANTONE 19-4052 TCX', name: 'Classic Blue', rgb: [15, 76, 129] },
  { code: 'PANTONE 18-1664 TCX', name: 'Fiesta', rgb: [196, 58, 50] },
  { code: 'PANTONE 17-1463 TCX', name: 'Tangerine Tango', rgb: [228, 97, 40] },
  { code: 'PANTONE 13-0858 TCX', name: 'Illuminating', rgb: [244, 207, 66] },
  { code: 'PANTONE 17-6153 TCX', name: 'Greenery', rgb: [100, 138, 102] },
  { code: 'PANTONE 18-3838 TCX', name: 'Very Peri', rgb: [96, 78, 151] },
  { code: 'PANTONE 15-3919 TCX', name: 'Serenity', rgb: [178, 180, 195] },
  { code: 'PANTONE 19-1629 TCX', name: 'Marsala', rgb: [96, 56, 58] },
]

function extractJsonObject(
  text: string,
): { pantoneCode?: string; pantoneName?: string; candidates?: Array<{ code?: string; name?: string }> } | null {
  const fenced = text.match(/```json\s*([\s\S]*?)```/i)
  const raw = fenced ? fenced[1] : text
  const start = raw.indexOf('{')
  const end = raw.lastIndexOf('}')
  if (start === -1 || end === -1 || end <= start) return null
  try {
    return JSON.parse(raw.slice(start, end + 1))
  } catch {
    return null
  }
}

function nearestPantoneCandidates(r: number, g: number, b: number): Array<{ code: string; name: string }> {
  return [...PANTONE_FALLBACK]
    .map((candidate) => {
      const [cr, cg, cb] = candidate.rgb
      const dist = (r - cr) ** 2 + (g - cg) ** 2 + (b - cb) ** 2
      return { code: candidate.code, name: candidate.name, dist }
    })
    .sort((a, b2) => a.dist - b2.dist)
    .slice(0, 3)
    .map(({ code, name }) => ({ code, name }))
}

export async function POST(req: NextRequest) {
  const apiKey = process.env.GEMINI_API_KEY
  if (!apiKey) {
    return NextResponse.json({ error: 'GEMINI_API_KEY is not set' }, { status: 500 })
  }

  const body = await req.json()
  const imageBase64 = String(body.imageBase64 || '').trim()
  const mimeType = String(body.mimeType || 'image/jpeg')
  if (!imageBase64) {
    return NextResponse.json({ error: 'imageBase64 is required' }, { status: 400 })
  }

  let squareBuffer: Buffer
  let squareBase64 = ''
  let rgbValue = ''
  let r = 0
  let g = 0
  let b = 0
  try {
    const inputBuffer = Buffer.from(imageBase64, 'base64')
    const image = sharp(inputBuffer)
    const meta = await image.metadata()
    const width = meta.width || 0
    const height = meta.height || 0
    if (!width || !height) {
      return NextResponse.json({ error: 'Invalid image' }, { status: 400 })
    }

    const side = Math.min(width, height)
    const left = Math.floor((width - side) / 2)
    const top = Math.floor((height - side) / 2)

    squareBuffer = await image
      .extract({ left, top, width: side, height: side })
      .resize(512, 512, { fit: 'cover' })
      .jpeg({ quality: 90 })
      .toBuffer()

    const stats = await sharp(squareBuffer).stats()
    const channels = stats.channels
    r = Math.round(channels[0]?.mean || 0)
    g = Math.round(channels[1]?.mean || 0)
    b = Math.round(channels[2]?.mean || 0)
    rgbValue = `RGB(${r}, ${g}, ${b})`
    squareBase64 = squareBuffer.toString('base64')
  } catch {
    return NextResponse.json({ error: 'Failed to process image' }, { status: 400 })
  }

  const prompt = [
    'You are a textile color matching assistant.',
    'Task: estimate the closest Pantone code and Pantone color name for the main color in this image.',
    `Reference average RGB from the same image: ${rgbValue}.`,
    'Rules:',
    '- Focus on the dominant visible color, ignore tiny accents/shadows/highlights.',
    '- If the image appears grayscale/near-neutral, return a neutral Pantone family code.',
    '- Output one best Pantone and also 2 alternatives.',
    '- Prefer practical apparel notation like "PANTONE 19-4052 TCX" (or C if TCX is unclear).',
    '- Do not output explanations.',
    'Return strict JSON only with this schema:',
    '{"pantoneCode":"PANTONE XXXX XXX","pantoneName":"Name","candidates":[{"code":"PANTONE XXXX XXX","name":"Name"},{"code":"...","name":"..."},{"code":"...","name":"..."}]}',
  ].join('\n')

  const geminiRes = await fetch(
    `https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash:generateContent?key=${apiKey}`,
    {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        contents: [
          {
            parts: [
              { text: prompt },
              {
                inlineData: {
                  mimeType: 'image/jpeg',
                  data: squareBase64,
                },
              },
            ],
          },
        ],
      }),
    },
  )

  let pantoneCode = ''
  let pantoneName = ''
  let candidates: Array<{ code: string; name: string }> = []
  let warning = ''
  if (geminiRes.ok) {
    const data = (await geminiRes.json()) as GeminiResponse
    const text = data.candidates?.[0]?.content?.parts?.map((p) => p.text || '').join('\n') || ''
    const parsed = extractJsonObject(text)
    pantoneCode = parsed?.pantoneCode ? String(parsed.pantoneCode).trim() : ''
    pantoneName = parsed?.pantoneName ? String(parsed.pantoneName).trim() : ''
    if (Array.isArray(parsed?.candidates)) {
      candidates = parsed.candidates
        .map((c) => ({ code: String(c.code || '').trim(), name: String(c.name || '').trim() }))
        .filter((c) => c.code)
        .slice(0, 3)
    }
  } else {
    warning = (await geminiRes.text()) || 'Gemini request failed'
  }
  if (!candidates.length) {
    candidates = nearestPantoneCandidates(r, g, b)
  }
  if (!pantoneCode) {
    pantoneCode = candidates[0]?.code || ''
  }
  if (!pantoneName) {
    pantoneName = candidates.find((c) => c.code === pantoneCode)?.name || ''
  }

  return NextResponse.json({
    pantoneCode,
    pantoneName,
    candidates,
    rgbValue,
    normalizedImageBase64: squareBase64,
    normalizedMimeType: 'image/jpeg',
    warning,
  })
}
