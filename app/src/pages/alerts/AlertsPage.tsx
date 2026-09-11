import { useEffect, useState } from 'react'
import { ShieldAlert } from 'lucide-react'
import { useAuth } from '@/context/AuthContext'
import { closeAlert, fetchMyAlerts, fetchOpenAlerts, type AlertWithResponse } from '@/lib/dashboard'
import type { AlertLevel } from '@/lib/types'
import { ALERT_LEVEL_LABEL_TH } from '@/lib/types'
import { LoadingScreen } from '@/components/ui/LoadingScreen'

const LEVEL_DOT: Record<AlertLevel, string> = {
  red: 'bg-alert-red',
  orange: 'bg-alert-orange',
  yellow: 'bg-alert-yellow',
  green: 'bg-alert-green',
}

const SHIFT_LABEL: Record<string, string> = {
  morning: 'เวรเช้า',
  afternoon: 'เวรบ่าย',
  night: 'เวรดึก',
}

export function AlertsPage() {
  const { profile, session } = useAuth()
  const isSupervisory = profile && ['supervisor', 'admin', 'executive'].includes(profile.role)

  const [alerts, setAlerts] = useState<AlertWithResponse[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  function reload() {
    if (!session) return
    setLoading(true)
    const fetcher = isSupervisory ? fetchOpenAlerts() : fetchMyAlerts(session.user.id)
    fetcher
      .then(setAlerts)
      .catch((err: Error) => setError(err.message))
      .finally(() => setLoading(false))
  }

  useEffect(() => {
    reload()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [session, isSupervisory])

  if (loading) return <LoadingScreen label="กำลังโหลด Alert" />
  if (error) {
    return (
      <div className="rounded-lg border border-alert-red/30 bg-alert-red-soft px-4 py-3 text-sm text-alert-red">
        {error}
      </div>
    )
  }

  return (
    <div className="max-w-3xl space-y-5">
      <section>
        <h1 className="text-xl font-semibold text-ink">Alert</h1>
        <p className="mt-1 text-sm text-ink-muted">
          {isSupervisory
            ? 'รายการ Alert ที่ยังไม่ปิด — ตรวจสอบและบันทึกการแก้ไข'
            : 'สถานะ Alert จากรายการที่คุณบันทึกไว้'}
        </p>
      </section>

      {alerts.length === 0 ? (
        <p className="rounded-lg border border-dashed border-border px-4 py-8 text-center text-sm text-ink-muted">
          {isSupervisory ? 'ไม่มี Alert ค้างอยู่ในขณะนี้ 🎉' : 'ยังไม่มี Alert จากรายการที่คุณบันทึก'}
        </p>
      ) : (
        <div className="space-y-3">
          {alerts.map((alert) =>
            isSupervisory ? (
              <SupervisorAlertCard key={alert.id} alert={alert} onClosed={reload} />
            ) : (
              <ReadOnlyAlertCard key={alert.id} alert={alert} />
            ),
          )}
        </div>
      )}
    </div>
  )
}

function AlertMeta({ alert }: { alert: AlertWithResponse }) {
  return (
    <div className="flex items-center gap-2.5">
      <span className={`h-2.5 w-2.5 shrink-0 rounded-full ${LEVEL_DOT[alert.level]}`} />
      <div>
        <p className="text-sm font-medium text-ink">
          เตียง {alert.response?.bed_code ?? '—'}
          {alert.response?.shift && ` · ${SHIFT_LABEL[alert.response.shift]}`}
        </p>
        <p className="text-xs text-ink-muted">
          {ALERT_LEVEL_LABEL_TH[alert.level]} · เปิดเมื่อ{' '}
          {new Date(alert.opened_at).toLocaleString('th-TH', {
            day: '2-digit',
            month: '2-digit',
            hour: '2-digit',
            minute: '2-digit',
          })}
        </p>
      </div>
    </div>
  )
}

function ReadOnlyAlertCard({ alert }: { alert: AlertWithResponse }) {
  return (
    <div className="rounded-lg border border-border bg-surface px-4 py-3.5">
      <div className="flex items-center justify-between">
        <AlertMeta alert={alert} />
        <span
          className={`shrink-0 rounded-full px-2.5 py-1 text-[11px] font-medium ${
            alert.closed_at ? 'bg-alert-green-soft text-alert-green' : 'bg-alert-orange-soft text-alert-orange'
          }`}
        >
          {alert.closed_at ? 'ปิดแล้ว' : 'รอติดตาม'}
        </span>
      </div>
      {alert.corrective_action && (
        <p className="mt-2.5 rounded-md bg-surface-sunken px-3 py-2 text-xs text-ink-muted">
          การแก้ไข: {alert.corrective_action}
        </p>
      )}
    </div>
  )
}

function SupervisorAlertCard({ alert, onClosed }: { alert: AlertWithResponse; onClosed: () => void }) {
  const { session } = useAuth()
  const [expanded, setExpanded] = useState(false)
  const [correctiveAction, setCorrectiveAction] = useState('')
  const [submitting, setSubmitting] = useState(false)
  const [err, setErr] = useState<string | null>(null)

  async function handleClose() {
    if (!session || correctiveAction.trim().length === 0) return
    setSubmitting(true)
    setErr(null)
    try {
      await closeAlert({
        alertId: alert.id,
        closedBy: session.user.id,
        verifiedBy: session.user.id,
        correctiveAction: correctiveAction.trim(),
      })
      onClosed()
    } catch (e) {
      setErr(e instanceof Error ? e.message : 'ปิด Alert ไม่สำเร็จ')
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <div className="rounded-lg border border-border bg-surface px-4 py-3.5">
      <div className="flex items-center justify-between">
        <AlertMeta alert={alert} />
        <button
          onClick={() => setExpanded((v) => !v)}
          className="shrink-0 rounded-md border border-border px-3 py-1.5 text-xs font-medium text-ink hover:bg-surface-sunken"
        >
          {expanded ? 'ยกเลิก' : 'ปิด Alert'}
        </button>
      </div>

      {expanded && (
        <div className="mt-3 space-y-2 border-t border-border pt-3">
          <label className="flex items-start gap-2 text-xs text-ink-muted">
            <ShieldAlert className="mt-0.5 h-3.5 w-3.5 shrink-0 text-alert-orange" />
            ระบุการแก้ไข/ตรวจสอบซ้ำที่ทำแล้ว ก่อนปิดรายการนี้
          </label>
          <textarea
            value={correctiveAction}
            onChange={(e) => setCorrectiveAction(e.target.value)}
            rows={2}
            placeholder="เช่น ตรวจสอบซ้ำร่วมกับพยาบาลผู้บันทึก แก้ไขอัตราการให้สารน้ำแล้ว"
            className="w-full rounded-md border border-border bg-surface px-3 py-2 text-sm text-ink placeholder:text-ink-muted/60 focus:border-accent"
          />
          {err && <p className="text-xs text-alert-red">{err}</p>}
          <button
            onClick={() => void handleClose()}
            disabled={submitting || correctiveAction.trim().length === 0}
            className="rounded-md bg-ink px-4 py-2 text-xs font-medium text-white hover:bg-ink/90 disabled:opacity-50"
          >
            {submitting ? 'กำลังบันทึก…' : 'ยืนยันปิด Alert'}
          </button>
        </div>
      )}
    </div>
  )
}
