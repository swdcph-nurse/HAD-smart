import { useEffect, useMemo, useState } from 'react'
import type { FormEvent, ReactNode } from 'react'
import { useLocation, useNavigate } from 'react-router-dom'
import {
  AlertTriangle,
  ArrowLeft,
  ClipboardCheck,
  Pill,
  Search,
  ShieldCheck,
  UserRound,
} from 'lucide-react'
import { supabase } from '@/lib/supabase'

type Staff = {
  id: string
  display_code?: string
  full_name: string | null
  position?: string | null
}

type Drug = {
  id: string
  generic_name: string
  route?: string | null
  learning_wi?: string | null
  administration_guide?: string | null
  patient_advice?: string | null
  emergency_management?: string | null
}

type Event = Record<string, any>

type Step = 'staff' | 'qr' | 'learning' | 'prepare' | 'review' | 'assessment'

export function MedicationKioskPage() {
  const navigate = useNavigate()
  const location = useLocation()
  const charge = location.pathname.endsWith('/charge')

  const [staff, setStaff] = useState<Staff[]>([])
  const [selected, setSelected] = useState<Staff | null>(null)
  const [pending, setPending] = useState<Event[]>([])
  const [event, setEvent] = useState<Event | null>(null)
  const [drug, setDrug] = useState<Drug | null>(null)
  const [step, setStep] = useState<Step>('staff')
  const [q, setQ] = useState('')
  const [qr, setQr] = useState('')
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState('')
  const [answers, setAnswers] = useState<boolean[]>(Array(20).fill(false))

  const filtered = useMemo(
    () =>
      staff.filter((s) =>
        `${s.full_name ?? ''} ${s.position ?? ''}`.toLowerCase().includes(q.toLowerCase()),
      ),
    [staff, q],
  )

  useEffect(() => {
    supabase.rpc('kiosk_list_staff').then((result) => {
      if (result.error) setError(result.error.message)
      else setStaff(result.data ?? [])
    })
  }, [])

  async function pick(s: Staff) {
    setSelected(s)
    setError('')

    if (charge) {
      setBusy(true)
      const result = await supabase.rpc('kiosk_list_pending_events', {
        p_nurse_id: s.id,
      })
      setBusy(false)

      if (result.error) {
        setError(result.error.message)
        return
      }

      setPending(result.data ?? [])
      setStep('review')
    } else {
      setStep('qr')
    }
  }

  async function findDrug() {
    setError('')
    setBusy(true)
    const result = await supabase.rpc('kiosk_get_drug', {
      p_qr_value: qr.trim(),
    })
    setBusy(false)

    if (result.error || !result.data) {
      setError(result.error?.message ?? 'ไม่พบรายการยา')
      return
    }

    setDrug(result.data)
    setStep('learning')
  }

  async function save(e: FormEvent<HTMLFormElement>) {
    e.preventDefault()
    if (!selected || !drug) return

    setError('')
    setBusy(true)
    const form = Object.fromEntries(new FormData(e.currentTarget))
    const result = await supabase.rpc('kiosk_create_medication_event', {
      p_nurse1_id: selected.id,
      p_drug_id: drug.id,
      p_bed_code: String(form.bed_code ?? ''),
      p_hn: String(form.hn ?? ''),
      p_patient_name: String(form.patient_name ?? ''),
      p_ratio_plan: String(form.ratio_plan ?? ''),
      p_dose: String(form.dose ?? ''),
      p_fluid_mixed: String(form.fluid_mixed ?? ''),
      p_fluid_volume: String(form.fluid_volume ?? ''),
      p_rate_ml_hr: String(form.rate_ml_hr ?? ''),
    })
    setBusy(false)

    if (result.error) {
      setError(result.error.message)
      return
    }

    localStorage.setItem('had_last_med_event', JSON.stringify(result.data))
    alert('บันทึกสำเร็จแล้ว ส่งรายการเข้าสู่คิว Charge Nurse ตรวจสอบ')
    navigate('/nurse/charge')
  }

  async function review(id: string, correct: boolean) {
    if (!selected) return

    const note = correct
      ? null
      : prompt('ระบุรายการที่ต้องแก้ไข') || 'กรุณาตรวจสอบคำสั่งแพทย์'

    setError('')
    setBusy(true)
    const result = await supabase.rpc('kiosk_review_medication_event', {
      p_event_id: id,
      p_nurse2_id: selected.id,
      p_is_correct: correct,
      p_correction_note: note,
    })
    setBusy(false)

    if (result.error) {
      setError(result.error.message)
      return
    }

    setEvent(result.data)
    if (correct) {
      setStep('assessment')
    } else {
      setPending((items) => items.filter((item) => item.id !== id))
    }
  }

  async function finish() {
    if (!event || !selected) return

    const nurse1Id = event.nurse1_id
    if (!nurse1Id) {
      setError('ไม่พบข้อมูลพยาบาลคนที่ 1 ของรายการ')
      return
    }

    setError('')
    setBusy(true)
    const result = await supabase.rpc('kiosk_submit_assessment', {
      p_event_id: event.id,
      p_nurse1_id: nurse1Id,
      p_nurse2_id: selected.id,
      p_answers: answers,
    })
    setBusy(false)

    if (result.error) {
      setError(result.error.message)
      return
    }

    localStorage.removeItem('had_last_med_event')
    alert('บันทึก Medication Event และการประเมินเรียบร้อยแล้ว')
    navigate('/nurse')
  }

  return (
    <div className="min-h-dvh bg-slate-50 text-slate-900">
      <header className="border-b bg-white">
        <div className="mx-auto flex max-w-6xl items-center justify-between p-4">
          <div className="flex items-center gap-3">
            <div className="grid h-11 w-11 place-items-center rounded-2xl bg-teal-700 text-white">
              <Pill />
            </div>
            <div>
              <b>HAD Smart</b>
              <div className="text-xs text-slate-500">{charge ? 'Charge Nurse' : 'Med Nurse'}</div>
            </div>
          </div>
          <button
            onClick={() => navigate('/nurse')}
            className="inline-flex items-center gap-2 rounded-xl border px-3 py-2 text-sm"
          >
            <ArrowLeft size={16} />
            เปลี่ยนบทบาท
          </button>
        </div>
      </header>

      <main className="mx-auto max-w-5xl p-5 md:p-8">
        {error && (
          <div className="mb-5 flex gap-2 rounded-2xl border border-red-200 bg-red-50 p-4 text-sm text-red-700">
            <AlertTriangle />
            <span>{error}</span>
          </div>
        )}

        {step === 'staff' && (
          <section className="mx-auto max-w-3xl rounded-3xl border bg-white p-6 shadow-sm">
            <Head
              icon={<UserRound />}
              title={charge ? 'เลือกพยาบาลคนที่ 2' : 'เลือกพยาบาลคนที่ 1'}
              sub={charge ? 'Charge Nurse • ผู้ตรวจสอบ / ผู้นิเทศ' : 'Med Nurse • ผู้เตรียมยา / ผู้รับการนิเทศ'}
            />
            <div className="relative mt-6">
              <Search className="absolute left-3 top-3" size={18} />
              <input
                value={q}
                onChange={(e) => setQ(e.target.value)}
                placeholder="ค้นหาชื่อพยาบาล..."
                className="w-full rounded-2xl border bg-slate-50 py-3 pl-10 pr-4"
              />
            </div>
            <div className="mt-3 max-h-96 overflow-auto rounded-2xl border">
              {filtered.map((s) => (
                <button
                  key={s.id}
                  onClick={() => pick(s)}
                  className="flex w-full items-center gap-3 border-b p-4 text-left hover:bg-teal-50"
                >
                  <UserRound />
                  <span className="flex-1">
                    <b>{s.full_name}</b>
                    <small className="block text-slate-500">{s.position ?? 'พยาบาลวิชาชีพ'}</small>
                  </span>
                  ›
                </button>
              ))}
            </div>
          </section>
        )}

        {step === 'qr' && (
          <section className="mx-auto max-w-3xl rounded-3xl border bg-white p-6 shadow-sm">
            <Head
              icon={<Pill />}
              title="สแกน QR รายการยา"
              sub="Med Nurse • สแกนจาก Medication Card ที่ระบบสร้าง"
            />
            <div className="mt-6 rounded-2xl bg-slate-50 p-5">
              <input
                value={qr}
                onChange={(e) => setQr(e.target.value)}
                placeholder="กรอกรหัส QR หรือสแกนให้ค่า QR ลงช่องนี้"
                className="w-full rounded-xl border p-3"
              />
              <button
                disabled={!qr || busy}
                onClick={findDrug}
                className="mt-3 w-full rounded-xl bg-teal-700 p-3 font-bold text-white disabled:opacity-50"
              >
                {busy ? 'กำลังค้นหา…' : 'ค้นหารายการยา'}
              </button>
            </div>
          </section>
        )}

        {step === 'learning' && drug && (
          <section className="mx-auto max-w-4xl rounded-3xl border bg-white p-6 shadow-sm">
            <Head icon={<ShieldCheck />} title={`Learning • ${drug.generic_name}`} sub="ทบทวนก่อนเตรียมยา" />
            <div className="mt-6 grid gap-3 md:grid-cols-2">
              {[
                ['WI / แนวทาง', drug.learning_wi],
                ['การบริหารยา', drug.administration_guide],
                ['คำแนะนำผู้ป่วย', drug.patient_advice],
                ['ภาวะฉุกเฉิน', drug.emergency_management],
              ].map(([title, value]) => (
                <article key={title} className="rounded-2xl border p-4">
                  <b>{title}</b>
                  <p className="mt-2 whitespace-pre-wrap text-sm leading-6 text-slate-600">
                    {value || 'ยังไม่ได้กำหนดเนื้อหา'}
                  </p>
                </article>
              ))}
            </div>
            <button
              onClick={() => setStep('prepare')}
              className="mt-6 w-full rounded-xl bg-teal-700 p-3 font-bold text-white"
            >
              รับทราบ และไปเตรียมยา
            </button>
          </section>
        )}

        {step === 'prepare' && drug && <Prepare drug={drug} busy={busy} save={save} />}
        {step === 'review' && <Review pending={pending} selected={selected} review={review} busy={busy} />}
        {step === 'assessment' && event && (
          <Assessment answers={answers} setAnswers={setAnswers} finish={finish} busy={busy} />
        )}
      </main>
    </div>
  )
}

