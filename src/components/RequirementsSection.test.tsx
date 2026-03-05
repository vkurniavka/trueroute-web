import { render, screen } from '@testing-library/react'
import { describe, expect, it, vi } from 'vitest'
import { RequirementsSection } from './RequirementsSection'

vi.mock('next-intl/server', () => ({
  getTranslations: () =>
    Promise.resolve((key: string) => {
      const translations: Record<string, string> = {
        title: 'What you need',
        needsTitle: 'Required',
        notNeededTitle: 'Not required',
        android: 'Android 8.0+ phone with gyroscope',
        adapter: 'ELM327 Bluetooth OBD2 adapter (~$10, Bluetooth Classic / SPP)',
        vehicle: 'OBD2-equipped vehicle (petrol 2001+, most diesel 2004+)',
        noInternet: 'Internet connection during navigation',
        noSubscription: 'Subscription or account',
        noHardware: 'Any special hardware beyond the adapter',
      }
      return translations[key] ?? key
    }),
}))

describe('RequirementsSection', () => {
  it('renders section title', async () => {
    const result = await RequirementsSection()
    render(result)
    expect(screen.getByText('What you need')).toBeInTheDocument()
  })

  it('lists what IS needed', async () => {
    const result = await RequirementsSection()
    render(result)
    expect(screen.getByText('Android 8.0+ phone with gyroscope')).toBeInTheDocument()
    expect(screen.getByText(/ELM327 Bluetooth OBD2 adapter/)).toBeInTheDocument()
    expect(screen.getByText(/OBD2-equipped vehicle/)).toBeInTheDocument()
  })

  it('lists what is NOT needed', async () => {
    const result = await RequirementsSection()
    render(result)
    expect(screen.getByText('Internet connection during navigation')).toBeInTheDocument()
    expect(screen.getByText('Subscription or account')).toBeInTheDocument()
    expect(screen.getByText('Any special hardware beyond the adapter')).toBeInTheDocument()
  })

  it('does not mention iOS, CarPlay, or Android Auto', async () => {
    const result = await RequirementsSection()
    const { container } = render(result)
    const text = container.textContent ?? ''
    expect(text.toLowerCase()).not.toContain('ios')
    expect(text.toLowerCase()).not.toContain('carplay')
    expect(text.toLowerCase()).not.toContain('android auto')
  })
})
