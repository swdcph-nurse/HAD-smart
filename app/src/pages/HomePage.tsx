import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { ScanLine, LayoutDashboard } from 'lucide-react'
import { useAuth } from '@/context/AuthContext'
import { supabase } from '@/lib/supabase'
import { ROLE_LABEL_TH } from '@/lib/types'

export function HomePage() {
  const { profile } = useAuth()
  const [wardName, setWardName] = useState<string | null>(null)

  useEffect(() => {
    if (!profile?.ward_id) return
    supabase
      .from('wards')
      .select('name')
      .eq('id', profile.ward_id)
      .single()
      .then(({ data }) => setWardName(data?.name ?? null))
  }, [profile?.ward_id])

  if (!profile) return null

  const isSupervisory = ['supervisor', 'admin', 'executive'].includes(profile.role)

  return (
    <div className="space-y-6">
      <section>
        <p className="text-sm text-ink-muted">สวัสดี</p>
        <h1 className="text-xl font-semibold text-ink">{profile.display_code}</h1>
        <p className="mt-0.5 text-sm text-ink-muted">
          {ROLE_LABEL_TH[profile.role]}
          {wardName ? ` · ${wardName}` : ''}
        </p>
      </section>

      {!profile.ward_id && (
        <div className="rounded-lg border border-alert-orange/30 bg-alert-orange-soft px-4 py-3 text-sm text-alert-orange">
          บัญชีนี้ยังไม่ถูกกำหนดหอผู้ป่วย (ward) กรุณาติดต่อผู้ดูแลระบบเพื่อกำหนดสิทธิ์ให้ครบถ้วน
        </div>
      )}

      {!isSupervisory ? (
        <Link
          to="/checklist"
          className="flex items-center gap-3 rounded-lg border border-accent/30 bg-accent-soft px-4 py-3.5 transition-colors hover:border-accent"
        >
          <ScanLine className="h-5 w-5 shrink-0 text-accent" strokeWidth={1.75} />
          <div className="flex-1">
            <p className="text-sm font-medium text-ink">เริ่ม QR Checklist</p>
            <p className="text-xs text-ink-muted">บันทึกตรวจสอบก่อน / ขณะ / หลังให้ยา</p>
          </div>
        </Link>
      ) : (
        <Link
          to="/dashboard"
          className="flex items-center gap-3 rounded-lg border border-accent/30 bg-accent-soft px-4 py-3.5 transition-colors hover:border-accent"
        >
          <LayoutDashboard className="h-5 w-5 shrink-0 text-accent" strokeWidth={1.75} />
          <div className="flex-1">
            <p className="text-sm font-medium text-ink">ดูแดชบอร์ดนิเทศ</p>
            <p className="text-xs text-ink-muted">สรุปภาพรวมและ Alert ที่ต้องติดตาม</p>
          </div>
        </Link>
      )}

      <section className="space-y-3">
        <h2 className="text-sm font-medium text-ink-muted">โมดูลของระบบ</h2>

        <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-3">
          <RoadmapCard title="แบบประเมินพฤติกรรม และ Pre/Post-test" phase="เฟส 5" />
        </div>
      </section>
    </div>
  )
}

function RoadmapCard({ title, phase }: { title: string; phase: string }) {
  return (
    <div className="flex items-center justify-between gap-3 rounded-lg border border-border bg-surface px-4 py-3.5">
      <div>
        <p className="text-sm font-medium text-ink">{title}</p>
        <p className="mt-0.5 text-xs text-ink-muted">อยู่ระหว่างพัฒนา — เปิดใช้งานใน {phase}</p>
      </div>
      <span className="shrink-0 rounded-full bg-surface-sunken px-2.5 py-1 text-[11px] font-medium text-ink-muted">
        เร็วๆ นี้
      </span>
    </div>
  )
}