function Head({ icon, title, sub }: { icon: ReactNode; title: string; sub: string }) {
  return (
    <div className="flex gap-3">
      <div className="grid h-11 w-11 place-items-center rounded-2xl bg-teal-50 text-teal-700">{icon}</div>
      <div>
        <h2 className="text-xl font-bold">{title}</h2>
        <p className="text-sm text-slate-500">{sub}</p>
      </div>
    </div>
  )
}

function Prepare({
  drug,
  save,
  busy,
}: {
  drug: Drug
  save: (e: FormEvent<HTMLFormElement>) => void
  busy: boolean
}) {
  const fields = [
    ['bed_code', 'เตียง / ห้อง'],
    ['hn', 'HN'],
    ['patient_name', 'ชื่อผู้ป่วย'],
    ['ratio_plan', 'อัตราส่วนตามแผน'],
    ['dose', 'ขนาด / ปริมาณยา'],
    ['fluid_mixed', 'สารน้ำที่ผสม'],
    ['fluid_volume', 'ปริมาณสารน้ำ'],
    ['rate_ml_hr', 'อัตรา ml/hr'],
  ]

  return (
    <section className="mx-auto max-w-4xl rounded-3xl border bg-white p-6 shadow-sm">
      <Head icon={<Pill />} title="เตรียมยา" sub={drug.generic_name} />
      <form onSubmit={save} className="mt-6 grid gap-4 md:grid-cols-2">
        {fields.map(([name, label]) => (
          <label key={name} className="text-sm font-semibold">
            {label}
            <input
              name={name}
              required={['bed_code', 'hn', 'patient_name', 'dose'].includes(name)}
              className="mt-1.5 w-full rounded-xl border p-3"
            />
          </label>
        ))}
        <button
          disabled={busy}
          className="md:col-span-2 rounded-xl bg-teal-700 p-3 font-bold text-white disabled:opacity-50"
        >
          บันทึกและส่ง Charge Nurse ตรวจสอบ
        </button>
      </form>
    </section>
  )
}

