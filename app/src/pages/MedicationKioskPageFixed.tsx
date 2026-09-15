import { useEffect, useMemo, useRef, useState, type FormEvent } from 'react'
import { useLocation, useNavigate } from 'react-router-dom'
import { AlertTriangle, ArrowLeft, Camera, CheckCircle2, Eye, Home, Pencil, Pill, RefreshCw, Search, ShieldCheck, UserRound, XCircle } from 'lucide-react'
import { supabase } from '@/lib/supabase'

type Staff = { id: string; display_code?: string; full_name: string | null; position?: string | null }
type Drug = { id: string; generic_name: string; compatible_solutions?: string | null; preparation_method?: string | null; injection_duration?: string | null; other_precautions?: string | null; route?: string | null }
type Event = Record<string, any>
type Step = 'staff' | 'dashboard' | 'qr' | 'learning' | 'prepare' | 'review' | 'assessment' | 'done'
type Item = { no: number; text: string; critical: boolean }

const ITEMS: Item[] = [
  { no: 1, text: 'ตรวจสอบคำสั่งแพทย์ครบถ้วน: ผู้ป่วย ยา ขนาด วิธีให้ และเวลา', critical: false },
  { no: 2, text: 'ทำเครื่องหมายชื่อยาความเสี่ยงสูงตามแนวทางของหน่วยงาน', critical: false },
  { no: 3, text: 'ตรวจสอบรายการยาใน MAR กับคำสั่งแพทย์', critical: false },
  { no: 4, text: 'Double Check ร่วมกับพยาบาลอีก 1 คนก่อนเตรียมยา', critical: true },
  { no: 5, text: 'ตรวจสอบวันหมดอายุของยาและสารน้ำก่อนใช้', critical: false },
  { no: 6, text: 'เตรียมยาในสถานที่สะอาด มีแสงสว่างเพียงพอ และลดสิ่งรบกวน', critical: false },
  { no: 7, text: 'คำนวณขนาดยา ความเข้มข้น และอัตราการให้ถูกต้อง', critical: false },
  { no: 8, text: 'ติดฉลาก High-Alert Drug พร้อมชื่อยา ความเข้มข้น และวัน–เวลาผสม', critical: false },
  { no: 9, text: 'เลือกสารน้ำสำหรับผสมถูกต้องตามแผนการรักษา/แนวทาง', critical: false },
  { no: 10, text: 'Double Check ที่เตียงผู้ป่วยและยืนยันตัวผู้ป่วยอย่างน้อย 2 ตัวบ่งชี้', critical: true },
  { no: 11, text: 'เลือกเส้นทางให้ยา Central Line/Peripheral Vein ตามข้อบ่งชี้', critical: false },
  { no: 12, text: 'ใช้เครื่องควบคุมการให้สารน้ำอัตโนมัติและไม่ปล่อย Free Flow', critical: true },
  { no: 13, text: 'แนะนำผู้ป่วย/ญาติให้สังเกตอาการผิดปกติจากยา', critical: false },
  { no: 14, text: 'ปรับขนาดยาหรืออัตราการให้ตามแผนการรักษาอย่างถูกต้อง', critical: false },
  { no: 15, text: 'บันทึกการให้ยาใน MAR พร้อมลายเซ็นพยาบาล 2 คนตามแนวทาง', critical: false },
  { no: 16, text: 'ประเมินสัญญาณชีพ ผลตรวจ และอาการไม่พึงประสงค์ตามความถี่ที่กำหนด', critical: true },
  { no: 17, text: 'ตรวจสอบตำแหน่ง IV Site สม่ำเสมอเพื่อป้องกัน Extravasation', critical: false },
  { no: 18, text: 'หยุดยา/ช่วยเหลือเบื้องต้นและรายงานแพทย์ทันทีเมื่อพบอาการผิดปกติ', critical: false },
  { no: 19, text: 'บันทึกผลการเฝ้าระวังและติดตามหลังให้ยาอย่างครบถ้วน', critical: false },
  { no: 20, text: 'รายงาน Medication Error หรือ Near Miss ตามระบบทันที', critical: false },
]
const btn = 'inline-flex items-center justify-center gap-2 rounded-xl border px-4 py-2 text-sm font-medium transition disabled:cursor-not-allowed disabled:opacity-50'
const input = 'w-full rounded-xl border border-slate-200 bg-white px-4 py-3 outline-none focus:border-teal-500 focus:ring-2 focus:ring-teal-100'

function extractDrugId(value: string) {
  const raw = value.trim()
  if (!raw) return ''
  try {
    const url = new URL(raw)
    const parts = url.pathname.split('/').filter(Boolean)
    if (parts.length >= 2 && parts[parts.length - 2] === 'learn') return decodeURIComponent(parts[parts.length - 1])
  } catch { /* raw QR value */ }
  return raw
}

