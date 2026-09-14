import { Navigate, Outlet } from 'react-router-dom'
import { useAuth } from '@/context/AuthContext'
import { LoadingScreen } from '@/components/ui/LoadingScreen'

/** จำกัดเส้นทางให้เฉพาะบัญชีที่มี session และ profile ที่ยังเปิดใช้งาน */
export function ProtectedRoute() {
  const { session, profile, loading, profileLoading, signOut } = useAuth()

  if (loading || (session && profileLoading)) return <LoadingScreen label="กำลังตรวจสอบสิทธิ์การเข้าใช้งาน" />
  if (!session) return <Navigate to="/login" replace />
  if (!profile || !profile.is_active) {
    return <div className="grid min-h-dvh place-items-center bg-canvas p-6"><div className="w-full max-w-md rounded-2xl border border-border bg-surface p-6 text-center"><h1 className="text-lg font-semibold text-ink">บัญชีถูกปิดใช้งาน</h1><p className="mt-2 text-sm text-ink-muted">บัญชีนี้ไม่มีสิทธิ์เข้าใช้งานระบบในขณะนี้ กรุณาติดต่อผู้ดูแลระบบ</p><button onClick={() => void signOut()} className="mt-5 rounded-xl bg-accent px-4 py-2.5 text-sm font-semibold text-white">ออกจากระบบ</button></div></div>
  }

  return <Outlet />
}
