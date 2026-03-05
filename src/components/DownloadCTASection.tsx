import { getTranslations } from 'next-intl/server'
import { env } from '@/lib/env'

export async function DownloadCTASection() {
  const t = await getTranslations('downloadCta')
  const playStoreUrl = env.playStoreUrl

  return (
    <section className="bg-zinc-950 px-4 py-20 sm:px-6 lg:px-8">
      <div className="mx-auto max-w-3xl text-center">
        <h2 className="text-3xl font-bold text-zinc-50 sm:text-4xl">
          {t('title')}
        </h2>
        <div className="mt-10 flex flex-col items-center gap-6 sm:flex-row sm:justify-center">
          <div className="flex flex-col items-center gap-3">
            {playStoreUrl ? (
              <a
                href={playStoreUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center rounded-lg bg-sky-500 px-8 py-4 text-lg font-semibold text-zinc-50 transition-colors hover:bg-sky-400"
              >
                {t('button')}
              </a>
            ) : (
              <span className="inline-flex cursor-not-allowed items-center rounded-lg bg-zinc-700 px-8 py-4 text-lg font-semibold text-zinc-400">
                {t('comingSoon')}
              </span>
            )}
            <p className="text-sm text-zinc-500">
              {t('androidVersion')}
            </p>
          </div>
          <div className="flex h-32 w-32 items-center justify-center rounded-lg border border-zinc-800 bg-zinc-900">
            <p className="text-center text-xs text-zinc-500">
              {t('qrPlaceholder')}
            </p>
          </div>
        </div>
      </div>
    </section>
  )
}
