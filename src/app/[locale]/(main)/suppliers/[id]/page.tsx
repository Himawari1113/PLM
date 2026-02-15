'use client'

import { useEffect, useState } from 'react'
import { ArrowLeft, Trash2, Save } from 'lucide-react'
import { useTranslations } from 'next-intl'
import { Link, useRouter } from '@/lib/navigation'
import { useParams } from 'next/navigation'
import { BpField, BpFieldGrid, BpPageHeader } from '@/components/common'
import { PRODUCT_STATUS_COLORS } from '@/lib/constants'

interface SupplierDetail {
  id: string; name: string; contactPerson: string | null; email: string | null
  phone: string | null; address: string | null; country: string | null; description: string | null
  products: { id: string; styleNumber: string; name: string; status: string }[]
  supplierMaterials: { id: string; material: { id: string; name: string; type: string }; unitPrice: number | null; leadTime: number | null }[]
}

export default function SupplierDetailPage() {
  const params = useParams()
  const router = useRouter()
  const t = useTranslations('suppliers')
  const tCommon = useTranslations('common')
  const tProducts = useTranslations('products')
  const tMaterials = useTranslations('materials')
  const tConstants = useTranslations('constants')
  const [supplier, setSupplier] = useState<SupplierDetail | null>(null)
  const [editing, setEditing] = useState(false)
  const [form, setForm] = useState<any>({})

  const fetchSupplier = async () => {
    const res = await fetch(`/api/suppliers/${params.id}`)
    if (!res.ok) { router.push('/suppliers'); return }
    const data = await res.json()
    setSupplier(data)
    setForm({
      name: data.name, contactPerson: data.contactPerson || '',
      email: data.email || '', phone: data.phone || '',
      address: data.address || '', country: data.country || '',
      description: data.description || '',
    })
  }

  useEffect(() => { fetchSupplier() }, [params.id])

  const handleSave = async () => {
    await fetch(`/api/suppliers/${params.id}`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(form),
    })
    setEditing(false)
    fetchSupplier()
  }

  const handleDelete = async () => {
    if (!confirm(t('deleteConfirm'))) return
    await fetch(`/api/suppliers/${params.id}`, { method: 'DELETE' })
    router.push('/suppliers')
  }

  if (!supplier) return <div className="bp-spinner-wrap"><div className="bp-spinner" /></div>

  return (
    <>
      <BpPageHeader
        title={supplier.name}
        actions={
          <>
            <Link href="/suppliers">
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
          <h2 className="bp-card__title">{t('info')}</h2>
        </div>
        <div className="bp-card__content">
          {editing ? (
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: 16 }}>
              <div className="bp-form-group"><label className="bp-label">{t('companyName')}</label><input className="bp-input" value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} /></div>
              <div className="bp-form-group"><label className="bp-label">{t('contactPerson')}</label><input className="bp-input" value={form.contactPerson} onChange={(e) => setForm({ ...form, contactPerson: e.target.value })} /></div>
              <div className="bp-form-group"><label className="bp-label">{t('email')}</label><input className="bp-input" value={form.email} onChange={(e) => setForm({ ...form, email: e.target.value })} /></div>
              <div className="bp-form-group"><label className="bp-label">{t('phone')}</label><input className="bp-input" value={form.phone} onChange={(e) => setForm({ ...form, phone: e.target.value })} /></div>
              <div className="bp-form-group"><label className="bp-label">{t('country')}</label><input className="bp-input" value={form.country} onChange={(e) => setForm({ ...form, country: e.target.value })} /></div>
              <div className="bp-form-group"><label className="bp-label">{t('address')}</label><input className="bp-input" value={form.address} onChange={(e) => setForm({ ...form, address: e.target.value })} /></div>
              <div className="bp-form-group" style={{ gridColumn: '1 / -1' }}><label className="bp-label">{t('description')}</label><textarea className="bp-textarea" value={form.description} onChange={(e) => setForm({ ...form, description: e.target.value })} /></div>
            </div>
          ) : (
            <BpFieldGrid>
              <BpField label={t('contactPerson')}>{supplier.contactPerson || '-'}</BpField>
              <BpField label={t('email')}>{supplier.email || '-'}</BpField>
              <BpField label={t('phone')}>{supplier.phone || '-'}</BpField>
              <BpField label={t('country')}>{supplier.country || '-'}</BpField>
              <BpField label={t('address')}>{supplier.address || '-'}</BpField>
              {supplier.description && <BpField label={t('description')}>{supplier.description}</BpField>}
            </BpFieldGrid>
          )}
        </div>
      </div>

      <div className="bp-card" style={{ marginBottom: 24 }}>
        <div className="bp-card__header">
          <h2 className="bp-card__title">{t('productsCount')}</h2>
        </div>
        <div className="bp-card__content">
          {supplier.products.length === 0 ? (
            <p style={{ fontSize: 'var(--font-size-sm)', color: 'var(--color-gray-500)' }}>{tCommon('noData')}</p>
          ) : (
            <table className="bp-table">
              <thead>
                <tr>
                  <th>{tProducts('styleNumber')}</th>
                  <th>{tProducts('productName')}</th>
                  <th>{tProducts('status')}</th>
                </tr>
              </thead>
              <tbody>
                {supplier.products.map((p) => (
                  <tr key={p.id}>
                    <td><Link href={`/products/${p.id}`} className="bp-table__link">{p.styleNumber}</Link></td>
                    <td>{p.name}</td>
                    <td><span className={`bp-badge ${PRODUCT_STATUS_COLORS[p.status]}`}>{tConstants(`productStatus.${p.status}`)}</span></td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>
      </div>

      <div className="bp-card">
        <div className="bp-card__header">
          <h2 className="bp-card__title">{t('materialsCount')}</h2>
        </div>
        <div className="bp-card__content">
          {supplier.supplierMaterials.length === 0 ? (
            <p style={{ fontSize: 'var(--font-size-sm)', color: 'var(--color-gray-500)' }}>{tCommon('noData')}</p>
          ) : (
            <table className="bp-table">
              <thead>
                <tr>
                  <th>{tMaterials('name')}</th>
                  <th>{tMaterials('type')}</th>
                  <th>{tMaterials('unitPrice')}</th>
                  <th>{tMaterials('leadTime')}</th>
                </tr>
              </thead>
              <tbody>
                {supplier.supplierMaterials.map((sm) => (
                  <tr key={sm.id}>
                    <td><Link href={`/materials/${sm.material.id}`} className="bp-table__link">{sm.material.name}</Link></td>
                    <td>{tConstants(`materialTypes.${sm.material.type}`)}</td>
                    <td>{sm.unitPrice ? `¥${sm.unitPrice.toLocaleString()}` : '-'}</td>
                    <td>{sm.leadTime ? `${sm.leadTime} ${tCommon('days')}` : '-'}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>
      </div>
    </>
  )
}
