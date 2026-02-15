'use client'

import { useEffect, useState } from 'react'
import { Link, useRouter } from '@/lib/navigation'
import { PRODUCT_CATEGORIES } from '@/lib/constants'
import { ArrowLeft } from 'lucide-react'
import { useTranslations } from 'next-intl'
import { BpPageHeader } from '@/components/common'

interface Season {
  id: string
  name: string
  collections: { id: string; name: string }[]
}

interface Supplier {
  id: string
  name: string
}

interface Division {
  id: number
  name: string
}

export default function NewProductPage() {
  const router = useRouter()
  const t = useTranslations('products')
  const tCommon = useTranslations('common')
  const tConstants = useTranslations('constants')
  const [seasons, setSeasons] = useState<Season[]>([])
  const [suppliers, setSuppliers] = useState<Supplier[]>([])
  const [divisions, setDivisions] = useState<Division[]>([])
  const [error, setError] = useState('')
  const [form, setForm] = useState({
    styleNumber: '', name: '', category: 'TOPS',
    description: '', targetPrice: '', collectionId: '', supplierId: '', divisionId: '',
  })
  const [selectedSeasonId, setSelectedSeasonId] = useState('')

  useEffect(() => {
    fetch('/api/seasons').then((r) => r.json().catch(() => [])).then((data) => setSeasons(Array.isArray(data) ? data : []))
    fetch('/api/suppliers').then((r) => r.json().catch(() => [])).then((data) => setSuppliers(Array.isArray(data) ? data : []))
    fetch('/api/divisions').then((r) => r.json().catch(() => [])).then((data) => setDivisions(Array.isArray(data) ? data : []))
  }, [])

  const collections = seasons.find((s) => s.id === selectedSeasonId)?.collections || []

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setError('')
    const res = await fetch('/api/products', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(form),
    })
    if (res.ok) {
      const product = await res.json()
      router.push(`/products/${product.id}`)
      return
    }
    const body = await res.json().catch(() => ({}))
    setError(body?.error || 'Failed to create product')
  }

  return (
    <>
      <form onSubmit={handleSubmit}>
        <BpPageHeader
          title={t('newProduct')}
          actions={
            <>
              <Link href="/products">
                <button type="button" className="bp-button bp-button--ghost">
                  <ArrowLeft style={{ width: 18, height: 18 }} />
                  {t('backToProducts')}
                </button>
              </Link>
              <button type="submit" className="bp-button bp-button--primary">{tCommon('save')}</button>
              <Link href="/products"><button type="button" className="bp-button bp-button--secondary">{tCommon('cancel')}</button></Link>
            </>
          }
        />

        <div className="bp-card">
          <div className="bp-card__content">
            {error ? <p style={{ color: 'var(--color-danger)', marginBottom: 12 }}>{error}</p> : null}
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: 16 }}>
            <div className="bp-form-group"><label className="bp-label">{t('styleNumber')} *</label><input className="bp-input" value={form.styleNumber} onChange={(e) => setForm({ ...form, styleNumber: e.target.value })} placeholder={t('styleNumberPlaceholder')} required /></div>
            <div className="bp-form-group"><label className="bp-label">{t('productName')} *</label><input className="bp-input" value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} placeholder={t('productNamePlaceholder')} required /></div>
            <div className="bp-form-group"><label className="bp-label">{t('category')}</label>
              <select className="bp-select" value={form.category} onChange={(e) => setForm({ ...form, category: e.target.value })}>
                {PRODUCT_CATEGORIES.map((c) => <option key={c.value} value={c.value}>{tConstants(`categories.${c.value}`)}</option>)}
              </select>
            </div>
            <div className="bp-form-group"><label className="bp-label">{t('targetPrice')}</label><input className="bp-input" type="number" value={form.targetPrice} onChange={(e) => setForm({ ...form, targetPrice: e.target.value })} placeholder={t('pricePlaceholderUsd')} /></div>
            <div className="bp-form-group"><label className="bp-label">{t('division')}</label>
              <select className="bp-select" value={form.divisionId} onChange={(e) => setForm({ ...form, divisionId: e.target.value })}>
                <option value="">{tCommon('select')}</option>
                {divisions.map((d) => <option key={d.id} value={String(d.id)}>{d.name}</option>)}
              </select>
            </div>
            <div className="bp-form-group"><label className="bp-label">{t('season')}</label>
              <select className="bp-select" value={selectedSeasonId} onChange={(e) => { setSelectedSeasonId(e.target.value); setForm({ ...form, collectionId: '' }) }}>
                <option value="">{tCommon('select')}</option>
                {seasons.map((s) => <option key={s.id} value={s.id}>{s.name}</option>)}
              </select>
            </div>
            <div className="bp-form-group"><label className="bp-label">{t('collection')}</label>
              <select className="bp-select" value={form.collectionId} onChange={(e) => setForm({ ...form, collectionId: e.target.value })} disabled={!selectedSeasonId}>
                <option value="">{tCommon('select')}</option>
                {collections.map((c) => <option key={c.id} value={c.id}>{c.name}</option>)}
              </select>
            </div>
            <div className="bp-form-group"><label className="bp-label">{t('supplier')}</label>
              <select className="bp-select" value={form.supplierId} onChange={(e) => setForm({ ...form, supplierId: e.target.value })}>
                <option value="">{tCommon('select')}</option>
                {suppliers.map((s) => <option key={s.id} value={s.id}>{s.name}</option>)}
              </select>
            </div>
            <div className="bp-form-group" style={{ gridColumn: '1 / -1' }}><label className="bp-label">{t('description')}</label><textarea className="bp-textarea" value={form.description} onChange={(e) => setForm({ ...form, description: e.target.value })} rows={3} /></div>
            </div>
          </div>
        </div>
      </form>
    </>
  )
}
