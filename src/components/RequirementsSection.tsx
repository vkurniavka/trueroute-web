import { getTranslations } from 'next-intl/server'

const needed = ['android', 'adapter', 'vehicle'] as const
const notNeeded = ['noInternet', 'noSubscription', 'noHardware'] as const

export async function RequirementsSection() {
  const t = await getTranslations('requirements')

  return (
    <section className="bg-zinc-900 px-4 py-20 sm:px-6 lg:px-8">
      <div className="mx-auto max-w-4xl">
        <h2 className="text-center text-3xl font-bold text-zinc-50 sm:text-4xl">
          {t('title')}
        </h2>
        <div className="mt-16 grid gap-12 sm:grid-cols-2">
          <div>
            <h3 className="text-lg font-semibold text-sky-400">
              {t('needsTitle')}
            </h3>
            <ul className="mt-4 space-y-3">
              {needed.map((key) => (
                <li key={key} className="flex items-start gap-3 text-zinc-300">
                  <span className="mt-0.5 text-sky-400" aria-hidden="true">✓</span>
                  <span>{t(key)}</span>
                </li>
              ))}
            </ul>
          </div>
          <div>
            <h3 className="text-lg font-semibold text-zinc-400">
              {t('notNeededTitle')}
            </h3>
            <ul className="mt-4 space-y-3">
              {notNeeded.map((key) => (
                <li key={key} className="flex items-start gap-3 text-zinc-500">
                  <span className="mt-0.5" aria-hidden="true">✗</span>
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