function Review({
  pending,
  selected,
  review,
  busy,
}: {
  pending: Event[]
  selected: Staff | null
  review: (id: string, correct: boolean) => void
  busy: boolean
}) {
  return (
    <section className="mx-auto max-w-4xl rounded-3xl border bg-white p-6 shadow-sm">
      <Head
        icon={<ShieldCheck />}
        title="Charge Nurse • รายการรอตรวจ"
        sub={`ผู้ตรวจสอบ: ${selected?.full_name ?? ''}`}
      />
      <div className="mt-6 space-y-4">
        {pending.map((item) => (
          <article key={item.id} className="rounded-2xl border p-5">
            <div className="font-bold">{item.drug_name ?? 'รายการยา'} • เตียง {item.bed_code}</div>
            <div className="mt-2 text-sm text-slate-600">
              HN: {item.hn} • ผู้ป่วย: {item.patient_name}
            </div>
            <div className="mt-2 text-sm">
              สถานะ: <b>{item.status}</b>
            </div>
            <div className="mt-4 flex gap-2">
              <button
                disabled={busy}
                onClick={() => review(item.id, true)}
                className="flex-1 rounded-xl bg-emerald-600 p-3 font-bold text-white disabled:opacity-50"
              >
                ถูกต้อง → ยืนยัน
              </button>
              <button
                disabled={busy}
                onClick={() => review(item.id, false)}
                className="flex-1 rounded-xl bg-amber-500 p-3 font-bold text-white disabled:opacity-50"
              >
                ไม่ถูกต้อง → ส่งกลับแก้ไข
              </button>
            </div>
          </article>
        ))}
        {!pending.length && (
          <div className="rounded-2xl bg-slate-50 p-8 text-center text-sm text-slate-500">
            ไม่มีรายการที่รอตรวจสอบ
          </div>
        )}
      </div>
    </section>
  )
}

