import { NextRequest, NextResponse } from 'next/server'
import { deriveInspectionItems, FIBER_TYPES } from '@/lib/quality-rule-engine'

export async function POST(req: NextRequest) {
    try {
        const body = await req.json()
        const { sampleType, division, subCategory, materials, colors } = body

        // Map inputs to engine spec
        const fiberIds: any[] = []
        const materialsList = Array.isArray(materials) ? materials : []

        console.log('API drafting for materials:', materialsList)

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

        console.log('Detected fiber IDs:', fiberIds.map(f => f.id))

        const category = (division || "").toLowerCase().includes("baby") ? "baby" :
            (subCategory || "").toLowerCase().includes("knit") ? "knit" : "midwear"

        const colorsText = JSON.stringify(colors || "").toLowerCase()
        let colorType: any = 'medium'
        if (colorsText.includes('white') || colorsText.includes('ecru')) colorType = 'white'
        else if (colorsText.includes('black') || colorsText.includes('navy') || colorsText.includes('dark')) colorType = 'dark'

        const spec = {
            category,
            subcategory: subCategory,
            fibers: fiberIds,
            processings: [],
            color: colorType,
            careMethod: 'wash' as const
        }

        const items = deriveInspectionItems(spec)

        // Add standard visual check items
        const visualItems = [
            { category: "Appearance", itemName: "Sewing Specifications", standard: "As per tech pack" },
            { category: "Appearance", itemName: "Defects/Stains/Shading", standard: "No visible defects" },
            { category: "Measurement", itemName: "Main Dimensions", standard: "Within tolerance (e.g. ±1.0cm)" },
            { category: "Labeling", itemName: "Label Content/Attachment", standard: "Attached correctly" },
        ]

        const finalItems = [...items, ...visualItems].map(item => ({
            ...item,
            isAiGenerated: false, // Now deterministic
        }))

        return NextResponse.json({ items: finalItems })
    } catch (error) {
        console.error('Quality draft generation error:', error)
        return NextResponse.json({ error: 'Failed to generate inspection items' }, { status: 500 })
    }
}
