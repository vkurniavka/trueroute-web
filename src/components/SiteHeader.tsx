import Image from 'next/image'
import Link from 'next/link'
import { getTranslations } from 'next-intl/server'

import { MobileMenuToggle } from './MobileMenuToggle'

export async function SiteHeader() {
  const t = await getTranslations()

  return (
    <header className="sticky top-0 z-50 border-b border-border bg-surface-dark">
      <div className="relative mx-auto flex max-w-7xl items-center justify-between px-4 py-4 sm:px-6 lg:px-8">
        <Link href="/" className="flex items-center gap-2 text-xl font-bold text-text-primary">
          <Image src="/trueroute-icon.svg" width={32} height={32} alt="" />
          {t('header.logoText')}
        </Link>

        <nav
          aria-label={t('nav.ariaLabel')}
          className="hidden md:flex md:gap-6"
        >
          <Link
            href="/how-to/connect-obd2"
            className="text-sm text-text-secondary transition-colors hover:text-text-primary"
          >
            {t('nav.howTo')}
          </Link>
          <Link
            href="/troubleshooting/obd2-not-connecting"
            className="text-sm text-text-secondary transition-colors hover:text-text-primary"
          >
            {t('nav.troubleshooting')}
          </Link>
        </nav>

        <MobileMenuToggle />
      </div>
    </header>
  )
}
