import { defineRouting } from 'next-intl/routing'

export const routing = defineRouting({
  locales: ['en'],
  defaultLocale: 'en',
  // Single-locale v1 site — never prefix URLs with /en/.
  // Without this the middleware redirects / → /en/ but there is no
  // src/app/[locale]/ directory, so every route returns 404 on CF Pages.
  localePrefix: 'never',
})
