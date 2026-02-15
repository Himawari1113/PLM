'use client'

import { useState } from 'react'
import { useRouter, Link } from '@/lib/navigation'
import { ArrowLeft } from 'lucide-react'
import { useTranslations } from 'next-intl'
import { BpPageHeader } from '@/components/common'

export default function NewSupplierPage() {
  const router = useRouter()
  const t = useTranslations('suppliers')
  const tCommon = useTranslations('common')
  const [form, setForm] = useState({
    name: '', contactPerson: '', email: '', phone: '',
    address: '', country: '', description: '',
  })

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    const res = await fetch('/api/suppliers', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(form),
    })
    if (res.ok) {
      const supplier = await res.json()
      router.push(`/suppliers/${supplier.id}`)
    }
  }

  return (
    <>
      <form onSubmit={handleSubmit}>
        <BpPageHeader
          title={t('newSupplier')}
          actions={
            <>
              <Link href="/suppliers">
                <button type="button" className="bp-button bp-button--ghost">
                  <ArrowLeft style={{ width: 18, height: 18 }} />
                  {t('backToSuppliers')}
                </button>
              </Link>
              <button type="submit" className="bp-button bp-button--primary">{tCommon('save')}</button>
              <Link href="/suppliers"><button type="button" className="bp-button bp-button--secondary">{tCommon('cancel')}</button></Link>
            </>
          }
        />

        <div className="bp-card">
          <div className="bp-card__content">
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: 16 }}>
            <div className="bp-form-group"><label className="bp-label">{t('companyName')} *</label><input className="bp-input" value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} placeholder={t('namePlaceholder')} required /></div>
            <div className="bp-form-group"><label className="bp-label">{t('contactPerson')}</label><input className="bp-input" value={form.contactPerson} onChange={(e) => setForm({ ...form, contactPerson: e.target.value })} /></div>
            <div className="bp-form-group"><label className="bp-label">{t('email')}</label><input className="bp-input" type="email" value={form.email} onChange={(e) => setForm({ ...form, email: e.target.value })} /></div>
            <div className="bp-form-group"><label className="bp-label">{t('phone')}</label><input className="bp-input" value={form.phone} onChange={(e) => setForm({ ...form, phone: e.target.value })} /></div>
            <div className="bp-form-group"><label className="bp-label">{t('country')}</label><input className="bp-input" value={form.country} onChange={(e) => setForm({ ...form, country: e.target.value })} placeholder={t('countryPlaceholder')} /></div>
            <div className="bp-form-group"><label className="bp-label">{t('address')}</label><input className="bp-input" value={form.address} onChange={(e) => setForm({ ...form, address: e.target.value })} /></div>
            <div className="bp-form-group" style={{ gridColumn: '1 / -1' }}><label className="bp-label">{t('description')}</label><textarea className="bp-textarea" value={form.description} onChange={(e) => setForm({ ...form, description: e.target.value })} rows={3} /></div>
            </div>
          </div>
        </div>
      </form>
    </>
  )
}
