'use client'

import { useState } from 'react'
import { useRouter, Link } from '@/lib/navigation'
import { MATERIAL_TYPE_LABELS } from '@/lib/constants'
import { ArrowLeft } from 'lucide-react'
import { useTranslations } from 'next-intl'
import { BpPageHeader } from '@/components/common'

export default function NewMaterialPage() {
  const router = useRouter()
  const t = useTranslations('materials')
  const tCommon = useTranslations('common')
  const tConstants = useTranslations('constants')
  const [form, setForm] = useState({
    name: '', type: 'FABRIC', composition: '', color: '',
    weight: '', width: '', unitPrice: '', unit: 'm', description: '',
  })

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    const res = await fetch('/api/materials', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(form),
    })
    if (res.ok) {
      const material = await res.json()
      router.push(`/materials/${material.id}`)
    }
  }

  return (
    <>
      <form onSubmit={handleSubmit}>
        <BpPageHeader
          title={t('newMaterial')}
          actions={
            <>
              <Link href="/materials">
                <button type="button" className="bp-button bp-button--ghost">
                  <ArrowLeft style={{ width: 18, height: 18 }} />
                  {t('backToMaterials')}
                </button>
              </Link>
              <button type="submit" className="bp-button bp-button--primary">{tCommon('save')}</button>
              <Link href="/materials"><button type="button" className="bp-button bp-button--secondary">{tCommon('cancel')}</button></Link>
            </>
          }
        />

        <div className="bp-card">
          <div className="bp-card__content">
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: 16 }}>
            <div className="bp-form-group"><label className="bp-label">{t('name')} *</label><input className="bp-input" value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} placeholder={t('namePlaceholder')} required /></div>
            <div className="bp-form-group"><label className="bp-label">{t('type')}</label>
              <select className="bp-select" value={form.type} onChange={(e) => setForm({ ...form, type: e.target.value })}>
                {Object.keys(MATERIAL_TYPE_LABELS).map((k) => <option key={k} value={k}>{tConstants(`materialTypes.${k}`)}</option>)}
              </select>
            </div>
            <div className="bp-form-group"><label className="bp-label">{t('composition')}</label><input className="bp-input" value={form.composition} onChange={(e) => setForm({ ...form, composition: e.target.value })} placeholder={t('compositionPlaceholder')} /></div>
            <div className="bp-form-group"><label className="bp-label">{t('color')}</label><input className="bp-input" value={form.color} onChange={(e) => setForm({ ...form, color: e.target.value })} placeholder={t('colorPlaceholder')} /></div>
            <div className="bp-form-group"><label className="bp-label">{t('weight')}</label><input className="bp-input" value={form.weight} onChange={(e) => setForm({ ...form, weight: e.target.value })} placeholder={t('weightPlaceholder')} /></div>
            <div className="bp-form-group"><label className="bp-label">{t('width')}</label><input className="bp-input" value={form.width} onChange={(e) => setForm({ ...form, width: e.target.value })} placeholder={t('widthPlaceholder')} /></div>
            <div className="bp-form-group"><label className="bp-label">{t('unitPrice')}</label><input className="bp-input" type="number" value={form.unitPrice} onChange={(e) => setForm({ ...form, unitPrice: e.target.value })} placeholder={t('pricePlaceholder')} /></div>
            <div className="bp-form-group"><label className="bp-label">{t('unit')}</label><input className="bp-input" value={form.unit} onChange={(e) => setForm({ ...form, unit: e.target.value })} placeholder={t('unitPlaceholder')} /></div>
            <div className="bp-form-group" style={{ gridColumn: '1 / -1' }}><label className="bp-label">{t('description')}</label><textarea className="bp-textarea" value={form.description} onChange={(e) => setForm({ ...form, description: e.target.value })} rows={3} /></div>
            </div>
          </div>
        </div>
      </form>
    </>
  )
}
