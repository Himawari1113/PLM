import { NextRequest, NextResponse } from 'next/server'

const FREEPIK_API_URL = 'https://api.freepik.com/v1/ai/mystic'
const POLL_INTERVAL = 3000 // 3 seconds
const MAX_POLLS = 60 // 180 seconds max (3 minutes)

export async function POST(req: NextRequest) {
  try {
    const apiKey = process.env.FREEPIK_API_KEY
    if (!apiKey) {
      return NextResponse.json({ error: 'FREEPIK_API_KEY is not configured' }, { status: 500 })
    }

    const body = await req.json()
    const { prompt, aspect_ratio, model } = body

    if (!prompt || typeof prompt !== 'string') {
      return NextResponse.json({ error: 'prompt is required' }, { status: 400 })
    }

    // Step 1: Submit generation task
    const createRes = await fetch(FREEPIK_API_URL, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-freepik-api-key': apiKey,
      },
      body: JSON.stringify({
        prompt,
        resolution: '2k',
        aspect_ratio: aspect_ratio || 'square_1_1',
        model: model || 'realism',
        filter_nsfw: true,
      }),
    })

    if (!createRes.ok) {
      const errorData = await createRes.json().catch(() => ({}))
      console.error('Freepik API create error:', createRes.status, errorData)
      return NextResponse.json(
        { error: `Freepik API error: ${createRes.status}`, details: errorData },
        { status: createRes.status },
      )
    }

    const createData = await createRes.json()
    const taskId = createData.data?.task_id

    if (!taskId) {
      // If the response already contains generated images, return directly
      if (createData.data?.generated?.length > 0) {
        console.log('Images generated immediately:', createData.data.generated)
        return NextResponse.json(createData)
      }
      console.error('No task_id in response:', createData)
      return NextResponse.json({ error: 'No task_id returned from Freepik' }, { status: 500 })
    }

    console.log(`Task created with ID: ${taskId}, starting to poll...`)

    // Step 2: Poll for completion
    for (let i = 0; i < MAX_POLLS; i++) {
      await new Promise((resolve) => setTimeout(resolve, POLL_INTERVAL))

      const pollRes = await fetch(`${FREEPIK_API_URL}/${taskId}`, {
        method: 'GET',
        headers: {
          'x-freepik-api-key': apiKey,
        },
      })

      if (!pollRes.ok) {
        console.error(`Poll #${i + 1} error:`, pollRes.status)
        continue
      }

      const pollData = await pollRes.json()
      const status = pollData.data?.status

      console.log(`Poll #${i + 1}: status = ${status}`)

      if (status === 'COMPLETED') {
        console.log('Generation completed successfully:', pollData.data?.generated?.length, 'images')
        return NextResponse.json(pollData)
      }

      if (status === 'FAILED') {
        console.error('Generation failed:', pollData.data)
        return NextResponse.json(
          { error: 'Image generation failed', details: pollData.data },
          { status: 500 },
        )
      }

      // CREATED or IN_PROGRESS - continue polling
    }

    console.error(`Timeout after ${MAX_POLLS} polls (${(MAX_POLLS * POLL_INTERVAL) / 1000}s)`)
    return NextResponse.json(
      { error: `Generation timed out after ${(MAX_POLLS * POLL_INTERVAL) / 1000} seconds. The task may still be processing. Please try again later.` },
      { status: 504 },
    )
  } catch (error) {
    console.error('Generate design error:', error)
    return NextResponse.json({ error: 'Failed to generate design' }, { status: 500 })
  }
}
