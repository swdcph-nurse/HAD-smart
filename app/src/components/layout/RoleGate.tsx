import { Navigate, Outlet } from 'react-router-dom'
import { useAuth } from '@/context/AuthContext'
import type { Role } from '@/lib/types'
import { LoadingScreen } from '@/components/ui/LoadingScreen'

/** จำกัดเส้นทางให้เข้าถึงได้เฉพาะบทบาทที่ระบุ — ผู้ใช้ role อื่นถูกพากลับหน้าแรกของตน */
export function RoleGate({ allow }: { allow: Role[] }) {
  const { profile, profileLoading } = useAuth()

  if (profileLoading || !profile) return <LoadingScreen label="กำลังโหลดข้อมูลผู้ใช้" />
  if (!allow.includes(profile.role)) return <Navigate to="/" replace />

  return <Outlet />
}
