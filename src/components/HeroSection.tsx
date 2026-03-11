import { getTranslations } from 'next-intl/server'
import Image from 'next/image'
import Link from 'next/link'
import { env } from '@/lib/env'

export async function HeroSection() {
  const t = await getTranslations('hero')
  const playStoreUrl = env.playStoreUrl

  return (
    <section className="bg-surface-dark px-4 py-20 sm:px-6 sm:py-28 lg:px-8 lg:py-36">
      <div className="mx-auto max-w-4xl text-center">
        {/* Animated status pill */}
        <div className="mb-8 inline-flex items-center gap-2 rounded-full border border-blue-primary/30 bg-blue-primary/10 px-4 py-1.5 text-sm text-blue-bright">
          <span className="relative flex h-2 w-2" aria-hidden="true">
            <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-gps-mode opacity-75" />
            <span className="relative inline-flex h-2 w-2 rounded-full bg-gps-mode" />
          </span>
          GPS Protected · Dead Reckoning Active
        </div>
        {/* Shield icon */}
        <div className="mb-8 flex justify-center">
          <div className="relative">
            {/* Two-layer glow behind the shield */}
            <div className="absolute inset-0 scale-110 rounded-full bg-blue-primary opacity-35 blur-3xl" aria-hidden="true" />
            <div className="absolute inset-0 translate-x-4 translate-y-4 scale-75 rounded-full bg-gold-primary opacity-15 blur-2xl" aria-hidden="true" />
            <Image
              src="/trueroute-icon.svg"
              alt="TrueRoute shield"
              width={120}
              height={120}
              priority
              className="relative drop-shadow-lg"
            />
          </div>
        </div>
        <h1 className="text-4xl font-bold tracking-tight text-text-primary sm:text-5xl lg:text-6xl">
          {t('headline')}
        </h1>
        <p className="mx-auto mt-6 max-w-2xl text-lg text-text-secondary sm:text-xl">
          {t('subheadline')}
        </p>
        <div className="mt-10 flex flex-col items-center gap-4 sm:flex-row sm:justify-center">
          {playStoreUrl ? (
            <a
              href={playStoreUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center rounded-lg bg-gold-primary px-6 py-3 text-base font-bold text-navy-bg transition-colors hover:bg-gold-deep active:scale-95"
            >
              {t('ctaDownload')}
            </a>
          ) : (
            <span className="inline-flex cursor-not-allowed items-center rounded-lg bg-surface-elevated px-6 py-3 text-base font-semibold text-text-muted">
              {t('ctaComingSoon')}
            </span>
          )}
          <Link
            href="#how-it-works"
            className="inline-flex items-center rounded-lg border border-blue-primary px-6 py-3 text-base font-semibold text-blue-bright transition-colors hover:bg-surface-card"
          >
            {t('ctaHowItWorks')}
          </Link>
        </div>
      </div>
    </section>
  )
}
