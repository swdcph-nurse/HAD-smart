import { useAuth } from '@/context/AuthContext'
import { ROLE_LABEL_TH, type NurseLevel } from '@/lib/types'

const NURSE_LEVEL_LABEL_TH: Record<NurseLevel, string> = {
  novice: 'Novice',
  advanced_beginner: 'Advanced Beginner',
  competent: 'Competent',
  proficient: 'Proficient',
  expert: 'Expert',
}

export function ProfilePage() {
  const { profile } = useAuth()
  if (!profile) return null

  const rows: Array<[string, string]> = [
    ['รหัสผู้ใช้', profile.display_code],
    ['บทบาท', ROLE_LABEL_TH[profile.role]],
  ]
  if (profile.nurse_level) {
    rows.push(['ระดับความสามารถ', NURSE_LEVEL_LABEL_TH[profile.nurse_level]])
  }

  return (
    <div className="max-w-xl space-y-6">
      <h1 className="text-xl font-semibold text-ink">โปรไฟล์</h1>

      <div className="divide-y divide-border overflow-hidden rounded-lg border border-border bg-surface">
        {rows.map(([label, value]) => (
          <div key={label} className="flex items-center justify-between px-4 py-3">
            <span className="text-sm text-ink-muted">{label}</span>
            <span className="text-sm font-medium text-ink">{value}</span>
          </div>
        ))}
      </div>

      <p className="text-xs leading-relaxed text-ink-muted">
        การแก้ไขบทบาทหรือหอผู้ป่วยของบัญชีนี้ต้องดำเนินการโดยผู้ดูแลระบบเท่านั้น
        หากข้อมูลไม่ถูกต้อง กรุณาติดต่อผู้ดูแลระบบของหน่วยงาน
      </p>
    </div>
  )
}
