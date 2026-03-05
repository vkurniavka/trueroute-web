import { render } from '@testing-library/react'
import { describe, expect, it } from 'vitest'
import { FaqStructuredData } from './FaqStructuredData'

describe('FaqStructuredData', () => {
  const items = [
    { question: 'Why is X?', answer: 'Because of Y.' },
    { question: 'How do I Z?', answer: 'Do A then B.' },
  ]

  it('renders a script tag with application/ld+json type', () => {
    const { container } = render(<FaqStructuredData items={items} />)
    const script = container.querySelector('script[type="application/ld+json"]')
    expect(script).toBeInTheDocument()
  })

  it('renders valid FAQPage JSON-LD schema', () => {
    const { container } = render(<FaqStructuredData items={items} />)
    const script = container.querySelector('script[type="application/ld+json"]')
    const jsonLd = JSON.parse(script?.innerHTML ?? '{}')

    expect(jsonLd['@context']).toBe('https://schema.org')
    expect(jsonLd['@type']).toBe('FAQPage')
    expect(jsonLd.mainEntity).toHaveLength(2)
  })

  it('maps items to Question/Answer entities', () => {
    const { container } = render(<FaqStructuredData items={items} />)
    const script = container.querySelector('script[type="application/ld+json"]')
    const jsonLd = JSON.parse(script?.innerHTML ?? '{}')

    expect(jsonLd.mainEntity[0]['@type']).toBe('Question')
    expect(jsonLd.mainEntity[0].name).toBe('Why is X?')
    expect(jsonLd.mainEntity[0].acceptedAnswer['@type']).toBe('Answer')
    expect(jsonLd.mainEntity[0].acceptedAnswer.text).toBe('Because of Y.')

    expect(jsonLd.mainEntity[1].name).toBe('How do I Z?')
    expect(jsonLd.mainEntity[1].acceptedAnswer.text).toBe('Do A then B.')
  })

  it('renders empty mainEntity array when no items provided', () => {
    const { container } = render(<FaqStructuredData items={[]} />)
    const script = container.querySelector('script[type="application/ld+json"]')
    const jsonLd = JSON.parse(script?.innerHTML ?? '{}')

    expect(jsonLd.mainEntity).toHaveLength(0)
  })
})
