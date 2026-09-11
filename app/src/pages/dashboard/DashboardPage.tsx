import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { Line, LineChart, ResponsiveContainer, Tooltip, XAxis, YAxis, CartesianGrid } from 'recharts'
import { ShieldAlert, ClipboardCheck, TrendingUp, ArrowRight } from 'lucide-react'
import {
  fetchDailyTrend,
  fetchLevelBreakdown,
  fetchOpenAlerts,
  fetchTopFailedItems,
  type AlertWithResponse,
  type FailedItemStat,
  type TrendPoint,
} from '@/lib/dashboard'
import type { AlertLevel } from '@/lib/types'
import { LoadingScreen } from '@/components/ui/LoadingScreen'

const LEVEL_LABEL: Record<AlertLevel, string> = {
  red: 'วิกฤต',
  orange: 'ไม่ผ่านบางข้อ',
  yellow: 'ไม่ครบ',
  green: 'ครบถ้วน',
}
const LEVEL_BAR_COLOR: Record<AlertLevel, string> = {
  red: 'bg-alert-red',
  orange: 'bg-alert-orange',
  yellow: 'bg-alert-yellow',
  green: 'bg-alert-green',
}
const LEVEL_ORDER: AlertLevel[] = ['red', 'orange', 'yellow', 'green']

