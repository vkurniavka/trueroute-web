import { getTranslations } from 'next-intl/server'

const needed = ['android', 'adapter', 'vehicle'] as const
const notNeeded = ['noInternet', 'noSubscription', 'noHardware'] as const

export async function RequirementsSection() {
  const t = await getTranslations('requirements')

  return (
    <section className="bg-surface-dark px-4 py-20 sm:px-6 lg:px-8">
      <div className="mx-auto max-w-4xl">
        <h2 className="text-center text-3xl font-bold text-text-primary sm:text-4xl">
          {t('title')}
        </h2>
        <div className="mt-16 grid gap-12 sm:grid-cols-2">
          <div className="rounded-xl border border-border bg-surface-card p-6 transition-colors duration-200 hover:bg-surface-elevated">
            <h3 className="text-lg font-semibold text-text-primary">
              {t('needsTitle')}
            </h3>
            <ul className="mt-4 space-y-3">
              {needed.map((key) => (
                <li key={key} className="flex items-start gap-3 text-text-primary">
                  <span className="mt-0.5 text-gps-mode" aria-hidden="true">✓</span>
                  <span>{t(key)}</span>
                </li>
              ))}
            </ul>
          </div>
          <div className="rounded-xl border border-border bg-surface-card p-6 transition-colors duration-200 hover:bg-surface-elevated">
            <h3 className="text-lg font-semibold text-text-secondary">
              {t('notNeededTitle')}
            </h3>
            <ul className="mt-4 space-y-3">
              {notNeeded.map((key) => (
                <li key={key} className="flex items-start gap-3 text-text-secondary">
                  <span className="mt-0.5 text-text-muted" aria-hidden="true">✗</span>
                  <span className="line-through">{t(key)}</span>
                </li>
              ))}
            </ul>
          </div>
        </div>
      </div>
    </section>
  )
}
