
export interface FiberType {
    id: string;
    label: string;
    ironMax: number;
    washTempMax: number;
    weakAlkali: boolean;
    chlorineSensitive: boolean;
}

export const FIBER_TYPES: FiberType[] = [
    { id: "cotton", label: "Cotton", ironMax: 210, washTempMax: 60, weakAlkali: true, chlorineSensitive: false },
    { id: "polyester", label: "Polyester", ironMax: 150, washTempMax: 60, weakAlkali: true, chlorineSensitive: false },
    { id: "nylon", label: "Nylon", ironMax: 150, washTempMax: 40, weakAlkali: false, chlorineSensitive: true },
    { id: "acrylic", label: "Acrylic", ironMax: 150, washTempMax: 40, weakAlkali: false, chlorineSensitive: false },
    { id: "rayon", label: "Rayon", ironMax: 150, washTempMax: 30, weakAlkali: false, chlorineSensitive: false },
    { id: "cupra", label: "Cupra", ironMax: 150, washTempMax: 30, weakAlkali: false, chlorineSensitive: false },
    { id: "acetate", label: "Acetate", ironMax: 110, washTempMax: 30, weakAlkali: false, chlorineSensitive: true },
    { id: "silk", label: "Silk", ironMax: 150, washTempMax: 30, weakAlkali: false, chlorineSensitive: true },
    { id: "wool", label: "Wool", ironMax: 150, washTempMax: 30, weakAlkali: false, chlorineSensitive: true },
    { id: "cashmere", label: "Cashmere", ironMax: 150, washTempMax: 30, weakAlkali: false, chlorineSensitive: true },
    { id: "mohair", label: "Mohair", ironMax: 150, washTempMax: 30, weakAlkali: false, chlorineSensitive: true },
    { id: "angora", label: "Angora", ironMax: 150, washTempMax: 30, weakAlkali: false, chlorineSensitive: true },
    { id: "linen", label: "Linen", ironMax: 210, washTempMax: 40, weakAlkali: true, chlorineSensitive: false },
    { id: "ramie", label: "Ramie", ironMax: 210, washTempMax: 40, weakAlkali: true, chlorineSensitive: false },
    { id: "polyurethane", label: "Polyurethane", ironMax: 110, washTempMax: 40, weakAlkali: false, chlorineSensitive: true },
    { id: "lyocell", label: "Lyocell", ironMax: 150, washTempMax: 40, weakAlkali: false, chlorineSensitive: false },
    { id: "modal", label: "Modal", ironMax: 150, washTempMax: 40, weakAlkali: false, chlorineSensitive: false },
    { id: "down", label: "Down (Fill)", ironMax: 0, washTempMax: 30, weakAlkali: false, chlorineSensitive: true },
];

export interface QualitySpec {
    category: string;
    subcategory?: string;
    fibers: FiberType[];
    processings: string[];
    color: 'white' | 'light' | 'medium' | 'dark' | 'multi';
    careMethod: 'wash' | 'dry_clean' | 'wet_clean' | 'wash_and_dry';
}

