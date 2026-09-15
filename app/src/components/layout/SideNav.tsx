import { NavLink } from 'react-router-dom'
import { useAuth } from '@/context/AuthContext'
import { ROLE_LABEL_TH } from '@/lib/types'
import { getNavItems } from './navItems'

const HAD_SMART_LOGO = '/brand/had-smart.jpg?v=20260916'

/** แถบเมนูข้าง — แสดงเฉพาะจอ md ขึ้นไป (แทนที่ BottomNav บนจอมือถือ) */
export function SideNav() {
  const { profile, signOut } = useAuth()
  const items = getNavItems(profile?.role)

  return (
    <aside className="hidden w-64 shrink-0 border-r border-border bg-surface md:flex md:flex-col">
      <div className="border-b border-border px-5 py-4">
        <div className="flex items-center gap-3">
          <img src={HAD_SMART_LOGO} alt="HAD Smart" className="h-12 w-12 shrink-0 rounded-xl object-cover shadow-sm" />
          <div className="min-w-0">
            <p className="truncate text-sm font-bold text-ink">HAD Smart</p>
            <p className="mt-0.5 text-[11px] leading-4 text-ink-muted">ระบบนิเทศการบริหารยาความเสี่ยงสูง</p>
          </div>
        </div>
      </div>

      <nav className="flex-1 space-y-1 px-3 py-4">
        {items.map((item) =>
          item.comingSoon ? (
            <div
              key={item.to}
              aria-disabled="true"
              title="เปิดใช้งานในเฟสถัดไป"
              className="flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm text-ink-muted/50"
            >
              <item.icon className="h-[18px] w-[18px]" strokeWidth={1.75} />
              {item.label}
            </div>
          ) : (
            <NavLink
              key={item.to}
              to={item.to}
              end={item.to === '/'}
              className={({ isActive }) =>
                `flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-medium transition-colors ${
                  isActive ? 'bg-accent-soft text-accent' : 'text-ink-muted hover:bg-surface-sunken hover:text-ink'
                }`
              }
            >
              <item.icon className="h-[18px] w-[18px]" strokeWidth={1.75} />
              {item.label}
            </NavLink>
          ),
        )}
      </nav>

      <div className="border-t border-border px-4 py-4">
        {profile && (
          <p className="mb-2 truncate text-xs text-ink-muted">
            {profile.display_code} · {ROLE_LABEL_TH[profile.role]}
          </p>
        )}
        <button
          onClick={() => void signOut()}
          className="w-full rounded-md px-3 py-2 text-left text-sm font-medium text-ink-muted hover:bg-surface-sunken hover:text-ink"
        >
          ออกจากระบบ
        </button>
      </div>
    </aside>
  )
}
