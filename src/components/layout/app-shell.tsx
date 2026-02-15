'use client'

import { useState } from 'react'
import { SessionProvider } from 'next-auth/react'
import { Sidebar } from './sidebar'
import { Header } from './header'

export function AppShell({ children }: { children: React.ReactNode }) {
  const [isSidebarExpanded, setIsSidebarExpanded] = useState(false)

  return (
    <SessionProvider>
      <Sidebar
        isExpanded={isSidebarExpanded}
        onToggle={() => setIsSidebarExpanded(!isSidebarExpanded)}
      />
      <div className={`bp-main${isSidebarExpanded ? '' : ' bp-main--collapsed'}`}>
        <Header />
        <main className="bp-page">
          {children}
        </main>
      </div>
    </SessionProvider>
  )
}
