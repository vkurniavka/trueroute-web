import { render, screen } from '@testing-library/react'
import { describe, expect, it, vi, beforeEach } from 'vitest'

vi.mock('next-intl/server', () => ({
  getTranslations: () =>
    Promise.resolve((key: string) => {
      const translations: Record<string, string> = {
        headline: 'Navigate safely when GPS is disrupted',
        subheadline:
          'TrueRoute fuses OBD2 speed, gyroscope, and GPS into one accurate position — and keeps going when GPS fails.',
        ctaDownload: 'Download for Android',
        ctaComingSoon: 'Coming Soon',
        ctaHowItWorks: 'How it works',
      }
      return translations[key] ?? key
    }),
}))

vi.mock('next/link', () => ({
  default: ({
    href,
    children,
    ...props
  }: {
    href: string
    children: React.ReactNode
    className?: string
  }) => (
    <a href={href} {...props}>
      {children}
    </a>
  ),
}))

const envMock = { playStoreUrl: '' }
vi.mock('@/lib/env', () => ({
  get env() {
    return envMock
  },
}))

describe('HeroSection', () => {
  beforeEach(() => {
    envMock.playStoreUrl = ''
  })

  it('renders headline and subheadline', async () => {
    const { HeroSection } = await import('./HeroSection')
    const result = await HeroSection()
    render(result)
    expect(
      screen.getByText('Navigate safely when GPS is disrupted')
    ).toBeInTheDocument()
    expect(
      screen.getByText(/TrueRoute fuses OBD2 speed/)
    ).toBeInTheDocument()
  })

  it('renders "Coming Soon" when play store URL is not set', async () => {
    const { HeroSection } = await import('./HeroSection')
    const result = await HeroSection()
    render(result)
    expect(screen.getByText('Coming Soon')).toBeInTheDocument()
  })

  it('renders "Download for Android" link when play store URL is set', async () => {
    envMock.playStoreUrl =
      'https://play.google.com/store/apps/details?id=com.trueroute'
    const { HeroSection } = await import('./HeroSection')
    const result = await HeroSection()
    render(result)
    const link = screen.getByText('Download for Android')
    expect(link).toBeInTheDocument()
    expect(link).toHaveAttribute(
      'href',
      'https://play.google.com/store/apps/details?id=com.trueroute'
    )
    expect(link).toHaveAttribute('target', '_blank')
    expect(link).toHaveAttribute('rel', 'noopener noreferrer')
  })

  it('renders "How it works" link pointing to #how-it-works', async () => {
    const { HeroSection } = await import('./HeroSection')
    const result = await HeroSection()
    render(result)
    const link = screen.getByText('How it works')
    expect(link).toBeInTheDocument()
    expect(link).toHaveAttribute('href', '#how-it-works')
  })

  it('uses section element', async () => {
    const { HeroSection } = await import('./HeroSection')
    const result = await HeroSection()
    const { container } = render(result)
    expect(container.querySelector('section')).toBeInTheDocument()
  })
})