export function deriveInspectionItems(spec: QualitySpec) {
    const items: any[] = [];
    const { category, subcategory, fibers, processings, color, careMethod } = spec;
    const fiberIds = fibers.map((f) => f.id);
    const procIds = processings || [];

    const isBaby = category === "baby";
    const isInnerwear = category === "innerwear";
    const isWhite = color === "white";

    const hasSpecialPrint = procIds.some((p) => ["pigment_print", "rubber_print", "transfer_print", "foam_print", "lame"].includes(p));
    const hasCoating = procIds.includes("coating");
    const hasFlock = procIds.includes("flock");
    const hasBonding = procIds.includes("bonding");
    const hasWaterRepellent = procIds.includes("water_repellent");
    const hasLeather = procIds.includes("leather_parts");

    const isWash = careMethod === "wash" || careMethod === "wash_and_dry";
    const isDry = careMethod === "dry_clean" || careMethod === "wash_and_dry";
    const isWet = careMethod === "wet_clean";

    const hasWool = fiberIds.some((f) => ["wool", "cashmere", "mohair", "angora"].includes(f));
    const hasPolyurethane = fiberIds.includes("polyurethane");

    // A. Common Mandatory Items
    items.push({
        category: "Common",
        itemName: "Fiber Composition Test (JIS L 1030)",
        standard: "Within tolerance",
        reason: "Evidence for labeling (Statutory)",
    });

    items.push({
        category: "Common",
        itemName: "Formaldehyde Test (JIS L 1041)",
        standard: isBaby ? "Absorbance A-Ao <= 0.05" : "<= 75μg/g",
        reason: isBaby ? "Infant safety standard" : "General clothing standard",
    });

    items.push({
        category: "Colorfastness",
        itemName: "Colorfastness to Light (JIS L 0842)",
        standard: "Grade 4 or higher",
        reason: "Mandatory for all colors/items",
    });

    // B. Colorfastness for Dyed Items
    if (!isWhite) {
        if (isWash) {
            items.push({
                category: "Colorfastness",
                itemName: "Colorfastness to Washing (JIS L 0844)",
                standard: "Fading Grade 4 / Staining Grade 4 or higher",
                reason: "Water-washable items",
            });
        }
        if (isDry) {
            items.push({
                category: "Colorfastness",
                itemName: "Colorfastness to Dry Cleaning (JIS L 0860)",
                standard: "Fading Grade 4 / Staining Grade 4 or higher",
                reason: "Dry cleanable items",
            });
        }
        if (isInnerwear) {
            items.push({
                category: "Colorfastness",
                itemName: "Colorfastness to Perspiration (JIS L 0848)",
                standard: "Fading Grade 4 / Staining Grade 4 or higher",
                reason: "Mandatory for innerwear",
            });
        }
        items.push({
            category: "Colorfastness",
            itemName: "Colorfastness to Rubbing (JIS L 0849)",
            standard: "Dry Grade 4 / Wet Grade 3 or higher",
            reason: "General dyed items",
        });
    }

    // C. Physical Property Tests
    if (isWash) {
        items.push({
            category: "Physical Testing",
            itemName: "Dimensional Stability (Washing) (JIS L 1930)",
            standard: "Within ±3.0%",
            reason: "Water-washable items",
        });
    }
    if (isDry) {
        items.push({
            category: "Physical Testing",
            itemName: "Dimensional Stability (Dry Cleaning) (JIS L 1096)",
            standard: "Within ±2.0%",
            reason: "Dry cleanable items",
        });
    }

    items.push({
        category: "Physical Testing",
        itemName: "Appearance After Wash",
        standard: "No significant changes",
        reason: "Shape and texture evaluation after wash",
    });

    if (category === "knit" || hasWool || subcategory?.toLowerCase().includes("knit")) {
        items.push({
            category: "Physical Testing",
            itemName: "Pilling Test (JIS L 1076)",
            standard: "Grade 3 or higher",
            reason: "Evaluation of pilling susceptibility",
        });
    }

    // D. Processing Durability
    if (hasSpecialPrint || hasCoating || hasFlock) {
        items.push({
            category: "Durability",
            itemName: "Print/Coating Durability",
            standard: "No peeling or detachment",
            reason: "Special print/processing evaluation",
        });
    }

    if (hasBonding) {
        items.push({
            category: "Durability",
            itemName: "Bonding Peel Strength",
            standard: "1.0N/cm or higher",
            reason: "Adhesion strength evaluation",
        });
    }

    if (hasWaterRepellent) {
        items.push({
            category: "Functional",
            itemName: "Water Repellency Test (JIS L 1092)",
            standard: "Grade 2 or higher",
            reason: "Basis for water-repellent labeling",
        });
    }

    if (hasLeather) {
        items.push({
            category: "Common",
            itemName: "Leather/Synthetic Identification",
            standard: "Matches labeling",
            reason: "Statutory labeling compliance",
        });
    }

    if (hasPolyurethane || fiberIds.includes("nylon")) {
        items.push({
            category: "Colorfastness",
            itemName: "Colorfastness to Chlorinated Water (JIS L 0884)",
            standard: "Grade 4 or higher",
            reason: "Material characteristics",
        });
    }

    return items;
}

