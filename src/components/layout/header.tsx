'use client'

import { memo } from 'react'
import { signOut, useSession } from 'next-auth/react'
import { LogOut, Bell } from 'lucide-react'
import { LanguageSwitcher } from '@/components/language-switcher'
import { DesignPatternSwitcher } from '@/components/theme/DesignPatternSwitcher'
import { useTranslations } from 'next-intl'

export const Header = memo(function Header() {
  const { data: session } = useSession()
  const t = useTranslations()

  // Role display names (always in English)
  const roleDisplayNames: Record<string, string> = {
    'ADMIN': 'Administrator',
    'DESIGNER': 'Designer',
    'MERCHANDISER': 'Merchandiser',
    'VIEWER': 'Viewer',
  }

  return (
    <header className="bp-header">
      <div style={{ flex: 1 }} />

      <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
        <DesignPatternSwitcher />
        <LanguageSwitcher />

        <button
          className="bp-button bp-button--ghost bp-button--icon"
          title="Notifications"
          style={{ position: 'relative' }}
        >
          <Bell style={{ width: 18, height: 18 }} />
          <span
            style={{
              position: 'absolute',
              top: 6,
              right: 6,
              width: 8,
              height: 8,
              borderRadius: '50%',
              background: 'var(--color-warning)',
            }}
          />
        </button>

        {session?.user && (
          <div className="bp-header__user">
            <div className="bp-header__avatar">
              {session.user.name?.charAt(0).toUpperCase()}
            </div>
            <div>
              <div className="bp-header__user-name">{session.user.name}</div>
              <div className="bp-header__user-role">
                {session.user.role ? roleDisplayNames[session.user.role] || session.user.role : ''}
              </div>
            </div>
          </div>
        )}

        <button
          className="bp-button bp-button--ghost bp-button--sm"
          onClick={() => signOut({ callbackUrl: '/login' })}
          style={{ color: 'var(--color-danger)' }}
        >
          <LogOut style={{ width: 16, height: 16 }} />
          Logout
        </button>
      </div>
    </header>
  )
})
