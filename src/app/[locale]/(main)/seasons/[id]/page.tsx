'use client'

import { useEffect, useState } from 'react'
import { useParams } from 'next/navigation'
import { Link, useRouter } from '@/lib/navigation'
import { PRODUCT_STATUS_COLORS } from '@/lib/constants'
import { Plus, Trash2, ArrowLeft } from 'lucide-react'
import { useTranslations } from 'next-intl'
import { BpPageHeader } from '@/components/common'

interface SeasonDetail {
  id: string
  name: string
  year: number
  term: string
  description: string | null
  collections: {
    id: string
    name: string
    description: string | null
    products: {
      id: string
      styleNumber: string
      name: string
      status: string
    }[]
  }[]
}

export default function SeasonDetailPage() {
  const params = useParams()
  const router = useRouter()
  const t = useTranslations('seasons')
  const tCommon = useTranslations('common')
  const tConstants = useTranslations('constants')
  const [season, setSeason] = useState<SeasonDetail | null>(null)
  const [newCollection, setNewCollection] = useState('')
  const [showCollForm, setShowCollForm] = useState(false)

  const fetchSeason = async () => {
    const res = await fetch(`/api/seasons/${params.id}`)
    if (!res.ok) { router.push('/seasons'); return }
    setSeason(await res.json())
  }

  useEffect(() => { fetchSeason() }, [params.id])

  const addCollection = async (e: React.FormEvent) => {
    e.preventDefault()
    await fetch('/api/collections', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ name: newCollection, seasonId: params.id }),
    })
    setNewCollection('')
    setShowCollForm(false)
    fetchSeason()
  }

  const deleteCollection = async (id: string) => {
    if (!confirm(t('deleteCollectionConfirm') || 'Delete this collection?')) return
    await fetch(`/api/collections/${id}`, { method: 'DELETE' })
    fetchSeason()
  }

  const deleteSeason = async () => {
    if (!confirm(t('deleteConfirm') || 'Delete this season?')) return
    await fetch(`/api/seasons/${params.id}`, { method: 'DELETE' })
    router.push('/seasons')
  }

  if (!season) return <div className="bp-spinner-wrap"><div className="bp-spinner" /></div>

  return (
    <>
      <BpPageHeader
        title={season.name}
        actions={
          <>
            <Link href="/seasons">
              <button className="bp-button bp-button--ghost bp-button--icon"><ArrowLeft style={{ width: 18, height: 18 }} /></button>
            </Link>
            <button className="bp-button bp-button--danger bp-button--sm" onClick={deleteSeason}>
              <Trash2 style={{ width: 14, height: 14 }} />{tCommon('delete')}
            </button>
          </>
        }
      />

      {season.description && (
        <p style={{ color: 'var(--color-gray-500)', marginBottom: 16 }}>{season.description}</p>
      )}

      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 16 }}>
        <h2 style={{ fontSize: 'var(--font-size-lg)', fontWeight: 600 }}>{t('collections') || 'Collections'}</h2>
        <button className="bp-button bp-button--secondary bp-button--sm" onClick={() => setShowCollForm(!showCollForm)}>
          <Plus style={{ width: 14, height: 14 }} />{t('addCollection') || 'Add Collection'}
        </button>
      </div>

      {showCollForm && (
        <form onSubmit={addCollection} style={{ display: 'flex', gap: 8, marginBottom: 16 }}>
          <input
            className="bp-input"
            value={newCollection}
            onChange={(e) => setNewCollection(e.target.value)}
            placeholder={t('collectionName') || 'Collection name'}
            required
            style={{ flex: 1 }}
          />
          <button type="submit" className="bp-button bp-button--primary bp-button--sm">{tCommon('save')}</button>
          <button type="button" className="bp-button bp-button--secondary bp-button--sm" onClick={() => setShowCollForm(false)}>{tCommon('cancel')}</button>
        </form>
      )}

      {season.collections.length === 0 ? (
        <p style={{ color: 'var(--color-gray-400)', textAlign: 'center', padding: 40 }}>{t('noCollections') || 'No collections yet'}</p>
      ) : (
        <div style={{ display: 'grid', gap: 16 }}>
          {season.collections.map((col) => (
            <div key={col.id} className="bp-card">
              <div className="bp-card__header">
                <h3 className="bp-card__title">{col.name}</h3>
                <button className="bp-button bp-button--ghost bp-button--icon bp-button--sm" onClick={() => deleteCollection(col.id)}>
                  <Trash2 style={{ width: 14, height: 14, color: 'var(--color-gray-400)' }} />
                </button>
              </div>
              <div className="bp-card__content">
                {col.products.length === 0 ? (
                  <p style={{ fontSize: 'var(--font-size-sm)', color: 'var(--color-gray-500)' }}>{tCommon('noData')}</p>
                ) : (
                  <table className="bp-table">
                    <thead>
                      <tr>
                        <th>{tConstants('products.styleNumber') || 'Style No.'}</th>
                        <th>{tConstants('products.productName') || 'Product Name'}</th>
                        <th>{tConstants('products.status') || 'Status'}</th>
                      </tr>
                    </thead>
                    <tbody>
                      {col.products.map((p) => (
                        <tr key={p.id}>
                          <td>
                            <Link href={`/products/${p.id}`} className="bp-table__link">{p.styleNumber}</Link>
                          </td>
                          <td>{p.name}</td>
                          <td>
                            <span className={`bp-badge ${PRODUCT_STATUS_COLORS[p.status]}`}>
                              {tConstants(`productStatus.${p.status}`)}
                            </span>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                )}
              </div>
            </div>
          ))}
        </div>
      )}
    </>
  )
}
