import { NextRequest, NextResponse } from 'next/server'
import { deriveCareSymbols, deriveCareNotes, FIBER_TYPES } from '@/lib/quality-rule-engine'

export async function POST(req: NextRequest) {
    try {
        const body = await req.json()
        const { materials, division, subCategory, colors } = body

        // Map inputs to engine spec
        const fiberIds: any[] = []
        const materialsList = Array.isArray(materials) ? materials : []

        console.log('API care labels for materials:', materialsList)

        FIBER_TYPES.forEach(f => {
            const isMatch = materialsList.some((m: any) => {
                const name = (m.name || m.materialName || "").toLowerCase()
                return name.includes(f.id) || name.includes(f.label.toLowerCase())
            })
            if (isMatch) {
                fiberIds.push(f)
            }
        })

        if (fiberIds.length === 0) {
            console.log('No specific fibers found, falling back to Cotton')
            fiberIds.push(FIBER_TYPES[0])
        }

        console.log('Detected fiber IDs for care labels:', fiberIds.map(f => f.id))

        const category = (division || "").toLowerCase().includes("baby") ? "baby" :
            (subCategory || "").toLowerCase().includes("knit") ? "knit" : "midwear"

        const colorsText = JSON.stringify(colors || "").toLowerCase()
        let colorType: any = 'medium'
        if (colorsText.includes('white') || colorsText.includes('ecru')) colorType = 'white'
        else if (colorsText.includes('black') || colorsText.includes('navy') || colorsText.includes('dark')) colorType = 'dark'

        const spec = {
            category,
            fibers: fiberIds,
            processings: [],
            color: colorType,
            careMethod: 'wash' as const
        }

        const symbols = deriveCareSymbols(spec)
        const notes = deriveCareNotes(spec)

        const finalLabels = [...symbols, ...notes].map(label => ({
            category: label.category,
            symbolCode: label.symbolCode || "TERM",
            symbolName: label.symbolName,
            description: label.description
        }))

        return NextResponse.json({ labels: finalLabels })
    } catch (error) {
        console.error('Care label generation error:', error)
        return NextResponse.json({ error: 'Failed to generate care labels' }, { status: 500 })
    }
}
