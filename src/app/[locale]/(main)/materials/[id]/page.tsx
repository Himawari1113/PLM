'use client'

import { useEffect, useState } from 'react'
import { useParams } from 'next/navigation'
import { useRouter, Link } from '@/lib/navigation'
import { MATERIAL_TYPE_LABELS } from '@/lib/constants'
import { ArrowLeft, Trash2, Save } from 'lucide-react'
import { useTranslations } from 'next-intl'
import { BpField, BpFieldGrid, BpPageHeader } from '@/components/common'

interface MaterialDetail {
  id: string; name: string; type: string; composition: string | null
  color: string | null; weight: string | null; width: string | null
  unitPrice: number | null; unit: string | null; description: string | null
  bomItems: { id: string; quantity: number; sample: { id: string; sampleName: string; product: { id: string; styleNumber: string; name: string } } }[]
  supplierMaterials: { id: string; supplier: { id: string; name: string }; unitPrice: number | null; leadTime: number | null }[]
}

export default function MaterialDetailPage() {
  const params = useParams()
  const router = useRouter()
  const t = useTranslations('materials')
  const tCommon = useTranslations('common')
  const tConstants = useTranslations('constants')
  const [material, setMaterial] = useState<MaterialDetail | null>(null)
  const [editing, setEditing] = useState(false)
  const [form, setForm] = useState<any>({})

  const fetchMaterial = async () => {
    const res = await fetch(`/api/materials/${params.id}`)
    if (!res.ok) { router.push('/materials'); return }
    const data = await res.json()
    setMaterial(data)
    setForm({
      name: data.name, type: data.type, composition: data.composition || '',
      color: data.color || '', weight: data.weight || '', width: data.width || '',
      unitPrice: data.unitPrice || '', unit: data.unit || '', description: data.description || '',
    })
  }

  useEffect(() => { fetchMaterial() }, [params.id])

  const handleSave = async () => {
    await fetch(`/api/materials/${params.id}`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(form),
    })
    setEditing(false)
    fetchMaterial()
  }

  const handleDelete = async () => {
    if (!confirm(t('deleteConfirm'))) return
    await fetch(`/api/materials/${params.id}`, { method: 'DELETE' })
    router.push('/materials')
  }

  if (!material) return <div className="bp-spinner-wrap"><div className="bp-spinner" /></div>

  return (
    <>
      <BpPageHeader
        title={material.name}
        titleMeta={<span className="bp-badge bp-badge--neutral">{tConstants(`materialTypes.${material.type}`)}</span>}
        actions={
          <>
            <Link href="/materials">
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
              <div className="bp-form-group"><label className="bp-label">{t('name')}</label><input className="bp-input" value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} /></div>
              <div className="bp-form-group"><label className="bp-label">{t('type')}</label>
                <select className="bp-select" value={form.type} onChange={(e) => setForm({ ...form, type: e.target.value })}>
                  {Object.keys(MATERIAL_TYPE_LABELS).map((k) => <option key={k} value={k}>{tConstants(`materialTypes.${k}`)}</option>)}
                </select>
              </div>
              <div className="bp-form-group"><label className="bp-label">{t('composition')}</label><input className="bp-input" value={form.composition} onChange={(e) => setForm({ ...form, composition: e.target.value })} /></div>
              <div className="bp-form-group"><label className="bp-label">{t('color')}</label><input className="bp-input" value={form.color} onChange={(e) => setForm({ ...form, color: e.target.value })} /></div>
              <div className="bp-form-group"><label className="bp-label">{t('weight')}</label><input className="bp-input" value={form.weight} onChange={(e) => setForm({ ...form, weight: e.target.value })} /></div>
              <div className="bp-form-group"><label className="bp-label">{t('width')}</label><input className="bp-input" value={form.width} onChange={(e) => setForm({ ...form, width: e.target.value })} /></div>
              <div className="bp-form-group"><label className="bp-label">{t('unitPrice')}</label><input className="bp-input" type="number" value={form.unitPrice} onChange={(e) => setForm({ ...form, unitPrice: e.target.value })} /></div>
              <div className="bp-form-group"><label className="bp-label">{t('unit')}</label><input className="bp-input" value={form.unit} onChange={(e) => setForm({ ...form, unit: e.target.value })} /></div>
              <div className="bp-form-group" style={{ gridColumn: '1 / -1' }}><label className="bp-label">{t('description')}</label><textarea className="bp-textarea" value={form.description} onChange={(e) => setForm({ ...form, description: e.target.value })} /></div>
            </div>
          ) : (
            <BpFieldGrid>
              <BpField label={t('composition')}>{material.composition || '-'}</BpField>
              <BpField label={t('color')}>{material.color || '-'}</BpField>
              <BpField label={t('weight')}>{material.weight || '-'}</BpField>
              <BpField label={t('width')}>{material.width || '-'}</BpField>
              <BpField label={t('unitPrice')}>{material.unitPrice ? `¥${material.unitPrice.toLocaleString()}/${material.unit || ''}` : '-'}</BpField>
              {material.description && <BpField label={t('description')}>{material.description}</BpField>}
            </BpFieldGrid>
          )}
        </div>
      </div>

      <div className="bp-card" style={{ marginBottom: 24 }}>
        <div className="bp-card__header">
          <h2 className="bp-card__title">{t('usedProducts')}</h2>
        </div>
        <div className="bp-card__content">
          {material.bomItems.length === 0 ? (
            <p style={{ fontSize: 'var(--font-size-sm)', color: 'var(--color-gray-500)' }}>{t('noProducts')}</p>
          ) : (
            <table className="bp-table">
              <thead>
                <tr>
                  <th>{t('products.styleNumber')}</th>
                  <th>{t('products.productName')}</th>
                  <th>{t('usage')}</th>
                </tr>
              </thead>
              <tbody>
                {material.bomItems.map((item) => (
                  <tr key={item.id}>
                    <td>
                      <Link href={`/products/${item.sample.product.id}`} className="bp-table__link">
                        {item.sample.product.styleNumber}
                      </Link>
                    </td>
                    <td>{item.sample.product.name} / {item.sample.sampleName}</td>
                    <td>{item.quantity}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>
      </div>

      <div className="bp-card">
        <div className="bp-card__header">
          <h2 className="bp-card__title">{t('suppliers')}</h2>
        </div>
        <div className="bp-card__content">
          {material.supplierMaterials.length === 0 ? (
            <p style={{ fontSize: 'var(--font-size-sm)', color: 'var(--color-gray-500)' }}>{t('noSuppliers')}</p>
          ) : (
            <table className="bp-table">
              <thead>
                <tr>
                  <th>{t('nav.suppliers')}</th>
                  <th>{t('unitPrice')}</th>
                  <th>{t('leadTime')}</th>
                </tr>
              </thead>
              <tbody>
                {material.supplierMaterials.map((sm) => (
                  <tr key={sm.id}>
                    <td>
                      <Link href={`/suppliers/${sm.supplier.id}`} className="bp-table__link">
                        {sm.supplier.name}
                      </Link>
                    </td>
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
