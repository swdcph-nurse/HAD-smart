import { Outlet } from 'react-router-dom'
import { useAuth } from '@/context/AuthContext'
import { ROLE_LABEL_TH } from '@/lib/types'
import { BottomNav } from './BottomNav'
import { SideNav } from './SideNav'

export function AppShell() {
  const { profile, signOut } = useAuth()

  return (
    <div className="flex min-h-dvh bg-canvas">
      {/* จอ md ขึ้นไป: sidebar ถาวรด้านซ้าย (มีปุ่มออกจากระบบในตัวแล้ว) */}
      <SideNav />

      <div className="flex min-h-dvh flex-1 flex-col">
        {/* จอมือถือ/แท็บเล็ตแคบ: top bar แทน sidebar */}
        <header className="sticky top-0 z-10 border-b border-border bg-surface/95 backdrop-blur md:hidden">
          <div className="mx-auto flex max-w-md items-center justify-between px-4 py-3">
            <div>
              <p className="text-sm font-semibold text-ink">HAD Smart Alert</p>
              {profile && (
                <p className="text-xs text-ink-muted">
                  {profile.display_code} · {ROLE_LABEL_TH[profile.role]}
                </p>
              )}
            </div>
            <button
              onClick={() => void signOut()}
              className="rounded-md px-2.5 py-1.5 text-xs font-medium text-ink-muted hover:bg-surface-sunken hover:text-ink"
            >
              ออกจากระบบ
            </button>
          </div>
        </header>

        <main className="mx-auto w-full max-w-md flex-1 px-4 py-5 pb-24 md:max-w-5xl md:px-10 md:py-8 md:pb-8">
          <Outlet />
        </main>

        <BottomNav />
      </div>
    </div>
  )
}
