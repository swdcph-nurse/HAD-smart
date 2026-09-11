import { Link } from 'react-router-dom'

export function NotFoundPage() {
  return (
    <div className="grid min-h-dvh place-items-center bg-canvas px-6 text-center">
      <div>
        <p className="text-sm font-medium text-accent">404</p>
        <h1 className="mt-1 text-lg font-semibold text-ink">ไม่พบหน้านี้</h1>
        <p className="mt-1.5 text-sm text-ink-muted">ลิงก์อาจไม่ถูกต้อง หรือหน้านี้ถูกย้ายไปแล้ว</p>
        <Link
          to="/"
          className="mt-5 inline-block rounded-md bg-ink px-4 py-2 text-sm font-medium text-white hover:bg-ink/90"
        >
          กลับหน้าแรก
        </Link>
      </div>
    </div>
  )
}
