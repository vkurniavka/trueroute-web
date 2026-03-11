import { getTranslations } from 'next-intl/server'
import { env } from '@/lib/env'

export async function DownloadCTASection() {
  const t = await getTranslations('downloadCta')
  const playStoreUrl = env.playStoreUrl

  return (
    <section className="cta-gradient px-4 py-20 sm:px-6 lg:px-8">
      <div className="mx-auto max-w-3xl text-center">
        <h2 className="text-3xl font-bold text-text-primary sm:text-4xl">
          {t('title')}
        </h2>
        <div className="mt-10 flex flex-col items-center gap-6 sm:flex-row sm:justify-center">
          <div className="flex flex-col items-center gap-3">
            {playStoreUrl ? (
              <a
                href={playStoreUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center rounded-lg bg-gold-primary px-8 py-4 text-lg font-bold text-navy-bg transition-colors hover:bg-gold-deep"
              >
                {t('button')}
              </a>
            ) : (
              <span className="inline-flex cursor-not-allowed items-center rounded-lg bg-surface-elevated px-8 py-4 text-lg font-semibold text-text-muted">
                {t('comingSoon')}
              </span>
            )}
            <p className="text-sm text-text-muted">
              {t('androidVersion')}
            </p>
          </div>
          <div className="flex h-32 w-32 items-center justify-center rounded-lg border border-border bg-surface-elevated">
            <p className="text-center text-xs text-text-muted">
              {t('qrPlaceholder')}
            </p>
          </div>
        </div>
      </div>
    </section>
  )
}
