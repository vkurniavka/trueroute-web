import { render, screen, fireEvent } from '@testing-library/react'
import { describe, expect, it, vi } from 'vitest'
import { MobileMenuToggle } from './MobileMenuToggle'

vi.mock('next-intl', () => ({
  useTranslations: () => {
    const translations: Record<string, string> = {
      'header.logoText': 'TrueRoute',
      'nav.howTo': 'How-to',
      'nav.troubleshooting': 'Troubleshooting',
      'nav.ariaLabel': 'Main navigation',
      'nav.openMenu': 'Open menu',
      'nav.closeMenu': 'Close menu',
    }
    return (key: string) => translations[key] ?? key
  },
}))

vi.mock('next-intl/server', () => ({
  getTranslations: async () => {
    const translations: Record<string, string> = {
      'header.logoText': 'TrueRoute',
      'nav.howTo': 'How-to',
      'nav.troubleshooting': 'Troubleshooting',
      'nav.ariaLabel': 'Main navigation',
      'nav.openMenu': 'Open menu',
      'nav.closeMenu': 'Close menu',
    }
    return (key: string) => translations[key] ?? key
  },
}))

vi.mock('next/image', () => ({
  default: (props: Record<string, unknown>) => (
    // eslint-disable-next-line @next/next/no-img-element, jsx-a11y/alt-text
    <img {...props} />
  ),
}))

vi.mock('next/link', () => ({
  default: ({
    children,
    href,
    ...props
  }: {
    children: React.ReactNode
    href: string
    [key: string]: unknown
  }) => (
    <a href={href} {...props}>
      {children}
    </a>
  ),
}))

describe('SiteHeader', () => {
  it('renders as async Server Component with logo and desktop nav', async () => {
    const { SiteHeader } = await import('./SiteHeader')
    const element = await SiteHeader()
    render(element)

    const logo = screen.getByText('TrueRoute')
    expect(logo).toBeInTheDocument()
    expect(logo.closest('a')).toHaveAttribute('href', '/')

    const nav = screen.getByRole('navigation', { name: 'Main navigation' })
    expect(nav).toBeInTheDocument()

    const howToLink = screen.getByText('How-to').closest('a')
    expect(howToLink).toHaveAttribute('href', '/how-to/connect-obd2')

    const tsLink = screen.getByText('Troubleshooting').closest('a')
    expect(tsLink).toHaveAttribute('href', '/troubleshooting/obd2-not-connecting')
  })

  it('uses header landmark element', async () => {
    const { SiteHeader } = await import('./SiteHeader')
    const element = await SiteHeader()
    render(element)

    const header = screen.getByRole('banner')
    expect(header).toBeInTheDocument()
  })
})

describe('MobileMenuToggle', () => {
  it('renders hamburger button that toggles mobile menu', () => {
    render(<MobileMenuToggle />)
    const hamburger = screen.getByLabelText('Open menu')
    expect(hamburger).toBeInTheDocument()
    expect(hamburger).toHaveAttribute('aria-expanded', 'false')

    fireEvent.click(hamburger)

    const closeButton = screen.getByLabelText('Close menu')
    expect(closeButton).toHaveAttribute('aria-expanded', 'true')

    const mobileNav = screen.getByRole('navigation', {
      name: 'Main navigation',
    })
    expect(mobileNav).toBeInTheDocument()

    fireEvent.click(closeButton)
    expect(screen.getByLabelText('Open menu')).toHaveAttribute(
      'aria-expanded',
      'false'
    )
  })

  it('closes mobile menu when a link is clicked', () => {
    render(<MobileMenuToggle />)
    fireEvent.click(screen.getByLabelText('Open menu'))

    const howToLink = screen.getByText('How-to')
    fireEvent.click(howToLink)

    expect(screen.getByLabelText('Open menu')).toHaveAttribute(
      'aria-expanded',
      'false'
    )
  })
})