function Assessment({
  answers,
  setAnswers,
  finish,
  busy,
}: {
  answers: boolean[]
  setAnswers: (answers: boolean[]) => void
  finish: () => void
  busy: boolean
}) {
  return (
    <section className="mx-auto max-w-4xl rounded-3xl border bg-white p-6 shadow-sm">
      <Head
        icon={<ClipboardCheck />}
        title="ประเมินตนเอง 20 ข้อ"
        sub="พยาบาลคนที่ 1 = ผู้รับการนิเทศ • พยาบาลคนที่ 2 = ผู้นิเทศ"
      />
      <div className="mt-5 grid gap-3 md:grid-cols-2">
        {answers.map((value, index) => (
          <label key={index} className="flex items-center gap-3 rounded-xl border p-3 text-sm">
            <input
              type="checkbox"
              checked={value}
              onChange={(e) => {
                const next = [...answers]
                next[index] = e.target.checked
                setAnswers(next)
              }}
            />
            ข้อประเมินที่ {index + 1}
          </label>
        ))}
      </div>
      <button
        disabled={busy}
        onClick={finish}
        className="mt-6 w-full rounded-xl bg-teal-700 p-3 font-bold text-white disabled:opacity-50"
      >
        บันทึกการประเมินและจบ Medication Event
      </button>
    </section>
  )
}
