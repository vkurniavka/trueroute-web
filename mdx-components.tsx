import type { ReactNode, ComponentType } from 'react'
import { ScreenshotPlaceholder } from '@/components/ScreenshotPlaceholder'

type MDXComponents = Record<string, ComponentType<never> | ((props: Record<string, unknown>) => ReactNode)>

export function useMDXComponents(components: MDXComponents): MDXComponents {
  return {
    ScreenshotPlaceholder,
    ...components,
  }
}
