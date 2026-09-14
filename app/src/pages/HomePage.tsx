import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { ScanLine, LayoutDashboard, ClipboardCheck } from 'lucide-react'
import { useAuth } from '@/context/AuthContext'
import { supabase } from '@/lib/supabase'
import { ROLE_LABEL_TH } from '@/lib/types'

export function HomePage() {
  const { profile } = useAuth()
  const [wardName, setWardName] = useState<string | null>(null)
  useEffect(() => {
    if (!profile?.ward_id) return
    supabase.from('wards').select('name').eq('id', profile.ward_id).single().then(({ data }) => setWardName(data?.name ?? null))
  }, [profile?.ward_id])
  if (!profile) return null
  const isSupervisory = ['supervisor', 'admin', 'executive'].includes(profile.role)
  return (
    <div className="space-y-6">
      <section>
        <p className="text-sm text-ink-muted">สวัสดี</p>
        <h1 className="text-xl font-semibold text-ink">{profile.display_code}</h1>
        <p className="mt-0.5 text-sm text-ink-muted">{ROLE_LABEL_TH[profile.role]}{wardName ? ` · ${wardName}` : ''}</p>
      </section>
      {!profile.ward_id && <div className="rounded-lg border border-alert-orange/30 bg-alert-orange-soft px-4 py-3 text-sm text-alert-orange">บัญชีนี้ยังไม่ถูกกำหนดหอผู้ป่วย (ward) กรุณาติดต่อผู้ดูแลระบบ</div>}
      {!isSupervisory ? (
        <Link to="/checklist" className="flex items-center gap-3 rounded-lg border border-accent/30 bg-accent-soft px-4 py-3.5 hover:border-accent"><ScanLine className="h-5 w-5 shrink-0 text-accent" /><div className="flex-1"><p className="text-sm font-medium text-ink">เริ่ม QR Checklist</p><p className="text-xs text-ink-muted">บันทึกตรวจสอบก่อน / ขณะ / หลังให้ยา</p></div></Link>
      ) : (
        <Link to="/dashboard" className="flex items-center gap-3 rounded-lg border border-accent/30 bg-accent-soft px-4 py-3.5 hover:border-accent"><LayoutDashboard className="h-5 w-5 shrink-0 text-accent" /><div className="flex-1"><p className="text-sm font-medium text-ink">ดูแดชบอร์ดนิเทศ</p><p className="text-xs text-ink-muted">สรุปภาพรวมและ Alert ที่ต้องติดตาม</p></div></Link>
      )}
      <section className="space-y-3"><h2 className="text-sm font-medium text-ink-muted">โมดูลของระบบ</h2><div className="grid gap-3 md:grid-cols-2 xl:grid-cols-3"><Link to="/assessment" className="flex items-center gap-3 rounded-lg border border-accent/30 bg-surface px-4 py-3.5 hover:border-accent"><ClipboardCheck className="h-5 w-5 text-accent" /><div><p className="text-sm font-medium text-ink">ประเมินพฤติกรรมและ Pre/Post-test</p><p className="mt-0.5 text-xs text-ink-muted">เฟส 5 · พร้อมใช้งาน</p></div></Link></div></section>
    </div>
  )
}
