import { render, screen } from '@testing-library/react'
import { describe, expect, it, vi } from 'vitest'
import { HowItWorksSection } from './HowItWorksSection'

vi.mock('next-intl/server', () => ({
  getTranslations: () =>
    Promise.resolve((key: string) => {
      const translations: Record<string, string> = {
        title: 'How it works',
        step1Title: 'Connect your OBD2 adapter',
        step1Body: "Plug any ELM327 Bluetooth adapter into your car's OBD2 port — no tools needed.",
        step2Title: 'The app fuses all sensors',
        step2Body: 'OBD2 speed + gyroscope + GPS are combined into one continuous, accurate position.',
        step3Title: 'GPS fails — navigation continues',
        step3Body: 'When GPS is jammed or spoofed, dead reckoning keeps your position accurate automatically.',
      }
      return translations[key] ?? key
    }),
}))

describe('HowItWorksSection', () => {
  it('renders section title', async () => {
    const result = await HowItWorksSection()
    render(result)
    expect(screen.getByText('How it works')).toBeInTheDocument()
  })

  it('renders exactly 3 steps', async () => {
    const result = await HowItWorksSection()
    render(result)
    expect(screen.getByText('Connect your OBD2 adapter')).toBeInTheDocument()
    expect(screen.getByText('The app fuses all sensors')).toBeInTheDocument()
    expect(screen.getByText('GPS fails — navigation continues')).toBeInTheDocument()
  })

  it('renders step numbers', async () => {
    const result = await HowItWorksSection()
    render(result)
    expect(screen.getByText('1')).toBeInTheDocument()
    expect(screen.getByText('2')).toBeInTheDocument()
    expect(screen.getByText('3')).toBeInTheDocument()
  })

  it('has id="how-it-works" for scroll target', async () => {
    const result = await HowItWorksSection()
    const { container } = render(result)
    expect(container.querySelector('#how-it-works')).toBeInTheDocument()
  })

  it('does not mention routing or turn-by-turn', async () => {
    const result = await HowItWorksSection()
    const { container } = render(result)
    const text = container.textContent ?? ''
    expect(text.toLowerCase()).not.toContain('turn-by-turn')
    expect(text.toLowerCase()).not.toContain('routing')
  })
})
