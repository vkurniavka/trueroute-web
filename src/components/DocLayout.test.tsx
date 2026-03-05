import { render, screen } from '@testing-library/react'
import { describe, expect, it, vi } from 'vitest'

vi.mock('next-intl/server', () => ({
  getTranslations: () =>
    Promise.resolve((key: string) => {
      const translations: Record<string, string> = {
        breadcrumb: 'Breadcrumb',
        home: 'Home',
        howTo: 'How-to',
        troubleshooting: 'Troubleshooting',
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

describe('DocLayout', () => {
  it('renders breadcrumb with Home link, section, and page title for how-to', async () => {
    const { DocLayout } = await import('./DocLayout')
    const result = await DocLayout({
      section: 'how-to',
      title: 'Connect your OBD2 adapter',
      children: <p>Test content</p>,
    })
    render(result)

    const homeLink = screen.getByText('Home')
    expect(homeLink).toBeInTheDocument()
    expect(homeLink).toHaveAttribute('href', '/')

    expect(screen.getByText('How-to')).toBeInTheDocument()
    expect(screen.getByText('Connect your OBD2 adapter')).toBeInTheDocument()
  })

  it('renders breadcrumb with Troubleshooting section label', async () => {
    const { DocLayout } = await import('./DocLayout')
    const result = await DocLayout({
      section: 'troubleshooting',
      title: 'OBD2 not connecting',
      children: <p>Content</p>,
    })
    render(result)

    expect(screen.getByText('Troubleshooting')).toBeInTheDocument()
    expect(screen.getByText('OBD2 not connecting')).toBeInTheDocument()
  })

  it('renders children inside the content area', async () => {
    const { DocLayout } = await import('./DocLayout')
    const result = await DocLayout({
      section: 'how-to',
      title: 'Test Page',
      children: <p>This is the MDX content</p>,
    })
    render(result)

    expect(screen.getByText('This is the MDX content')).toBeInTheDocument()
  })

  it('renders as an article element', async () => {
    const { DocLayout } = await import('./DocLayout')
    const result = await DocLayout({
      section: 'how-to',
      title: 'Test',
      children: <p>Content</p>,
    })
    const { container } = render(result)

    expect(container.querySelector('article')).toBeInTheDocument()
  })

  it('has accessible breadcrumb navigation', async () => {
    const { DocLayout } = await import('./DocLayout')
    const result = await DocLayout({
      section: 'how-to',
      title: 'Test',
      children: <p>Content</p>,
    })
    render(result)

    const nav = screen.getByLabelText('Breadcrumb')
    expect(nav).toBeInTheDocument()
    expect(nav.tagName).toBe('NAV')
  })

  it('limits content width for readability', async () => {
    const { DocLayout } = await import('./DocLayout')
    const result = await DocLayout({
      section: 'how-to',
      title: 'Test',
      children: <p>Content</p>,
    })
    const { container } = render(result)

    const contentDiv = container.querySelector('.doc-content')
    expect(contentDiv).toBeInTheDocument()
  })
})
