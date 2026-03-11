import { getTranslations } from 'next-intl/server'

const steps = [
  { num: 1, titleKey: 'step1Title', bodyKey: 'step1Body' },
  { num: 2, titleKey: 'step2Title', bodyKey: 'step2Body' },
  { num: 3, titleKey: 'step3Title', bodyKey: 'step3Body' },
] as const

export async function HowItWorksSection() {
  const t = await getTranslations('howItWorks')

  return (
    <section id="how-it-works" className="bg-surface-dark px-4 py-20 sm:px-6 lg:px-8">
      <div className="mx-auto max-w-5xl">
        {/* TODO: i18n */}
        <p className="mb-3 text-center text-xs font-semibold uppercase tracking-widest text-text-muted">How It Works</p>
        <h2 className="text-center text-3xl font-bold text-text-primary sm:text-4xl">
          {t('title')}
        </h2>
        <div className="relative mt-16 grid gap-12 sm:grid-cols-3">
          {/* Connector line threading through the number circles — desktop only */}
          <div
            className="absolute left-[calc(16.67%+24px)] right-[calc(16.67%+24px)] top-6 hidden h-px bg-border sm:block"
            aria-hidden="true"
          />
          {steps.map((step) => (
            <div
              key={step.num}
              className="rounded-xl border border-border bg-surface-card p-6 text-center transition-all duration-200 hover:-translate-y-0.5 hover:border-blue-primary/50 hover:bg-surface-elevated"
            >
              {/* Ring-style circle sits on top of connector line */}
              <div className="relative z-10 mx-auto flex h-12 w-12 items-center justify-center rounded-full border-2 border-blue-primary bg-surface-dark text-lg font-bold text-blue-bright ring-4 ring-blue-primary/20">
                {step.num}
              </div>
              <h3 className="mt-4 text-lg font-semibold text-text-primary">
                {t(step.titleKey)}
              </h3>
              <p className="mt-2 text-base text-text-secondary">
                {t(step.bodyKey)}
              </p>
            </div>
          ))}
        </div>
      </div>
    </section>
  )
}
