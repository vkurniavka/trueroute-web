import { getTranslations } from 'next-intl/server'

const steps = [
  { num: 1, titleKey: 'step1Title', bodyKey: 'step1Body' },
  { num: 2, titleKey: 'step2Title', bodyKey: 'step2Body' },
  { num: 3, titleKey: 'step3Title', bodyKey: 'step3Body' },
] as const

export async function HowItWorksSection() {
  const t = await getTranslations('howItWorks')

  return (
    <section id="how-it-works" className="bg-zinc-900 px-4 py-20 sm:px-6 lg:px-8">
      <div className="mx-auto max-w-5xl">
        <h2 className="text-center text-3xl font-bold text-zinc-50 sm:text-4xl">
          {t('title')}
        </h2>
        <div className="mt-16 grid gap-12 sm:grid-cols-3">
          {steps.map((step) => (
            <div key={step.num} className="text-center">
              <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-full bg-sky-500 text-lg font-bold text-zinc-50">
                {step.num}
              </div>
              <h3 className="mt-4 text-lg font-semibold text-zinc-50">
                {t(step.titleKey)}
              </h3>
              <p className="mt-2 text-sm text-zinc-400">
                {t(step.bodyKey)}
              </p>
            </div>
          ))}
        </div>
      </div>
    </section>
  )
}
