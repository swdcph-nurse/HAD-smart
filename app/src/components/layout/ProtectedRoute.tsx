import { Navigate, Outlet } from 'react-router-dom'
import { useAuth } from '@/context/AuthContext'
import { LoadingScreen } from '@/components/ui/LoadingScreen'

export function ProtectedRoute() {
  const { session, loading } = useAuth()

  if (loading) return <LoadingScreen label="กำลังตรวจสอบสิทธิ์การเข้าใช้งาน" />
  if (!session) return <Navigate to="/login" replace />

  return <Outlet />
}
