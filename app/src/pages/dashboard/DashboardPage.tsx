import { useEffect, useMemo, useState } from 'react'
import { ClipboardCheck, ShieldCheck, AlertTriangle, CheckCircle2, RefreshCw, Download, Clock3, HeartPulse } from 'lucide-react'
import { fetchActiveHadDrugs, fetchMedicationSupervision, type SupervisionDashboardData } from '@/lib/dashboard'
import { LoadingScreen } from '@/components/ui/LoadingScreen'

function isoDate(d: Date) { return d.toISOString().slice(0, 10) }

export function DashboardPage() {
  const today = new Date()
  const defaultFrom = new Date(today.getTime() - 29 * 86400000)
  const [from, setFrom] = useState(isoDate(defaultFrom))
  const [to, setTo] = useState(isoDate(today))
  const [drugId, setDrugId] = useState('')
  const [drugs, setDrugs] = useState<{ id: string; generic_name: string }[]>([])
  const [data, setData] = useState<SupervisionDashboardData | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')

  async function load() {
    setLoading(true); setError('')
    try { setData(await fetchMedicationSupervision(from, to, drugId || undefined)) }
    catch (e) { setError(e instanceof Error ? e.message : 'ไม่สามารถโหลดข้อมูลได้') }
    finally { setLoading(false) }
  }

  useEffect(() => { fetchActiveHadDrugs().then(setDrugs).catch(() => setDrugs([])) }, [])
  useEffect(() => { load() }, [from, to, drugId])

  const criticalItems = useMemo(() => (data?.itemStats ?? []).filter((x) => x.critical), [data])
  const improvementItems = useMemo(() => [...(data?.itemStats ?? [])].sort((a, b) => a.rate - b.rate).slice(0, 5), [data])

  function exportCsv() {
    if (!data) return
    const rows = [
      ['ข้อ', 'รายการ', 'Critical', 'ผ่าน', 'ทั้งหมด', 'ร้อยละ'],
      ...data.itemStats.map(x => [x.no, x.text, x.critical ? 'ใช่' : 'ไม่', x.pass, x.total, x.rate]),
    ]
    const csv = '\ufeff' + rows.map(r => r.map(v => `"${String(v).replaceAll('"', '""')}"`).join(',')).join('\n')
    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' })
    const url = URL.createObjectURL(blob); const a = document.createElement('a')
    a.href = url; a.download = `HAD-Smart-supervision-${from}-${to}.csv`; a.click(); URL.revokeObjectURL(url)
  }

  if (loading && !data) return <LoadingScreen label="กำลังโหลดผลการนิเทศ" />
  if (error && !data) return <div className="rounded-2xl border border-alert-red/30 bg-alert-red-soft p-5 text-sm text-alert-red">{error}</div>
  if (!data) return null

  const pct = (n: number) => data.total ? Math.round(n / data.total * 1000) / 10 : 0
  const supervisionScore = data.average20 === null ? null : Math.round((data.average20 / 20 * 80 + (data.averageCritical ?? 0) / 100 * 20) * 10) / 10

  return (
    <div className="space-y-6 pb-8">
      <header className="flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
        <div>
          <div className="flex items-center gap-2 text-xs font-medium text-accent"><ShieldCheck className="h-4 w-4" /> NURSING SUPERVISION</div>
          <h1 className="mt-1 text-2xl font-semibold text-ink">แดชบอร์ดผลการนิเทศการใช้ยา High Alert Drug</h1>
          <p className="mt-1 text-sm text-ink-muted">ติดตามผลการปฏิบัติตามเกณฑ์ 20 ข้อ และรายการความปลอดภัย Critical</p>
        </div>
        <div className="flex gap-2">
          <button onClick={load} className="inline-flex items-center gap-2 rounded-xl border border-border bg-surface px-3 py-2 text-sm font-medium text-ink hover:bg-surface-sunken"><RefreshCw className="h-4 w-4" /> รีเฟรช</button>
          <button onClick={exportCsv} className="inline-flex items-center gap-2 rounded-xl bg-accent px-3 py-2 text-sm font-medium text-white hover:opacity-90"><Download className="h-4 w-4" /> Export CSV</button>
        </div>
      </header>

      <section className="rounded-2xl border border-border bg-surface p-4">
        <div className="grid gap-3 md:grid-cols-3">
          <label className="text-xs font-medium text-ink-muted">ตั้งแต่<input type="date" value={from} max={to} onChange={e => setFrom(e.target.value)} className="mt-1 block w-full rounded-xl border border-border bg-surface px-3 py-2 text-sm text-ink" /></label>
          <label className="text-xs font-medium text-ink-muted">ถึง<input type="date" value={to} min={from} onChange={e => setTo(e.target.value)} className="mt-1 block w-full rounded-xl border border-border bg-surface px-3 py-2 text-sm text-ink" /></label>
          <label className="text-xs font-medium text-ink-muted">รายการยา<select value={drugId} onChange={e => setDrugId(e.target.value)} className="mt-1 block w-full rounded-xl border border-border bg-surface px-3 py-2 text-sm text-ink"><option value="">ยาทั้งหมด</option>{drugs.map(d => <option key={d.id} value={d.id}>{d.generic_name}</option>)}</select></label>
        </div>
      </section>

      {error && <div className="rounded-xl border border-alert-orange/30 bg-alert-orange/10 px-4 py-3 text-sm text-ink">{error}</div>}

      <section className="grid gap-3 sm:grid-cols-2 xl:grid-cols-6">
        <Kpi icon={ClipboardCheck} label="ครั้งที่นิเทศ" value={data.total} sub="มีผลประเมินจาก Charge Nurse" />
        <Kpi icon={CheckCircle2} label="ผ่านครบ 20 ข้อ" value={`${pct(data.complete20)}%`} sub={`${data.complete20} จาก ${data.total} ครั้ง`} />
        <Kpi icon={ShieldCheck} label="Critical ผ่าน" value={`${pct(data.criticalPass)}%`} sub={`${data.criticalPass} จาก ${data.total} ครั้ง`} />
        <Kpi icon={HeartPulse} label="ผ่าน 20 + Critical" value={`${pct(data.completeBoth)}%`} sub={`${data.completeBoth} จาก ${data.total} ครั้ง`} />
        <Kpi icon={ClipboardCheck} label="คะแนนเฉลี่ย 20 ข้อ" value={data.average20 === null ? '—' : `${data.average20}/20`} sub="ผลการนิเทศ" />
        <Kpi icon={Clock3} label="ปิด Workflow" value={`${data.workflowCloseRate ?? 0}%`} sub={`${data.completed} รายการเสร็จสมบูรณ์`} />
      </section>

      <section className="grid gap-6 xl:grid-cols-[1.5fr_1fr]">
        <div className="rounded-2xl border border-border bg-surface p-5">
          <div className="mb-4 flex items-center justify-between"><div><h2 className="font-semibold text-ink">การปฏิบัติตามเกณฑ์รายข้อ</h2><p className="text-xs text-ink-muted">เรียงตามข้อ 1–20 • แสดงอัตราการปฏิบัติตามจากผลนิเทศ</p></div><span className="rounded-full bg-accent-soft px-3 py-1 text-xs font-semibold text-accent">20 Criteria</span></div>
          <div className="space-y-3">{data.itemStats.map(item => <ComplianceBar key={item.no} item={item} />)}</div>
        </div>

        <div className="space-y-6">
          <div className="rounded-2xl border border-border bg-surface p-5">
            <div className="mb-4 flex items-center gap-2"><AlertTriangle className="h-5 w-5 text-alert-red" /><div><h2 className="font-semibold text-ink">Critical Safety</h2><p className="text-xs text-ink-muted">4 รายการสำคัญด้านความปลอดภัย</p></div></div>
            <div className="space-y-3">{criticalItems.map(item => <div key={item.no} className="rounded-xl bg-surface-sunken p-3"><div className="flex gap-3"><span className="grid h-7 w-7 shrink-0 place-items-center rounded-lg bg-alert-red-soft text-xs font-bold text-alert-red">{item.no}</span><div className="min-w-0 flex-1"><p className="text-sm font-medium leading-5 text-ink">{item.text}</p><div className="mt-2 flex items-center justify-between text-xs"><span className="text-ink-muted">ผ่าน {item.pass}/{item.total} ครั้ง</span><strong className={item.rate >= 95 ? 'text-emerald-600' : item.rate >= 90 ? 'text-amber-600' : 'text-red-600'}>{item.rate}%</strong></div></div></div></div>)}</div>
          </div>

          <div className="rounded-2xl border border-border bg-surface p-5">
            <h2 className="font-semibold text-ink">ประเด็นที่ควรพัฒนา</h2><p className="mt-1 text-xs text-ink-muted">Top 5 รายการที่มีอัตราการปฏิบัติต่ำสุด</p>
            <div className="mt-4 space-y-3">{improvementItems.map((item, i) => <div key={item.no} className="flex gap-3"><span className="grid h-6 w-6 shrink-0 place-items-center rounded-full bg-surface-sunken text-xs font-semibold text-ink-muted">{i + 1}</span><div className="min-w-0 flex-1"><p className="text-sm text-ink">ข้อ {item.no} {item.critical && <span className="ml-1 rounded-full bg-alert-red-soft px-1.5 py-0.5 text-[10px] font-semibold text-alert-red">Critical</span>}</p><div className="mt-1 h-1.5 overflow-hidden rounded-full bg-surface-sunken"><div className="h-full rounded-full bg-accent" style={{ width: `${item.rate}%` }} /></div></div><span className="w-12 text-right text-xs font-semibold text-ink-muted">{item.rate}%</span></div>)}</div>
          </div>
        </div>
      </section>

      <section className="grid gap-6 lg:grid-cols-2">
        <div className="rounded-2xl border border-border bg-surface p-5">
          <div className="flex items-center justify-between"><div><h2 className="font-semibold text-ink">HAD Smart Supervision Score</h2><p className="mt-1 text-xs text-ink-muted">80% เกณฑ์ 20 ข้อ + 20% Critical Safety</p></div><div className="text-right"><div className="text-3xl font-bold text-accent">{supervisionScore === null ? '—' : supervisionScore}</div><div className="text-[11px] text-ink-muted">/ 100</div></div></div>
          <div className="mt-5 h-3 overflow-hidden rounded-full bg-surface-sunken"><div className="h-full rounded-full bg-accent" style={{ width: `${Math.min(supervisionScore ?? 0, 100)}%` }} /></div>
          <div className="mt-3 flex justify-between text-xs text-ink-muted"><span>ภาพรวมผลการนิเทศ</span><span>{supervisionScore !== null && supervisionScore >= 95 ? 'ดีมาก' : supervisionScore !== null && supervisionScore >= 90 ? 'เฝ้าระวัง' : 'ควรพัฒนา'}</span></div>
        </div>
        <div className="rounded-2xl border border-dashed border-border bg-surface p-5">
          <div className="flex items-center gap-3"><div className="grid h-10 w-10 place-items-center rounded-xl bg-accent-soft text-accent"><HeartPulse className="h-5 w-5" /></div><div><h2 className="font-semibold text-ink">ความพึงพอใจและภาระงานที่เพิ่มขึ้น</h2><p className="text-xs text-ink-muted">ส่วนนี้จะเชื่อมข้อมูลเมื่อแบบฟอร์มพัฒนาเสร็จ</p></div></div>
          <div className="mt-4 grid gap-3 sm:grid-cols-2"><Placeholder label="ความพึงพอใจต่อระบบ" /><Placeholder label="ความชัดเจนของ Learning" /><Placeholder label="ความมั่นใจในการเตรียมยา" /><Placeholder label="ภาระงาน/เวลาเพิ่มขึ้น" /></div>
        </div>
      </section>

      <section className="rounded-2xl border border-border bg-surface p-5">
        <div className="mb-3 flex items-center justify-between"><div><h2 className="font-semibold text-ink">รายละเอียดผลการนิเทศล่าสุด</h2><p className="text-xs text-ink-muted">ใช้สำหรับติดตามและ Coaching ไม่ใช้จัดอันดับบุคลากร</p></div><span className="text-xs text-ink-muted">{data.rows.length} รายการ</span></div>
        <div className="overflow-x-auto"><table className="w-full min-w-[760px] text-left text-sm"><thead><tr className="border-b border-border text-xs text-ink-muted"><th className="px-3 py-2">วันที่</th><th className="px-3 py-2">รายการยา</th><th className="px-3 py-2">Med Nurse</th><th className="px-3 py-2">Charge Nurse</th><th className="px-3 py-2 text-center">20 ข้อ</th><th className="px-3 py-2 text-center">Critical</th><th className="px-3 py-2 text-center">สถานะ</th></tr></thead><tbody>{data.rows.slice(0, 20).map(row => <tr key={row.id} className="border-b border-border/60 last:border-0"><td className="px-3 py-3 text-xs text-ink-muted">{new Date(row.created_at).toLocaleString('th-TH', { day: '2-digit', month: '2-digit', year: 'numeric', hour: '2-digit', minute: '2-digit' })}</td><td className="max-w-[260px] px-3 py-3 font-medium text-ink">{row.drug_name ?? '—'}</td><td className="px-3 py-3 text-xs text-ink-muted">{row.nurse1_name ?? '—'}</td><td className="px-3 py-3 text-xs text-ink-muted">{row.nurse2_name ?? '—'}</td><td className="px-3 py-3 text-center font-semibold text-ink">{row.supervised_total ?? 0}/20</td><td className="px-3 py-3 text-center">{row.supervised_critical_passed ? <span className="text-emerald-600">✓ ผ่าน</span> : <span className="text-red-600">✕ ไม่ผ่าน</span>}</td><td className="px-3 py-3 text-center"><span className="rounded-full bg-emerald-50 px-2 py-1 text-[11px] font-medium text-emerald-700">เสร็จสิ้น</span></td></tr>)}</tbody></table></div>
      </section>
    </div>
  )
}