export function MedicationKioskPage() {
  const navigate = useNavigate()
  const location = useLocation()
  const charge = location.pathname.endsWith('/charge')
  const [staff, setStaff] = useState<Staff[]>([])
  const [selected, setSelected] = useState<Staff | null>(null)
  const [pending, setPending] = useState<Event[]>([])
  const [event, setEvent] = useState<Event | null>(null)
  const [drug, setDrug] = useState<Drug | null>(null)
  const [editing, setEditing] = useState<Event | null>(null)
  const [step, setStep] = useState<Step>('staff')
  const [query, setQuery] = useState('')
  const [qr, setQr] = useState('')
  const [drugQuery, setDrugQuery] = useState('')
  const [drugOptions, setDrugOptions] = useState<Drug[]>([])
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState('')
  const [message, setMessage] = useState('')
  const [note, setNote] = useState('')
  const [answers, setAnswers] = useState<(boolean | null)[]>(Array(20).fill(null))
  const [showSelf, setShowSelf] = useState(false)
  const [handoff, setHandoff] = useState<{ event: Event; chargeName: string } | null>(null)

  const filteredStaff = useMemo(() => staff.filter(s => `${s.full_name ?? ''} ${s.position ?? ''}`.toLowerCase().includes(query.trim().toLowerCase())), [staff, query])
  const medPending = useMemo(() => pending.filter(x => ['pending_review', 'correction_required', 'pending_re_review'].includes(x.status)), [pending])
  const medReady = useMemo(() => pending.filter(x => x.status === 'ready_to_administer'), [pending])
  const chargeReview = useMemo(() => pending.filter(x => ['pending_review', 'pending_re_review'].includes(x.status)), [pending])
  const chargeReassess = useMemo(() => pending.filter(x => x.status === 'pending_charge_assessment'), [pending])

  useEffect(() => { void loadStaff() }, [])
  useEffect(() => {
    const v = drugQuery.trim()
    if (!v) { setDrugOptions([]); return }
    const t = window.setTimeout(() => { void searchDrugs(v) }, 250)
    return () => window.clearTimeout(t)
  }, [drugQuery])

  async function loadStaff() {
    const r = await supabase.rpc('kiosk_list_staff')
    if (r.error) setError(r.error.message)
    else setStaff((r.data ?? []) as Staff[])
  }
  async function pickStaff(s: Staff) {
    setSelected(s); setError(''); setMessage(''); setBusy(true)
    const r = await supabase.rpc(charge ? 'kiosk_list_pending_events' : 'kiosk_list_med_nurse_events', { p_nurse_id: s.id })
    setBusy(false)
    if (r.error) { setError(r.error.message); return }
    setPending((r.data ?? []) as Event[])
    setStep(charge ? 'review' : 'dashboard')
  }
  async function refresh() {
    if (!selected) return
    setBusy(true)
    const r = await supabase.rpc(charge ? 'kiosk_list_pending_events' : 'kiosk_list_med_nurse_events', { p_nurse_id: selected.id })
    setBusy(false)
    if (r.error) setError(r.error.message); else setPending((r.data ?? []) as Event[])
  }
  function home() { navigate('/') }
  function back() {
    const map: Record<Step, Step> = { staff: 'staff', dashboard: 'staff', qr: 'dashboard', learning: 'qr', prepare: 'dashboard', review: 'staff', assessment: charge ? 'review' : 'dashboard', done: charge ? 'review' : 'dashboard' }
    setError(''); setMessage(''); setStep(map[step])
  }
  async function searchDrugs(v: string) {
    const r = await supabase.from('had_drugs').select('id,generic_name,compatible_solutions,preparation_method,injection_duration,other_precautions,route').eq('is_active', true).ilike('generic_name', `%${v}%`).order('generic_name').limit(20)
    if (!r.error) setDrugOptions((r.data ?? []) as Drug[])
  }
  async function findDrug(value = qr) {
    const raw = value.trim()
    const drugId = extractDrugId(raw)
    if (!drugId) { setError('กรุณาสแกน QR รายการยา'); return }
    setQr(raw)
    setBusy(true)
    const r = await supabase.rpc('kiosk_get_drug', { p_qr_value: drugId })
    setBusy(false)
    if (r.error || !r.data) { setError(r.error?.message ?? 'ไม่พบรายการยา หรือ QR ไม่ถูกต้อง'); return }
    setDrug(r.data as Drug); setStep('learning')
  }
  function chooseDrug(d: Drug) { setDrug(d); setDrugQuery(d.generic_name); setDrugOptions([]); setStep('learning') }
  function startNew() { setEditing(null); setDrug(null); setQr(''); setDrugQuery(''); setError(''); setMessage(''); setStep('qr') }
  function editEvent(x: Event) { setEditing(x); setDrug({ id: x.drug_id ?? '', generic_name: x.drug_name ?? 'รายการยา' }); setStep('prepare') }
  async function save(e: FormEvent<HTMLFormElement>) {
    e.preventDefault(); if (!selected) return
    const f = Object.fromEntries(new FormData(e.currentTarget)); const reviewer = String(f.nurse2_id ?? '').trim()
    if (!reviewer) { setError('กรุณาเลือก Charge Nurse ที่ต้องการส่งตรวจสอบ'); return }
    setBusy(true)
    const params = { p_nurse1_id: selected.id, p_nurse2_id: reviewer, p_bed_code: String(f.bed_code ?? '').trim(), p_hn: String(f.hn ?? '').trim(), p_patient_name: String(f.patient_name ?? '').trim(), p_ratio_plan: String(f.ratio_plan ?? '').trim(), p_dose: String(f.dose ?? '').trim(), p_fluid_mixed: String(f.fluid_mixed ?? '').trim(), p_fluid_volume: String(f.fluid_volume ?? '').trim(), p_rate_ml_hr: String(f.rate_ml_hr ?? '').trim() }
    const r = editing ? await supabase.rpc('kiosk_update_medication_event', { p_event_id: editing.id, ...params }) : await supabase.rpc('kiosk_create_medication_event', { p_drug_id: drug?.id, ...params })
    setBusy(false)
    if (r.error) { setError(r.error.message); return }
    setMessage(editing ? 'แก้ไขรายการเรียบร้อย และส่งกลับให้ Charge Nurse ตรวจสอบ' : 'บันทึกรายการสำเร็จ และส่งให้ Charge Nurse ตรวจสอบแล้ว')
    setEditing(null); await refresh(); setStep('dashboard')
  }
  async function review(id: string, correct: boolean) {
    if (!selected) return
    setBusy(true)
    const r = await supabase.rpc('kiosk_review_medication_event', { p_event_id: id, p_nurse2_id: selected.id, p_is_correct: correct, p_correction_note: correct ? null : (note.trim() || 'กรุณาตรวจสอบคำสั่งแพทย์') })
    setBusy(false)
    if (r.error) { setError(r.error.message); return }
    setPending(x => x.filter(i => i.id !== id)); setNote(''); setMessage(correct ? 'ตรวจสอบถูกต้องแล้ว' : 'ส่งรายการกลับให้ Med Nurse แก้ไขแล้ว')
  }
  function startAssessment(x: Event) { setEvent(x); setAnswers(Array(20).fill(null)); setError(''); setStep('assessment') }
  async function finishSelf() {
    if (!event || !selected) return
    if (answers.some(v => v === null)) { setError('กรุณาประเมินให้ครบทั้ง 20 ข้อก่อนปิดงาน'); return }
    setBusy(true); const values = answers.map(v => v === true)
    const r = await supabase.rpc('kiosk_close_medication_event', { p_event_id: event.id, p_nurse1_id: selected.id, p_answers: values }); setBusy(false)
    if (r.error) { setError(r.error.message); return }
    const updated = { ...event, status: 'pending_charge_assessment', self_scores: values, self_total: r.data?.self_total ?? values.filter(Boolean).length }
    setHandoff({ event: updated, chargeName: event.nurse2_name ?? 'Charge Nurse ที่ได้รับมอบหมาย' }); await refresh()
  }
  async function finishCharge() {
    if (!event || !selected) return
    if (answers.some(v => v === null)) { setError('กรุณาประเมินให้ครบทั้ง 20 ข้อก่อนส่งผล'); return }
    setBusy(true); const values = answers.map(v => v === true)
    const r = await supabase.rpc('kiosk_submit_assessment', { p_event_id: event.id, p_nurse1_id: event.nurse1_id, p_nurse2_id: selected.id, p_answers: values }); setBusy(false)
    if (r.error) { setError(r.error.message); return }
    setMessage(`ประเมินซ้ำเรียบร้อย • ${r.data?.supervised_total ?? values.filter(Boolean).length}/20 • ปิด Workflow สำเร็จ`); await refresh(); setStep('done')
  }
  function confirmHandoff() { setHandoff(null); setMessage('บันทึก Self-Assessment แล้ว • ส่งต่อให้ Charge Nurse ประเมินซ้ำเรียบร้อย'); setStep('dashboard') }

  return <div className="min-h-dvh bg-slate-50 text-slate-900">
    <header className="border-b bg-white"><div className="mx-auto flex max-w-7xl items-center justify-between p-4">
      <div className="flex items-center gap-3"><div className="grid h-11 w-11 place-items-center rounded-2xl bg-teal-700 text-white"><Pill /></div><div><b className="text-lg">HAD Smart</b><div className="text-xs text-slate-500">{charge ? 'Charge Nurse • ผู้ตรวจสอบและประเมินซ้ำ' : 'Med Nurse • ผู้เตรียมยา'}</div></div></div>
      <div className="flex gap-2">{step !== 'staff' && <button onClick={back} className={btn}><ArrowLeft size={16}/>กลับ</button>}<button onClick={home} className={btn}><Home size={16}/>หน้าหลัก</button>{step !== 'staff' && <button onClick={refresh} className={btn} disabled={busy}><RefreshCw size={16}/>รีเฟรช</button>}</div>
    </div></header>
    <main className="mx-auto max-w-7xl p-5 md:p-8">
      {message && <div className="mb-5 flex gap-2 rounded-2xl border border-emerald-200 bg-emerald-50 p-4 text-sm text-emerald-800"><CheckCircle2 size={19}/>{message}</div>}
      {error && <div className="mb-5 flex gap-2 rounded-2xl border border-red-200 bg-red-50 p-4 text-sm text-red-700"><AlertTriangle size={19}/>{error}</div>}
      {step === 'staff' && <StaffPicker charge={charge} query={query} setQuery={setQuery} staff={filteredStaff} pick={pickStaff} busy={busy}/>} 
      {step === 'dashboard' && !charge && <MedDashboard nurse={selected} pending={medPending} ready={medReady} onNew={startNew} onEdit={editEvent} onClose={startAssessment}/>} 
      {step === 'qr' && <Qr qr={qr} setQr={setQr} query={drugQuery} setQuery={setDrugQuery} options={drugOptions} choose={chooseDrug} find={findDrug} busy={busy}/>} 
      {step === 'learning' && drug && <Learning drug={drug} next={() => setStep('prepare')}/>} 
      {step === 'prepare' && drug && <Prepare drug={drug} staff={staff} selected={selected} event={editing} busy={busy} save={save} cancel={() => { setEditing(null); setStep('dashboard') }}/>} 
      {step === 'review' && charge && <ChargeDashboard selected={selected} review={chargeReview} reassess={chargeReassess} onReview={review} onAssess={startAssessment} onSelf={x => { setEvent(x); setShowSelf(true) }} note={note} setNote={setNote} busy={busy}/>} 
      {step === 'assessment' && event && <Assessment event={event} charge={charge} answers={answers} setAnswers={setAnswers} submit={charge ? finishCharge : finishSelf} busy={busy} onSelf={charge ? () => setShowSelf(true) : undefined}/>} 
      {step === 'done' && <Done charge={charge} back={() => setStep(charge ? 'review' : 'dashboard')} refresh={refresh}/>} 
      {showSelf && event && <SelfModal event={event} close={() => setShowSelf(false)}/>} 
      {handoff && <Handoff event={handoff.event} chargeName={handoff.chargeName} confirm={confirmHandoff}/>} 
    </main>
  </div>
}

