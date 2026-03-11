interface Props {
  label: string
}

export function ScreenshotPlaceholder({ label }: Props) {
  return (
    <div className="my-6 flex min-h-[160px] items-center justify-center rounded-xl border border-dashed border-border bg-surface-card px-4 py-8 text-center">
      <div>
        <div className="mx-auto mb-3 flex h-10 w-10 items-center justify-center rounded-full bg-surface-elevated">
          <svg
            width="20"
            height="20"
            fill="none"
            stroke="currentColor"
            strokeWidth="1.5"
            viewBox="0 0 24 24"
            className="text-text-muted"
            aria-hidden="true"
          >
            <rect x="3" y="3" width="18" height="18" rx="2" />
            <circle cx="8.5" cy="8.5" r="1.5" />
            <path d="m21 15-5-5L5 21" />
          </svg>
        </div>
        <p className="text-sm text-text-muted">{label}</p>
      </div>
    </div>
  )
}
