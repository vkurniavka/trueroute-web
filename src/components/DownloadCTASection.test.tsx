import { render, screen } from '@testing-library/react'
import { describe, expect, it, vi, beforeEach } from 'vitest'

vi.mock('next-intl/server', () => ({
  getTranslations: () =>
    Promise.resolve((key: string) => {
      const translations: Record<string, string> = {
        title: 'Ready to drive with confidence?',
        button: 'Download on Google Play',
        comingSoon: 'Coming Soon',
        androidVersion: 'Requires Android 8.0+',
        qrPlaceholder: 'QR code coming soon',
      }
      return translations[key] ?? key
    }),
}))

const envMock = { playStoreUrl: '' }
vi.mock('@/lib/env', () => ({
  get env() {
    return envMock
  },
}))

describe('DownloadCTASection', () => {
  beforeEach(() => {
    envMock.playStoreUrl = ''
  })

  it('renders section title', async () => {
    const { DownloadCTASection } = await import('./DownloadCTASection')
    const result = await DownloadCTASection()
    render(result)
    expect(screen.getByText('Ready to drive with confidence?')).toBeInTheDocument()
  })

  it('renders "Coming Soon" when play store URL is not set', async () => {
    const { DownloadCTASection } = await import('./DownloadCTASection')
    const result = await DownloadCTASection()
    render(result)
    expect(screen.getByText('Coming Soon')).toBeInTheDocument()
  })

  it('renders download button when play store URL is set', async () => {
    envMock.playStoreUrl = 'https://play.google.com/store/apps/details?id=com.trueroute'
    const { DownloadCTASection } = await import('./DownloadCTASection')
    const result = await DownloadCTASection()
    render(result)
    const link = screen.getByText('Download on Google Play')
    expect(link).toBeInTheDocument()
    expect(link).toHaveAttribute(
      'href',
      'https://play.google.com/store/apps/details?id=com.trueroute'
    )
    expect(link).toHaveAttribute('target', '_blank')
  })

  it('renders Android version notice', async () => {
    const { DownloadCTASection } = await import('./DownloadCTASection')
    const result = await DownloadCTASection()
    render(result)
    expect(screen.getByText('Requires Android 8.0+')).toBeInTheDocument()
  })

  it('does not render QR code when play store URL is not set', async () => {
    const { DownloadCTASection } = await import('./DownloadCTASection')
    const result = await DownloadCTASection()
    render(result)
    expect(screen.queryByAltText('Scan to download TrueRoute on Google Play')).not.toBeInTheDocument()
  })

  it('renders QR code image when play store URL is set', async () => {
    envMock.playStoreUrl = 'https://play.google.com/store/apps/details?id=com.trueroute'
    const { DownloadCTASection } = await import('./DownloadCTASection')
    const result = await DownloadCTASection()
    render(result)
    const qrImage = screen.getByAltText('Scan to download TrueRoute on Google Play')
    expect(qrImage).toBeInTheDocument()
  })
})