export function DashboardPage() {
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [breakdown, setBreakdown] = useState<Record<AlertLevel, number> | null>(null)
  const [trend, setTrend] = useState<TrendPoint[]>([])
  const [topFailed, setTopFailed] = useState<FailedItemStat[]>([])
  const [openAlerts, setOpenAlerts] = useState<AlertWithResponse[]>([])

  useEffect(() => {
    Promise.all([fetchLevelBreakdown(30), fetchDailyTrend(14), fetchTopFailedItems(30, 5), fetchOpenAlerts()])
      .then(([b, t, f, a]) => {
        setBreakdown(b)
        setTrend(t)
        setTopFailed(f)
        setOpenAlerts(a)
      })
      .catch((err: Error) => setError(err.message))
      .finally(() => setLoading(false))
  }, [])

  if (loading) return <LoadingScreen label="กำลังโหลดแดชบอร์ด" />
  if (error) {
    return (
      <div className="rounded-lg border border-alert-red/30 bg-alert-red-soft px-4 py-3 text-sm text-alert-red">
        {error}
      </div>
    )
  }

  const total = breakdown ? LEVEL_ORDER.reduce((sum, l) => sum + breakdown[l], 0) : 0
  const complianceRate = total > 0 && breakdown ? Math.round((breakdown.green / total) * 100) : null

  return (
    <div className="space-y-8">
      <section>
        <h1 className="text-xl font-semibold text-ink">แดชบอร์ดนิเทศ</h1>
        <p className="mt-1 text-sm text-ink-muted">ภาพรวม 30 วันล่าสุด</p>
      </section>

      {/* สรุปตัวเลขหลัก */}
      <section className="grid gap-3 sm:grid-cols-3">
        <StatCard
          icon={ClipboardCheck}
          label="อัตราปฏิบัติครบถ้วน (30 วัน)"
          value={complianceRate !== null ? `${complianceRate}%` : '—'}
          sub={`จากทั้งหมด ${total} รายการ`}
        />
        <StatCard
          icon={ShieldAlert}
          label="Alert ที่ยังไม่ปิด"
          value={String(openAlerts.length)}
          sub={`ในจำนวนนี้เป็นวิกฤต ${openAlerts.filter((a) => a.level === 'red').length} รายการ`}
          accent={openAlerts.length > 0}
        />
        <StatCard
          icon={TrendingUp}
          label="บันทึกทั้งหมด (14 วัน)"
          value={String(trend.reduce((s, t) => s + t.total, 0))}
          sub="รวมทุกช่วง ก่อน/ขณะ/หลังให้ยา"
        />
      </section>

      {/* กราฟแนวโน้ม */}
      <section className="rounded-lg border border-border bg-surface p-4">
        <h2 className="mb-3 text-sm font-medium text-ink">แนวโน้มการบันทึกรายวัน (14 วันล่าสุด)</h2>
        <div className="h-64 w-full">
          <ResponsiveContainer width="100%" height="100%">
            <LineChart data={trend} margin={{ top: 5, right: 10, left: -20, bottom: 0 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="var(--color-border)" />
              <XAxis dataKey="date" tick={{ fontSize: 11, fill: 'var(--color-ink-muted)' }} />
              <YAxis tick={{ fontSize: 11, fill: 'var(--color-ink-muted)' }} allowDecimals={false} />
              <Tooltip
                contentStyle={{
                  fontSize: 12,
                  borderRadius: 8,
                  border: '1px solid var(--color-border)',
                }}
              />
              <Line type="monotone" dataKey="total" name="บันทึกทั้งหมด" stroke="var(--color-accent)" strokeWidth={2} dot={false} />
              <Line type="monotone" dataKey="alerts" name="มี Alert" stroke="var(--color-alert-red)" strokeWidth={2} dot={false} />
            </LineChart>
          </ResponsiveContainer>
        </div>
      </section>

      <div className="grid gap-6 lg:grid-cols-2">
        {/* สัดส่วนตามระดับ */}
        <section className="rounded-lg border border-border bg-surface p-4">
          <h2 className="mb-3 text-sm font-medium text-ink">สัดส่วนตามระดับ (30 วัน)</h2>
          {breakdown && total > 0 ? (
            <div className="space-y-3">
              {LEVEL_ORDER.map((level) => {
                const count = breakdown[level]
                const pct = total > 0 ? Math.round((count / total) * 100) : 0
                return (
                  <div key={level}>
                    <div className="mb-1 flex items-center justify-between text-xs">
                      <span className="text-ink-muted">{LEVEL_LABEL[level]}</span>
                      <span className="font-medium text-ink">
                        {count} ({pct}%)
                      </span>
                    </div>
                    <div className="h-2 overflow-hidden rounded-full bg-surface-sunken">
                      <div className={`h-full rounded-full ${LEVEL_BAR_COLOR[level]}`} style={{ width: `${pct}%` }} />
                    </div>
                  </div>
                )
              })}
            </div>
          ) : (
            <p className="text-sm text-ink-muted">ยังไม่มีข้อมูลในช่วงนี้</p>
          )}
        </section>

        {/* Top 5 รายการไม่ผ่านบ่อยสุด */}
        <section className="rounded-lg border border-border bg-surface p-4">
          <h2 className="mb-3 text-sm font-medium text-ink">Top 5 รายการไม่ปฏิบัติบ่อยสุด (30 วัน)</h2>
          {topFailed.length === 0 ? (
            <p className="text-sm text-ink-muted">ยังไม่มีข้อมูลในช่วงนี้ — เยี่ยมมาก</p>
          ) : (
            <ol className="space-y-2.5">
              {topFailed.map((item, idx) => (
                <li key={item.itemId} className="flex items-start gap-2.5 text-sm">
                  <span className="mt-0.5 flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-surface-sunken text-[11px] font-medium text-ink-muted">
                    {idx + 1}
                  </span>
                  <span className="flex-1 text-ink">
                    {item.itemText}
                    {item.isCritical && (
                      <span className="ml-1.5 rounded-full bg-alert-red-soft px-1.5 py-0.5 text-[10px] font-medium text-alert-red">
                        วิกฤต
                      </span>
                    )}
                  </span>
                  <span className="shrink-0 text-xs font-medium text-ink-muted">{item.count} ครั้ง</span>
                </li>
              ))}
            </ol>
          )}
        </section>
      </div>

      {/* Alert ที่ยังไม่ปิด */}
      <section>
        <div className="mb-3 flex items-center justify-between">
          <h2 className="text-sm font-medium text-ink">Alert ที่ต้องติดตาม ({openAlerts.length})</h2>
          <Link to="/alerts" className="flex items-center gap-1 text-xs font-medium text-accent hover:underline">
            ดูทั้งหมดที่หน้า Alert <ArrowRight className="h-3 w-3" />
          </Link>
        </div>

        {openAlerts.length === 0 ? (
          <p className="rounded-lg border border-dashed border-border px-4 py-6 text-center text-sm text-ink-muted">
            ไม่มี Alert ค้างอยู่ในขณะนี้
          </p>
        ) : (
          <div className="divide-y divide-border overflow-hidden rounded-lg border border-border bg-surface">
            {openAlerts.slice(0, 5).map((a) => (
              <div key={a.id} className="flex items-center justify-between gap-3 px-4 py-3">
                <div className="flex items-center gap-2.5">
                  <span className={`h-2.5 w-2.5 shrink-0 rounded-full ${LEVEL_BAR_COLOR[a.level]}`} />
                  <div>
                    <p className="text-sm font-medium text-ink">
                      เตียง {a.response?.bed_code ?? '—'} · {LEVEL_LABEL[a.level]}
                    </p>
                    <p className="text-xs text-ink-muted">
                      เปิดเมื่อ {new Date(a.opened_at).toLocaleString('th-TH', { day: '2-digit', month: '2-digit', hour: '2-digit', minute: '2-digit' })}
                    </p>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </section>
    </div>
  )
}

function StatCard({
  icon: Icon,
  label,
  value,
  sub,
  accent,
}: {
  icon: typeof ShieldAlert
  label: string
  value: string
  sub: string
  accent?: boolean
}) {
  return (
    <div className="rounded-lg border border-border bg-surface p-4">
      <div className="flex items-center gap-2 text-ink-muted">
        <Icon className={`h-4 w-4 ${accent ? 'text-alert-red' : ''}`} strokeWidth={1.75} />
        <span className="text-xs">{label}</span>
      </div>
      <p className={`mt-2 text-2xl font-semibold ${accent ? 'text-alert-red' : 'text-ink'}`}>{value}</p>
      <p className="mt-0.5 text-xs text-ink-muted">{sub}</p>
    </div>
  )
}
