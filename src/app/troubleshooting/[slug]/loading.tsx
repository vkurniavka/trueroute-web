export default function Loading() {
  return (
    <div className="mx-auto max-w-3xl animate-pulse px-4 py-8 sm:px-6 lg:px-8">
      <div className="mb-8 h-4 w-48 rounded bg-surface-elevated" />
      <div className="space-y-4">
        <div className="h-8 w-3/4 rounded bg-surface-elevated" />
        <div className="h-4 rounded bg-surface-elevated" />
        <div className="h-4 w-5/6 rounded bg-surface-elevated" />
        <div className="h-4 w-4/6 rounded bg-surface-elevated" />
      </div>
    </div>
  )
}
