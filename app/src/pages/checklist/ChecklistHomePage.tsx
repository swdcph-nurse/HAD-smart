import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { ClipboardList, Syringe, ClipboardCheck, ChevronRight } from 'lucide-react'
import { useAuth } from '@/context/AuthContext'
import { fetchMyRecentResponses } from '@/lib/checklist'
import type { ChecklistPhase, ChecklistResponse } from '@/lib/types'
import { ALERT_LEVEL_LABEL_TH } from '@/lib/types'

const PHASES: Array<{ phase: ChecklistPhase; label: string; desc: string; icon: typeof Syringe }> = [
  { phase: 'before', label: 'ก่อนให้ยา', desc: '9 ข้อ — ตรวจคำสั่งแพทย์ เตรียมยา Double Check', icon: ClipboardList },
  { phase: 'during', label: 'ขณะให้ยา', desc: '5 ข้อ — ยืนยันตัวผู้ป่วย ควบคุมการให้สารน้ำ', icon: Syringe },
  { phase: 'after', label: 'หลังให้ยา', desc: '6 ข้อ — บันทึก MAR เฝ้าระวังอาการ', icon: ClipboardCheck },
]

const LEVEL_DOT: Record<string, string> = {
  red: 'bg-alert-red',
  orange: 'bg-alert-orange',
  yellow: 'bg-alert-yellow',
  green: 'bg-alert-green',
}

export function ChecklistHomePage() {
  const { session } = useAuth()
  const [recent, setRecent] = useState<ChecklistResponse[] | null>(null)

  useEffect(() => {
    if (!session) return
    fetchMyRecentResponses(session.user.id, 8)
      .then(setRecent)
      .catch(() => setRecent([]))
  }, [session])

  return (
    <div className="space-y-8">
      <section>
        <h1 className="text-xl font-semibold text-ink">QR Checklist</h1>
        <p className="mt-1 text-sm text-ink-muted">
          เลือกช่วงที่ต้องการบันทึก — ระบบจะประเมินและแจ้งเตือนทันทีที่กดบันทึก
        </p>
      </section>

      <section className="grid gap-3 md:grid-cols-3">
        {PHASES.map(({ phase, label, desc, icon: Icon }) => (
          <Link
            key={phase}
            to={`/checklist/${phase}`}
            className="group flex items-start gap-3 rounded-lg border border-border bg-surface px-4 py-4 transition-colors hover:border-accent"
          >
            <div className="rounded-md bg-accent-soft p-2 text-accent">
              <Icon className="h-5 w-5" strokeWidth={1.75} />
            </div>
            <div className="flex-1">
              <p className="text-sm font-medium text-ink">{label}</p>
              <p className="mt-0.5 text-xs leading-relaxed text-ink-muted">{desc}</p>
            </div>
            <ChevronRight className="mt-1 h-4 w-4 shrink-0 text-ink-muted/50 group-hover:text-accent" />
          </Link>
        ))}
      </section>

      <section>
        <h2 className="mb-3 text-sm font-medium text-ink-muted">รายการที่บันทึกล่าสุดของฉัน</h2>

        {recent === null ? (
          <p className="text-sm text-ink-muted">กำลังโหลด…</p>
        ) : recent.length === 0 ? (
          <p className="rounded-lg border border-dashed border-border px-4 py-6 text-center text-sm text-ink-muted">
            ยังไม่มีรายการที่บันทึกไว้
          </p>
        ) : (
          <div className="divide-y divide-border overflow-hidden rounded-lg border border-border bg-surface">
            {recent.map((r) => (
              <div key={r.id} className="flex items-center justify-between gap-3 px-4 py-3">
                <div className="flex items-center gap-2.5">
                  <span className={`h-2.5 w-2.5 shrink-0 rounded-full ${LEVEL_DOT[r.computed_level]}`} />
                  <div>
                    <p className="text-sm font-medium text-ink">
                      เตียง {r.bed_code} · {SHIFT_LABEL[r.shift]}
                    </p>
                    <p className="text-xs text-ink-muted">{ALERT_LEVEL_LABEL_TH[r.computed_level]}</p>
                  </div>
                </div>
                <time className="shrink-0 text-xs text-ink-muted">
                  {new Date(r.created_at).toLocaleString('th-TH', {
                    day: '2-digit',
                    month: '2-digit',
                    hour: '2-digit',
                    minute: '2-digit',
                  })}
                </time>
              </div>
            ))}
          </div>
        )}
      </section>
    </div>
  )
}

const SHIFT_LABEL: Record<string, string> = {
  morning: 'เวรเช้า',
  afternoon: 'เวรบ่าย',
  night: 'เวรดึก',
}
