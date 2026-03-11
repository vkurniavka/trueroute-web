'use client'

export default function Error({ error, reset }: { error: Error & { digest?: string }; reset: () => void }) {
  return (
    <div className="flex min-h-[60vh] flex-col items-center justify-center gap-4 px-4 text-center">
      <p className="text-xs font-semibold uppercase tracking-widest text-text-muted">Error</p>
      <h2 className="text-3xl font-bold text-text-primary">Something went wrong</h2>
      <p className="text-text-secondary">{error.message}</p>
      <button onClick={reset} className="mt-2 rounded-lg bg-blue-primary px-6 py-2 text-sm font-semibold text-text-primary transition-colors hover:bg-blue-bright">
        Try again
      </button>
    </div>
  )
}
