import { BrowserRouter, Routes, Route } from 'react-router-dom'
import { AuthProvider } from '@/context/AuthContext'
import { ProtectedRoute } from '@/components/layout/ProtectedRoute'
import { AppShell } from '@/components/layout/AppShell'
import { LoginPage } from '@/pages/LoginPage'
import { HomePage } from '@/pages/HomePage'
import { ProfilePage } from '@/pages/ProfilePage'
import { NotFoundPage } from '@/pages/NotFoundPage'
import { ChecklistHomePage } from '@/pages/checklist/ChecklistHomePage'
import { ChecklistFormPage } from '@/pages/checklist/ChecklistFormPage'

export default function App() {
  return (
    <BrowserRouter>
      <AuthProvider>
        <Routes>
          <Route path="/login" element={<LoginPage />} />

          {/* ทุกเส้นทางด้านล่างนี้ต้อง login ก่อน (ดู ProtectedRoute) */}
          <Route element={<ProtectedRoute />}>
            <Route element={<AppShell />}>
              <Route path="/" element={<HomePage />} />
              <Route path="/profile" element={<ProfilePage />} />
              <Route path="/checklist" element={<ChecklistHomePage />} />
              <Route path="/checklist/:phase" element={<ChecklistFormPage />} />
              {/* /alerts, /dashboard จะเพิ่มในเฟส 4 ตาม ROADMAP.md */}
            </Route>
          </Route>

          <Route path="*" element={<NotFoundPage />} />
        </Routes>
      </AuthProvider>
    </BrowserRouter>
  )
}
