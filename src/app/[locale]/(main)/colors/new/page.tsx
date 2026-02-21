'use client'

import { useState } from 'react'
import { ArrowLeft } from 'lucide-react'
import { Link, useRouter } from '@/lib/navigation'
import { useTranslations } from 'next-intl'
import { BpPageHeader } from '@/components/common'

type ColorType = 'SOLID' | 'PATTERN'

export default function NewColorPage() {
  const router = useRouter()
  const t = useTranslations('colors')
  const tCommon = useTranslations('common')

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
    cmykC: '',
    cmykM: '',
    cmykY: '',
    cmykK: '',
    colorTemperature: '',
  })

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
          if (data.pantoneCode) setForm((prev) => ({ ...prev, pantoneCode: String(data.pantoneCode) }))
          if (data.pantoneName) setForm((prev) => ({ ...prev, pantoneName: String(data.pantoneName) }))
          if (data.rgbValue) setForm((prev) => ({ ...prev, rgbValue: String(data.rgbValue) }))
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
    const payload = {
      ...form,
      cmykC: form.cmykC !== '' ? parseInt(form.cmykC) : null,
      cmykM: form.cmykM !== '' ? parseInt(form.cmykM) : null,
      cmykY: form.cmykY !== '' ? parseInt(form.cmykY) : null,
      cmykK: form.cmykK !== '' ? parseInt(form.cmykK) : null,
      colorTemperature: form.colorTemperature || null,
    }
    const res = await fetch('/api/colors', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload),
    })
    setSubmitting(false)
    if (res.ok) { router.push('/colors'); return }
    const body = await res.json().catch(() => ({}))
    setSubmitError(body?.error || 'Failed to save color.')
  }

  return (
    <form onSubmit={handleSubmit}>
      <BpPageHeader
        title={t('newColor')}
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
          {submitError && <div style={{ marginBottom: 12, color: 'var(--color-danger)' }}>{submitError}</div>}
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: 16 }}>
            <div className="bp-form-group">
              <label className="bp-label">{t('colorCode')} *</label>
              <input className="bp-input" value={form.colorCode} onChange={(e) => setForm({ ...form, colorCode: e.target.value })} required />
            </div>
            <div className="bp-form-group">
              <label className="bp-label">{t('colorName')} *</label>
              <input className="bp-input" value={form.colorName} onChange={(e) => setForm({ ...form, colorName: e.target.value })} required />
            </div>

            <div className="bp-form-group">
              <label className="bp-label">{t('colorImage')} *</label>
              <input
                type="file" className="bp-input" accept="image/*" required
                onChange={(e) => { const file = e.target.files?.[0]; if (file) handleAnalyze(file) }}
              />
            </div>
            <div className="bp-form-group">
              <label className="bp-label">{t('pantoneCode')}</label>
              <input
                className="bp-input" value={form.pantoneCode}
                onChange={(e) => setForm({ ...form, pantoneCode: e.target.value })}
                placeholder={analyzing ? t('analyzingPantone') : 'PANTONE 19-4052 C'}
              />
            </div>
            <div className="bp-form-group">
              <label className="bp-label">{t('pantoneName')}</label>
              <input className="bp-input" value={form.pantoneName} onChange={(e) => setForm({ ...form, pantoneName: e.target.value })} placeholder="Classic Blue" />
            </div>
            <div className="bp-form-group">
              <label className="bp-label">{t('rgbValue')}</label>
              <input className="bp-input" value={form.rgbValue} onChange={(e) => setForm({ ...form, rgbValue: e.target.value })} placeholder="rgb(0, 0, 0)" />
            </div>

            {/* CMYK */}
            <div className="bp-form-group" style={{ gridColumn: '1 / -1' }}>
              <label className="bp-label">CMYK (0–100)</label>
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 8 }}>
                {(['cmykC', 'cmykM', 'cmykY', 'cmykK'] as const).map((key, i) => (
                  <div key={key}>
                    <label style={{ fontSize: 'var(--font-size-xs)', color: 'var(--color-text-secondary)', marginBottom: 2, display: 'block' }}>
                      {['C', 'M', 'Y', 'K'][i]}
                    </label>
                    <input
                      className="bp-input" type="number" min={0} max={100}
                      value={form[key]}
                      onChange={(e) => setForm({ ...form, [key]: e.target.value })}
                      placeholder="0"
                    />
                  </div>
                ))}
              </div>
            </div>

            {/* Color Temperature */}
            <div className="bp-form-group">
              <label className="bp-label">Color Temperature</label>
              <select className="bp-select" value={form.colorTemperature} onChange={(e) => setForm({ ...form, colorTemperature: e.target.value })}>
                <option value="">-- Select --</option>
                <option value="WARM">🔥 Warm</option>
                <option value="COOL">❄️ Cool</option>
                <option value="NEUTRAL">⚪ Neutral</option>
              </select>
            </div>

            {pantoneCandidates.length > 0 && (
              <div className="bp-form-group" style={{ gridColumn: '1 / -1' }}>
                <label className="bp-label">{t('pantoneCandidates')}</label>
                <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
                  {pantoneCandidates.map((candidate) => (
                    <button
                      key={candidate.code} type="button"
                      className={`bp-button bp-button--sm ${form.pantoneCode === candidate.code ? 'bp-button--primary' : 'bp-button--secondary'}`}
                      onClick={() => setForm((prev) => ({ ...prev, pantoneCode: candidate.code, pantoneName: candidate.name }))}
                    >
                      {candidate.code}{candidate.name ? ` / ${candidate.name}` : ''}
                    </button>
                  ))}
                </div>
              </div>
            )}

            <div className="bp-form-group" style={{ gridColumn: '1 / -1' }}>
              <label className="bp-label">{t('colorType')}</label>
              <div style={{ display: 'flex', gap: 8 }}>
                <button type="button" className={`bp-button ${form.colorType === 'SOLID' ? 'bp-button--primary' : 'bp-button--secondary'}`} onClick={() => setForm({ ...form, colorType: 'SOLID' })}>{t('solid')}</button>
                <button type="button" className={`bp-button ${form.colorType === 'PATTERN' ? 'bp-button--primary' : 'bp-button--secondary'}`} onClick={() => setForm({ ...form, colorType: 'PATTERN' })}>{t('pattern')}</button>
              </div>
            </div>

            {previewUrl && (
              <div className="bp-form-group" style={{ gridColumn: '1 / -1' }}>
                <label className="bp-label">{t('preview')}</label>
                <img src={previewUrl} alt="color preview" style={{ width: 240, height: 240, objectFit: 'cover', borderRadius: 'var(--radius-md)', border: '1px solid var(--color-border)' }} />
              </div>
            )}
          </div>
        </div>
      </div>
    </form>
  )
}
