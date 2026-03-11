'use client'

import Link from 'next/link'
import { useTranslations } from 'next-intl'
import { useCallback, useState } from 'react'

export function MobileMenuToggle() {
  const t = useTranslations()
  const [open, setOpen] = useState(false)

  const toggle = useCallback(() => {
    setOpen((prev) => !prev)
  }, [])

  const close = useCallback(() => {
    setOpen(false)
  }, [])

  return (
    <>
      <button
        type="button"
        className="text-text-secondary transition-colors hover:text-text-primary md:hidden"
        onClick={toggle}
        aria-expanded={open}
        aria-label={open ? t('nav.closeMenu') : t('nav.openMenu')}
      >
        <svg
          className="h-6 w-6"
          fill="none"
          viewBox="0 0 24 24"
          strokeWidth={1.5}
          stroke="currentColor"
        >
          {open ? (
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

      {open && (
        <nav
          aria-label={t('nav.ariaLabel')}
          className="absolute left-0 right-0 top-full border-t border-border bg-surface-card md:hidden"
        >
          <div className="space-y-1 px-4 py-3">
            <Link
              href="/how-to/connect-obd2"
              className="block rounded-lg px-3 py-2 text-sm text-text-secondary transition-colors hover:bg-surface-elevated hover:text-text-primary"
              onClick={close}
            >
              {t('nav.howTo')}
            </Link>
            <Link
              href="/troubleshooting/obd2-not-connecting"
              className="block rounded-lg px-3 py-2 text-sm text-text-secondary transition-colors hover:bg-surface-elevated hover:text-text-primary"
              onClick={close}
            >
              {t('nav.troubleshooting')}
            </Link>
          </div>
        </nav>
      )}
    </>
  )
}
