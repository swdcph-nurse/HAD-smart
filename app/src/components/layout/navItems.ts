import { Home, ScanLine, BellRing, LayoutDashboard, UserRound } from 'lucide-react'
import type { Role } from '@/lib/types'

export interface NavItem {
  to: string
  label: string
  icon: typeof Home
  /** โมดูลที่ยังไม่ได้พัฒนา (จะเปิดใช้งานในเฟสถัดไปตาม ROADMAP.md) */
  comingSoon?: boolean
}

export function getNavItems(role: Role | undefined): NavItem[] {
  const isSupervisory = role && ['supervisor', 'admin', 'executive'].includes(role)

  if (isSupervisory) {
    return [
      { to: '/', label: 'หน้าแรก', icon: Home },
      { to: '/dashboard', label: 'แดชบอร์ด', icon: LayoutDashboard },
      { to: '/alerts', label: 'Alert', icon: BellRing },
      { to: '/profile', label: 'โปรไฟล์', icon: UserRound },
    ]
  }

  return [
    { to: '/', label: 'หน้าแรก', icon: Home },
    { to: '/checklist', label: 'Checklist', icon: ScanLine },
    { to: '/alerts', label: 'Alert', icon: BellRing },
    { to: '/profile', label: 'โปรไฟล์', icon: UserRound },
  ]
}
