'use client'

import { useState } from 'react'
import { signIn } from 'next-auth/react'
import { useRouter } from 'next/navigation'
import { Sparkles, User, Lock, AlertCircle } from 'lucide-react'
import { useTranslations } from 'next-intl'

export default function LoginPage() {
  const router = useRouter()
  const t = useTranslations('login')

  const [userid, setUserid] = useState('')
  const [password, setPassword] = useState('')
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setError('')
    setLoading(true)

    const result = await signIn('credentials', {
      userid,
      password,
      redirect: false,
    })

    setLoading(false)

    if (result?.error) {
      setError(t('error'))
    } else {
      router.push('/dashboard')
      router.refresh()
    }
  }

  return (
    <div style={{ display: 'flex', minHeight: '100vh', alignItems: 'center', justifyContent: 'center', padding: 16, position: 'relative', overflow: 'hidden', background: 'var(--color-gray-50)' }}>
      <div className="bp-card" style={{ width: '100%', maxWidth: 420, boxShadow: 'var(--shadow-xl)', overflow: 'hidden', position: 'relative' }}>
        <div style={{ textAlign: 'center', padding: '32px 24px 0' }}>
          <div style={{ display: 'inline-flex', alignItems: 'center', justifyContent: 'center', width: 64, height: 64, borderRadius: 16, background: 'var(--color-gray-800)', marginBottom: 16 }}>
            <Sparkles style={{ width: 32, height: 32, color: '#fff' }} />
          </div>
          <h1 style={{ fontSize: 'var(--font-size-2xl)', fontWeight: 700, marginBottom: 4 }}>{t('title')}</h1>
          <p style={{ fontSize: 'var(--font-size-sm)', color: 'var(--color-gray-500)', marginBottom: 24 }}>{t('subtitle')}</p>
        </div>

        <div className="bp-card__content" style={{ padding: '0 24px 32px' }}>
          <form onSubmit={handleSubmit}>
            {error && (
              <div style={{ display: 'flex', alignItems: 'flex-start', gap: 12, padding: 12, borderRadius: 'var(--radius-md)', background: 'var(--color-gray-50)', border: '1px solid var(--color-gray-200)', marginBottom: 20 }}>
                <AlertCircle style={{ width: 20, height: 20, color: 'var(--color-danger)', flexShrink: 0, marginTop: 2 }} />
                <div>
                  <p style={{ fontSize: 'var(--font-size-sm)', fontWeight: 500, color: 'var(--color-danger)' }}>{error}</p>
                  <p style={{ fontSize: 'var(--font-size-xs)', color: 'var(--color-gray-500)', marginTop: 4 }}>{t('errorSubtext')}</p>
                </div>
              </div>
            )}

            <div className="bp-form-group" style={{ marginBottom: 16 }}>
              <label className="bp-label" htmlFor="userid">{t('userid')}</label>
              <div style={{ position: 'relative' }}>
                <User style={{ position: 'absolute', left: 12, top: '50%', transform: 'translateY(-50%)', width: 16, height: 16, color: 'var(--color-gray-400)' }} />
                <input
                  id="userid"
                  className="bp-input"
                  type="text"
                  placeholder={t('useridPlaceholder')}
                  value={userid}
                  onChange={(e) => setUserid(e.target.value)}
                  required
                  style={{ paddingLeft: 40, height: 48 }}
                />
              </div>
            </div>

            <div className="bp-form-group" style={{ marginBottom: 20 }}>
              <label className="bp-label" htmlFor="password">{t('password')}</label>
              <div style={{ position: 'relative' }}>
                <Lock style={{ position: 'absolute', left: 12, top: '50%', transform: 'translateY(-50%)', width: 16, height: 16, color: 'var(--color-gray-400)' }} />
                <input
                  id="password"
                  className="bp-input"
                  type="password"
                  placeholder={t('passwordPlaceholder')}
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  required
                  style={{ paddingLeft: 40, height: 48 }}
                />
              </div>
            </div>

            <button
              type="submit"
              className="bp-button bp-button--primary"
              disabled={loading}
              style={{ width: '100%', height: 48, fontSize: 'var(--font-size-base)', fontWeight: 600 }}
            >
              {loading ? (
                <span style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                  <span className="bp-spinner bp-spinner--sm" />
                  {t('loggingIn')}
                </span>
              ) : (
                t('loginButton')
              )}
            </button>

            <div style={{ position: 'relative', margin: '20px 0', textAlign: 'center' }}>
              <div style={{ position: 'absolute', inset: 0, display: 'flex', alignItems: 'center' }}>
                <div style={{ width: '100%', borderTop: '1px solid var(--color-gray-200)' }} />
              </div>
              <span style={{ position: 'relative', background: '#fff', padding: '0 12px', fontSize: 'var(--font-size-xs)', color: 'var(--color-gray-500)', fontWeight: 500 }}>
                {t('demoAccount')}
              </span>
            </div>

            <div style={{ borderRadius: 'var(--radius-md)', background: 'var(--color-gray-50)', border: '1px solid var(--color-gray-200)', padding: 16, display: 'flex', justifyContent: 'space-between' }}>
              <div>
                <p style={{ fontSize: 'var(--font-size-xs)', fontWeight: 600 }}>User ID</p>
                <p style={{ fontSize: 'var(--font-size-xs)', color: 'var(--color-gray-500)', fontFamily: 'monospace' }}>admin</p>
              </div>
              <div>
                <p style={{ fontSize: 'var(--font-size-xs)', fontWeight: 600 }}>Password</p>
                <p style={{ fontSize: 'var(--font-size-xs)', color: 'var(--color-gray-500)', fontFamily: 'monospace' }}>password</p>
              </div>
            </div>
          </form>
        </div>
      </div>
    </div>
  )
}
