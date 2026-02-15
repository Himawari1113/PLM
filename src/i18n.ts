import { getRequestConfig } from 'next-intl/server'
import { routing } from './lib/navigation'

export default getRequestConfig(async ({ requestLocale }) => {
  let locale = await requestLocale

  // Validate that the incoming `locale` parameter is valid
  if (!locale || !routing.locales.includes(locale as any)) {
    locale = routing.defaultLocale
  }

  return {
    locale,
    messages: (
      await (locale === 'ja'
        ? import('../messages/ja.json')
        : import('../messages/en.json'))
    ).default
  }
})
