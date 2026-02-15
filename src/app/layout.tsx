import type { Metadata } from 'next'
import './globals.css'

export const metadata: Metadata = {
  title: 'Apparel PLM',
  description: 'アパレル製品ライフサイクル管理システム',
}

export default function RootLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <html lang="en">
      <body>
        {children}
      </body>
    </html>
  )
}