export function deriveCareSymbols(spec: QualitySpec) {
    const { fibers, processings, careMethod, color, category } = spec;
    const fiberIds = fibers.map((f) => f.id);
    const procIds = processings || [];

    const hasWool = fiberIds.some((f) => ["wool", "cashmere", "mohair", "angora"].includes(f));
    const hasSilk = fiberIds.includes("silk");
    const hasPolyurethane = fiberIds.includes("polyurethane");
    const hasAcetate = fiberIds.includes("acetate");
    const hasDown = fiberIds.includes("down");

    const isDelicate = hasSilk || hasAcetate || hasWool;
    const hasSpecialPrint = procIds.some((p) => ["pigment_print", "rubber_print", "transfer_print", "foam_print", "lame"].includes(p));

    const isWash = careMethod === "wash" || careMethod === "wash_and_dry";
    const isDry = careMethod === "dry_clean" || careMethod === "wash_and_dry";

    const maxWashTemp = isWash ? Math.min(...fibers.map((f) => f.washTempMax)) : 0;
    const ironTemps = fibers.map((f) => f.ironMax).filter((t) => t > 0);
    const maxIronTemp = ironTemps.length > 0 ? Math.min(...ironTemps) : 0;

    const symbols: any[] = [];

    // 1. Washing
    if (isWash) {
        const mechStrength = isDelicate || hasSpecialPrint || hasDown ? "Very Weak" : hasPolyurethane ? "Weak" : "Normal";
        const handWash = (hasSilk || hasAcetate || hasDown) && maxWashTemp <= 30;
        symbols.push({
            category: "WASHING",
            symbolName: handWash ? `Hand Wash (${maxWashTemp}°C)` : `Machine Wash (${maxWashTemp}°C / ${mechStrength})`,
            symbolCode: handWash ? "F" + maxWashTemp : "W" + maxWashTemp,
            description: mechStrength !== "Normal" ? `Mechanical strength: ${mechStrength}` : null,
        });
    } else {
        symbols.push({ category: "WASHING", symbolName: "Do Not Wash", symbolCode: "WX" });
    }

    // 2. Bleaching
    const chlorineSensitive = fibers.some((f) => f.chlorineSensitive);
    if (chlorineSensitive) {
        symbols.push({ category: "BLEACHING", symbolName: "Do Not Bleach", symbolCode: "BX" });
    } else if (color === "dark" || color === "multi") {
        symbols.push({ category: "BLEACHING", symbolName: "Oxygen Bleach Only", symbolCode: "BO" });
    } else {
        symbols.push({ category: "BLEACHING", symbolName: "Bleachable", symbolCode: "BA" });
    }

    // 3. Tumble Dry
    const noTumble = isDelicate || hasSpecialPrint || hasPolyurethane || hasDown || procIds.includes("bonding") || procIds.includes("pleats");
    if (noTumble) {
        symbols.push({ category: "DRYING", symbolName: "Do Not Tumble Dry", symbolCode: "TX" });
    } else {
        symbols.push({ category: "DRYING", symbolName: "Tumble Dry Low", symbolCode: "TL" });
    }

    // 4. Natural Drying
    const hangOrFlat = hasWool || hasDown || category === "knit" ? "Flat Dry" : "Line Dry";
    const shade = isDelicate || color === "dark" || color === "multi" ? "In Shade" : "In Sun";
    symbols.push({ category: "DRYING", symbolName: `${hangOrFlat} / ${shade}`, symbolCode: hangOrFlat === "Flat Dry" ? "DF" : "DH" });

    // 5. Ironing
    if (maxIronTemp === 0) {
        symbols.push({ category: "IRONING", symbolName: "Do Not Iron", symbolCode: "IX" });
    } else {
        const dots = maxIronTemp >= 200 ? "•••" : maxIronTemp >= 150 ? "••" : "•";
        symbols.push({ category: "IRONING", symbolName: `Iron ${dots} (${maxIronTemp}°C)`, symbolCode: "I" + maxIronTemp });
    }

    // 6. Dry Cleaning
    if (isDry) {
        const solvent = hasAcetate ? "Petroleum Only" : "Normal";
        symbols.push({ category: "DRY_CLEAN_FASTNESS", symbolName: `Dry Clean (${solvent})`, symbolCode: hasAcetate ? "DF" : "DP" });
    } else {
        symbols.push({ category: "DRY_CLEAN_FASTNESS", symbolName: "Do Not Dry Clean", symbolCode: "DX" });
    }

    return symbols;
}

