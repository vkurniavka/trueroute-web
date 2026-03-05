import { render, screen } from '@testing-library/react'
import { describe, expect, it, vi } from 'vitest'
import { SiteFooter } from './SiteFooter'

vi.mock('next-intl/server', () => ({
  getTranslations: () =>
    Promise.resolve((key: string, params?: Record<string, unknown>) => {
      const translations: Record<string, string> = {
        github: 'GitHub',
        copyright: `\u00a9 ${params?.year ?? ''} TrueRoute`,
        version: `v${params?.version ?? ''}`,
      }
      return translations[key] ?? key
    }),
}))

vi.mock('@/lib/env', () => ({
  env: {
    appVersion: '0.1.0',
  },
}))

describe('SiteFooter', () => {
  it('renders GitHub link with correct href and attributes', async () => {
    const result = await SiteFooter()
    render(result)
    const link = screen.getByText('GitHub')
    expect(link).toBeInTheDocument()
    expect(link).toHaveAttribute(
      'href',
      'https://github.com/vkurniavka/trueroute-web'
    )
    expect(link).toHaveAttribute('target', '_blank')
    expect(link).toHaveAttribute('rel', 'noopener noreferrer')
  })

  it('renders copyright with current year', async () => {
    const result = await SiteFooter()
    render(result)
    const year = new Date().getFullYear()
    expect(
      screen.getByText(`\u00a9 ${year} TrueRoute`)
    ).toBeInTheDocument()
  })

  it('renders app version', async () => {
    const result = await SiteFooter()
    render(result)
    expect(screen.getByText('v0.1.0')).toBeInTheDocument()
  })

  it('uses footer landmark element', async () => {
    const result = await SiteFooter()
    render(result)
    expect(screen.getByRole('contentinfo')).toBeInTheDocument()
  })
})
