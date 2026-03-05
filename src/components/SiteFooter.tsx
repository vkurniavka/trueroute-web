import { getTranslations } from 'next-intl/server'
import { env } from '@/lib/env'

export async function SiteFooter() {
  const t = await getTranslations('footer')
  const year = new Date().getFullYear()

  return (
    <footer className="border-t border-border bg-surface-dark">
      <div className="mx-auto max-w-7xl px-4 py-8 sm:px-6 lg:px-8">
        <div className="flex flex-col items-center gap-4 text-sm sm:flex-row sm:justify-between">
          <a
            href="https://github.com/vkurniavka/trueroute-web"
            target="_blank"
            rel="noopener noreferrer"
            className="text-text-secondary transition-colors hover:text-text-primary"
          >
            {t('github')}
          </a>
          <p className="text-text-muted">
            {t('copyright', { year })}
          </p>
          <p className="text-text-muted">
            {t('version', { version: env.appVersion })}
          </p>
        </div>
      </div>
    </footer>
  )
}
