import { NextIntlClientProvider } from 'next-intl'
import { getMessages } from 'next-intl/server'
import { DesignPatternProvider } from '@/components/theme/DesignPatternProvider'
import { YearFilterProvider } from '@/contexts/YearFilterContext'

export function generateStaticParams() {
  return [{ locale: 'ja' }, { locale: 'en' }]
}

export default async function LocaleLayout({
  children,
  params: { locale }
}: {
  children: React.ReactNode
  params: { locale: string }
}) {
  const messages = await getMessages()

  return (
    <html lang={locale}>
      <body>
        <DesignPatternProvider>
          <YearFilterProvider>
            <NextIntlClientProvider messages={messages}>
              {children}
            </NextIntlClientProvider>
          </YearFilterProvider>
        </DesignPatternProvider>
      </body>
    </html>
  )
}
