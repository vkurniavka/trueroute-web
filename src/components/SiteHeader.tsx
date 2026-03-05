'use client'

import Image from 'next/image'
import Link from 'next/link'
import { useTranslations } from 'next-intl'
import { useCallback, useState } from 'react'

export function SiteHeader() {
  const t = useTranslations()
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false)

  const toggleMobileMenu = useCallback(() => {
    setMobileMenuOpen((prev) => !prev)
  }, [])

  const closeMobileMenu = useCallback(() => {
    setMobileMenuOpen(false)
  }, [])

  return (
    <header className="sticky top-0 z-50 border-b border-border bg-surface-dark">
      <div className="mx-auto flex max-w-7xl items-center justify-between px-4 py-4 sm:px-6 lg:px-8">
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

        <button
          type="button"
          className="text-text-secondary transition-colors hover:text-text-primary md:hidden"
          onClick={toggleMobileMenu}
          aria-expanded={mobileMenuOpen}
          aria-label={
            mobileMenuOpen ? t('nav.closeMenu') : t('nav.openMenu')
          }
        >
          <svg
            className="h-6 w-6"
            fill="none"
            viewBox="0 0 24 24"
            strokeWidth={1.5}
            stroke="currentColor"
          >
            {mobileMenuOpen ? (
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                d="M6 18L18 6M6 6l12 12"
              />
            ) : (
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                d="M3.75 6.75h16.5M3.75 12h16.5m-16.5 5.25h16.5"
              />
            )}
          </svg>
        </button>
      </div>

      {mobileMenuOpen && (
        <nav
          aria-label={t('nav.ariaLabel')}
          className="border-t border-border bg-surface-card md:hidden"
        >
          <div className="space-y-1 px-4 py-3">
            <Link
              href="/how-to/connect-obd2"
              className="block rounded-lg px-3 py-2 text-sm text-text-secondary transition-colors hover:bg-surface-elevated hover:text-text-primary"
              onClick={closeMobileMenu}
            >
              {t('nav.howTo')}
            </Link>
            <Link
              href="/troubleshooting/obd2-not-connecting"
              className="block rounded-lg px-3 py-2 text-sm text-text-secondary transition-colors hover:bg-surface-elevated hover:text-text-primary"
              onClick={closeMobileMenu}
            >
              {t('nav.troubleshooting')}
            </Link>
          </div>
        </nav>
      )}
    </header>
  )
}
