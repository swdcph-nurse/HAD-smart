import { Home, ScanLine, BellRing, LayoutDashboard, UserRound, ClipboardCheck, Pill } from 'lucide-react'
import type { Role } from '@/lib/types'

export interface NavItem {
  to: string
  label: string
  icon: typeof Home
  comingSoon?: boolean
}

export function getNavItems(role: Role | undefined): NavItem[] {
  const isSupervisory = role && ['supervisor', 'admin', 'executive'].includes(role)
  if (role === 'admin') {
    return [
      { to: '/', label: 'หน้าแรก', icon: Home },
      { to: '/dashboard', label: 'แดชบอร์ดผลการนิเทศ', icon: LayoutDashboard },
      { to: '/admin/drugs', label: 'จัดการรายการยา', icon: Pill },
      { to: '/profile', label: 'ผู้ดูแลระบบ', icon: UserRound },
    ]
  }
  if (isSupervisory) {
    return [
      { to: '/', label: 'หน้าแรก', icon: Home },
      { to: '/dashboard', label: 'แดชบอร์ด', icon: LayoutDashboard },
      { to: '/assessment', label: 'ประเมิน', icon: ClipboardCheck },
      { to: '/alerts', label: 'Alert', icon: BellRing },
      { to: '/profile', label: 'โปรไฟล์', icon: UserRound },
    ]
  }
  return [
    { to: '/', label: 'หน้าแรก', icon: Home },
    { to: '/checklist', label: 'Checklist', icon: ScanLine },
    { to: '/assessment', label: 'ประเมิน', icon: ClipboardCheck },
    { to: '/alerts', label: 'Alert', icon: BellRing },
    { to: '/profile', label: 'โปรไฟล์', icon: UserRound },
  ]
}
