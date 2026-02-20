'use client'

import { useEffect, useMemo, useState } from 'react'
import dynamic from 'next/dynamic'
import { ArrowLeft, Box, Factory, FileText, FlaskConical, ImagePlus, Palette, Plus, Scissors, Sparkles, Trash2 } from 'lucide-react'
import { useTranslations } from 'next-intl'
import { Link, useRouter } from '@/lib/navigation'
import { SAMPLE_TYPE_LABELS } from '@/lib/constants'
import { BpPageHeader } from '@/components/common'

const Clo3dViewer = dynamic(
  () => import('@/components/viewer3d/Clo3dViewer').then((mod) => mod.Clo3dViewer),
  { ssr: false, loading: () => <div style={{ height: 400, display: 'flex', alignItems: 'center', justifyContent: 'center' }}><div className="bp-spinner" /></div> },
)

interface NewSampleFormProps {
  submitUrl: string
  backHref: string
  fixedProductId?: string
  sampleId?: string
  submitMethod?: 'POST' | 'PUT'
}

interface ProductOption {
  id: string
  styleNumber: string
  name: string
  category: string
  divisionId?: number | null
  division?: { name: string } | null
  collection?: {
    season?: {
      year?: number
      term?: string
    } | null
  } | null
}

interface ColorOption {
  id: string
  colorCode: string
  colorName: string
  pantoneCode?: string | null
  rgbValue?: string | null
  colorImage?: string | null
}

interface SupplierOption {
  id: string
  name: string
}

interface DivisionOption {
  id: number
  name: string
}

interface SizeMasterOption {
  id: string
  sizeGroupId: string
  sizeCode: string
  sizeName: string
}

interface MeasurementRow {
  part: string
  size: string
  sizeMasterId?: string
  value: string
}

interface MaterialInput {
  materialMasterId?: string
  materialCode: string
  materialName: string
  costPerUnit: string
  fabricSupplier: string
  unit?: string
  consumption?: string
}

interface MaterialMasterOption {
  id: string
  name: string
  type: string
  materialCategory?: string | null
  unitPrice?: number | null
  composition?: string | null
}

const SAMPLE_STATUS_UI = ['REGISTERED', 'APPROVED', 'DROPPED'] as const

const DEFAULT_PARTS_BY_CATEGORY: Record<string, string[]> = {
  TOPS: ['Body Length', 'Chest', 'Shoulder Width', 'Sleeve Length'],
  BOTTOMS: ['Waist', 'Hip', 'Inseam', 'Hem Width'],
  OUTERWEAR: ['Body Length', 'Chest', 'Shoulder Width', 'Sleeve Length'],
  DRESSES: ['Body Length', 'Bust', 'Waist', 'Hip'],
  KNITWEAR: ['Body Length', 'Chest', 'Sleeve Length'],
  OTHER: ['Length', 'Width'],
}

function normalizeToken(value?: string | null) {
  return String(value || '')
    .toLowerCase()
    .replace(/[^a-z0-9]/g, '')
}

function toDataUrl(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader()
    reader.onload = () => resolve(String(reader.result || ''))
    reader.onerror = reject
    reader.readAsDataURL(file)
  })
}

