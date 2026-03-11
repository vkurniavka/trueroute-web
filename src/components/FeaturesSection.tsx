import { Activity, FolderOpen, Map, Navigation, ShieldCheck } from 'lucide-react'
import { getTranslations } from 'next-intl/server'
import Link from 'next/link'
import type { ComponentType, SVGProps } from 'react'

const features: ReadonlyArray<{
  titleKey: string
  descKey: string
  href: string
  Icon: ComponentType<SVGProps<SVGSVGElement> & { size?: number; strokeWidth?: number }>
  primary: boolean
}> = [
  { titleKey: 'gpsDetectionTitle', descKey: 'gpsDetectionDesc', href: '/how-to/positioning-modes', Icon: ShieldCheck, primary: true },
  { titleKey: 'deadReckoningTitle', descKey: 'deadReckoningDesc', href: '/how-to/positioning-modes', Icon: Navigation, primary: true },
  { titleKey: 'offlineMapsTitle', descKey: 'offlineMapsDesc', href: '/how-to/download-maps', Icon: Map, primary: false },
  { titleKey: 'gpxImportTitle', descKey: 'gpxImportDesc', href: '/how-to/import-gpx-route', Icon: FolderOpen, primary: false },
  { titleKey: 'diagnosticsTitle', descKey: 'diagnosticsDesc', href: '/how-to/diagnostics', Icon: Activity, primary: false },
]

export async function FeaturesSection() {
  const t = await getTranslations('features')

  return (
    <section className="bg-surface-card px-4 py-20 sm:px-6 lg:px-8">
      <div className="mx-auto max-w-6xl">
        {/* TODO: i18n */}
        <p className="mb-3 text-center text-xs font-semibold uppercase tracking-widest text-text-muted">Features</p>
        <h2 className="text-center text-3xl font-bold text-text-primary sm:text-4xl">
          {t('title')}
        </h2>
        <div className="mt-16 grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
          {features.map((feature) => (
            <Link
              key={feature.titleKey}
              href={feature.href}
              className="group rounded-xl border border-border bg-surface-elevated p-6 transition-colors hover:bg-surface-dark"
            >
              <div
                className={`flex h-12 w-12 items-center justify-center rounded-xl ${feature.primary ? 'bg-gold-primary/15 text-gold-primary' : 'bg-blue-primary/15 text-blue-bright'}`}
                aria-hidden="true"
              >
                <feature.Icon size={24} strokeWidth={1.5} />
              </div>
              <h3 className="mt-4 text-lg font-semibold text-text-primary group-hover:text-blue-bright">
                {t(feature.titleKey)}
              </h3>
              <p className="mt-2 text-base text-text-secondary">
                {t(feature.descKey)}
              </p>
            </Link>
          ))}
        </div>
      </div>
    </section>
  )
}