function Kpi({ icon: Icon, label, value, sub }: { icon: typeof ClipboardCheck; label: string; value: string | number; sub: string }) { return <div className="rounded-2xl border border-border bg-surface p-4"><Icon className="h-5 w-5 text-accent" /><p className="mt-3 text-xs text-ink-muted">{label}</p><p className="mt-1 text-2xl font-bold text-ink">{value}</p><p className="mt-1 text-[11px] text-ink-muted">{sub}</p></div> }
function ComplianceBar({ item }: { item: { no: number; text: string; critical: boolean; rate: number } }) { const cls = item.rate >= 95 ? 'bg-emerald-500' : item.rate >= 90 ? 'bg-amber-500' : 'bg-red-500'; return <div><div className="mb-1.5 flex gap-2 text-xs"><span className="w-6 shrink-0 font-bold text-ink">{item.no}</span><span className="min-w-0 flex-1 text-ink">{item.text}{item.critical && <span className="ml-1.5 rounded-full bg-alert-red-soft px-1.5 py-0.5 text-[9px] font-bold text-alert-red">CRITICAL</span>}</span><span className="w-12 shrink-0 text-right font-semibold text-ink">{item.rate}%</span></div><div className="ml-8 h-2 overflow-hidden rounded-full bg-surface-sunken"><div className={`h-full rounded-full ${cls}`} style={{ width: `${item.rate}%` }} /></div></div> }
function Placeholder({ label }: { label: string }) { return <div className="rounded-xl bg-surface-sunken p-3"><p className="text-xs text-ink-muted">{label}</p><p className="mt-2 text-sm font-semibold text-ink-muted">อยู่ระหว่างพัฒนา</p></div> }