function StaffPicker({ charge, query, setQuery, staff, pick, busy }: { charge: boolean; query: string; setQuery: (v: string) => void; staff: Staff[]; pick: (s: Staff) => void; busy: boolean }) {
  return <section className="mx-auto max-w-3xl"><div className="mb-7 rounded-3xl bg-gradient-to-br from-teal-800 to-slate-900 p-7 text-white shadow-lg"><div className="text-sm opacity-80">HAD Smart</div><h1 className="mt-1 text-2xl font-bold">{charge ? 'เลือกชื่อ Charge Nurse' : 'เลือกชื่อ Med Nurse'}</h1><p className="mt-2 text-sm text-white/75">{charge ? 'แสดงเฉพาะรายการที่ Charge Nurse คนนี้รับผิดชอบ' : 'เลือกชื่อของตนเองเพื่อดูรายการเตรียมยา'}</p></div><div className="rounded-3xl border bg-white p-5"><label className="mb-2 block text-sm font-semibold">ค้นหารายชื่อ</label><div className="relative"><Search className="absolute left-4 top-3.5 text-slate-400" size={19}/><input className={`${input} pl-11`} value={query} onChange={e => setQuery(e.target.value)} placeholder="พิมพ์ชื่อพยาบาล..."/></div><div className="mt-4 max-h-[55vh] space-y-2 overflow-auto">{staff.map(s => <button key={s.id} type="button" disabled={busy} onClick={() => pick(s)} className="flex w-full items-center gap-3 rounded-2xl border border-slate-100 p-4 text-left hover:border-teal-300 hover:bg-teal-50"><span className="grid h-10 w-10 place-items-center rounded-full bg-teal-100 text-teal-700"><UserRound size={19}/></span><span><b className="block">{s.full_name ?? 'ไม่ระบุชื่อ'}</b><span className="text-xs text-slate-500">{s.position ?? 'พยาบาลวิชาชีพ'}</span></span></button>)}{!staff.length && <div className="p-8 text-center text-sm text-slate-500">ไม่พบรายชื่อ</div>}</div></div></section>
}
function MedDashboard({ nurse, pending, ready, onNew, onEdit, onClose }: { nurse: Staff | null; pending: Event[]; ready: Event[]; onNew: () => void; onEdit: (x: Event) => void; onClose: (x: Event) => void }) {
  return <section><div className="mb-6 flex items-center justify-between gap-4"><div><div className="text-sm text-slate-500">Med Nurse</div><h1 className="text-2xl font-bold">รายการของฉัน</h1><p className="text-sm text-slate-500">{nurse?.full_name}</p></div><button onClick={onNew} className="rounded-xl bg-teal-700 px-5 py-3 text-sm font-semibold text-white"><Pill size={17} className="mr-2 inline"/>เตรียมยาใหม่</button></div><div className="grid gap-5 lg:grid-cols-2"><Panel title="รายการเตรียมยาแล้ว • รอตรวจสอบ">{pending.map(x => <EventCard key={x.id} item={x} edit={x.status !== 'pending_review' ? onEdit : undefined}/>)}{!pending.length && <Empty text="ไม่มีรายการที่รอตรวจสอบหรือแก้ไข"/>}</Panel><Panel title="รายการตรวจสอบแล้ว • รอปิดงาน">{ready.map(x => <EventCard key={x.id} item={x} close={onClose}/>)}{!ready.length && <Empty text="ไม่มีรายการรอปิดงาน"/>}</Panel></div></section>
}
function ChargeDashboard({ selected, review, reassess, onReview, onAssess, onSelf, note, setNote, busy }: { selected: Staff | null; review: Event[]; reassess: Event[]; onReview: (id: string, correct: boolean) => void; onAssess: (x: Event) => void; onSelf: (x: Event) => void; note: string; setNote: (v: string) => void; busy: boolean }) {
  return <section><div className="mb-6"><div className="text-sm text-slate-500">Charge Nurse</div><h1 className="text-2xl font-bold">งานของฉัน</h1><p className="text-sm text-slate-500">{selected?.full_name}</p></div><div className="grid gap-5 lg:grid-cols-2"><Panel title="รายการยาที่ฉันตรวจสอบ">{review.map(x => <ReviewCard key={x.id} item={x} review={onReview} note={note} setNote={setNote} busy={busy}/>)}{!review.length && <Empty text="ไม่มีรายการยาที่รอตรวจสอบ"/>}</Panel><Panel title="รายการประเมินซ้ำของฉัน">{reassess.map(x => <div key={x.id} className="mb-3 rounded-2xl border border-teal-200 bg-teal-50 p-4"><b>{x.drug_name ?? 'รายการยา'}</b><div className="mt-1 text-xs text-slate-600">Med Nurse: {x.nurse1_name ?? '-'} • ผู้ป่วย: {x.patient_name ?? '-'}</div><div className="mt-3 text-xs">Self-Assessment: <b>{x.self_total ?? 0}/20</b></div><div className="mt-3 flex flex-wrap gap-2"><button className={btn} onClick={() => onSelf(x)}><Eye size={16}/>ดูผล Self-Assessment</button><button onClick={() => onAssess(x)} className="rounded-xl bg-teal-700 px-4 py-2 text-sm font-semibold text-white"><ShieldCheck size={16} className="mr-1 inline"/>ประเมินซ้ำ 20 ข้อ</button></div></div>)}{!reassess.length && <Empty text="ยังไม่มีรายการรอประเมินซ้ำ"/>}</Panel></div></section>
}
function EventCard({ item, edit, close }: { item: Event; edit?: (x: Event) => void; close?: (x: Event) => void }) {
  return <div className="mb-3 rounded-2xl border p-4"><div className="flex items-start justify-between gap-3"><div><b>{item.drug_name ?? 'รายการยา'}</b><div className="mt-1 text-xs text-slate-500">เตียง {item.bed_code ?? item.bed_or_room ?? '-'} • HN {item.hn ?? '-'}</div><div className="text-xs text-slate-500">ผู้ป่วย: {item.patient_name ?? '-'}</div></div><Status status={item.status}/></div>{edit && <button onClick={() => edit(item)} className={`${btn} mt-3 border-amber-200 bg-amber-50 text-amber-800`}><Pencil size={16}/>แก้ไขและส่งตรวจใหม่</button>}{close && <button onClick={() => close(item)} className="mt-3 w-full rounded-xl bg-teal-700 px-4 py-3 text-sm font-semibold text-white">ปิดงาน → ประเมินตนเอง</button>}</div>
}
function ReviewCard({ item, review, note, setNote, busy }: { item: Event; review: (id: string, correct: boolean) => void; note: string; setNote: (v: string) => void; busy: boolean }) {
  const [open, setOpen] = useState(false)
  return <div className="mb-3 rounded-2xl border p-4"><div className="flex justify-between gap-3"><div><b>{item.drug_name ?? 'รายการยา'}</b><div className="mt-1 text-xs text-slate-500">Med Nurse: {item.nurse1_name ?? '-'} • ผู้ป่วย: {item.patient_name ?? '-'}</div></div><Status status={item.status}/></div>{open && <div className="mt-3 rounded-xl bg-slate-50 p-3 text-xs"><div>ขนาดยา: {item.dose_amount ?? '-'}</div><div>อัตรา: {item.administration_rate_ml_hr ?? '-'} ml/hr</div><textarea className={`${input} mt-3 min-h-20`} value={note} onChange={e => setNote(e.target.value)} placeholder="หมายเหตุเมื่อส่งกลับแก้ไข"/></div>}<div className="mt-3 flex flex-wrap gap-2"><button className={btn} onClick={() => setOpen(!open)}><Eye size={16}/>ดูรายละเอียด</button><button disabled={busy} onClick={() => review(item.id, true)} className="rounded-xl bg-emerald-600 px-4 py-2 text-sm font-semibold text-white"><CheckCircle2 size={16}/>ถูกต้อง</button><button disabled={busy} onClick={() => review(item.id, false)} className="rounded-xl bg-amber-500 px-4 py-2 text-sm font-semibold text-white">ส่งกลับแก้ไข</button></div></div>
}
function Assessment({ event, charge, answers, setAnswers, submit, busy, onSelf }: { event: Event; charge: boolean; answers: (boolean | null)[]; setAnswers: (v: (boolean | null)[]) => void; submit: () => void; busy: boolean; onSelf?: () => void }) {
  return <section className="mx-auto max-w-4xl"><div className="mb-5 rounded-3xl border bg-white p-6"><div className="flex items-center justify-between"><div><div className="text-sm font-semibold text-teal-700">{charge ? 'Charge Nurse Assessment' : 'Med Nurse Self-Assessment'}</div><h1 className="text-2xl font-bold">{charge ? 'ประเมินซ้ำรายการยา' : 'ประเมินตนเองก่อนปิดงาน'}</h1><p className="mt-2 text-sm text-slate-500">ยา: {event.drug_name ?? '-'} • ผู้ป่วย: {event.patient_name ?? '-'}</p></div><div className="text-2xl font-bold text-teal-700">{answers.filter(Boolean).length}/20</div></div>{onSelf && <button onClick={onSelf} className={`${btn} mt-4`}><Eye size={16}/>ดูผล Self-Assessment ของ Med Nurse</button>}</div><div className="space-y-3">{ITEMS.map((x, i) => <div key={x.no} className="rounded-2xl border bg-white p-4"><div className="flex gap-3"><span className="font-bold">{x.no}</span><div className="flex-1"><div className="text-sm font-medium">{x.text}{x.critical && <span className="ml-2 rounded-full bg-amber-100 px-2 py-0.5 text-[10px] font-bold text-amber-800">Critical</span>}</div><div className="mt-3 flex gap-2"><button onClick={() => { const a = [...answers]; a[i] = true; setAnswers(a) }} className={`rounded-xl px-4 py-2 text-sm font-semibold ${answers[i] === true ? 'bg-emerald-600 text-white' : 'bg-slate-100'}`}>✓ ปฏิบัติ</button><button onClick={() => { const a = [...answers]; a[i] = false; setAnswers(a) }} className={`rounded-xl px-4 py-2 text-sm font-semibold ${answers[i] === false ? 'bg-red-600 text-white' : 'bg-slate-100'}`}>✕ ไม่ปฏิบัติ</button></div></div></div></div>)}</div><button disabled={busy || answers.some(v => v === null)} onClick={submit} className="mt-6 w-full rounded-xl bg-teal-700 px-5 py-3.5 font-semibold text-white">{charge ? 'ส่งผล Charge Nurse Assessment → ปิด Workflow' : 'บันทึก Self-Assessment'}</button></section>
}
function SelfModal({ event, close }: { event: Event; close: () => void }) {
  const scores = Array.isArray(event.self_scores) ? event.self_scores : []
  return <div className="fixed inset-0 z-50 grid place-items-center bg-slate-950/50 p-4"><div className="max-h-[90vh] w-full max-w-3xl overflow-auto rounded-3xl bg-white p-6"><div className="flex items-center justify-between"><div><h2 className="text-xl font-bold">ผล Med Nurse Self-Assessment</h2><p className="text-sm text-slate-500">{event.drug_name ?? '-'} • {event.self_total ?? 0}/20</p></div><button className={btn} onClick={close}>ปิด</button></div><div className="mt-5 space-y-2">{ITEMS.map((x, i) => { const passed = scores[i] === true || scores[i] === 1 || scores[i] === 'true'; return <div key={x.no} className="flex items-center gap-3 rounded-xl bg-slate-50 p-3 text-sm"><span className="w-6 font-bold">{x.no}</span><span className="flex-1">{x.text}</span><span className={`inline-flex items-center gap-1 rounded-full px-2.5 py-1 text-xs font-bold ${passed ? 'bg-emerald-100 text-emerald-700' : 'bg-red-100 text-red-700'}`}>{passed ? <CheckCircle2 size={16}/> : <XCircle size={16}/>} {passed ? 'ถูก' : 'ผิด'}</span></div> })}</div></div></div>
}
function Handoff({ event, chargeName, confirm }: { event: Event; chargeName: string; confirm: () => void }) { return <div className="fixed inset-0 z-[60] grid place-items-center bg-slate-950/60 p-4"><div className="w-full max-w-md rounded-3xl bg-white p-6 text-center shadow-2xl"><ShieldCheck className="mx-auto text-teal-700" size={40}/><h2 className="mt-3 text-xl font-bold">บันทึก Self-Assessment สำเร็จ</h2><p className="mt-2 text-sm text-slate-500">รายการนี้ถูกส่งต่อเพื่อประเมินซ้ำโดย</p><div className="mt-4 rounded-2xl bg-teal-50 p-4 font-bold text-teal-900">{chargeName}</div><p className="mt-4 text-sm">{event.drug_name ?? '-'} • {event.self_total ?? 0}/20</p><button onClick={confirm} className="mt-5 w-full rounded-xl bg-teal-700 px-5 py-3.5 font-semibold text-white">ยืนยัน และไปที่รายการของฉัน</button></div></div> }

