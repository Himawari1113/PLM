'use client'

import { useEffect, useMemo, useState } from 'react'
import { ArrowLeft, Factory, FileText, FlaskConical, ImagePlus, Palette, Plus, Scissors, Trash2 } from 'lucide-react'
import { useTranslations } from 'next-intl'
import { Link, useRouter } from '@/lib/navigation'
import { SAMPLE_TYPE_LABELS } from '@/lib/constants'
import { BpPageHeader } from '@/components/common'

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

  const [colorRows, setColorRows] = useState<Array<{ colorId: string; status: string }>>([{ colorId: '', status: 'IN_PROGRESS' }])
  const [sizeInfo, setSizeInfo] = useState('')
  const [sizeMeasurements, setSizeMeasurements] = useState<MeasurementRow[]>([])
  const [patternCadDataUrl, setPatternCadDataUrl] = useState('')
  const [patternCadFileName, setPatternCadFileName] = useState('')

  const [supplierId, setSupplierId] = useState('')
  const [factoryName, setFactoryName] = useState('')
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
        setSeasonTerm(data.season?.term === 'FW' ? 'FW' : 'SS')
        setSampleNumberDisplay(data.sampleNumber || '')
        setSampleNameEn(data.sampleName || '')
        setSampleType(data.sampleType || 'PROTO')
        setStatusUi(data.status === 'APPROVED' ? 'APPROVED' : data.status === 'REJECTED' ? 'DROPPED' : 'REGISTERED')
        setDivision(data.division || '')
        setSubCategory(data.subCategory || '')
        setImageDataUrl(data.imageUrl || '')
        setIllustratorDataUrl(data.illustratorFile || '')
        setPatternCadDataUrl(data.patternCadFile || '')
        setSizeInfo(data.sizeSpec || '')
        setSupplierId(data.supplierId || '')
        setFactoryName(data.factoryName || '')
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

  // Fetch size groups filtered by division AND subCategory
  const [sizeGroups, setSizeGroups] = useState<Array<{ id: string; name: string }>>([])
  useEffect(() => {
    const q = new URLSearchParams()
    if (division) q.set('divisionName', division)
    if (subCategory) q.set('subCategory', subCategory)
    fetch(`/api/size-groups?${q.toString()}`).then((r) => r.json()).then((data) =>
      setSizeGroups(Array.isArray(data) ? data.map((g: any) => ({ id: g.id, name: g.name })) : []),
    )
  }, [division, subCategory])

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
      const termMatch = !season || String(itemSeason?.term || '').toUpperCase() === season
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
        },
        productionInfo: {
          supplierId,
          supplierName: selectedSupplier?.name || '',
          factoryName,
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

      <div className="bp-card" style={{ marginBottom: 24 }}>
        <div className="bp-card__header">
          <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
            <FlaskConical style={{ width: 20, height: 20, color: 'var(--color-primary)' }} />
            <h2 className="bp-card__title">{t('info')}</h2>
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
                <select className="bp-select" value={subCategory} onChange={(e) => setSubCategory(e.target.value)} disabled={isDetail}>
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
              <label className="bp-label">{t('factoryName')}</label>
              <input className="bp-input" value={factoryName} onChange={(e) => setFactoryName(e.target.value)} />
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
                  <th>{t('fabricSupplier')}</th>
                  <th style={{ width: 70 }} />
                </tr>
              </thead>
              <tbody>
                {/* --- Main Fabric --- */}
                <tr><td colSpan={5} style={{ background: 'var(--color-gray-50)', fontWeight: 700 }}>{t('mainFabric')}</td></tr>
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
                  <td><input className="bp-input" value={mainFabric.fabricSupplier} onChange={(e) => setMainFabric({ ...mainFabric, fabricSupplier: e.target.value })} /></td>
                  <td />
                </tr>

                {/* --- Sub Fabric --- */}
                <tr>
                  <td colSpan={5} style={{ background: 'var(--color-gray-50)', fontWeight: 700 }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                      <span>{t('subFabric')}</span>
                      <button type="button" className="bp-button bp-button--secondary bp-button--sm" onClick={() => setSubFabrics((prev) => [...prev, { materialMasterId: '', materialCode: '', materialName: '', costPerUnit: '', fabricSupplier: '' }])}>
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
                  <td colSpan={5} style={{ background: 'var(--color-gray-50)', fontWeight: 700 }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                      <span>{t('subMaterial')}</span>
                      <button type="button" className="bp-button bp-button--secondary bp-button--sm" onClick={() => setSubMaterials((prev) => [...prev, { materialMasterId: '', materialCode: '', materialName: '', costPerUnit: '', fabricSupplier: '' }])}>
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
    </form>
  )
}
