import { getTranslations } from 'next-intl/server'
import Image from 'next/image'
import { env } from '@/lib/env'

export async function DownloadCTASection() {
  const t = await getTranslations('downloadCta')
  const playStoreUrl = env.playStoreUrl

  return (
    <section className="cta-gradient px-4 py-20 sm:px-6 lg:px-8">
      <div className="mx-auto max-w-3xl text-center">
        {/* TODO: i18n */}
        <p className="mb-3 text-center text-xs font-semibold uppercase tracking-widest text-text-muted">Get Started</p>
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
          {playStoreUrl ? (
            <Image
              src={`https://api.qrserver.com/v1/create-qr-code/?data=${encodeURIComponent(playStoreUrl)}&size=128x128&color=E8ECF4&bgcolor=1A2235&margin=8`}
              width={128}
              height={128}
              alt="Scan to download TrueRoute on Google Play"
              className="rounded-lg"
            />
          ) : null}
        </div>
      </div>
    </section>
  )
}
