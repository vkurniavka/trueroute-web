declare module '*.mdx' {
  import type { ComponentType } from 'react'

  const component: ComponentType
  export default component

  export const metadata: {
    title: string
    description: string
  }

  export const faqItems: {
    question: string
    answer: string
  }[]
}
