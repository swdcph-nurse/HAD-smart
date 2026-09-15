import { useState, type FormEvent } from 'react'
import { Navigate } from 'react-router-dom'
import { useAuth } from '@/context/AuthContext'

export function LoginPage() {
  const { session, loading, signInWithPassword } = useAuth()
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [error, setError] = useState<string | null>(null)
  const [submitting, setSubmitting] = useState(false)

  if (!loading && session) return <Navigate to="/dashboard" replace />

  async function handleSubmit(e: FormEvent) {
    e.preventDefault()
    setError(null)
    setSubmitting(true)
    const { error } = await signInWithPassword(email, password)
    setSubmitting(false)
    if (error) setError(error)
  }

  return (
    <div className="grid min-h-dvh place-items-center bg-canvas px-5 py-10">
      <div className="w-full max-w-sm">
        <header className="mb-8">
          <div className="mb-5 flex items-center gap-3">
            <img src="/brand/had-smart.jpg" alt="HAD Smart" className="h-16 w-16 rounded-2xl object-cover shadow-sm" />
            <div>
              <p className="text-lg font-bold text-ink">HAD Smart</p>
              <p className="text-xs text-ink-muted">High Alert Drug Supervision</p>
            </div>
          </div>
          <h1 className="mt-1 text-2xl font-semibold text-ink">ผู้ดูแลระบบ</h1>
          <p className="mt-1.5 text-sm leading-relaxed text-ink-muted">เข้าสู่ระบบด้วย Email และรหัสผ่านของบัญชีผู้ดูแลระบบที่ลงทะเบียนไว้</p>
        </header>
        <form onSubmit={handleSubmit} className="space-y-4" noValidate>
          <div>
            <label htmlFor="email" className="mb-1.5 block text-sm font-medium text-ink">Email</label>
            <input id="email" type="email" autoComplete="username" required value={email} onChange={(e) => setEmail(e.target.value)} className="w-full rounded-md border border-border bg-surface px-3.5 py-2.5 text-ink" placeholder="admin@hospital.go.th" />
          </div>
          <div>
            <label htmlFor="password" className="mb-1.5 block text-sm font-medium text-ink">รหัสผ่าน</label>
            <input id="password" type="password" autoComplete="current-password" required value={password} onChange={(e) => setPassword(e.target.value)} className="w-full rounded-md border border-border bg-surface px-3.5 py-2.5 text-ink" placeholder="••••••••" />
          </div>
          {error && <p role="alert" className="rounded-md bg-alert-red-soft px-3 py-2 text-sm text-alert-red">{error}</p>}
          <button type="submit" disabled={submitting} className="w-full rounded-md bg-ink py-2.5 text-sm font-medium text-white disabled:opacity-60">{submitting ? 'กำลังเข้าสู่ระบบ…' : 'เข้าสู่ระบบ'}</button>
        </form>
        <p className="mt-6 text-xs leading-relaxed text-ink-muted">บัญชีผู้ดูแลระบบใช้สำหรับจัดการข้อมูล HAD Smart และการตั้งค่าที่ได้รับอนุญาตเท่านั้น</p>
      </div>
    </div>
  )
}
