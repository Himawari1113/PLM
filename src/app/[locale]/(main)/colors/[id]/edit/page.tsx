'use client'

import { useEffect, useState } from 'react'
import { ArrowLeft } from 'lucide-react'
import { Link, useRouter } from '@/lib/navigation'
import { useParams } from 'next/navigation'
import { useTranslations } from 'next-intl'
import { BpPageHeader } from '@/components/common'

type ColorType = 'SOLID' | 'PATTERN'

export default function EditColorPage() {
  const params = useParams()
  const id = params.id as string
  const router = useRouter()
  const t = useTranslations('colors')
  const tCommon = useTranslations('common')

  const [loading, setLoading] = useState(true)
  const [submitting, setSubmitting] = useState(false)
  const [analyzing, setAnalyzing] = useState(false)
  const [submitError, setSubmitError] = useState('')
  const [previewUrl, setPreviewUrl] = useState('')
  const [pantoneCandidates, setPantoneCandidates] = useState<Array<{ code: string; name: string }>>([])
  const [form, setForm] = useState({
    colorCode: '',
    colorName: '',
    pantoneCode: '',
    pantoneName: '',
    rgbValue: '',
    colorImage: '',
    colorType: 'SOLID' as ColorType,
  })

  useEffect(() => {
    fetch(`/api/colors/${id}`)
      .then((r) => r.json())
      .then((data) => {
        setForm({
          colorCode: data.colorCode || '',
          colorName: data.colorName || '',
          pantoneCode: data.pantoneCode || '',
          pantoneName: data.pantoneName || '',
          rgbValue: data.rgbValue || '',
          colorImage: data.colorImage || '',
          colorType: data.colorType === 'PATTERN' ? 'PATTERN' : 'SOLID',
        })
        setPreviewUrl(data.colorImage || '')
      })
      .finally(() => setLoading(false))
  }, [id])

  const handleAnalyze = async (file: File) => {
    const reader = new FileReader()
    reader.onload = async () => {
      const dataUrl = String(reader.result || '')
      if (!dataUrl.includes(',')) return
      setPreviewUrl(dataUrl)
      setForm((prev) => ({ ...prev, colorImage: dataUrl }))

      const [meta, base64] = dataUrl.split(',')
      const mimeType = meta.match(/data:(.*);base64/)?.[1] || file.type || 'image/jpeg'

      setAnalyzing(true)
      try {
        const res = await fetch('/api/colors/analyze-pantone', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ imageBase64: base64, mimeType }),
        })
        if (res.ok) {
          const data = await res.json()
          if (data.normalizedImageBase64) {
            const normalizedUrl = `data:${data.normalizedMimeType || 'image/jpeg'};base64,${data.normalizedImageBase64}`
            setPreviewUrl(normalizedUrl)
            setForm((prev) => ({ ...prev, colorImage: normalizedUrl }))
          }
          if (data.pantoneCode) {
            setForm((prev) => ({ ...prev, pantoneCode: String(data.pantoneCode) }))
          }
          if (data.pantoneName) {
            setForm((prev) => ({ ...prev, pantoneName: String(data.pantoneName) }))
          }
          if (data.rgbValue) {
            setForm((prev) => ({ ...prev, rgbValue: String(data.rgbValue) }))
          }
          if (Array.isArray(data.candidates)) {
            setPantoneCandidates(
              data.candidates
                .map((c: { code?: string; name?: string }) => ({ code: String(c.code || ''), name: String(c.name || '') }))
                .filter((c: { code: string }) => c.code),
            )
          }
        }
      } finally {
        setAnalyzing(false)
      }
    }
    reader.readAsDataURL(file)
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setSubmitError('')
    setSubmitting(true)
    const res = await fetch(`/api/colors/${id}`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(form),
    })
    setSubmitting(false)
    if (res.ok) {
      router.push('/colors')
      return
    }
    const body = await res.json().catch(() => ({}))
    setSubmitError(body?.error || 'Failed to save color.')
  }

  if (loading) {
    return (
      <div className="bp-spinner-wrap">
        <div className="bp-spinner" />
      </div>
    )
  }

  return (
    <form onSubmit={handleSubmit}>
      <BpPageHeader
        title={t('editColor')}
        actions={
          <>
            <Link href="/colors">
              <button type="button" className="bp-button bp-button--ghost">
                <ArrowLeft style={{ width: 18, height: 18 }} />
                {t('backToColors')}
              </button>
            </Link>
            <button type="submit" className="bp-button bp-button--primary" disabled={submitting}>
              {tCommon('save')}
            </button>
            <Link href="/colors">
              <button type="button" className="bp-button bp-button--secondary">{tCommon('cancel')}</button>
            </Link>
          </>
        }
      />

      <div className="bp-card">
        <div className="bp-card__content">
          {submitError ? (
            <div style={{ marginBottom: 12, color: 'var(--color-danger)' }}>{submitError}</div>
          ) : null}
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: 16 }}>
            <div className="bp-form-group">
              <label className="bp-label">{t('colorCode')} *</label>
              <input
                className="bp-input"
                value={form.colorCode}
                onChange={(e) => setForm({ ...form, colorCode: e.target.value })}
                required
              />
            </div>
            <div className="bp-form-group">
              <label className="bp-label">{t('colorName')} *</label>
              <input
                className="bp-input"
                value={form.colorName}
                onChange={(e) => setForm({ ...form, colorName: e.target.value })}
                required
              />
            </div>

            <div className="bp-form-group">
              <label className="bp-label">{t('colorImage')}</label>
              <input
                type="file"
                className="bp-input"
                accept="image/*"
                onChange={(e) => {
                  const file = e.target.files?.[0]
                  if (file) handleAnalyze(file)
                }}
              />
            </div>
            <div className="bp-form-group">
              <label className="bp-label">{t('pantoneCode')}</label>
              <input
                className="bp-input"
                value={form.pantoneCode}
                onChange={(e) => setForm({ ...form, pantoneCode: e.target.value })}
                placeholder={analyzing ? t('analyzingPantone') : 'PANTONE 19-4052 C'}
              />
            </div>
            <div className="bp-form-group">
              <label className="bp-label">{t('pantoneName')}</label>
              <input
                className="bp-input"
                value={form.pantoneName}
                onChange={(e) => setForm({ ...form, pantoneName: e.target.value })}
                placeholder="Classic Blue"
              />
            </div>
            <div className="bp-form-group">
              <label className="bp-label">{t('rgbValue')}</label>
              <input
                className="bp-input"
                value={form.rgbValue}
                onChange={(e) => setForm({ ...form, rgbValue: e.target.value })}
                placeholder="RGB(0, 0, 0)"
              />
            </div>
            {pantoneCandidates.length > 0 ? (
              <div className="bp-form-group" style={{ gridColumn: '1 / -1' }}>
                <label className="bp-label">{t('pantoneCandidates')}</label>
                <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
                  {pantoneCandidates.map((candidate) => (
                    <button
                      key={candidate.code}
                      type="button"
                      className={`bp-button bp-button--sm ${form.pantoneCode === candidate.code ? 'bp-button--primary' : 'bp-button--secondary'}`}
                      onClick={() => setForm((prev) => ({ ...prev, pantoneCode: candidate.code, pantoneName: candidate.name }))}
                    >
                      {candidate.code}{candidate.name ? ` / ${candidate.name}` : ''}
                    </button>
                  ))}
                </div>
              </div>
            ) : null}

            <div className="bp-form-group" style={{ gridColumn: '1 / -1' }}>
              <label className="bp-label">{t('colorType')}</label>
              <div style={{ display: 'flex', gap: 8 }}>
                <button
                  type="button"
                  className={`bp-button ${form.colorType === 'SOLID' ? 'bp-button--primary' : 'bp-button--secondary'}`}
                  onClick={() => setForm({ ...form, colorType: 'SOLID' })}
                >
                  {t('solid')}
                </button>
                <button
                  type="button"
                  className={`bp-button ${form.colorType === 'PATTERN' ? 'bp-button--primary' : 'bp-button--secondary'}`}
                  onClick={() => setForm({ ...form, colorType: 'PATTERN' })}
                >
                  {t('pattern')}
                </button>
              </div>
            </div>

            {previewUrl ? (
              <div className="bp-form-group" style={{ gridColumn: '1 / -1' }}>
                <label className="bp-label">{t('preview')}</label>
                <img
                  src={previewUrl}
                  alt="color preview"
                  style={{ width: 240, height: 240, objectFit: 'cover', borderRadius: 'var(--radius-md)', border: '1px solid var(--color-border)' }}
                />
              </div>
            ) : null}
          </div>
        </div>
      </div>
    </form>
  )
}
