'use client'

import { useEffect, useState } from 'react'
import { ArrowLeft, Trash2, Save, FlaskConical, ArrowUpRight } from 'lucide-react'
import { useTranslations } from 'next-intl'
import { Link, useRouter } from '@/lib/navigation'
import { useParams } from 'next/navigation'
import { BpField, BpFieldGrid, BpPageHeader } from '@/components/common'
import {
  PRODUCT_CATEGORIES,
  PRODUCT_STATUS_LABELS,
  PRODUCT_STATUS_COLORS,
} from '@/lib/constants'

interface ProductDetail {
  id: string
  styleNumber: string
  name: string
  divisionId: number | null
  division: { id: number; name: string } | null
  category: string
  description: string | null
  status: string
  targetPrice: number | null
  collectionId: string | null
  supplierId: string | null
  collection: { id: string; name: string; season: { id: string; name: string } } | null
  supplier: { id: string; name: string } | null
  _count: { samples: number }
}

interface Season { id: string; name: string; collections: { id: string; name: string }[] }
interface Supplier { id: string; name: string }
interface Division { id: number; name: string }

const usd = new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD' })

export default function ProductDetailPage() {
  const params = useParams()
  const router = useRouter()
  const t = useTranslations('products')
  const tCommon = useTranslations('common')
  const tConstants = useTranslations('constants')
  const [product, setProduct] = useState<ProductDetail | null>(null)
  const [seasons, setSeasons] = useState<Season[]>([])
  const [suppliers, setSuppliers] = useState<Supplier[]>([])
  const [divisions, setDivisions] = useState<Division[]>([])
  const [error, setError] = useState('')
  const [editing, setEditing] = useState(false)
  const [form, setForm] = useState<any>({})
  const [selectedSeasonId, setSelectedSeasonId] = useState('')

  const fetchProduct = async () => {
    try {
      setError('')
      const res = await fetch(`/api/products/${params.id}`)
      const data = await res.json().catch(() => ({}))
      if (!res.ok) {
        throw new Error(data?.error || 'Failed to fetch product')
      }
      setProduct(data)
      setForm({
        styleNumber: data.styleNumber, name: data.name, category: data.category,
        description: data.description || '', status: data.status,
        targetPrice: data.targetPrice || '', collectionId: data.collectionId || '',
        supplierId: data.supplierId || '', divisionId: data.divisionId ? String(data.divisionId) : '',
      })
      setSelectedSeasonId(data.collection?.season?.id || '')
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Failed to fetch product')
      router.push('/products')
    }
  }

  useEffect(() => {
    fetchProduct()
    fetch('/api/seasons').then((r) => r.json()).then(setSeasons)
    fetch('/api/suppliers').then((r) => r.json()).then(setSuppliers)
    fetch('/api/divisions').then((r) => r.json()).then(setDivisions)
  }, [params.id])

  const collections = seasons.find((s) => s.id === selectedSeasonId)?.collections || []

  const handleSave = async () => {
    await fetch(`/api/products/${params.id}`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(form),
    })
    setEditing(false)
    fetchProduct()
  }

  const handleDelete = async () => {
    if (!confirm('Delete this product?')) return
    await fetch(`/api/products/${params.id}`, { method: 'DELETE' })
    router.push('/products')
  }

  if (!product) {
    if (error) return <div className="bp-table__empty"><p>{error}</p></div>
    return <div className="bp-spinner-wrap"><div className="bp-spinner" /></div>
  }

  return (
    <>
      <BpPageHeader
        title={product.styleNumber}
        titleMeta={
          <span className={`bp-badge ${PRODUCT_STATUS_COLORS[product.status]}`}>
            {tConstants(`productStatus.${product.status}`)}
          </span>
        }
        subtitle={product.name}
        actions={
          <>
            <Link href="/products">
              <button className="bp-button bp-button--ghost bp-button--icon"><ArrowLeft style={{ width: 18, height: 18 }} /></button>
            </Link>
            {editing ? (
              <>
                <button className="bp-button bp-button--primary" onClick={handleSave}>
                  <Save style={{ width: 16, height: 16 }} />{tCommon('save')}
                </button>
                <button className="bp-button bp-button--secondary" onClick={() => setEditing(false)}>{tCommon('cancel')}</button>
              </>
            ) : (
              <>
                <button className="bp-button bp-button--secondary" onClick={() => setEditing(true)}>{tCommon('edit')}</button>
                <button className="bp-button bp-button--danger" onClick={handleDelete}>
                  <Trash2 style={{ width: 16, height: 16 }} />{tCommon('delete')}
                </button>
              </>
            )}
          </>
        }
      />

      <div className="bp-card" style={{ marginBottom: 24 }}>
        <div className="bp-card__header">
          <h2 className="bp-card__title">{t('productName')}</h2>
        </div>
        <div className="bp-card__content">
          {editing ? (
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: 16 }}>
              <div className="bp-form-group">
                <label className="bp-label">{t('styleNumber')}</label>
                <input className="bp-input" value={form.styleNumber} onChange={(e) => setForm({ ...form, styleNumber: e.target.value })} />
              </div>
              <div className="bp-form-group">
                <label className="bp-label">{t('productName')}</label>
                <input className="bp-input" value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} />
              </div>
              <div className="bp-form-group">
                <label className="bp-label">{t('category')}</label>
                <select className="bp-select" value={form.category} onChange={(e) => setForm({ ...form, category: e.target.value })}>
                  {PRODUCT_CATEGORIES.map((c) => <option key={c.value} value={c.value}>{tConstants(`categories.${c.value}`)}</option>)}
                </select>
              </div>
              <div className="bp-form-group">
                <label className="bp-label">{t('status')}</label>
                <select className="bp-select" value={form.status} onChange={(e) => setForm({ ...form, status: e.target.value })}>
                  {Object.keys(PRODUCT_STATUS_LABELS).map((k) => <option key={k} value={k}>{tConstants(`productStatus.${k}`)}</option>)}
                </select>
              </div>
              <div className="bp-form-group">
                <label className="bp-label">{t('targetPrice')}</label>
                <input className="bp-input" type="number" value={form.targetPrice} onChange={(e) => setForm({ ...form, targetPrice: e.target.value })} />
              </div>
              <div className="bp-form-group">
                <label className="bp-label">{t('division')}</label>
                <select className="bp-select" value={form.divisionId} onChange={(e) => setForm({ ...form, divisionId: e.target.value })}>
                  <option value="">--</option>
                  {divisions.map((d) => <option key={d.id} value={String(d.id)}>{d.name}</option>)}
                </select>
              </div>
              <div className="bp-form-group">
                <label className="bp-label">{t('season')}</label>
                <select className="bp-select" value={selectedSeasonId} onChange={(e) => { setSelectedSeasonId(e.target.value); setForm({ ...form, collectionId: '' }) }}>
                  <option value="">--</option>
                  {seasons.map((s) => <option key={s.id} value={s.id}>{s.name}</option>)}
                </select>
              </div>
              <div className="bp-form-group">
                <label className="bp-label">Collection</label>
                <select className="bp-select" value={form.collectionId} onChange={(e) => setForm({ ...form, collectionId: e.target.value })} disabled={!selectedSeasonId}>
                  <option value="">--</option>
                  {collections.map((c) => <option key={c.id} value={c.id}>{c.name}</option>)}
                </select>
              </div>
              <div className="bp-form-group">
                <label className="bp-label">{t('supplier')}</label>
                <select className="bp-select" value={form.supplierId} onChange={(e) => setForm({ ...form, supplierId: e.target.value })}>
                  <option value="">--</option>
                  {suppliers.map((s) => <option key={s.id} value={s.id}>{s.name}</option>)}
                </select>
              </div>
              <div className="bp-form-group" style={{ gridColumn: '1 / -1' }}>
                <label className="bp-label">Description</label>
                <textarea className="bp-textarea" value={form.description} onChange={(e) => setForm({ ...form, description: e.target.value })} />
              </div>
            </div>
          ) : (
            <BpFieldGrid>
              <BpField label={t('category')}>{tConstants(`categories.${product.category}`)}</BpField>
              <BpField label={t('division')}>{product.division?.name || '-'}</BpField>
              <BpField label={t('targetPrice')}>{product.targetPrice != null ? usd.format(product.targetPrice) : '-'}</BpField>
              <BpField label={t('season')}>{product.collection?.season?.name || '-'}</BpField>
              <BpField label="Collection">{product.collection?.name || '-'}</BpField>
              <BpField label={t('supplier')}>{product.supplier?.name || '-'}</BpField>
              {product.description && <BpField label="Description">{product.description}</BpField>}
            </BpFieldGrid>
          )}
        </div>
      </div>

      <div className="bp-card">
        <div className="bp-card__header">
          <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
            <FlaskConical style={{ width: 20, height: 20, color: 'var(--color-primary)' }} />
            <h2 className="bp-card__title">{t('samples')}</h2>
          </div>
          <Link href={`/products/${params.id}/samples`}>
            <button className="bp-button bp-button--secondary bp-button--sm">
              {t('viewAllSamples')} ({product._count.samples})
              <ArrowUpRight style={{ width: 14, height: 14 }} />
            </button>
          </Link>
        </div>
        <div className="bp-card__content">
          <p style={{ fontSize: 'var(--font-size-sm)', color: 'var(--color-gray-500)' }}>
            {product._count.samples > 0
              ? `${product._count.samples} ${tCommon('items')}`
              : t('noSamples')
            }
          </p>
        </div>
      </div>
    </>
  )
}
