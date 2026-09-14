import { useEffect, useMemo, useState } from 'react'
import { CheckCircle2, ClipboardCheck, GraduationCap, ShieldAlert } from 'lucide-react'
import { useAuth } from '@/context/AuthContext'
import {
  calculateBehaviorResult,
  fetchBehaviorHistory,
  fetchBehaviorItems,
  fetchEligibleNurses,
  fetchKnowledgeHistory,
  submitBehaviorAssessment,
  submitKnowledgeTest,
  type AssessmentSummary,
  type BehaviorAssessment,
  type BehaviorAssessmentItem,
  type KnowledgeTest,
} from '@/lib/assessment'
import type { Profile, Shift } from '@/lib/types'

const SHIFTS: Array<{ value: Shift; label: string }> = [
  { value: 'morning', label: 'เวรเช้า' },
  { value: 'afternoon', label: 'เวรบ่าย' },
  { value: 'night', label: 'เวรดึก' },
]

const QUIZ = [
  { q: 'ก่อนให้ High-Alert Drug ควรทำ Double Check ร่วมกับพยาบาลอีก 1 คน', a: true },
  { q: 'สามารถปล่อย Free Flow ได้ หากตั้งอัตราเครื่องควบคุมสารน้ำไว้แล้ว', a: false },
  { q: 'การยืนยันตัวผู้ป่วยควรใช้อย่างน้อย 2 ตัวบ่งชี้ก่อนให้ยา', a: true },
  { q: 'ฉลากยาความเสี่ยงสูงควรระบุชื่อยาและความเข้มข้น', a: true },
  { q: 'เมื่อพบอาการผิดปกติจากยา สามารถรอดูอาการก่อนรายงานแพทย์ได้เสมอ', a: false },
  { q: 'ควรตรวจสอบวันหมดอายุของยาและสารน้ำก่อนใช้', a: true },
  { q: 'การบันทึกการให้ยาใน MAR เป็นส่วนหนึ่งของความปลอดภัยด้านยา', a: true },
  { q: 'ควรตรวจตำแหน่ง IV site สม่ำเสมอเพื่อป้องกัน Extravasation', a: true },
  { q: 'Medication Error และ Near Miss ควรรายงานตามระบบของหน่วยงาน', a: true },
  { q: 'การคำนวณขนาดยา ความเข้มข้น และอัตราการให้ ไม่จำเป็นต้องตรวจซ้ำ', a: false },
]

const resultLabel = {
  pass: 'ผ่านเกณฑ์',
  coaching: 'ควรได้รับการ Coaching',
  individual_plan: 'จัดทำ Individual Development Plan',
} as const