function Qr({ qr, setQr, query, setQuery, options, choose, find, busy }: { qr: string; setQr: (v: string) => void; query: string; setQuery: (v: string) => void; options: Drug[]; choose: (d: Drug) => void; find: (value?: string) => void; busy: boolean }) {
  const [camera, setCamera] = useState(false)
  return <section className="mx-auto max-w-3xl"><Panel title="เลือกยา"><label className="block text-sm font-semibold">ค้นหาชื่อยา<input className={`${input} mt-2`} value={query} onChange={e => setQuery(e.target.value)} placeholder="พิมพ์ชื่อยา เช่น Norepinephrine"/></label>{options.length > 0 && <div className="mt-2 rounded-2xl border bg-white">{options.map(d => <button key={d.id} onClick={() => choose(d)} className="block w-full border-b p-4 text-left hover:bg-teal-50">{d.generic_name}</button>)}</div>}<div className="my-5 border-t pt-5"><div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between"><label className="block flex-1 text-sm font-semibold">QR Card เดียวกันใช้สำหรับ Scan to Learn และเตรียมยา<input className={`${input} mt-2`} value={qr} onChange={e => setQr(e.target.value)} onKeyDown={e => e.key === 'Enter' && find()} placeholder="สแกนกล้อง หรือวาง Learning URL / QR value"/></label><button type="button" onClick={() => setCamera(v => !v)} className="inline-flex shrink-0 items-center justify-center gap-2 rounded-xl border border-teal-300 bg-teal-50 px-4 py-3 text-sm font-semibold text-teal-800"><Camera size={18}/>{camera ? 'ปิดกล้อง' : 'เปิดกล้องสแกน QR'}</button></div>{camera && <CameraScanner onDetected={value => { setCamera(false); setQr(value); find(value) }} onError={message => setQr(qr || message)} />}<button onClick={() => find()} disabled={busy} className="mt-3 w-full rounded-xl bg-teal-700 px-5 py-3 font-semibold text-white">เปิด Learning ของยา</button></div></Panel></section>
}

