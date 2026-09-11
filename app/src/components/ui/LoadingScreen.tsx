export function LoadingScreen({ label = 'กำลังโหลด' }: { label?: string }) {
  return (
    <div className="flex min-h-dvh flex-col items-center justify-center gap-3 bg-canvas px-6 text-center">
      <div
        className="h-8 w-8 animate-spin rounded-full border-2 border-border border-t-accent"
        role="status"
        aria-label={label}
      />
      <p className="text-sm text-ink-muted">{label}…</p>
    </div>
  )
}
