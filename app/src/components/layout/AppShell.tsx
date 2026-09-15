import { Outlet } from 'react-router-dom'
import { useAuth } from '@/context/AuthContext'
import { ROLE_LABEL_TH } from '@/lib/types'
import { BottomNav } from './BottomNav'
import { SideNav } from './SideNav'

export function AppShell() {
  const { profile, signOut } = useAuth()

  return (
    <div className="flex min-h-dvh w-full bg-canvas">
      <SideNav />

      <div className="flex min-h-dvh min-w-0 flex-1 flex-col">
        <header className="sticky top-0 z-10 border-b border-border bg-surface/95 backdrop-blur md:hidden">
          <div className="flex w-full items-center justify-between gap-3 px-4 py-3 sm:px-6">
            <div className="min-w-0">
              <p className="truncate text-sm font-semibold text-ink">HAD Smart Alert</p>
              {profile && (
                <p className="truncate text-xs text-ink-muted">
                  {profile.display_code} · {ROLE_LABEL_TH[profile.role]}
                </p>
              )}
            </div>
            <button
              onClick={() => void signOut()}
              className="shrink-0 rounded-md px-2.5 py-1.5 text-xs font-medium text-ink-muted hover:bg-surface-sunken hover:text-ink"
            >
              ออกจากระบบ
            </button>
          </div>
        </header>

        <main className="w-full min-w-0 flex-1 px-3 py-4 pb-24 sm:px-5 sm:py-6 md:px-6 md:py-7 md:pb-8 lg:px-8 xl:px-10">
          <div className="w-full min-w-0">
            <Outlet />
          </div>
        </main>

        <BottomNav />
      </div>
    </div>
  )
}
