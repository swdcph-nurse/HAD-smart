import { BrowserRouter, Routes, Route } from 'react-router-dom'
import { AuthProvider } from '@/context/AuthContext'
import { ProtectedRoute } from '@/components/layout/ProtectedRoute'
import { AppShell } from '@/components/layout/AppShell'
import { LoginPage } from '@/pages/LoginPage'
import { LandingPage } from '@/pages/LandingPage'
import { NurseRolePage } from '@/pages/NurseRolePage'
import { HomePage } from '@/pages/HomePage'
import { ProfilePage } from '@/pages/ProfilePage'
import { NotFoundPage } from '@/pages/NotFoundPage'
import { ChecklistHomePage } from '@/pages/checklist/ChecklistHomePage'
import { ChecklistFormPage } from '@/pages/checklist/ChecklistFormPage'
import { DashboardPage } from '@/pages/dashboard/DashboardPage'
import { AlertsPage } from '@/pages/alerts/AlertsPage'
import { AssessmentPage } from '@/pages/assessment/AssessmentPage'
import { RoleGate } from '@/components/layout/RoleGate'
import { KioskPage } from '@/pages/KioskPage'

export default function App() {
  return <BrowserRouter><AuthProvider><Routes>
    <Route path="/" element={<LandingPage />} />
    <Route path="/nurse" element={<NurseRolePage />} />
    <Route path="/nurse/med" element={<KioskPage />} />
    <Route path="/nurse/charge" element={<KioskPage />} />
    <Route path="/kiosk" element={<KioskPage />} />
    <Route path="/login" element={<LoginPage />} />
    <Route element={<ProtectedRoute />}><Route element={<AppShell />}>
      <Route path="/home" element={<HomePage />} />
      <Route path="/profile" element={<ProfilePage />} />
      <Route path="/checklist" element={<ChecklistHomePage />} />
      <Route path="/checklist/:phase" element={<ChecklistFormPage />} />
      <Route path="/assessment" element={<AssessmentPage />} />
      <Route path="/alerts" element={<AlertsPage />} />
      <Route element={<RoleGate allow={['supervisor', 'admin', 'executive']} />}><Route path="/dashboard" element={<DashboardPage />} /></Route>
    </Route></Route>
    <Route path="*" element={<NotFoundPage />} />
  </Routes></AuthProvider></BrowserRouter>
}