export function AssessmentPage() {
  const { profile } = useAuth()
  const [tab, setTab] = useState<'behavior' | 'knowledge' | 'history'>('behavior')
  const [items, setItems] = useState<BehaviorAssessmentItem[]>([])
  const [nurses, setNurses] = useState<Profile[]>([])
  const [selectedNurse, setSelectedNurse] = useState('')
  const [shift, setShift] = useState<Shift>('morning')
  const [scores, setScores] = useState<Record<string, boolean>>({})
  const [behaviorHistory, setBehaviorHistory] = useState<BehaviorAssessment[]>([])
  const [knowledgeHistory, setKnowledgeHistory] = useState<KnowledgeTest[]>([])
  const [testType, setTestType] = useState<'pre' | 'post'>('pre')
  const [answers, setAnswers] = useState<Record<number, boolean>>({})
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [message, setMessage] = useState<string | null>(null)

  const isSupervisor = !!profile && ['supervisor', 'admin', 'executive'].includes(profile.role)
  const nurseId = isSupervisor ? selectedNurse : profile?.id ?? ''
  const wardId = isSupervisor ? nurses.find((n) => n.id === selectedNurse)?.ward_id ?? profile?.ward_id ?? '' : profile?.ward_id ?? ''

  const behaviorResult = useMemo(() => calculateBehaviorResult(items, scores), [items, scores])
  const knowledgeScore = QUIZ.reduce((sum, item, index) => sum + (answers[index] === item.a ? 1 : 0), 0)
  const knowledgeComplete = Object.keys(answers).length === QUIZ.length

  const refreshHistory = async (targetNurseId: string) => {
    if (!targetNurseId) return
    const [b, k] = await Promise.all([fetchBehaviorHistory(targetNurseId), fetchKnowledgeHistory(targetNurseId)])
    setBehaviorHistory(b)
    setKnowledgeHistory(k)
  }

  useEffect(() => {
    if (!profile) return
    setLoading(true)
    Promise.all([fetchBehaviorItems(), isSupervisor ? fetchEligibleNurses(profile) : Promise.resolve([] as Profile[])])
      .then(async ([loadedItems, loadedNurses]) => {
        setItems(loadedItems)
        setNurses(loadedNurses)
        const target = isSupervisor ? loadedNurses[0]?.id ?? '' : profile.id
        setSelectedNurse(target)
        await refreshHistory(target)
      })
      .catch((error: Error) => setMessage(error.message))
      .finally(() => setLoading(false))
  }, [profile, isSupervisor])

  useEffect(() => {
    if (!selectedNurse || !isSupervisor) return
    void refreshHistory(selectedNurse).catch((error: Error) => setMessage(error.message))
  }, [selectedNurse, isSupervisor])

  const saveBehavior = async () => {
    if (!profile || !nurseId || !wardId || Object.keys(scores).length !== items.length) {
      setMessage('กรุณาเลือกพยาบาลและตอบแบบประเมินครบทั้ง 20 ข้อ')
      return
    }
    setSaving(true)
    setMessage(null)
    try {
      await submitBehaviorAssessment({ nurseId, evaluatorId: profile.id, wardId, shift, scores, items })
      await refreshHistory(nurseId)
      setMessage(`บันทึกสำเร็จ: ${resultLabel[behaviorResult.result]}`)
    } catch (error) {
      setMessage(error instanceof Error ? error.message : 'บันทึกไม่สำเร็จ')
    } finally {
      setSaving(false)
    }
  }

  const saveKnowledge = async () => {
    if (!nurseId || !knowledgeComplete) {
      setMessage('กรุณาตอบแบบทดสอบให้ครบ 10 ข้อ')
      return
    }
    setSaving(true)
    setMessage(null)
    try {
      await submitKnowledgeTest({ nurseId, testType, score: knowledgeScore, maxScore: QUIZ.length })
      await refreshHistory(nurseId)
      setMessage(`บันทึก ${testType.toUpperCase()}-test สำเร็จ: ${knowledgeScore}/${QUIZ.length}`)
      setAnswers({})
    } catch (error) {
      setMessage(error instanceof Error ? error.message : 'บันทึกไม่สำเร็จ')
    } finally {
      setSaving(false)
    }
  }

  if (loading) return <p className="text-sm text-ink-muted">กำลังโหลดแบบประเมิน…</p>

  const summary: AssessmentSummary = {
    pre: knowledgeHistory.find((x) => x.test_type === 'pre') ?? null,
    post: knowledgeHistory.find((x) => x.test_type === 'post') ?? null,
  }
  const improvement = summary.pre && summary.post ? summary.post.score - summary.pre.score : null

  return (
    <div className="space-y-6">
      <header>
        <div className="flex items-center gap-3">
          <div className="rounded-lg bg-accent-soft p-2.5 text-accent"><ClipboardCheck className="h-5 w-5" /></div>
          <div>
            <h1 className="text-xl font-semibold text-ink">ประเมินและพัฒนา</h1>
            <p className="text-sm text-ink-muted">Behavior Assessment · Pre/Post-test</p>
          </div>
        </div>
      </header>

      <div className="grid grid-cols-3 rounded-lg border border-border bg-surface p-1">
        {[
          ['behavior', 'ประเมินพฤติกรรม'],
          ['knowledge', 'Pre/Post-test'],
          ['history', 'ประวัติและพัฒนาการ'],
        ].map(([value, label]) => (
          <button key={value} onClick={() => setTab(value as typeof tab)} className={`rounded-md px-2 py-2 text-xs font-medium ${tab === value ? 'bg-accent text-white' : 'text-ink-muted hover:bg-surface-sunken'}`}>
            {label}
          </button>
        ))}
      </div>

      {isSupervisor && (
        <div className="grid gap-3 rounded-lg border border-border bg-surface p-4 md:grid-cols-2">
          <label className="text-sm text-ink-muted">พยาบาลผู้รับการประเมิน
            <select value={selectedNurse} onChange={(e) => setSelectedNurse(e.target.value)} className="mt-1 w-full rounded-md border border-border bg-canvas px-3 py-2 text-sm text-ink">
              {nurses.map((nurse) => <option key={nurse.id} value={nurse.id}>{nurse.display_code}{nurse.full_name ? ` · ${nurse.full_name}` : ''}</option>)}
            </select>
          </label>
          {tab === 'behavior' && <label className="text-sm text-ink-muted">เวรที่ประเมิน
            <select value={shift} onChange={(e) => setShift(e.target.value as Shift)} className="mt-1 w-full rounded-md border border-border bg-canvas px-3 py-2 text-sm text-ink">
              {SHIFTS.map((x) => <option key={x.value} value={x.value}>{x.label}</option>)}
            </select>
          </label>}
        </div>
      )}

      {message && <div className="rounded-lg border border-accent/30 bg-accent-soft px-4 py-3 text-sm text-ink">{message}</div>}

      {tab === 'behavior' && (
        <section className="space-y-4">
          <div className="rounded-lg border border-border bg-surface p-4">
            <div className="flex items-center justify-between gap-4">
              <div><p className="text-sm font-semibold text-ink">คะแนน {behaviorResult.total_score}/20</p><p className="text-xs text-ink-muted">ผ่านต้องได้ ≥18 และ Critical items ทั้ง 4 ข้อต้องผ่าน 100%</p></div>
              <span className={`rounded-full px-3 py-1 text-xs font-semibold ${behaviorResult.result === 'pass' ? 'bg-alert-green-soft text-alert-green' : behaviorResult.result === 'individual_plan' ? 'bg-alert-red-soft text-alert-red' : 'bg-alert-orange-soft text-alert-orange'}`}>{resultLabel[behaviorResult.result]}</span>
            </div>
          </div>

          <div className="space-y-2">
            {items.map((item) => (
              <label key={item.id} className={`flex cursor-pointer items-start gap-3 rounded-lg border p-4 ${item.is_critical ? 'border-alert-red/30 bg-alert-red-soft/30' : 'border-border bg-surface'}`}>
                <input type="checkbox" checked={scores[item.id] === true} onChange={(e) => setScores((current) => ({ ...current, [item.id]: e.target.checked }))} className="mt-1 h-4 w-4 accent-accent" />
                <span className="flex-1 text-sm leading-relaxed text-ink"><b className="mr-1">{item.item_no}.</b>{item.item_text}</span>
                {item.is_critical && <span className="shrink-0 rounded-full bg-alert-red-soft px-2 py-1 text-[10px] font-bold text-alert-red">CRITICAL</span>}
              </label>
            ))}
          </div>

          {!behaviorResult.critical_items_passed && Object.keys(scores).length === items.length && <div className="flex gap-2 rounded-lg border border-alert-red/30 bg-alert-red-soft p-4 text-sm text-alert-red"><ShieldAlert className="h-5 w-5 shrink-0" />Critical item ยังไม่ผ่าน 100% — ผลประเมินจะไม่สามารถเป็น “ผ่าน” ได้</div>}
          {isSupervisor && <button disabled={saving} onClick={() => void saveBehavior()} className="w-full rounded-lg bg-accent px-4 py-3 text-sm font-semibold text-white disabled:opacity-50">{saving ? 'กำลังบันทึก…' : 'บันทึกผลการประเมิน'}</button>}
        </section>
      )}

      {tab === 'knowledge' && (
        <section className="space-y-4">
          <div className="flex items-center justify-between gap-3 rounded-lg border border-border bg-surface p-4">
            <div className="flex items-center gap-3"><GraduationCap className="h-5 w-5 text-accent" /><div><p className="text-sm font-semibold text-ink">Knowledge Test 10 ข้อ</p><p className="text-xs text-ink-muted">บันทึกผลแยก Pre และ Post เพื่อเปรียบเทียบการพัฒนา</p></div></div>
            <select value={testType} onChange={(e) => setTestType(e.target.value as 'pre' | 'post')} className="rounded-md border border-border bg-canvas px-2 py-2 text-sm text-ink"><option value="pre">Pre-test</option><option value="post">Post-test</option></select>
          </div>
          <div className="space-y-2">
            {QUIZ.map((item, index) => <div key={item.q} className="rounded-lg border border-border bg-surface p-4"><p className="text-sm font-medium leading-relaxed text-ink">{index + 1}. {item.q}</p><div className="mt-3 grid grid-cols-2 gap-2"><button onClick={() => setAnswers((a) => ({ ...a, [index]: true }))} className={`rounded-md border px-3 py-2 text-sm ${answers[index] === true ? 'border-accent bg-accent-soft text-accent' : 'border-border text-ink-muted'}`}>ถูก / ใช่</button><button onClick={() => setAnswers((a) => ({ ...a, [index]: false }))} className={`rounded-md border px-3 py-2 text-sm ${answers[index] === false ? 'border-accent bg-accent-soft text-accent' : 'border-border text-ink-muted'}`}>ผิด / ไม่ใช่</button></div></div>)}
          </div>
          <div className="sticky bottom-3 flex items-center justify-between gap-3 rounded-lg border border-border bg-surface/95 p-3 shadow-sm backdrop-blur"><span className="text-sm font-semibold text-ink">คะแนน {knowledgeScore}/{QUIZ.length}</span><button disabled={saving} onClick={() => void saveKnowledge()} className="rounded-lg bg-accent px-4 py-2.5 text-sm font-semibold text-white disabled:opacity-50">{saving ? 'กำลังบันทึก…' : `บันทึก ${testType.toUpperCase()}-test`}</button></div>
        </section>
      )}

      {tab === 'history' && (
        <section className="space-y-4">
          <div className="grid gap-3 md:grid-cols-3">
            <Metric title="Pre-test ล่าสุด" value={summary.pre ? `${summary.pre.score}/${summary.pre.max_score}` : '—'} />
            <Metric title="Post-test ล่าสุด" value={summary.post ? `${summary.post.score}/${summary.post.max_score}` : '—'} />
            <Metric title="พัฒนาการ" value={improvement === null ? 'รอผล Post-test' : `${improvement >= 0 ? '+' : ''}${improvement.toFixed(1)} คะแนน`} />
          </div>
          <div className="rounded-lg border border-border bg-surface p-4"><h2 className="mb-3 text-sm font-semibold text-ink">ประวัติการประเมินพฤติกรรม</h2>{behaviorHistory.length === 0 ? <p className="text-sm text-ink-muted">ยังไม่มีประวัติ</p> : <div className="space-y-2">{behaviorHistory.map((row) => <div key={row.id} className="flex items-center justify-between gap-3 rounded-md bg-canvas px-3 py-2"><span className="text-sm text-ink">{row.total_score}/20 · {resultLabel[row.result]}</span><span className="text-xs text-ink-muted">{new Date(row.evaluated_at).toLocaleDateString('th-TH')}</span></div>)}</div>}</div>
          <div className="rounded-lg border border-border bg-surface p-4"><h2 className="mb-3 text-sm font-semibold text-ink">ประวัติ Pre/Post-test</h2>{knowledgeHistory.length === 0 ? <p className="text-sm text-ink-muted">ยังไม่มีประวัติ</p> : <div className="space-y-2">{knowledgeHistory.map((row) => <div key={row.id} className="flex items-center justify-between gap-3 rounded-md bg-canvas px-3 py-2"><span className="text-sm text-ink"><CheckCircle2 className="mr-2 inline h-4 w-4 text-accent" />{row.test_type.toUpperCase()} · {row.score}/{row.max_score}</span><span className="text-xs text-ink-muted">{new Date(row.taken_at).toLocaleDateString('th-TH')}</span></div>)}</div>}</div>
        </section>
      )}
    </div>
  )
}

function Metric({ title, value }: { title: string; value: string }) {
  return <div className="rounded-lg border border-border bg-surface p-4"><p className="text-xs text-ink-muted">{title}</p><p className="mt-1 text-lg font-semibold text-ink">{value}</p></div>
}
