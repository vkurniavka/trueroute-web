import { render, screen, fireEvent } from '@testing-library/react'
import { describe, expect, it, vi } from 'vitest'
import { SiteHeader } from './SiteHeader'

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
  it('renders logo with link to home', () => {
    render(<SiteHeader />)
    const logo = screen.getByText('TrueRoute')
    expect(logo).toBeInTheDocument()
    expect(logo.closest('a')).toHaveAttribute('href', '/')
  })

  it('renders desktop nav links with correct hrefs', () => {
    render(<SiteHeader />)
    const howToLinks = screen.getAllByText('How-to')
    const desktopLink = howToLinks[0].closest('a')
    expect(desktopLink).toHaveAttribute('href', '/how-to/connect-obd2')

    const troubleshootingLinks = screen.getAllByText('Troubleshooting')
    const desktopTsLink = troubleshootingLinks[0].closest('a')
    expect(desktopTsLink).toHaveAttribute(
      'href',
      '/troubleshooting/obd2-not-connecting'
    )
  })

  it('uses header landmark element', () => {
    render(<SiteHeader />)
    const header = screen.getByRole('banner')
    expect(header).toBeInTheDocument()
  })

  it('has nav with aria-label', () => {
    render(<SiteHeader />)
    const navs = screen.getAllByRole('navigation', {
      name: 'Main navigation',
    })
    expect(navs.length).toBeGreaterThanOrEqual(1)
  })

  it('renders hamburger button on mobile that toggles menu', () => {
    render(<SiteHeader />)
    const hamburger = screen.getByLabelText('Open menu')
    expect(hamburger).toBeInTheDocument()
    expect(hamburger).toHaveAttribute('aria-expanded', 'false')

    fireEvent.click(hamburger)

    const closeButton = screen.getByLabelText('Close menu')
    expect(closeButton).toHaveAttribute('aria-expanded', 'true')

    // Mobile menu should now be visible with links
    const mobileNavs = screen.getAllByRole('navigation', {
      name: 'Main navigation',
    })
    expect(mobileNavs.length).toBe(2) // desktop + mobile

    fireEvent.click(closeButton)
    expect(screen.getByLabelText('Open menu')).toHaveAttribute(
      'aria-expanded',
      'false'
    )
  })
})
