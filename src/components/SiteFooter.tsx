import { getTranslations } from 'next-intl/server'
import { env } from '@/lib/env'

export async function SiteFooter() {
  const t = await getTranslations('footer')
  const year = new Date().getFullYear()

  return (
    <footer className="border-t border-zinc-800 bg-zinc-950">
      <div className="mx-auto max-w-7xl px-4 py-8 sm:px-6 lg:px-8">
        <div className="flex flex-col items-center gap-4 text-sm sm:flex-row sm:justify-between">
          <a
            href="https://github.com/vkurniavka/trueroute-web"
            target="_blank"
            rel="noopener noreferrer"
            className="text-zinc-400 transition-colors hover:text-zinc-50"
          >
            {t('github')}
          </a>
          <p className="text-zinc-400">
            {t('copyright', { year })}
          </p>
          <p className="text-zinc-500">
            {t('version', { version: env.appVersion })}
          </p>
        </div>
      </div>
    </footer>
  )
}
