import fs from 'fs'
import path from 'path'
import type { Metadata } from 'next'
import { notFound } from 'next/navigation'
import { DocLayout } from '@/components/DocLayout'

const contentDir = path.join(process.cwd(), 'content', 'troubleshooting')

export function generateStaticParams() {
  if (!fs.existsSync(contentDir)) return []
  return fs
    .readdirSync(contentDir)
    .filter((f) => f.endsWith('.mdx'))
    .map((f) => ({ slug: f.replace('.mdx', '') }))
}

interface PageProps {
  params: Promise<{ slug: string }>
}

async function getMdxModule(slug: string) {
  try {
    return await import(`../../../../content/troubleshooting/${slug}.mdx`)
  } catch {
    return null
  }
}

export async function generateMetadata({ params }: PageProps): Promise<Metadata> {
  const { slug } = await params
  const mod = await getMdxModule(slug)
  if (!mod?.metadata) return {}
  return {
    title: mod.metadata.title,
    description: mod.metadata.description,
  }
}

export default async function TroubleshootingPage({ params }: PageProps) {
  const { slug } = await params
  const mod = await getMdxModule(slug)
  if (!mod) notFound()

  const Content = mod.default
  const title = mod.metadata?.title ?? slug

  return (
    <DocLayout section="troubleshooting" title={title}>
      <Content />
    </DocLayout>
  )
}