export function NewSampleForm({
  submitUrl,
  backHref,
  fixedProductId,
  sampleId,
  submitMethod = 'POST',
}: NewSampleFormProps) {
  const router = useRouter()
  const t = useTranslations('samples')
  const tCommon = useTranslations('common')
  const tConstants = useTranslations('constants')
  const isDetail = submitMethod === 'PUT'

  const [products, setProducts] = useState<ProductOption[]>([])
  const [colors, setColors] = useState<ColorOption[]>([])
  const [suppliers, setSuppliers] = useState<SupplierOption[]>([])
  const [divisions, setDivisions] = useState<DivisionOption[]>([])
  const [mainFabricMasters, setMainFabricMasters] = useState<MaterialMasterOption[]>([])
  const [subFabricMasters, setSubFabricMasters] = useState<MaterialMasterOption[]>([])
  const [subMaterialMasters, setSubMaterialMasters] = useState<MaterialMasterOption[]>([])
  const [sizeMasters, setSizeMasters] = useState<SizeMasterOption[]>([])
  const [submitting, setSubmitting] = useState(false)
  const [loadingSample, setLoadingSample] = useState(false)

  const [productId, setProductId] = useState(fixedProductId || '')
  const [productInput, setProductInput] = useState('')
  const [year, setYear] = useState(String(new Date().getFullYear()))
  const [seasonTerm, setSeasonTerm] = useState<'SS' | 'FW'>('SS')
  const [sampleNumberDisplay, setSampleNumberDisplay] = useState('')
  const [sampleNameEn, setSampleNameEn] = useState('')
  const [sampleType, setSampleType] = useState('PROTO')
  const [statusUi, setStatusUi] = useState<(typeof SAMPLE_STATUS_UI)[number]>('REGISTERED')
  const [division, setDivision] = useState('')
  const [subCategory, setSubCategory] = useState('')
  const [imageDataUrl, setImageDataUrl] = useState('')
  const [imageFileName, setImageFileName] = useState('')
  const [illustratorDataUrl, setIllustratorDataUrl] = useState('')
  const [illustratorFileName, setIllustratorFileName] = useState('')

  // AI Design Generation
  const [aiPrompt, setAiPrompt] = useState('')
  const [aiGenerating, setAiGenerating] = useState(false)
  const [aiImages, setAiImages] = useState<string[]>([])
  const [aiError, setAiError] = useState('')
  const [aiModel, setAiModel] = useState('realism')

  const handleGenerateDesign = async () => {
    if (!aiPrompt.trim()) return
    setAiGenerating(true)
    setAiError('')
    setAiImages([])
    try {
      const res = await fetch('/api/ai/generate-design', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          prompt: aiPrompt,
          aspect_ratio: 'square_1_1',
          model: aiModel,
        }),
      })
      const data = await res.json()
      if (!res.ok) {
        const errorMsg = data.error || 'Failed to generate'
        console.error('AI generation error:', errorMsg, data)
        setAiError(errorMsg)
        return
      }
      if (data.data?.generated && data.data.generated.length > 0) {
        console.log('Generated images:', data.data.generated.length)
        setAiImages(data.data.generated)
      } else {
        console.error('No images in response:', data)
        setAiError('No images generated')
      }
    } catch (err) {
      console.error('Network error:', err)
      setAiError('Network error')
    } finally {
      setAiGenerating(false)
    }
  }

  const applyAiImageAsSample = async (url: string) => {
    try {
      // Download the image and convert to Base64
      const response = await fetch(url)
      const blob = await response.blob()
      const reader = new FileReader()
      reader.onloadend = () => {
        setImageDataUrl(reader.result as string)
        setImageFileName('ai-generated.png')
      }
      reader.readAsDataURL(blob)
    } catch (err) {
      console.error('Failed to download AI image:', err)
      // Fallback: use the URL directly
      setImageDataUrl(url)
      setImageFileName('ai-generated.png')
    }
  }

  const [colorRows, setColorRows] = useState<Array<{ colorId: string; status: string }>>([{ colorId: '', status: 'IN_PROGRESS' }])
  const [sizeInfo, setSizeInfo] = useState('')
  const [sizeMeasurements, setSizeMeasurements] = useState<MeasurementRow[]>([])
  const [patternCadDataUrl, setPatternCadDataUrl] = useState('')
  const [patternCadFileName, setPatternCadFileName] = useState('')
  const [clo3dDataUrl, setClo3dDataUrl] = useState('')
  const [clo3dPreviewUrl, setClo3dPreviewUrl] = useState('')
  const [clo3dFileName, setClo3dFileName] = useState('')

  const [supplierId, setSupplierId] = useState('')
  const [mainFactoryCode, setMainFactoryCode] = useState('')
  const [originCountry, setOriginCountry] = useState('')

  const [mainFabric, setMainFabric] = useState<MaterialInput>({
    materialMasterId: '',
    materialCode: '',
    materialName: '',
    costPerUnit: '',
    fabricSupplier: '',
  })
  const [subFabrics, setSubFabrics] = useState<MaterialInput[]>([])
  const [subMaterials, setSubMaterials] = useState<MaterialInput[]>([])
  const [remark, setRemark] = useState('')

  // Cost section state
  const [costingType, setCostingType] = useState('')
  const [costStatus, setCostStatus] = useState('')
  const [fcrDate, setFcrDate] = useState('')
  const [poDeadline, setPoDeadline] = useState('')
  const [labor, setLabor] = useState('')
  const [fob, setFob] = useState('')
  const [euroDuty, setEuroDuty] = useState('')
  const [finalDuty, setFinalDuty] = useState('')
  const [freightCost, setFreightCost] = useState('')
  const [certification, setCertification] = useState('')
  const [commission, setCommission] = useState('')
  const [defectCost, setDefectCost] = useState('')
  const [ldpUsd, setLdpUsd] = useState('')
  const [ldpRum, setLdpRum] = useState('')

  // Comments
  const [comments, setComments] = useState<Array<{id: string, userId: string, userName: string, comment: string, createdAt: string}>>([])
  const [newComment, setNewComment] = useState('')
  const [submittingComment, setSubmittingComment] = useState(false)
  const [commentsCollapsed, setCommentsCollapsed] = useState(false)
  const [commentsSidebarTop, setCommentsSidebarTop] = useState(141)

  useEffect(() => {
    fetch('/api/products').then((r) => r.json()).then((data) => setProducts(Array.isArray(data) ? data : []))
    fetch('/api/colors').then((r) => r.json()).then((data) => setColors(Array.isArray(data) ? data : []))
    fetch('/api/suppliers').then((r) => r.json()).then((data) => setSuppliers(Array.isArray(data) ? data : []))
    fetch('/api/divisions').then((r) => r.json()).then((data) => setDivisions(Array.isArray(data) ? data : []))
    fetch('/api/materials?materialCategory=MAIN_FABRIC').then((r) => r.json()).then((d) => setMainFabricMasters(Array.isArray(d) ? d : []))
    fetch('/api/materials?materialCategory=SUB_FABRIC').then((r) => r.json()).then((d) => setSubFabricMasters(Array.isArray(d) ? d : []))
    fetch('/api/materials?materialCategory=SUB_MATERIAL').then((r) => r.json()).then((d) => setSubMaterialMasters(Array.isArray(d) ? d : []))
  }, [])

  useEffect(() => {
    if (!fixedProductId) return
    const current = products.find((item) => item.id === fixedProductId)
    if (!current) return
    setProductId(current.id)
    setProductInput(`${current.styleNumber} - ${current.name}`)
  }, [fixedProductId, products])

  useEffect(() => {
    if (!sampleId) return
    setLoadingSample(true)
    fetch(`/api/samples/${sampleId}`)
      .then((r) => r.json())
      .then((data) => {
        setProductId(data.productId || '')
        if (data.product) setProductInput(`${data.product.styleNumber} - ${data.product.name}`)
        setYear(String(data.year || new Date().getFullYear()))
        setSeasonTerm(data.season?.seasonName === 'FW' ? 'FW' : 'SS')
        setSampleNumberDisplay(data.sampleNumber || '')
        setSampleNameEn(data.sampleName || '')
        setSampleType(data.sampleType || 'PROTO')
        setStatusUi(data.status === 'APPROVED' ? 'APPROVED' : data.status === 'REJECTED' ? 'DROPPED' : 'REGISTERED')
        setDivision(data.division || '')
        setSubCategory(data.subCategory || '')
        setImageDataUrl(data.imageUrl || '')
        setIllustratorDataUrl(data.illustratorFile || '')
        setPatternCadDataUrl(data.patternCadFile || '')
        setClo3dDataUrl(data.clo3dFile || '')
        setClo3dPreviewUrl(data.clo3dFile || '')
        setClo3dFileName(data.clo3dFileName || '')
        setSizeInfo(data.sizeSpec || '')
        setSupplierId(data.supplierId || '')
        setMainFactoryCode(data.mainFactoryCode || '')
        setOriginCountry(data.shippingDestination || '')
        setRemark(data.remarks || '')
        setColorRows(Array.isArray(data.sampleColors) && data.sampleColors.length > 0 ? data.sampleColors.map((x: any) => ({ colorId: x.colorId, status: x.status || 'IN_PROGRESS' })) : [{ colorId: '', status: 'IN_PROGRESS' }])
        setSizeMeasurements(Array.isArray(data.sizeMeasurements) ? data.sizeMeasurements.map((x: any) => ({ part: x.part || '', size: x.sizeCode || '', value: x.value || '', sizeMasterId: x.sizeMasterId || '' })) : [])

        const main = Array.isArray(data.sampleMaterials) ? data.sampleMaterials.find((x: any) => x.kind === 'MAIN_FABRIC') : null
        if (main) {
          setMainFabric({
            materialMasterId: '',
            materialCode: main.materialCode || '',
            materialName: main.materialName || '',
            costPerUnit: main.costPerUnit != null ? String(main.costPerUnit) : '',
            fabricSupplier: main.fabricSupplier || '',
          })
        }
        setSubFabrics(Array.isArray(data.sampleMaterials) ? data.sampleMaterials.filter((x: any) => x.kind === 'SUB_FABRIC').map((x: any) => ({ materialMasterId: '', materialCode: x.materialCode || '', materialName: x.materialName || '', costPerUnit: x.costPerUnit != null ? String(x.costPerUnit) : '', fabricSupplier: x.fabricSupplier || '' })) : [])
        setSubMaterials(Array.isArray(data.sampleMaterials) ? data.sampleMaterials.filter((x: any) => x.kind === 'SUB_MATERIAL').map((x: any) => ({ materialMasterId: '', materialCode: x.materialCode || '', materialName: x.materialName || '', costPerUnit: x.costPerUnit != null ? String(x.costPerUnit) : '', fabricSupplier: x.fabricSupplier || '' })) : [])
      })
      .finally(() => setLoadingSample(false))
  }, [sampleId])

  // Fetch comments
  useEffect(() => {
    if (!sampleId) return
    fetch(`/api/samples/${sampleId}/comments`)
      .then((r) => r.json())
      .then((data) => setComments(Array.isArray(data) ? data : []))
      .catch((err) => console.error('Failed to fetch comments:', err))
  }, [sampleId])

  const handleSubmitComment = async () => {
    if (!newComment.trim() || !sampleId) return
    setSubmittingComment(true)
    try {
      const res = await fetch(`/api/samples/${sampleId}/comments`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          userId: 'current-user',
          userName: 'Admin User',
          comment: newComment
        })
      })
      if (res.ok) {
        const newCommentData = await res.json()
        setComments((prev) => [...prev, newCommentData])
        setNewComment('')
      }
    } catch (err) {
      console.error('Failed to submit comment:', err)
    } finally {
      setSubmittingComment(false)
    }
  }

  // Handle scroll for sticky comments sidebar
  useEffect(() => {
    if (!isDetail) return
    
    const handleScroll = () => {
      const scrollTop = window.scrollY || document.documentElement.scrollTop
      // Start at 141px and move less than scroll amount (30% of scroll)
      const baseTop = 141
      const movementFactor = 0.3
      const newTop = Math.max(80, baseTop - (scrollTop * movementFactor))
      setCommentsSidebarTop(newTop)
    }

    window.addEventListener('scroll', handleScroll, { passive: true })
    return () => window.removeEventListener('scroll', handleScroll)
  }, [isDetail])

  // Fetch size groups filtered by division AND subCategory
  const [sizeGroups, setSizeGroups] = useState<Array<{ id: string; name: string }>>([])
  useEffect(() => {
    if (!division || !subCategory) {
      setSizeGroups([])
      return
    }
    const q = new URLSearchParams()
    q.set('divisionName', division)
    q.set('subCategory', subCategory)
    fetch(`/api/size-groups?${q.toString()}`).then((r) => r.json()).then((data) => {
      setSizeGroups(Array.isArray(data) ? data.map((g: any) => ({ id: g.id, name: g.name })) : [])
    })
  }, [division, subCategory, divisions.length])

  // Fetch sizes for the selected size group
  useEffect(() => {
    if (!sizeInfo) {
      setSizeMasters([])
      return
    }
    const sg = sizeGroups.find((g) => g.name === sizeInfo)
    if (!sg) { setSizeMasters([]); return }
    fetch(`/api/size-masters?sizeGroupId=${sg.id}`)
      .then((r) => r.json())
      .then((data) => setSizeMasters(Array.isArray(data) ? data : []))
  }, [sizeInfo, sizeGroups])

  // Auto-match existing material names to master IDs on data load
  useEffect(() => {
    if (mainFabricMasters.length === 0) return
    setMainFabric((prev) => {
      if (prev.materialMasterId || !prev.materialName) return prev
      const matched = mainFabricMasters.find((m) => m.name === prev.materialName)
      return matched ? { ...prev, materialMasterId: matched.id } : prev
    })
  }, [mainFabricMasters])

  useEffect(() => {
    if (subFabricMasters.length === 0) return
    setSubFabrics((prev) =>
      prev.map((item) => {
        if (item.materialMasterId || !item.materialName) return item
        const matched = subFabricMasters.find((m) => m.name === item.materialName)
        return matched ? { ...item, materialMasterId: matched.id } : item
      }),
    )
  }, [subFabricMasters])

  useEffect(() => {
    if (subMaterialMasters.length === 0) return
    setSubMaterials((prev) =>
      prev.map((item) => {
        if (item.materialMasterId || !item.materialName) return item
        const matched = subMaterialMasters.find((m) => m.name === item.materialName)
        return matched ? { ...item, materialMasterId: matched.id } : item
      }),
    )
  }, [subMaterialMasters])

  // Helper: fuzzy search filter for material masters
  const filterMaterials = (masters: MaterialMasterOption[], query: string) => {
    if (!query.trim()) return masters.slice(0, 30)
    const q = query.toLowerCase()
    return masters.filter((m) => m.name.toLowerCase().includes(q) || (m.composition || '').toLowerCase().includes(q)).slice(0, 30)
  }

  const selectedProduct = useMemo(() => products.find((x) => x.id === productId), [products, productId])
  const selectedSupplier = suppliers.find((x) => x.id === supplierId)

  const sizeGroupOptions = sizeGroups

  const sizeOptions = useMemo(() => {
    return sizeMasters.map((x) => x.sizeCode)
  }, [sizeMasters])

  const subCategoryOptions = useMemo(() => {
    const divisionKey = normalizeToken(division)
    const base = divisionKey
      ? products.filter((item) => normalizeToken(item.division?.name) === divisionKey)
      : products
    return Array.from(new Set(base.map((item) => item.category).filter(Boolean))).sort()
  }, [products, division])

  const sizePatternOptions = sizeGroupOptions

  useEffect(() => {
    if (!selectedProduct || sizeMeasurements.length > 0 || sizeOptions.length === 0) return
    const points = DEFAULT_PARTS_BY_CATEGORY[selectedProduct.category] || DEFAULT_PARTS_BY_CATEGORY.OTHER
    const baseSizes = sizeOptions.slice(0, Math.min(sizeOptions.length, 3))
    const rows: MeasurementRow[] = []
    points.forEach((part) => {
      baseSizes.forEach((size) => {
        const master = sizeMasters.find((x) => x.sizeCode === size)
        rows.push({ part, size, value: '', sizeMasterId: master?.id || '' })
      })
    })
    setSizeMeasurements(rows)
  }, [selectedProduct, sizeMeasurements.length, sizeOptions, sizeMasters])

  const contextFilteredProducts = useMemo(() => {
    const yearNumber = Number(year)
    const hasYear = Number.isFinite(yearNumber)
    const season = seasonTerm?.toUpperCase()
    const divisionKey = normalizeToken(division)
    const subCategoryKey = String(subCategory || '').toLowerCase()

    return products.filter((item) => {
      const divisionMatch = !divisionKey || normalizeToken(item.division?.name) === divisionKey
      const categoryMatch = !subCategoryKey || String(item.category || '').toLowerCase() === subCategoryKey
      const itemSeason = item.collection?.season
      const yearMatch = !hasYear || itemSeason?.year === yearNumber
      const termMatch = !season || String(itemSeason?.seasonName || '').toUpperCase() === season
      return divisionMatch && categoryMatch && yearMatch && termMatch
    })
  }, [products, division, subCategory, year, seasonTerm])

  const suggestedProducts = useMemo(() => {
    const q = sampleNameEn.trim().toLowerCase()
    if (!q) return contextFilteredProducts.slice(0, 20)
    return contextFilteredProducts.filter((x) => `${x.name} ${x.styleNumber}`.toLowerCase().includes(q)).slice(0, 20)
  }, [contextFilteredProducts, sampleNameEn])

  useEffect(() => {
    if (fixedProductId) return
    const exact = contextFilteredProducts.find((x) => `${x.styleNumber} - ${x.name}` === productInput)
    if (exact) setProductId(exact.id)
  }, [productInput, contextFilteredProducts, fixedProductId])

  const measurementPoints = useMemo(
    () => Array.from(new Set(sizeMeasurements.map((x) => x.part).filter(Boolean))),
    [sizeMeasurements],
  )

  const getMeasurementValue = (part: string, size: string) =>
    sizeMeasurements.find((x) => x.part === part && x.size === size)?.value || ''

  const setMeasurementCell = (part: string, size: string, value: string) => {
    const master = sizeMasters.find((x) => x.sizeCode === size)
    setSizeMeasurements((prev) => {
      const idx = prev.findIndex((x) => x.part === part && x.size === size)
      if (idx >= 0) {
        const next = [...prev]
        next[idx] = { ...next[idx], value }
        return next
      }
      return [...prev, { part, size, value, sizeMasterId: master?.id || '' }]
    })
  }

  const addMeasurementPoint = () => {
    const part = `Point ${measurementPoints.length + 1}`
    const cols = sizeOptions.length > 0 ? sizeOptions : ['M']
    setSizeMeasurements((prev) => [
      ...prev,
      ...cols.map((size) => {
        const master = sizeMasters.find((x) => x.sizeCode === size)
        return { part, size, value: '', sizeMasterId: master?.id || '' }
      }),
    ])
  }

  const removeMeasurementPoint = (part: string) => {
    setSizeMeasurements((prev) => prev.filter((x) => x.part !== part))
  }

  const handleFile = async (file: File | null, setName: (v: string) => void, setData: (v: string) => void) => {
    if (!file) {
      setName('')
      setData('')
      return
    }
    setName(file.name)
    setData(await toDataUrl(file))
  }

  const handleSubmit = async (event: React.FormEvent) => {
    event.preventDefault()
    const payload = {
      productId,
      newSampleData: {
        sampleInfo: {
          year,
          seasonTerm,
          sampleNameEn,
          sampleType,
          statusUi,
          division,
          subCategory,
          productOverride: productInput || '',
          imageFileName,
          imageDataUrl,
          illustratorFileName,
          illustratorDataUrl,
        },
        specInfo: {
          colors: colorRows.filter((x) => x.colorId),
          sizeInfo,
          sizeMeasurements,
          patternCadFileName,
          patternCadDataUrl,
          clo3dFileName,
          clo3dDataUrl,
        },
        productionInfo: {
          supplierId,
          supplierName: selectedSupplier?.name || '',
          mainFactoryCode,
          originCountry,
        },
        materials: { mainFabric, subFabrics, subMaterials },
        others: { remark },
      },
    }
    setSubmitting(true)
    const res = await fetch(submitUrl, {
      method: submitMethod,
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload),
    })
    setSubmitting(false)
    if (!res.ok) return
    const sample = await res.json()
    router.push(`/samples/${sample.id}`)
  }

  if (loadingSample) return <div className="bp-spinner-wrap"><div className="bp-spinner" /></div>

  // Check completion status for each section
  const sectionStatus = {
    sampleInfo: !!(productId && year && seasonTerm && division && subCategory),
    color: colorRows.some(row => row.colorId),
    specInfo: !!(sizeInfo && sizeMeasurements.length > 0),
    productionInfo: !!(supplierId && mainFactoryCode && originCountry),
    billOfMaterials: !!(mainFabric.materialCode || mainFabric.materialName),
    cost: !!(costingType && costStatus && (labor || fob || mainFabric.costPerUnit))
  }

  const progressChart = isDetail ? (
    <div style={{ 
      display: 'flex', 
      gap: 12,
      alignItems: 'center',
      marginLeft: 'auto',
      alignSelf: 'flex-start'
    }}>
      {[
        { key: 'sampleInfo', label: 'Smpl', status: sectionStatus.sampleInfo },
        { key: 'color', label: 'Color', status: sectionStatus.color },
        { key: 'specInfo', label: 'Spec', status: sectionStatus.specInfo },
        { key: 'productionInfo', label: 'Supplier', status: sectionStatus.productionInfo },
        { key: 'billOfMaterials', label: 'BOM', status: sectionStatus.billOfMaterials },
        { key: 'cost', label: 'Cost', status: sectionStatus.cost }
      ].map((section) => (
        <div 
          key={section.key} 
          style={{
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            gap: 4
          }}
        >
          <div style={{
            width: 20,
            height: 20,
            borderRadius: 4,
            backgroundColor: section.status ? 'var(--color-success)' : 'var(--color-bg)',
            border: `2px solid ${section.status ? 'var(--color-success)' : 'var(--color-border)'}`,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            flexShrink: 0
          }}>
            {section.status && (
              <svg width="12" height="12" viewBox="0 0 16 16" fill="none">
                <path d="M3 8L7 12L13 4" stroke="white" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"/>
              </svg>
            )}
          </div>
          <span style={{
            fontSize: 10,
            fontWeight: 500,
            color: section.status ? 'var(--color-success)' : 'var(--color-text-tertiary)',
            whiteSpace: 'nowrap'
          }}>
            {section.label}
          </span>
        </div>
      ))}
    </div>
  ) : null

  return (
    <form onSubmit={handleSubmit}>
      <BpPageHeader
        title={isDetail ? (sampleNumberDisplay || t('sampleNumber')) : t('newSample')}
        actions={
          <>
            <Link href={backHref}>
              <button type="button" className="bp-button bp-button--ghost">
                <ArrowLeft style={{ width: 18, height: 18 }} />
                {t('backToSamples')}
              </button>
            </Link>
            <button type="submit" className="bp-button bp-button--primary" disabled={submitting}>
              {submitting ? tCommon('loading') : isDetail ? tCommon('save') : t('register')}
            </button>
            <Link href={backHref}>
              <button type="button" className="bp-button bp-button--secondary">{tCommon('cancel')}</button>
            </Link>
          </>
        }
      />

      {/* Two-column layout: Main content + Comments sidebar */}
      <div style={{ display: 'flex', gap: 24, alignItems: 'flex-start', minHeight: '100vh' }}>
        {/* Main content */}
        <div style={{ flex: 1, minWidth: 0 }}>

      <div className="bp-card" style={{ marginBottom: 24 }}>
        <div className="bp-card__header">
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', width: '100%' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
              <FlaskConical style={{ width: 20, height: 20, color: 'var(--color-primary)' }} />
              <h2 className="bp-card__title">{t('info')}</h2>
            </div>
            {progressChart}
          </div>
        </div>
        <div className="bp-card__content">
          <div style={{ display: 'grid', gridTemplateColumns: '340px 1fr', gap: 16, alignItems: 'start' }}>
            <div className="bp-form-group">
              <label className="bp-label">{t('sampleImage')}</label>
              {imageDataUrl ? (
                <img
                  src={imageDataUrl}
                  alt={imageFileName || 'sample-design'}
                  style={{ marginTop: 8, width: 320, height: 320, objectFit: 'cover', borderRadius: 8, border: '1px solid var(--color-border)' }}
                />
              ) : (
                <div
                  style={{
                    marginTop: 8,
                    width: 320,
                    height: 320,
                    borderRadius: 8,
                    border: '1px solid var(--color-border)',
                    background: 'var(--color-gray-50)',
                  }}
                />
              )}
              <div style={{ display: 'flex', gap: 8, marginTop: 10 }}>
                <label className="bp-button bp-button--secondary bp-button--sm" style={{ width: 'fit-content' }}>
                  <ImagePlus style={{ width: 14, height: 14 }} />
                  Image
                  <input
                    type="file"
                    accept="image/*"
                    style={{ display: 'none' }}
                    onChange={(e) => handleFile(e.target.files?.[0] || null, setImageFileName, setImageDataUrl)}
                  />
                </label>
                <label className="bp-button bp-button--secondary bp-button--sm" style={{ width: 'fit-content' }}>
                  <Scissors style={{ width: 14, height: 14 }} />
                  AI File
                  <input
                    type="file"
                    accept=".ai,.eps,.pdf"
                    style={{ display: 'none' }}
                    onChange={(e) => handleFile(e.target.files?.[0] || null, setIllustratorFileName, setIllustratorDataUrl)}
                  />
                </label>
              </div>
              {illustratorFileName ? <p style={{ marginTop: 8, fontSize: 'var(--font-size-sm)' }}>{illustratorFileName}</p> : null}

              {/* AI Design Generator */}
              <div style={{ marginTop: 16, padding: 12, background: 'var(--color-gray-50)', borderRadius: 8, border: '1px solid var(--color-border)' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginBottom: 8 }}>
                  <Sparkles style={{ width: 16, height: 16, color: 'var(--color-primary)' }} />
                  <span style={{ fontSize: 13, fontWeight: 600, color: 'var(--color-gray-700)' }}>AI Design Generator</span>
                </div>
                <div style={{ display: 'flex', gap: 6, marginBottom: 8 }}>
                  <select
                    className="bp-select"
                    value={aiModel}
                    onChange={(e) => setAiModel(e.target.value)}
                    style={{ width: 110, fontSize: 12 }}
                  >
                    <option value="realism">Realism</option>
                    <option value="zen">Zen</option>
                    <option value="flexible">Flexible</option>
                    <option value="fluid">Fluid</option>
                    <option value="super_real">Super Real</option>
                  </select>
                </div>
                <textarea
                  className="bp-textarea"
                  rows={3}
                  placeholder="Describe the product design... e.g. 'A minimal cotton t-shirt, white, flat lay on marble background'"
                  value={aiPrompt}
                  onChange={(e) => setAiPrompt(e.target.value)}
                  style={{ fontSize: 12, resize: 'vertical' }}
                />
                <button
                  type="button"
                  className="bp-button bp-button--primary bp-button--sm"
                  style={{ marginTop: 8, width: '100%' }}
                  onClick={handleGenerateDesign}
                  disabled={aiGenerating || !aiPrompt.trim()}
                >
                  {aiGenerating ? (
                    <><div className="bp-spinner bp-spinner--sm" style={{ width: 14, height: 14 }} /> Generating...</>
                  ) : (
                    <><Sparkles style={{ width: 14, height: 14 }} /> Generate</>
                  )}
                </button>
                {aiError && (
                  <p style={{ marginTop: 6, fontSize: 11, color: 'var(--color-danger)' }}>{aiError}</p>
                )}
                {aiImages.length > 0 && (
                  <div style={{ marginTop: 10 }}>
                    <p style={{ fontSize: 11, color: 'var(--color-gray-500)', marginBottom: 6 }}>Click to use as sample image:</p>
                    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: 6 }}>
                      {aiImages.map((url, idx) => (
                        <button
                          key={idx}
                          type="button"
                          onClick={() => applyAiImageAsSample(url)}
                          style={{
                            padding: 0,
                            border: imageDataUrl === url ? '2px solid var(--color-primary)' : '1px solid var(--color-border)',
                            borderRadius: 6,
                            cursor: 'pointer',
                            background: 'none',
                            overflow: 'hidden',
                          }}
                        >
                          <img
                            src={url}
                            alt={`AI generated ${idx + 1}`}
                            style={{ width: '100%', aspectRatio: '1/1', objectFit: 'cover', display: 'block' }}
                          />
                        </button>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: 16 }}>
              <div className="bp-form-group">
                <label className="bp-label">{t('sampleNumber')}</label>
                {isDetail ? (
                  <div className="bp-input" style={{ display: 'flex', alignItems: 'center', minHeight: 42 }}>
                    {sampleNumberDisplay || t('autoNumbering')}
                  </div>
                ) : (
                  <input className="bp-input" value={sampleNumberDisplay || t('autoNumbering')} disabled />
                )}
              </div>
              <div className="bp-form-group">
                <label className="bp-label">{t('sampleNameEn')}</label>
                <input className="bp-input" value={sampleNameEn} onChange={(e) => setSampleNameEn(e.target.value)} required />
              </div>
              <div className="bp-form-group">
                <label className="bp-label">{t('year')}</label>
                {isDetail ? (
                  <div className="bp-input" style={{ display: 'flex', alignItems: 'center', minHeight: 42 }}>{year}</div>
                ) : (
                  <input className="bp-input" value={year} onChange={(e) => setYear(e.target.value)} />
                )}
              </div>
              <div className="bp-form-group">
                <label className="bp-label">{t('season')}</label>
                {isDetail ? (
                  <div className="bp-input" style={{ display: 'flex', alignItems: 'center', minHeight: 42 }}>{seasonTerm}</div>
                ) : (
                  <select className="bp-select" value={seasonTerm} onChange={(e) => setSeasonTerm(e.target.value as 'SS' | 'FW')}>
                    <option value="SS">SS</option>
                    <option value="FW">FW</option>
                  </select>
                )}
              </div>
              <div className="bp-form-group">
                <label className="bp-label">{t('division')}</label>
                <select
                  className="bp-select"
                  value={division}
                  onChange={(e) => {
                    setDivision(e.target.value)
                    setSubCategory('')
                  }}
                  disabled={isDetail}
                >
                  <option value="">--</option>
                  {divisions.map((item) => (
                    <option key={item.id} value={item.name}>{item.name}</option>
                  ))}
                </select>
              </div>
              <div className="bp-form-group">
                <label className="bp-label">{t('subCategory')}</label>
                <select 
                  className="bp-select" 
                  value={subCategory} 
                  onChange={(e) => setSubCategory(e.target.value)}
                  disabled={isDetail}
                >
                  <option value="">--</option>
                  {subCategoryOptions.map((item) => (
                    <option key={item} value={item}>{item}</option>
                  ))}
                </select>
              </div>
              <div className="bp-form-group" style={{ gridColumn: '1 / -1' }}>
                <label className="bp-label">{t('product')} *</label>
                <input
                  className="bp-input"
                  list="product-candidates"
                  value={productInput}
                  onChange={(e) => setProductInput(e.target.value)}
                  placeholder={t('productInputPlaceholder')}
                  readOnly={Boolean(fixedProductId)}
                />
                <datalist id="product-candidates">
                  {suggestedProducts.map((item) => <option key={item.id} value={`${item.styleNumber} - ${item.name}`} />)}
                </datalist>
                {!fixedProductId && suggestedProducts.length > 0 ? (
                  <div style={{ display: 'flex', gap: 6, marginTop: 8, flexWrap: 'wrap' }}>
                    {suggestedProducts.map((item) => (
                      <button
                        key={item.id}
                        type="button"
                        className="bp-button bp-button--secondary bp-button--sm"
                        onClick={() => {
                          setProductId(item.id)
                          setProductInput(`${item.styleNumber} - ${item.name}`)
                        }}
                      >
                        {item.styleNumber}
                      </button>
                    ))}
                  </div>
                ) : null}
              </div>
              <div className="bp-form-group">
                <label className="bp-label">{t('sampleType')}</label>
                <select className="bp-select" value={sampleType} onChange={(e) => setSampleType(e.target.value)}>
                  {Object.keys(SAMPLE_TYPE_LABELS).map((key) => (
                    <option key={key} value={key}>{tConstants(`sampleTypes.${key}`)}</option>
                  ))}
                </select>
              </div>
              <div className="bp-form-group">
                <label className="bp-label">{t('status')}</label>
                <select className="bp-select" value={statusUi} onChange={(e) => setStatusUi(e.target.value as (typeof SAMPLE_STATUS_UI)[number])}>
                  <option value="REGISTERED">{t('registered')}</option>
                  <option value="APPROVED">{t('approved')}</option>
                  <option value="DROPPED">{t('dropped')}</option>
                </select>
              </div>
            </div>
          </div>
        </div>
      </div>

      <div className="bp-card" style={{ marginBottom: 24 }}>
        <div className="bp-card__header">
          <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
            <Palette style={{ width: 20, height: 20, color: 'var(--color-primary)' }} />
            <h2 className="bp-card__title">{t('color')}</h2>
          </div>
          <button type="button" className="bp-button bp-button--secondary bp-button--sm" onClick={() => setColorRows((prev) => [...prev, { colorId: '', status: 'IN_PROGRESS' }])}>
            <Plus style={{ width: 14, height: 14 }} />
            {tCommon('new')}
          </button>
        </div>
        <div className="bp-card__content">
          <div className="bp-table-wrap" style={{ maxHeight: 'none' }}>
            <table className="bp-table">
              <thead>
                <tr>
                  <th style={{ width: 200 }}>{t('color')}</th>
                  <th style={{ width: 40 }}>Image</th>
                  <th style={{ width: 140 }}>Status</th>
                  <th style={{ width: 100 }}>{t('pantoneCode')}</th>
                  <th style={{ width: 90 }}>{t('rgbValue')}</th>
                  <th style={{ width: 70 }} />
                </tr>
              </thead>
              <tbody>
                {colorRows.map((row, index) => {
                  const color = colors.find((x) => x.id === row.colorId)
                  return (
                    <tr key={`color-row-${index}`}>
                      <td>
                        <select className="bp-select" value={row.colorId} onChange={(e) => setColorRows((prev) => prev.map((x, i) => (i === index ? { ...x, colorId: e.target.value } : x)))}>
                          <option value="">--</option>
                          {colors.map((x) => <option key={x.id} value={x.id}>{x.colorCode} - {x.colorName}</option>)}
                        </select>
                      </td>
                      <td style={{ padding: 2, verticalAlign: 'middle' }}>{color?.colorImage ? <img src={color.colorImage} alt={color.colorCode} style={{ height: '100%', maxHeight: 32, aspectRatio: '1 / 1', objectFit: 'cover', borderRadius: 4, border: '1px solid var(--color-border)', display: 'block' }} /> : <div style={{ height: 32, aspectRatio: '1 / 1', border: '1px solid var(--color-border)', borderRadius: 4 }} />}</td>
                      <td>
                        <select className="bp-select" value={row.status} onChange={(e) => setColorRows((prev) => prev.map((x, i) => (i === index ? { ...x, status: e.target.value } : x)))}>
                          <option value="IN_PROGRESS">In Progress</option>
                          <option value="APPROVED">Approved</option>
                          <option value="DROPPED">Dropped</option>
                        </select>
                      </td>
                      <td>{color?.pantoneCode || '-'}</td>
                      <td>{color?.rgbValue || '-'}</td>
                      <td>
                        <button type="button" className="bp-button bp-button--danger bp-button--sm" onClick={() => setColorRows((prev) => prev.filter((_, i) => i !== index))}>
                          <Trash2 style={{ width: 14, height: 14 }} />
                          {tCommon('delete')}
                        </button>
                      </td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
          </div>
        </div>
      </div>

      <div className="bp-card" style={{ marginBottom: 24 }}>
        <div className="bp-card__header">
          <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
            <FileText style={{ width: 20, height: 20, color: 'var(--color-primary)' }} />
            <h2 className="bp-card__title">{t('specInfo')}</h2>
          </div>
        </div>
        <div className="bp-card__content">
          <div className="bp-form-group" style={{ marginBottom: 12 }}>
            <label className="bp-label">Size Group</label>
            <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
              <select
                className="bp-select"
                style={{ flex: 1 }}
                value={sizeInfo}
                onChange={(e) => setSizeInfo(e.target.value)}
                disabled={sizeMeasurements.some((m) => m.value !== '' && m.value != null)}
              >
                <option value="">--</option>
                {sizePatternOptions.map((g) => <option key={g.id} value={g.name}>{g.name}</option>)}
              </select>
              {sizeInfo && (
                <button
                  type="button"
                  className="bp-button bp-button--danger bp-button--sm"
                  onClick={() => {
                    if (sizeMeasurements.some((m) => m.value !== '' && m.value != null)) {
                      if (!confirm('Size Group を変更すると入力済みの測定値が削除されます。よろしいですか？')) return
                    }
                    setSizeInfo('')
                    setSizeMeasurements([])
                  }}
                >
                  <Trash2 style={{ width: 14, height: 14 }} />
                  {tCommon('delete')}
                </button>
              )}
            </div>
          </div>
          <div className="bp-form-group" style={{ marginBottom: 12 }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8 }}>
              <label className="bp-label" style={{ marginBottom: 0 }}>{t('sizeMeasurements')}</label>
              <button type="button" className="bp-button bp-button--secondary bp-button--sm" onClick={addMeasurementPoint}>
                <Plus style={{ width: 14, height: 14 }} />
                {t('addPart')}
              </button>
            </div>
            {/* Measurement table with fixed Parts (left) and Delete (right), scrollable sizes in middle */}
            <div className="measurement-sheet">
              <table className="measurement-sheet__table">
                <thead>
                  <tr>
                    <th className="measurement-sheet__fixed-left">{t('part')}</th>
                    {sizeOptions.map((size) => <th key={size} className="measurement-sheet__size-col">{size}</th>)}
                    <th className="measurement-sheet__fixed-right" />
                  </tr>
                </thead>
                <tbody>
                  {(measurementPoints.length > 0 ? measurementPoints : ['']).map((part, idx) => (
                    <tr key={`point-${idx}`}>
                      <td className="measurement-sheet__fixed-left">
                        <input
                          className="bp-input"
                          value={part}
                          placeholder="Part name"
                          onChange={(e) => {
                            const next = e.target.value
                            setSizeMeasurements((prev) => prev.map((x) => (x.part === part ? { ...x, part: next } : x)))
                          }}
                        />
                      </td>
                      {sizeOptions.map((size) => (
                        <td key={`${part}-${size}`} className="measurement-sheet__size-col">
                          <input className="bp-input" value={getMeasurementValue(part, size)} onChange={(e) => setMeasurementCell(part, size, e.target.value)} />
                        </td>
                      ))}
                      <td className="measurement-sheet__fixed-right">
                        <button type="button" className="bp-button bp-button--danger bp-button--sm" onClick={() => removeMeasurementPoint(part)}>
                          <Trash2 style={{ width: 14, height: 14 }} />
                          {tCommon('delete')}
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
          <div className="bp-form-group">
            <label className="bp-label">{t('patternCad')}</label>
            <label className="bp-button bp-button--secondary" style={{ width: 'fit-content' }}>
              {t('uploadPatternCad')}
              <input type="file" accept=".dxf,.zip,.rul,.pdf" style={{ display: 'none' }} onChange={(e) => handleFile(e.target.files?.[0] || null, setPatternCadFileName, setPatternCadDataUrl)} />
            </label>
            {patternCadFileName ? <p style={{ marginTop: 8, fontSize: 'var(--font-size-sm)' }}>{patternCadFileName}</p> : null}
          </div>

          {/* CLO 3D Preview */}
          <div className="bp-form-group" style={{ marginTop: 16 }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 8 }}>
              <Box style={{ width: 18, height: 18, color: 'var(--color-primary)' }} />
              <label className="bp-label" style={{ margin: 0 }}>CLO 3D Preview</label>
            </div>
            <div style={{ display: 'flex', gap: 8, marginBottom: 12 }}>
              <label className="bp-button bp-button--secondary" style={{ width: 'fit-content' }}>
                Upload 3D File
                <input
                  type="file"
                  accept=".glb,.gltf,.obj"
                  style={{ display: 'none' }}
                  onChange={(e) => {
                    const file = e.target.files?.[0]
                    if (!file) return
                    setClo3dFileName(file.name)
                    // Blob URL for immediate preview (fast, no base64 overhead)
                    const blobUrl = URL.createObjectURL(file)
                    setClo3dPreviewUrl(blobUrl)
                    // Also create base64 data URL for DB persistence
                    const reader = new FileReader()
                    reader.onload = () => setClo3dDataUrl(String(reader.result || ''))
                    reader.readAsDataURL(file)
                  }}
                />
              </label>
              {clo3dFileName && (
                <button
                  type="button"
                  className="bp-button bp-button--danger"
                  style={{ width: 'fit-content' }}
                  onClick={() => { setClo3dDataUrl(''); setClo3dPreviewUrl(''); setClo3dFileName('') }}
                >
                  <Trash2 style={{ width: 14, height: 14 }} />
                  Delete
                </button>
              )}
            </div>
            {clo3dPreviewUrl ? (
              <Clo3dViewer fileDataUrl={clo3dPreviewUrl} fileName={clo3dFileName} height={400} />
            ) : (
              <div style={{
                height: 200,
                display: 'flex',
                flexDirection: 'column',
                alignItems: 'center',
                justifyContent: 'center',
                background: 'var(--color-gray-50)',
                borderRadius: 8,
                border: '2px dashed var(--color-gray-200)',
                color: 'var(--color-gray-400)',
                fontSize: 13,
                gap: 8,
              }}>
                <Box style={{ width: 32, height: 32 }} />
                <span>Upload a 3D file from CLO 3D</span>
                <span style={{ fontSize: 11 }}>Supported: GLB, glTF, OBJ</span>
              </div>
            )}
          </div>
        </div>
      </div>

      <div className="bp-card" style={{ marginBottom: 24 }}>
        <div className="bp-card__header">
          <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
            <Factory style={{ width: 20, height: 20, color: 'var(--color-primary)' }} />
            <h2 className="bp-card__title">{t('productionInfo')}</h2>
          </div>
        </div>
        <div className="bp-card__content">
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 16 }}>
            <div className="bp-form-group">
              <label className="bp-label">{t('supplier')}</label>
              <select className="bp-select" value={supplierId} onChange={(e) => setSupplierId(e.target.value)}>
                <option value="">--</option>
                {suppliers.map((x) => <option key={x.id} value={x.id}>{x.name}</option>)}
              </select>
            </div>
            <div className="bp-form-group">
              <label className="bp-label">Main Factory Code</label>
              <input className="bp-input" value={mainFactoryCode} onChange={(e) => setMainFactoryCode(e.target.value)} />
            </div>
            <div className="bp-form-group">
              <label className="bp-label">{t('originCountry')}</label>
              <input className="bp-input" value={originCountry} onChange={(e) => setOriginCountry(e.target.value)} />
            </div>
          </div>
        </div>
      </div>

      <div className="bp-card" style={{ marginBottom: 24 }}>
        <div className="bp-card__header">
          <h2 className="bp-card__title">Bill of Materials</h2>
        </div>
        <div className="bp-card__content">
          <div className="bp-table-wrap" style={{ maxHeight: 'none' }}>
            <table className="bp-table">
              <thead>
                <tr>
                  <th>{t('materialCode')}</th>
                  <th>{t('materialName')}</th>
                  <th>{t('costPerUnit')}</th>
                  <th>Unit</th>
                  <th>Consumption</th>
                  <th>{t('fabricSupplier')}</th>
                  <th style={{ width: 70 }} />
                </tr>
              </thead>
              <tbody>
                {/* --- Main Fabric --- */}
                <tr><td colSpan={7} style={{ background: 'var(--color-gray-50)', fontWeight: 700 }}>{t('mainFabric')}</td></tr>
                <tr>
                  <td><input className="bp-input" value={mainFabric.materialCode} onChange={(e) => setMainFabric({ ...mainFabric, materialCode: e.target.value })} /></td>
                  <td>
                    <input
                      className="bp-input"
                      list="bom-main-fabric-list"
                      placeholder="Search main fabric..."
                      value={mainFabric.materialName}
                      onChange={(e) => {
                        const val = e.target.value
                        const picked = mainFabricMasters.find((m) => m.name === val)
                        setMainFabric((prev) => ({
                          ...prev,
                          materialName: val,
                          materialMasterId: picked?.id || '',
                          costPerUnit: picked?.unitPrice != null ? String(picked.unitPrice) : prev.costPerUnit,
                        }))
                      }}
                    />
                    <datalist id="bom-main-fabric-list">
                      {filterMaterials(mainFabricMasters, mainFabric.materialName).map((m) => (
                        <option key={m.id} value={m.name} />
                      ))}
                    </datalist>
                  </td>
                  <td><input className="bp-input" value={mainFabric.costPerUnit} onChange={(e) => setMainFabric({ ...mainFabric, costPerUnit: e.target.value })} /></td>
                  <td><input className="bp-input" value={mainFabric.unit || ''} onChange={(e) => setMainFabric({ ...mainFabric, unit: e.target.value })} placeholder="m, kg..." /></td>
                  <td><input className="bp-input" value={mainFabric.consumption || ''} onChange={(e) => setMainFabric({ ...mainFabric, consumption: e.target.value })} placeholder="1.5, 2.0..." /></td>
                  <td><input className="bp-input" value={mainFabric.fabricSupplier} onChange={(e) => setMainFabric({ ...mainFabric, fabricSupplier: e.target.value })} /></td>
                  <td />
                </tr>

                {/* --- Sub Fabric --- */}
                <tr>
                  <td colSpan={7} style={{ background: 'var(--color-gray-50)', fontWeight: 700 }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                      <span>{t('subFabric')}</span>
                      <button type="button" className="bp-button bp-button--secondary bp-button--sm" onClick={() => setSubFabrics((prev) => [...prev, { materialMasterId: '', materialCode: '', materialName: '', costPerUnit: '', fabricSupplier: '', unit: '', consumption: '' }])}>
                        <Plus style={{ width: 14, height: 14 }} />
                        {tCommon('new')}
                      </button>
                    </div>
                  </td>
                </tr>
                {subFabrics.map((item, index) => (
                  <tr key={`sf-${index}`}>
                    <td><input className="bp-input" value={item.materialCode} onChange={(e) => setSubFabrics((prev) => prev.map((x, i) => (i === index ? { ...x, materialCode: e.target.value } : x)))} /></td>
                    <td>
                      <input
                        className="bp-input"
                        list={`bom-sub-fabric-list-${index}`}
                        placeholder="Search sub fabric..."
                        value={item.materialName}
                        onChange={(e) => {
                          const val = e.target.value
                          const picked = subFabricMasters.find((m) => m.name === val)
                          setSubFabrics((prev) => prev.map((x, i) => (i === index ? {
                            ...x,
                            materialName: val,
                            materialMasterId: picked?.id || '',
                            costPerUnit: picked?.unitPrice != null ? String(picked.unitPrice) : x.costPerUnit,
                          } : x)))
                        }}
                      />
                      <datalist id={`bom-sub-fabric-list-${index}`}>
                        {filterMaterials(subFabricMasters, item.materialName).map((m) => (
                          <option key={m.id} value={m.name} />
                        ))}
                      </datalist>
                    </td>
                    <td><input className="bp-input" value={item.costPerUnit} onChange={(e) => setSubFabrics((prev) => prev.map((x, i) => (i === index ? { ...x, costPerUnit: e.target.value } : x)))} /></td>
                    <td><input className="bp-input" value={item.unit || ''} onChange={(e) => setSubFabrics((prev) => prev.map((x, i) => (i === index ? { ...x, unit: e.target.value } : x)))} placeholder="m, kg..." /></td>
                    <td><input className="bp-input" value={item.consumption || ''} onChange={(e) => setSubFabrics((prev) => prev.map((x, i) => (i === index ? { ...x, consumption: e.target.value } : x)))} placeholder="1.5, 2.0..." /></td>
                    <td><input className="bp-input" value={item.fabricSupplier} onChange={(e) => setSubFabrics((prev) => prev.map((x, i) => (i === index ? { ...x, fabricSupplier: e.target.value } : x)))} /></td>
                    <td>
                      <button type="button" className="bp-button bp-button--danger bp-button--sm" onClick={() => setSubFabrics((prev) => prev.filter((_, i) => i !== index))}>
                        <Trash2 style={{ width: 14, height: 14 }} />
                        {tCommon('delete')}
                      </button>
                    </td>
                  </tr>
                ))}

                {/* --- Sub Material --- */}
                <tr>
                  <td colSpan={7} style={{ background: 'var(--color-gray-50)', fontWeight: 700 }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                      <span>{t('subMaterial')}</span>
                      <button type="button" className="bp-button bp-button--secondary bp-button--sm" onClick={() => setSubMaterials((prev) => [...prev, { materialMasterId: '', materialCode: '', materialName: '', costPerUnit: '', fabricSupplier: '', unit: '', consumption: '' }])}>
                        <Plus style={{ width: 14, height: 14 }} />
                        {tCommon('new')}
                      </button>
                    </div>
                  </td>
                </tr>
                {subMaterials.map((item, index) => (
                  <tr key={`sm-${index}`}>
                    <td><input className="bp-input" value={item.materialCode} onChange={(e) => setSubMaterials((prev) => prev.map((x, i) => (i === index ? { ...x, materialCode: e.target.value } : x)))} /></td>
                    <td>
                      <input
                        className="bp-input"
                        list={`bom-sub-material-list-${index}`}
                        placeholder="Search sub material..."
                        value={item.materialName}
                        onChange={(e) => {
                          const val = e.target.value
                          const picked = subMaterialMasters.find((m) => m.name === val)
                          setSubMaterials((prev) => prev.map((x, i) => (i === index ? {
                            ...x,
                            materialName: val,
                            materialMasterId: picked?.id || '',
                            costPerUnit: picked?.unitPrice != null ? String(picked.unitPrice) : x.costPerUnit,
                          } : x)))
                        }}
                      />
                      <datalist id={`bom-sub-material-list-${index}`}>
                        {filterMaterials(subMaterialMasters, item.materialName).map((m) => (
                          <option key={m.id} value={m.name} />
                        ))}
                      </datalist>
                    </td>
                    <td><input className="bp-input" value={item.costPerUnit} onChange={(e) => setSubMaterials((prev) => prev.map((x, i) => (i === index ? { ...x, costPerUnit: e.target.value } : x)))} /></td>
                    <td><input className="bp-input" value={item.unit || ''} onChange={(e) => setSubMaterials((prev) => prev.map((x, i) => (i === index ? { ...x, unit: e.target.value } : x)))} placeholder="m, kg..." /></td>
                    <td><input className="bp-input" value={item.consumption || ''} onChange={(e) => setSubMaterials((prev) => prev.map((x, i) => (i === index ? { ...x, consumption: e.target.value } : x)))} placeholder="1.5, 2.0..." /></td>
                    <td><input className="bp-input" value={item.fabricSupplier} onChange={(e) => setSubMaterials((prev) => prev.map((x, i) => (i === index ? { ...x, fabricSupplier: e.target.value } : x)))} /></td>
                    <td>
                      <button type="button" className="bp-button bp-button--danger bp-button--sm" onClick={() => setSubMaterials((prev) => prev.filter((_, i) => i !== index))}>
                        <Trash2 style={{ width: 14, height: 14 }} />
                        {tCommon('delete')}
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      </div>

      {/* Cost Section */}
      <div className="bp-card" style={{ marginBottom: 24 }}>
        <div className="bp-card__header">
          <h2 className="bp-card__title">Cost</h2>
        </div>
        <div className="bp-card__content">
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 16, marginBottom: 24 }}>
            <div className="bp-form-group">
              <label className="bp-label">Costing Type</label>
              <select className="bp-select" value={costingType} onChange={(e) => setCostingType(e.target.value)} tabIndex={0}>
                <option value="">--</option>
                <option value="STANDARD">Standard</option>
                <option value="QUICK">Quick</option>
                <option value="DETAILED">Detailed</option>
              </select>
            </div>
            <div className="bp-form-group">
              <label className="bp-label">Status</label>
              <select className="bp-select" value={costStatus} onChange={(e) => setCostStatus(e.target.value)} tabIndex={0}>
                <option value="">--</option>
                <option value="DRAFT">Draft</option>
                <option value="PENDING">Pending</option>
                <option value="APPROVED">Approved</option>
              </select>
            </div>
            <div className="bp-form-group">
              <label className="bp-label">FCR Date</label>
              <input type="date" className="bp-input" value={fcrDate} onChange={(e) => setFcrDate(e.target.value)} tabIndex={0} />
            </div>
            <div className="bp-form-group">
              <label className="bp-label">PO Deadline</label>
              <input type="date" className="bp-input" value={poDeadline} onChange={(e) => setPoDeadline(e.target.value)} tabIndex={0} />
            </div>
          </div>

          {/* Excel-style cost table */}
          <div className="bp-table-wrap" style={{ maxHeight: 'none' }}>
            <table className="bp-table" style={{ fontSize: 13 }}>
              <thead>
                <tr style={{ backgroundColor: 'var(--color-gray-100)' }}>
                  <th style={{ width: '40%', textAlign: 'left', fontWeight: 600 }}>Cost Item</th>
                  <th style={{ width: '20%', textAlign: 'right', fontWeight: 600 }}>Unit Price</th>
                  <th style={{ width: '20%', textAlign: 'right', fontWeight: 600 }}>Quantity</th>
                  <th style={{ width: '20%', textAlign: 'right', fontWeight: 600 }}>Amount</th>
                </tr>
              </thead>
              <tbody>
                {/* Material Costs Header */}
                <tr style={{ backgroundColor: 'var(--color-gray-50)' }}>
                  <td colSpan={4} style={{ fontWeight: 700, fontSize: 14 }}>Material Costs</td>
                </tr>
                
                {/* Main Fabric */}
                <tr>
                  <td>Main Fabric</td>
                  <td style={{ textAlign: 'right' }}>
                    {mainFabric.costPerUnit ? parseFloat(mainFabric.costPerUnit).toFixed(2) : '0.00'}
                  </td>
                  <td style={{ textAlign: 'right' }}>
                    {mainFabric.consumption || '0.00'}
                  </td>
                  <td style={{ textAlign: 'right', fontWeight: 500 }}>
                    {mainFabric.costPerUnit && mainFabric.consumption ? 
                      (parseFloat(mainFabric.costPerUnit) * parseFloat(mainFabric.consumption)).toFixed(2) : '0.00'}
                  </td>
                </tr>

                {/* Sub Fabric */}
                <tr>
                  <td>Sub Fabric</td>
                  <td style={{ textAlign: 'right' }}>-</td>
                  <td style={{ textAlign: 'right' }}>-</td>
                  <td style={{ textAlign: 'right', fontWeight: 500 }}>
                    {subFabrics.reduce((sum, item) => {
                      const cost = item.costPerUnit && item.consumption ? 
                        parseFloat(item.costPerUnit) * parseFloat(item.consumption) : 0
                      return sum + cost
                    }, 0).toFixed(2)}
                  </td>
                </tr>

                {/* Trims */}
                <tr>
                  <td>Trims (Sub Materials)</td>
                  <td style={{ textAlign: 'right' }}>-</td>
                  <td style={{ textAlign: 'right' }}>-</td>
                  <td style={{ textAlign: 'right', fontWeight: 500 }}>
                    {subMaterials.reduce((sum, item) => {
                      const cost = item.costPerUnit && item.consumption ? 
                        parseFloat(item.costPerUnit) * parseFloat(item.consumption) : 0
                      return sum + cost
                    }, 0).toFixed(2)}
                  </td>
                </tr>

                {/* Packing */}
                <tr>
                  <td>Packing</td>
                  <td style={{ textAlign: 'right' }}>-</td>
                  <td style={{ textAlign: 'right' }}>-</td>
                  <td style={{ textAlign: 'right', fontWeight: 500 }}>0.00</td>
                </tr>

                {/* Material Subtotal */}
                <tr style={{ backgroundColor: 'var(--color-gray-50)', fontWeight: 600 }}>
                  <td colSpan={3} style={{ textAlign: 'right' }}>Material Subtotal</td>
                  <td style={{ textAlign: 'right' }}>
                    {(() => {
                      const mainCost = mainFabric.costPerUnit && mainFabric.consumption ? 
                        parseFloat(mainFabric.costPerUnit) * parseFloat(mainFabric.consumption) : 0
                      const subFabricCost = subFabrics.reduce((sum, item) => {
                        const cost = item.costPerUnit && item.consumption ? 
                          parseFloat(item.costPerUnit) * parseFloat(item.consumption) : 0
                        return sum + cost
                      }, 0)
                      const trimsCost = subMaterials.reduce((sum, item) => {
                        const cost = item.costPerUnit && item.consumption ? 
                          parseFloat(item.costPerUnit) * parseFloat(item.consumption) : 0
                        return sum + cost
                      }, 0)
                      return (mainCost + subFabricCost + trimsCost).toFixed(2)
                    })()}
                  </td>
                </tr>

                {/* Other Costs Header */}
                <tr style={{ backgroundColor: 'var(--color-gray-50)' }}>
                  <td colSpan={4} style={{ fontWeight: 700, fontSize: 14, paddingTop: 16 }}>Other Costs</td>
                </tr>

                {/* Labor */}
                <tr>
                  <td>Labor</td>
                  <td style={{ textAlign: 'right' }}>-</td>
                  <td style={{ textAlign: 'right' }}>-</td>
                  <td>
                    <input 
                      className="bp-input" 
                      type="number" 
                      step="0.01" 
                      value={labor} 
                      onChange={(e) => setLabor(e.target.value)}
                      tabIndex={0}
                      style={{ textAlign: 'right' }}
                    />
                  </td>
                </tr>

                {/* FOB */}
                <tr>
                  <td>FOB</td>
                  <td style={{ textAlign: 'right' }}>-</td>
                  <td style={{ textAlign: 'right' }}>-</td>
                  <td>
                    <input 
                      className="bp-input" 
                      type="number" 
                      step="0.01" 
                      value={fob} 
                      onChange={(e) => setFob(e.target.value)}
                      tabIndex={0}
                      style={{ textAlign: 'right' }}
                    />
                  </td>
                </tr>

                {/* Euro Duty */}
                <tr>
                  <td>Euro Duty</td>
                  <td style={{ textAlign: 'right' }}>-</td>
                  <td style={{ textAlign: 'right' }}>-</td>
                  <td>
                    <input 
                      className="bp-input" 
                      type="number" 
                      step="0.01" 
                      value={euroDuty} 
                      onChange={(e) => setEuroDuty(e.target.value)}
                      tabIndex={0}
                      style={{ textAlign: 'right' }}
                    />
                  </td>
                </tr>

                {/* Final Duty */}
                <tr>
                  <td>Final Duty</td>
                  <td style={{ textAlign: 'right' }}>-</td>
                  <td style={{ textAlign: 'right' }}>-</td>
                  <td>
                    <input 
                      className="bp-input" 
                      type="number" 
                      step="0.01" 
                      value={finalDuty} 
                      onChange={(e) => setFinalDuty(e.target.value)}
                      tabIndex={0}
                      style={{ textAlign: 'right' }}
                    />
                  </td>
                </tr>

                {/* Freight Cost */}
                <tr>
                  <td>Freight Cost</td>
                  <td style={{ textAlign: 'right' }}>-</td>
                  <td style={{ textAlign: 'right' }}>-</td>
                  <td>
                    <input 
                      className="bp-input" 
                      type="number" 
                      step="0.01" 
                      value={freightCost} 
                      onChange={(e) => setFreightCost(e.target.value)}
                      tabIndex={0}
                      style={{ textAlign: 'right' }}
                    />
                  </td>
                </tr>

                {/* Certification */}
                <tr>
                  <td>Certification</td>
                  <td style={{ textAlign: 'right' }}>-</td>
                  <td style={{ textAlign: 'right' }}>-</td>
                  <td>
                    <input 
                      className="bp-input" 
                      type="number" 
                      step="0.01" 
                      value={certification} 
                      onChange={(e) => setCertification(e.target.value)}
                      tabIndex={0}
                      style={{ textAlign: 'right' }}
                    />
                  </td>
                </tr>

                {/* Commission */}
                <tr>
                  <td>Commission</td>
                  <td style={{ textAlign: 'right' }}>-</td>
                  <td style={{ textAlign: 'right' }}>-</td>
                  <td>
                    <input 
                      className="bp-input" 
                      type="number" 
                      step="0.01" 
                      value={commission} 
                      onChange={(e) => setCommission(e.target.value)}
                      tabIndex={0}
                      style={{ textAlign: 'right' }}
                    />
                  </td>
                </tr>

                {/* Defect Cost */}
                <tr>
                  <td>Defect Cost</td>
                  <td style={{ textAlign: 'right' }}>-</td>
                  <td style={{ textAlign: 'right' }}>-</td>
                  <td>
                    <input 
                      className="bp-input" 
                      type="number" 
                      step="0.01" 
                      value={defectCost} 
                      onChange={(e) => setDefectCost(e.target.value)}
                      tabIndex={0}
                      style={{ textAlign: 'right' }}
                    />
                  </td>
                </tr>

                {/* LDP USD */}
                <tr>
                  <td>LDP USD</td>
                  <td style={{ textAlign: 'right' }}>-</td>
                  <td style={{ textAlign: 'right' }}>-</td>
                  <td>
                    <input 
                      className="bp-input" 
                      type="number" 
                      step="0.01" 
                      value={ldpUsd} 
                      onChange={(e) => setLdpUsd(e.target.value)}
                      tabIndex={0}
                      style={{ textAlign: 'right' }}
                    />
                  </td>
                </tr>

                {/* LDP RUM */}
                <tr>
                  <td>LDP RUM</td>
                  <td style={{ textAlign: 'right' }}>-</td>
                  <td style={{ textAlign: 'right' }}>-</td>
                  <td>
                    <input 
                      className="bp-input" 
                      type="number" 
                      step="0.01" 
                      value={ldpRum} 
                      onChange={(e) => setLdpRum(e.target.value)}
                      tabIndex={0}
                      style={{ textAlign: 'right' }}
                    />
                  </td>
                </tr>

                {/* Other Costs Subtotal */}
                <tr style={{ backgroundColor: 'var(--color-gray-50)', fontWeight: 600 }}>
                  <td colSpan={3} style={{ textAlign: 'right' }}>Other Costs Subtotal</td>
                  <td style={{ textAlign: 'right' }}>
                    {(() => {
                      const sum = [labor, fob, euroDuty, finalDuty, freightCost, certification, commission, defectCost, ldpUsd, ldpRum]
                        .reduce((acc, val) => acc + (parseFloat(val) || 0), 0)
                      return sum.toFixed(2)
                    })()}
                  </td>
                </tr>

                {/* Grand Total */}
                <tr style={{ backgroundColor: 'var(--color-primary-bg)', fontWeight: 700, fontSize: 15 }}>
                  <td colSpan={3} style={{ textAlign: 'right', color: 'var(--color-primary)' }}>Total Cost</td>
                  <td style={{ textAlign: 'right', color: 'var(--color-primary)' }}>
                    {(() => {
                      const mainCost = mainFabric.costPerUnit && mainFabric.consumption ? 
                        parseFloat(mainFabric.costPerUnit) * parseFloat(mainFabric.consumption) : 0
                      const subFabricCost = subFabrics.reduce((sum, item) => {
                        const cost = item.costPerUnit && item.consumption ? 
                          parseFloat(item.costPerUnit) * parseFloat(item.consumption) : 0
                        return sum + cost
                      }, 0)
                      const trimsCost = subMaterials.reduce((sum, item) => {
                        const cost = item.costPerUnit && item.consumption ? 
                          parseFloat(item.costPerUnit) * parseFloat(item.consumption) : 0
                        return sum + cost
                      }, 0)
                      const materialTotal = mainCost + subFabricCost + trimsCost
                      const otherTotal = [labor, fob, euroDuty, finalDuty, freightCost, certification, commission, defectCost, ldpUsd, ldpRum]
                        .reduce((acc, val) => acc + (parseFloat(val) || 0), 0)
                      return (materialTotal + otherTotal).toFixed(2)
                    })()}
                  </td>
                </tr>
              </tbody>
            </table>
          </div>
        </div>
      </div>

      <div className="bp-card" style={{ marginBottom: 24 }}>
        <div className="bp-card__header">
          <h2 className="bp-card__title">{t('others')}</h2>
        </div>
        <div className="bp-card__content">
          <div className="bp-form-group">
            <label className="bp-label">{t('remark')}</label>
            <textarea className="bp-textarea" rows={3} value={remark} onChange={(e) => setRemark(e.target.value)} />
          </div>
        </div>
      </div>

        </div>
        {/* End Main content */}

        {/* Comments sidebar */}
        {isDetail && (
          <div style={{ 
            width: commentsCollapsed ? 48 : 360, 
            flexShrink: 0,
            transition: 'width 0.3s ease',
            position: 'relative',
            height: 0
          }}>
            <div className="bp-card" style={{ 
              position: 'fixed', 
              top: `${commentsSidebarTop}px`,
              right: 24,
              width: commentsCollapsed ? 48 : 360,
              maxHeight: 'calc(100vh - 96px)', 
              display: 'flex', 
              flexDirection: 'column',
              overflow: 'hidden',
              transition: 'width 0.3s ease, top 0.1s ease',
              zIndex: 100
            }}>
              {commentsCollapsed ? (
                <div 
                  style={{ 
                    padding: 12, 
                    cursor: 'pointer',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    writingMode: 'vertical-rl',
                    textOrientation: 'mixed',
                    fontWeight: 600,
                    fontSize: 13,
                    color: 'var(--color-text-secondary)',
                    height: '100%',
                    minHeight: 200
                  }}
                  onClick={() => setCommentsCollapsed(false)}
                >
                  Comments ({comments.length})
                </div>
              ) : (
                <>
                  <div className="bp-card__header" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                    <h2 className="bp-card__title">Comments</h2>
                    <button
                      type="button"
                      onClick={() => setCommentsCollapsed(true)}
                      style={{
                        background: 'none',
                        border: 'none',
                        cursor: 'pointer',
                        padding: 4,
                        display: 'flex',
                        alignItems: 'center',
                        color: 'var(--color-text-secondary)'
                      }}
                      title="Collapse"
                    >
                      <svg width="16" height="16" viewBox="0 0 16 16" fill="none">
                        <path d="M10 4L6 8L10 12" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
                      </svg>
                    </button>
                  </div>
                  <div style={{ 
                    flex: 1, 
                    overflowY: 'auto', 
                    padding: 16, 
                    display: 'flex', 
                    flexDirection: 'column', 
                    gap: 16, 
                    minHeight: 300, 
                    maxHeight: 600 
                  }}>
                    {comments.length === 0 ? (
                      <div style={{ textAlign: 'center', padding: 32, color: 'var(--color-text-tertiary)', fontSize: 14 }}>
                        No comments yet
                      </div>
                    ) : (
                      comments.map((comment) => (
                        <div key={comment.id} style={{
                          padding: 12,
                          backgroundColor: 'var(--color-bg-secondary)',
                          borderRadius: 8,
                          border: '1px solid var(--color-border)'
                        }}>
                          <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 8 }}>
                            <span style={{ fontWeight: 600, fontSize: 13, color: 'var(--color-text)' }}>
                              {comment.userName}
                            </span>
                            <span style={{ fontSize: 11, color: 'var(--color-text-tertiary)' }}>
                              {new Date(comment.createdAt).toLocaleDateString('en-US', { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' })}
                            </span>
                          </div>
                          <div style={{ fontSize: 13, color: 'var(--color-text-secondary)', whiteSpace: 'pre-wrap', wordBreak: 'break-word' }}>
                            {comment.comment}
                          </div>
                        </div>
                      ))
                    )}
                  </div>
                  <div style={{ padding: 16, borderTop: '1px solid var(--color-border)' }}>
                    <textarea
                      className="bp-textarea"
                      rows={3}
                      placeholder="Add a comment..."
                      value={newComment}
                      onChange={(e) => setNewComment(e.target.value)}
                      style={{ marginBottom: 8, fontSize: 13 }}
                    />
                    <button
                      type="button"
                      className="bp-button bp-button--primary bp-button--sm"
                      onClick={handleSubmitComment}
                      disabled={submittingComment || !newComment.trim()}
                      style={{ width: '100%' }}
                    >
                      {submittingComment ? 'Posting...' : 'Post Comment'}
                    </button>
                  </div>
                </>
              )}
            </div>
          </div>
        )}
        {/* End Comments sidebar */}
      </div>
    </form>
  )
}