export function deriveCareNotes(spec: QualitySpec) {
    const { fibers, processings, careMethod, color, category } = spec;
    const fiberIds = fibers.map((f) => f.id);
    const procIds = processings || [];
    const notes: any[] = [];

    const hasWool = fiberIds.some((f) => ["wool", "cashmere", "mohair", "angora"].includes(f));
    const hasSilk = fiberIds.includes("silk");
    const hasPolyurethane = fiberIds.includes("polyurethane");
    const hasAcetate = fiberIds.includes("acetate");
    const hasDown = fiberIds.includes("down");
    const hasSpecialPrint = procIds.some((p) => ["pigment_print", "rubber_print", "transfer_print", "foam_print", "lame"].includes(p));
    const isWash = careMethod === "wash" || careMethod === "wash_and_dry";

    if (hasSilk || hasWool || hasAcetate) notes.push({ category: "ADDITIONAL", symbolName: "Use neutral detergent", description: "To protect fibers" });
    if (isWash && (color === "light" || color === "white") && fiberIds.some(f => ["rayon", "cupra", "silk", "wool"].includes(f))) {
        notes.push({ category: "ADDITIONAL", symbolName: "Use non-fluorescent detergent", description: "To prevent fading" });
    }
    if (hasSpecialPrint || hasSilk || procIds.includes("embroidery")) {
        notes.push({ category: "ADDITIONAL", symbolName: "Use laundry net", description: "To protect surface" });
    }
    if (color === "dark" || color === "multi") {
        notes.push({ category: "ADDITIONAL", symbolName: "Wash separately", description: "To prevent color transfer" });
        notes.push({ category: "ADDITIONAL", symbolName: "Do not soak", description: "To prevent color bleeding" });
    }
    if (hasSpecialPrint) notes.push({ category: "ADDITIONAL", symbolName: "Do not iron print", description: "To prevent peeling" });
    if (hasPolyurethane) notes.push({ category: "ADDITIONAL", symbolName: "Vulnerable to aging", description: "Due to material characteristics" });

    return notes;
}

// ── Utility: Map Sample Data to Spec ──

export function mapSampleToSpec(sample: any): QualitySpec {
    const fibers: FiberType[] = [];
    const materialsText = JSON.stringify(sample.sampleMaterials || "").toLowerCase();

    FIBER_TYPES.forEach(f => {
        if (materialsText.includes(f.id) || materialsText.includes(f.label.toLowerCase())) {
            fibers.push(f);
        }
    });

    if (fibers.length === 0) fibers.push(FIBER_TYPES[0]);

    const category = (sample.division || "").toLowerCase().includes("baby") ? "baby" :
        (sample.subCategory || "").toLowerCase().includes("knit") ? "knit" : "midwear";

    const colorsText = JSON.stringify(sample.sampleColors || "").toLowerCase();
    let color: QualitySpec['color'] = 'medium';
    if (colorsText.includes('white')) color = 'white';
    else if (colorsText.includes('black') || colorsText.includes('navy') || colorsText.includes('dark')) color = 'dark';

    return {
        category,
        fibers,
        processings: [],
        color,
        careMethod: 'wash'
    };
}
