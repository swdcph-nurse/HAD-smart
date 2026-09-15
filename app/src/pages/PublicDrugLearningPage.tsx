import { useEffect, useState } from 'react'
import { AlertTriangle, ArrowLeft, BookOpen, CheckCircle2, Pill, ShieldCheck } from 'lucide-react'
import { useNavigate, useParams } from 'react-router-dom'
import { supabase } from '@/lib/supabase'

type DrugLearning = {
  id: string
  generic_name: string
  drug_group: string | null
  strength: string | null
  route: string | null
  indications: string | null
  contraindications: string | null
  preparation_check: string | null
  compatible_solutions: string | null
  preparation_method: string | null
  injection_duration: string | null
  administration_guidance: string | null
  monitoring_guidance: string | null
  learning_wi: string | null
  learning_patient_advice: string | null
  learning_emergency: string | null
  other_precautions: string | null
}

function lines(value: string | null | undefined) {
  return String(value ?? '').replace(/\r\n/g, '\n').replace(/\r/g, '\n').replace(/\s*\|\s*/g, '\n').trim()
}

function Section({ title, value, tone = 'normal' }: { title: string; value: string | null | undefined; tone?: 'normal' | 'warning' }) {
  const text = lines(value)
  if (!text) return null
  return <section className={`rounded-2xl border p-4 ${tone === 'warning' ? 'border-amber-200 bg-amber-50' : 'border-slate-200 bg-slate-50'}`}>
    <h3 className={`text-sm font-bold ${tone === 'warning' ? 'text-amber-800' : 'text-teal-800'}`}>{title}</h3>
    <div className="mt-2 whitespace-pre-wrap text-sm leading-6 text-slate-700">{text}</div>
  </section>
}

export function PublicDrugLearningPage() {
  const { drugId } = useParams<{ drugId: string }>()
  const navigate = useNavigate()
  const [drug, setDrug] = useState<DrugLearning | null>(null)
  const [busy, setBusy] = useState(true)
  const [error, setError] = useState('')

  useEffect(() => {
    let active = true
    async function load() {
      if (!drugId) { setError('ไม่พบรหัสยา'); setBusy(false); return }
      const r = await supabase.rpc('public_get_drug_learning', { p_drug_id: drugId })
      if (!active) return
      if (r.error || !r.data?.[0]) setError('ไม่พบข้อมูล Learning หรือ QR นี้ถูกปิดใช้งานแล้ว')
      else setDrug(r.data[0] as DrugLearning)
      setBusy(false)
    }
    void load()
    return () => { active = false }
  }, [drugId])

  if (busy) return <div className="min-h-dvh bg-slate-950/90 p-4 sm:p-8 grid place-items-center"><div className="w-full max-w-3xl rounded-3xl bg-white p-8 text-center shadow-2xl"><BookOpen className="mx-auto animate-pulse text-teal-700" size={40}/><p className="mt-4 font-semibold">กำลังเปิด Learning…</p></div></div>
  if (error || !drug) return <div className="min-h-dvh bg-slate-950/90 p-4 sm:p-8 grid place-items-center"><div className="w-full max-w-lg rounded-3xl bg-white p-7 text-center shadow-2xl"><AlertTriangle className="mx-auto text-amber-500" size={44}/><h1 className="mt-4 text-xl font-bold">ไม่สามารถเปิด Learning ได้</h1><p className="mt-2 text-sm text-slate-500">{error || 'ไม่พบข้อมูลยา'}</p><button onClick={() => navigate('/')} className="mt-6 rounded-xl bg-teal-700 px-5 py-3 font-semibold text-white">กลับหน้าหลัก</button></div></div>

  return <div className="min-h-dvh bg-gradient-to-br from-slate-950 via-teal-950 to-slate-900 p-3 sm:p-6 md:p-8">
    <div className="mx-auto max-w-4xl overflow-hidden rounded-[2rem] bg-white shadow-2xl">
      <header className="bg-gradient-to-r from-teal-800 to-slate-900 px-5 py-5 text-white sm:px-7">
        <div className="flex items-center justify-between gap-4">
          <div className="flex min-w-0 items-center gap-3"><div className="grid h-11 w-11 shrink-0 place-items-center rounded-2xl bg-white/15"><Pill size={22}/></div><div className="min-w-0"><div className="text-xs font-semibold tracking-[.18em] text-teal-100">HAD SMART • SCAN TO LEARN</div><h1 className="mt-1 truncate text-xl font-bold sm:text-2xl">{drug.generic_name}</h1></div></div>
          <button onClick={() => navigate(-1)} className="shrink-0 rounded-xl border border-white/20 px-3 py-2 text-xs font-semibold hover:bg-white/10"><ArrowLeft size={15} className="mr-1 inline"/>กลับ</button>
        </div>
        <div className="mt-4 flex flex-wrap gap-2 text-xs"><span className="rounded-full bg-emerald-400/15 px-3 py-1.5 text-emerald-100"><ShieldCheck size={14} className="mr-1 inline"/>Learning Mode • Read only</span>{drug.drug_group && <span className="rounded-full bg-white/10 px-3 py-1.5">{drug.drug_group}</span>}{drug.strength && <span className="rounded-full bg-white/10 px-3 py-1.5">{drug.strength}</span>}{drug.route && <span className="rounded-full bg-white/10 px-3 py-1.5">{drug.route}</span>}</div>
      </header>
      <main className="space-y-4 p-4 sm:p-6 md:p-7">
        <div className="rounded-2xl border border-teal-200 bg-teal-50 p-4 text-sm text-teal-900"><CheckCircle2 size={18} className="mr-2 inline text-teal-700"/><b>Scan to Learn</b> — หน้านี้เป็นข้อมูลเพื่อการเรียนรู้เท่านั้น ไม่สร้าง Medication Event และไม่แสดงข้อมูลผู้ป่วย</div>
        <div className="grid gap-4 md:grid-cols-2">
          <Section title="ข้อบ่งใช้" value={drug.indications}/>
          <Section title="ข้อห้ามใช้ / ข้อควรระวังสำคัญ" value={drug.contraindications} tone="warning"/>
          <Section title="ตรวจสอบก่อนเตรียมยา" value={drug.preparation_check}/>
          <Section title="สารละลายที่ใช้ได้" value={drug.compatible_solutions}/>
          <Section title="วิธีเตรียมยา" value={drug.preparation_method}/>
          <Section title="ระยะเวลาที่ฉีด / ให้ยา" value={drug.injection_duration}/>
          <Section title="แนวทางการบริหารยา" value={drug.administration_guidance}/>
          <Section title="การเฝ้าระวัง" value={drug.monitoring_guidance}/>
          <Section title="ข้อควรระวังอื่น ๆ" value={drug.other_precautions}/>
          <Section title="คำแนะนำผู้ป่วย/ญาติ" value={drug.learning_patient_advice}/>
          <Section title="กรณีฉุกเฉิน" value={drug.learning_emergency} tone="warning"/>
          <Section title="Work Instruction / Learning Note" value={drug.learning_wi}/>
        </div>
        <footer className="border-t border-slate-200 pt-4 text-center text-xs leading-5 text-slate-500">HAD Smart • Clinical Learning Support • โปรดตรวจสอบคำสั่งแพทย์และแนวทางของโรงพยาบาล/หน่วยงานก่อนใช้ยา</footer>
      </main>
    </div>
  </div>
}
