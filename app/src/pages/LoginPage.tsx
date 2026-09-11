import { useState, type FormEvent } from 'react'
import { Navigate } from 'react-router-dom'
import { useAuth } from '@/context/AuthContext'

export function LoginPage() {
  const { session, loading, signInWithPassword } = useAuth()
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [error, setError] = useState<string | null>(null)
  const [submitting, setSubmitting] = useState(false)

  if (!loading && session) return <Navigate to="/" replace />

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
          <p className="text-xs font-medium tracking-wide text-accent">
            หอผู้ป่วยพิเศษปาริฉัตร
          </p>
          <h1 className="mt-1 text-2xl font-semibold text-ink">HAD Smart Alert</h1>
          <p className="mt-1.5 text-sm leading-relaxed text-ink-muted">
            ระบบนิเทศการบริหารยาความเสี่ยงสูง — เข้าสู่ระบบด้วยบัญชีที่หน่วยงานออกให้
          </p>
        </header>

        <form onSubmit={handleSubmit} className="space-y-4" noValidate>
          <div>
            <label htmlFor="email" className="mb-1.5 block text-sm font-medium text-ink">
              อีเมล
            </label>
            <input
              id="email"
              type="email"
              autoComplete="username"
              required
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className="w-full rounded-md border border-border bg-surface px-3.5 py-2.5 text-ink placeholder:text-ink-muted/60 focus:border-accent"
              placeholder="ชื่อผู้ใช้@โรงพยาบาล.go.th"
            />
          </div>

          <div>
            <label htmlFor="password" className="mb-1.5 block text-sm font-medium text-ink">
              รหัสผ่าน
            </label>
            <input
              id="password"
              type="password"
              autoComplete="current-password"
              required
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className="w-full rounded-md border border-border bg-surface px-3.5 py-2.5 text-ink focus:border-accent"
              placeholder="••••••••"
            />
          </div>

          {error && (
            <p role="alert" className="rounded-md bg-alert-red-soft px-3 py-2 text-sm text-alert-red">
              {error}
            </p>
          )}

          <button
            type="submit"
            disabled={submitting}
            className="w-full rounded-md bg-ink py-2.5 text-sm font-medium text-white transition-colors hover:bg-ink/90 disabled:opacity-60"
          >
            {submitting ? 'กำลังเข้าสู่ระบบ…' : 'เข้าสู่ระบบ'}
          </button>
        </form>

        <p className="mt-6 text-xs leading-relaxed text-ink-muted">
          ระบบนี้ใช้สำหรับบุคลากรที่ได้รับสิทธิ์เท่านั้น หากลืมรหัสผ่านหรือยังไม่มีบัญชี
          กรุณาติดต่อผู้ดูแลระบบของหน่วยงาน
        </p>
      </div>
    </div>
  )
}
