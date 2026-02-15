import { createNavigation } from 'next-intl/navigation'
import { defineRouting } from 'next-intl/routing'

export const locales = ['en', 'ja'] as const

export const routing = defineRouting({
  locales,
  defaultLocale: 'en'
})

export const { Link, redirect, usePathname, useRouter } = createNavigation(routing)
