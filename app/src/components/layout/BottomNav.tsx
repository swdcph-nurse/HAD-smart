import { NavLink } from 'react-router-dom'
import { useAuth } from '@/context/AuthContext'
import { getNavItems } from './navItems'

/** แถบเมนูล่าง — แสดงเฉพาะจอมือถือ/แท็บเล็ตแคบ (ซ่อนที่ md ขึ้นไป ใช้ SideNav แทน) */
export function BottomNav() {
  const { profile } = useAuth()
  const items = getNavItems(profile?.role)

  return (
    <nav className="fixed inset-x-0 bottom-0 z-10 border-t border-border bg-surface/95 backdrop-blur md:hidden">
      <div className="mx-auto grid max-w-md grid-cols-4 px-2 py-1.5">
        {items.map((item) =>
          item.comingSoon ? (
            <div
              key={item.to}
              aria-disabled="true"
              title="เปิดใช้งานในเฟสถัดไป"
              className="flex flex-col items-center gap-1 rounded-lg px-2 py-1.5 text-ink-muted/50"
            >
              <item.icon className="h-5 w-5" strokeWidth={1.75} />
              <span className="text-[11px]">{item.label}</span>
            </div>
          ) : (
            <NavLink
              key={item.to}
              to={item.to}
              end={item.to === '/'}
              className={({ isActive }) =>
                `flex flex-col items-center gap-1 rounded-lg px-2 py-1.5 transition-colors ${
                  isActive ? 'text-accent' : 'text-ink-muted hover:text-ink'
                }`
              }
            >
              <item.icon className="h-5 w-5" strokeWidth={1.75} />
              <span className="text-[11px]">{item.label}</span>
            </NavLink>
          ),
        )}
      </div>
    </nav>
  )
}
