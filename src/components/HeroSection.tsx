import { getTranslations } from 'next-intl/server'
import Link from 'next/link'
import { env } from '@/lib/env'

export async function HeroSection() {
  const t = await getTranslations('hero')
  const playStoreUrl = env.playStoreUrl

  return (
    <section className="bg-zinc-950 px-4 py-20 sm:px-6 sm:py-28 lg:px-8 lg:py-36">
      <div className="mx-auto max-w-4xl text-center">
        <h1 className="text-4xl font-bold tracking-tight text-zinc-50 sm:text-5xl lg:text-6xl">
          {t('headline')}
        </h1>
        <p className="mx-auto mt-6 max-w-2xl text-lg text-zinc-400 sm:text-xl">
          {t('subheadline')}
        </p>
        <div className="mt-10 flex flex-col items-center gap-4 sm:flex-row sm:justify-center">
          {playStoreUrl ? (
            <a
              href={playStoreUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center rounded-lg bg-sky-500 px-6 py-3 text-base font-semibold text-zinc-50 transition-colors hover:bg-sky-400"
            >
              {t('ctaDownload')}
            </a>
          ) : (
            <span className="inline-flex cursor-not-allowed items-center rounded-lg bg-zinc-700 px-6 py-3 text-base font-semibold text-zinc-400">
              {t('ctaComingSoon')}
            </span>
          )}
          <Link
            href="#how-it-works"
            className="inline-flex items-center rounded-lg border border-zinc-700 px-6 py-3 text-base font-semibold text-zinc-50 transition-colors hover:border-zinc-500 hover:text-zinc-300"
          >
            {t('ctaHowItWorks')}
          </Link>
        </div>
      </div>
    </section>
  )
}
