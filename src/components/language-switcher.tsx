'use client'

import { useLocale } from 'next-intl'
import { useRouter, usePathname } from '@/lib/navigation'
import { Globe } from 'lucide-react'
import { useTransition, memo } from 'react'

export const LanguageSwitcher = memo(function LanguageSwitcher() {
  const locale = useLocale()
  const router = useRouter()
  const pathname = usePathname()
  const [isPending, startTransition] = useTransition()

  const switchLanguage = () => {
    const newLocale = locale === 'ja' ? 'en' : 'ja'
    startTransition(() => {
      router.replace(pathname, { locale: newLocale })
    })
  }

  return (
    <button
      onClick={switchLanguage}
      disabled={isPending}
      className="bp-button bp-button--ghost"
      title={locale === 'ja' ? 'Switch to English' : '日本語に切り替え'}
      style={{ gap: '6px', opacity: isPending ? 0.5 : 1 }}
    >
      <Globe style={{ width: 18, height: 18 }} />
      <span style={{ fontSize: 'var(--font-size-sm)', fontWeight: 700 }}>
        {locale === 'ja' ? 'EN' : 'JA'}
      </span>
    </button>
  )
})
