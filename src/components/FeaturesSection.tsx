import { getTranslations } from 'next-intl/server'
import Link from 'next/link'

const goldIconFeatures = new Set(['gpsDetectionTitle', 'deadReckoningTitle'])

const features = [
  { titleKey: 'gpsDetectionTitle', descKey: 'gpsDetectionDesc', href: '/how-to/positioning-modes', icon: '🛡️' },
  { titleKey: 'deadReckoningTitle', descKey: 'deadReckoningDesc', href: '/how-to/positioning-modes', icon: '📍' },
  { titleKey: 'offlineMapsTitle', descKey: 'offlineMapsDesc', href: '/how-to/download-maps', icon: '🗺️' },
  { titleKey: 'gpxImportTitle', descKey: 'gpxImportDesc', href: '/how-to/import-gpx-route', icon: '📂' },
  { titleKey: 'diagnosticsTitle', descKey: 'diagnosticsDesc', href: '/how-to/diagnostics', icon: '📊' },
] as const

export async function FeaturesSection() {
  const t = await getTranslations('features')

  return (
    <section className="bg-surface-dark px-4 py-20 sm:px-6 lg:px-8">
      <div className="mx-auto max-w-6xl">
        <h2 className="text-center text-3xl font-bold text-text-primary sm:text-4xl">
          {t('title')}
        </h2>
        <div className="mt-16 grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
          {features.map((feature) => (
            <Link
              key={feature.titleKey}
              href={feature.href}
              className="group rounded-xl border border-border bg-surface-card p-6 transition-colors hover:bg-surface-elevated"
            >
              <span
                className={`text-3xl ${goldIconFeatures.has(feature.titleKey) ? 'text-gold-primary' : 'text-blue-bright'}`}
                role="img"
                aria-hidden="true"
              >
                {feature.icon}
              </span>
              <h3 className="mt-4 text-lg font-semibold text-text-primary group-hover:text-blue-bright">
                {t(feature.titleKey)}
              </h3>
              <p className="mt-2 text-sm text-text-secondary">
                {t(feature.descKey)}
              </p>
            </Link>
          ))}
        </div>
      </div>
    </section>
  )
}
