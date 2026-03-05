import Link from 'next/link'
import { getTranslations } from 'next-intl/server'

interface DocLayoutProps {
  section: 'how-to' | 'troubleshooting'
  title: string
  children: React.ReactNode
}

export async function DocLayout({ section, title, children }: DocLayoutProps) {
  const t = await getTranslations('doc')

  const sectionLabel =
    section === 'how-to' ? t('howTo') : t('troubleshooting')

  return (
    <article className="mx-auto max-w-3xl bg-surface-dark px-4 py-8 sm:px-6 lg:px-8">
      <nav aria-label={t('breadcrumb')} className="mb-8">
        <ol className="flex flex-wrap items-center gap-1 text-sm text-text-muted">
          <li>
            <Link
              href="/"
              className="text-blue-bright transition-colors hover:text-text-primary"
            >
              {t('home')}
            </Link>
          </li>
          <li aria-hidden="true" className="mx-1 text-text-muted">
            ›
          </li>
          <li className="text-text-secondary">{sectionLabel}</li>
          <li aria-hidden="true" className="mx-1 text-text-muted">
            ›
          </li>
          <li className="text-text-primary">{title}</li>
        </ol>
      </nav>
      <div className="doc-content">{children}</div>
    </article>
  )
}