function CameraScanner({ onDetected, onError }: { onDetected: (value: string) => void; onError: (value: string) => void }) {
  const videoRef = useRef<HTMLVideoElement | null>(null)
  const [status, setStatus] = useState('กำลังเปิดกล้อง…')
  const [supported, setSupported] = useState(true)
  useEffect(() => {
    let stream: MediaStream | null = null
    let timer = 0
    let stopped = false
    async function start() {
      const Detector = (window as Window & { BarcodeDetector?: any }).BarcodeDetector
      if (!Detector) { setSupported(false); setStatus('เบราว์เซอร์นี้ยังไม่รองรับการสแกน QR ผ่านกล้องในเว็บ กรุณาใช้ Chrome/Edge ที่รองรับ หรือป้อน QR URL ด้วยตนเอง'); onError('') ; return }
      if (!navigator.mediaDevices?.getUserMedia) { setSupported(false); setStatus('อุปกรณ์นี้ไม่อนุญาตให้เว็บเข้าถึงกล้อง'); onError(''); return }
      try {
        stream = await navigator.mediaDevices.getUserMedia({ video: { facingMode: { ideal: 'environment' }, width: { ideal: 1280 }, height: { ideal: 720 } }, audio: false })
        if (stopped || !videoRef.current) return
        videoRef.current.srcObject = stream
        await videoRef.current.play()
        const detector = new Detector({ formats: ['qr_code'] })
        const scan = async () => {
          if (stopped || !videoRef.current) return
          try {
            const codes = await detector.detect(videoRef.current)
            const value = codes?.[0]?.rawValue
            if (value) { stopped = true; onDetected(value); return }
          } catch { /* keep scanning */ }
          timer = window.setTimeout(() => void scan(), 250)
        }
        await scan()
      } catch (e) {
        setSupported(false)
        setStatus('ไม่สามารถเปิดกล้องได้ กรุณาอนุญาต Camera ใน Browser แล้วลองอีกครั้ง')
        onError(e instanceof Error ? e.message : '')
      }
    }
    void start()
    return () => { stopped = true; if (timer) window.clearTimeout(timer); stream?.getTracks().forEach(track => track.stop()) }
  }, [onDetected, onError])
  return <div className="mt-4 overflow-hidden rounded-3xl border border-teal-200 bg-slate-950 p-3 shadow-inner"><div className="relative aspect-[4/3] overflow-hidden rounded-2xl bg-black">{supported ? <><video ref={videoRef} muted playsInline className="h-full w-full object-cover"/><div className="pointer-events-none absolute inset-8 rounded-3xl border-2 border-white/80"><div className="absolute left-1/2 top-0 h-8 w-1 -translate-x-1/2 bg-teal-400"/><div className="absolute bottom-0 left-1/2 h-8 w-1 -translate-x-1/2 bg-teal-400"/><div className="absolute left-0 top-1/2 h-1 w-8 -translate-y-1/2 bg-teal-400"/><div className="absolute right-0 top-1/2 h-1 w-8 -translate-y-1/2 bg-teal-400"/></div></> : <div className="grid h-full place-items-center p-6 text-center text-sm text-white">{status}</div>}</div><div className="px-2 pb-1 pt-3 text-center text-xs text-white/75">{supported ? 'วาง QR Card ให้อยู่ในกรอบ • ระบบจะสแกนอัตโนมัติ' : status}</div></div>
}
function Learning({ drug, next }: { drug: Drug; next: () => void }) { return <section className="mx-auto max-w-4xl"><Panel title={`Learning ก่อนเตรียมยา • ${drug.generic_name}`}><div className="grid gap-4 md:grid-cols-2"><Box title="สารละลายที่ใช้ได้" value={drug.compatible_solutions}/><Box title="วิธีเตรียมยา" value={drug.preparation_method}/><Box title="ระยะเวลาที่ฉีด" value={drug.injection_duration}/><Box title="ข้อควรระวัง" value={drug.other_precautions}/></div><button onClick={next} className="mt-6 w-full rounded-xl bg-teal-700 px-5 py-3 font-semibold text-white">รับทราบ Learning และไปเตรียมยา</button></Panel></section> }
function Prepare({ drug, staff, selected, event, busy, save, cancel }: { drug: Drug; staff: Staff[]; selected: Staff | null; event: Event | null; busy: boolean; save: (e: FormEvent<HTMLFormElement>) => void; cancel: () => void }) { const [reviewer, setReviewer] = useState(event?.nurse2_id ?? ''); const reviewers = staff.filter(s => s.id !== selected?.id); useEffect(() => setReviewer(event?.nurse2_id ?? ''), [event?.nurse2_id]); return <section className="mx-auto max-w-4xl"><form onSubmit={save} className="rounded-3xl border bg-white p-6"><h1 className="text-2xl font-bold">เตรียมยา: {drug.generic_name}</h1><div className="mt-6 grid gap-4 md:grid-cols-2"><Field label="เตียง/ห้อง" name="bed_code" value={event?.bed_code ?? event?.bed_or_room ?? ''} required/><Field label="HN" name="hn" value={event?.hn ?? ''} required/><Field label="ชื่อผู้ป่วย" name="patient_name" value={event?.patient_name ?? ''} required/><Field label="แผน/อัตราส่วน" name="ratio_plan" value={event?.ordered_ratio ?? ''}/><Field label="ขนาดยา" name="dose" value={event?.dose_amount ?? ''} required/><Field label="สารน้ำที่ผสม" name="fluid_mixed" value={event?.diluent ?? ''} required/><Field label="ปริมาตรสารน้ำ" name="fluid_volume" value={event?.diluent_volume ?? ''}/><Field label="อัตราการให้ (ml/hr)" name="rate_ml_hr" value={event?.administration_rate_ml_hr ?? ''} required/></div><label className="mt-5 block text-sm font-semibold">Charge Nurse ที่ส่งให้ตรวจสอบ<select name="nurse2_id" value={reviewer} onChange={e => setReviewer(e.target.value)} className={`${input} mt-2`} required><option value="">เลือก Charge Nurse</option>{reviewers.map(s => <option key={s.id} value={s.id}>{s.full_name ?? 'ไม่ระบุชื่อ'}</option>)}</select></label><div className="mt-6 flex gap-3"><button type="button" onClick={cancel} className={`${btn} flex-1`}>ยกเลิก</button><button disabled={busy} className="flex-1 rounded-xl bg-teal-700 px-5 py-3 font-semibold text-white">{busy ? 'กำลังบันทึก...' : event ? 'แก้ไขและส่งตรวจใหม่' : 'บันทึกและส่งให้ Charge Nurse'}</button></div></form></section> }
function Field({ label, name, value, required }: { label: string; name: string; value: string; required?: boolean }) { return <label className="block"><span className="mb-2 block text-sm font-medium">{label}</span><input className={input} name={name} defaultValue={value} required={required}/></label> }
function Box({ title, value }: { title: string; value?: string | null }) { return <div className="rounded-2xl bg-slate-50 p-4"><div className="font-semibold text-slate-700">{title}</div><div className="mt-2 whitespace-pre-wrap text-sm text-slate-600">{value || 'ไม่มีข้อมูล'}</div></div> }
function Panel({ title, children }: { title: string; children: React.ReactNode }) { return <div className="rounded-3xl border bg-white p-5 shadow-sm"><h2 className="mb-4 font-bold">{title}</h2>{children}</div> }
function Empty({ text }: { text: string }) { return <div className="rounded-2xl border border-dashed p-8 text-center text-sm text-slate-500">{text}</div> }
function Status({ status }: { status: string }) { const map: Record<string, string> = { pending_review: 'รอตรวจสอบ', correction_required: 'รอแก้ไข', pending_re_review: 'รอตรวจซ้ำ', ready_to_administer: 'รอปิดงาน', pending_charge_assessment: 'รอ Charge Nurse ประเมินซ้ำ', completed: 'เสร็จสิ้น' }; return <span className="rounded-full bg-slate-100 px-3 py-1 text-xs font-semibold">{map[status] ?? status}</span> }
function Done({ charge, back, refresh }: { charge: boolean; back: () => void; refresh: () => void }) { return <section className="mx-auto max-w-2xl"><div className="rounded-3xl border bg-white p-8 text-center"><CheckCircle2 className="mx-auto text-emerald-600" size={48}/><h1 className="mt-4 text-2xl font-bold">ดำเนินการเรียบร้อย</h1><p className="mt-2 text-sm text-slate-500">{charge ? 'Charge Nurse ประเมินซ้ำและปิด Workflow แล้ว' : 'รายการถูกส่งต่อให้ Charge Nurse ประเมินซ้ำแล้ว'}</p><div className="mt-6 flex gap-3"><button onClick={refresh} className={`${btn} flex-1`}>รีเฟรชรายการ</button><button onClick={back} className="flex-1 rounded-xl bg-teal-700 px-5 py-3 font-semibold text-white">กลับรายการของฉัน</button></div></div></section> }
