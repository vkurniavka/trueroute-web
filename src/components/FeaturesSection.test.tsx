import { render, screen } from '@testing-library/react'
import { describe, expect, it, vi } from 'vitest'
import { FeaturesSection } from './FeaturesSection'

vi.mock('next-intl/server', () => ({
  getTranslations: () =>
    Promise.resolve((key: string) => {
      const translations: Record<string, string> = {
        title: 'What TrueRoute does',
        gpsDetectionTitle: 'GPS Disruption Detection',
        gpsDetectionDesc: 'Identifies GPS spoofing and jamming in real time.',
        deadReckoningTitle: 'Dead Reckoning',
        deadReckoningDesc: 'Continues navigation from OBD2 speed and phone sensors when GPS is lost.',
        offlineMapsTitle: 'Offline Maps',
        offlineMapsDesc: 'Download regional maps once, navigate without internet.',
        gpxImportTitle: 'GPX Route Import',
        gpxImportDesc: 'Load any GPX track to follow your planned route offline.',
        diagnosticsTitle: 'Real-time Diagnostics',
        diagnosticsDesc: 'Live OBD2 data: speed, RPM, and engine codes.',
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

describe('FeaturesSection', () => {
  it('renders section title', async () => {
    const result = await FeaturesSection()
    render(result)
    expect(screen.getByText('What TrueRoute does')).toBeInTheDocument()
  })

  it('renders exactly 5 feature cards', async () => {
    const result = await FeaturesSection()
    render(result)
    expect(screen.getByText('GPS Disruption Detection')).toBeInTheDocument()
    expect(screen.getByText('Dead Reckoning')).toBeInTheDocument()
    expect(screen.getByText('Offline Maps')).toBeInTheDocument()
    expect(screen.getByText('GPX Route Import')).toBeInTheDocument()
    expect(screen.getByText('Real-time Diagnostics')).toBeInTheDocument()
  })

  it('links each card to the correct how-to URL', async () => {
    const result = await FeaturesSection()
    render(result)
    const links = screen.getAllByRole('link')
    const hrefs = links.map((link) => link.getAttribute('href'))
    expect(hrefs).toContain('/how-to/positioning-modes')
    expect(hrefs).toContain('/how-to/download-maps')
    expect(hrefs).toContain('/how-to/import-gpx-route')
    expect(hrefs).toContain('/how-to/diagnostics')
  })

  it('does not mention v2 features', async () => {
    const result = await FeaturesSection()
    const { container } = render(result)
    const text = container.textContent ?? ''
    expect(text.toLowerCase()).not.toContain('turn-by-turn')
    expect(text.toLowerCase()).not.toContain('speed camera')
    expect(text.toLowerCase()).not.toContain('ios')
  })
})
