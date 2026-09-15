import { ShieldAlert } from 'lucide-react'

export function AlertsPage() {
  return (
    <div className="mx-auto max-w-3xl rounded-2xl border border-border bg-surface p-6 shadow-sm">
      <div className="flex items-start gap-3">
        <div className="rounded-xl bg-surface-sunken p-2">
          <ShieldAlert className="h-5 w-5 text-ink-muted" />
        </div>
        <div>
          <h1 className="text-lg font-semibold text-ink">Alert</h1>
          <p className="mt-1 text-sm text-ink-muted">
            เมนู Alert ถูกนำออกจากระบบแอดมินตามการออกแบบปัจจุบัน
          </p>
        </div>
      </div>
    </div>
  )
}
