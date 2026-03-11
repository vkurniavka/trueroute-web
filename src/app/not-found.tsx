import Link from 'next/link'

export default function NotFound() {
  return (
    <div className="flex min-h-[60vh] flex-col items-center justify-center gap-4 px-4 text-center">
      <p className="text-xs font-semibold uppercase tracking-widest text-text-muted">404</p>
      <h1 className="text-4xl font-bold text-text-primary">Page not found</h1>
      <p className="text-text-secondary">The page you&apos;re looking for doesn&apos;t exist or has been moved.</p>
      <Link href="/" className="mt-2 rounded-lg bg-blue-primary px-6 py-2 text-sm font-semibold text-text-primary transition-colors hover:bg-blue-bright">
        Go home
      </Link>
    </div>
  )
}
