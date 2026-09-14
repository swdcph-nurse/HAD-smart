import { useNavigate } from 'react-router-dom'
import { ArrowLeft, ArrowRight, ShieldCheck, Stethoscope, UserRound } from 'lucide-react'

export function NurseRolePage() {
  const navigate = useNavigate()
  return (
    <div className="min-h-dvh bg-slate-50 text-slate-900">
      <main className="mx-auto flex min-h-dvh max-w-5xl items-center px-5 py-10">
        <section className="w-full rounded-[32px] border bg-white p-6 shadow-sm md:p-10">
          <button onClick={() => navigate('/')} className="mb-8 inline-flex items-center gap-2 text-sm font-semibold text-slate-500 hover:text-teal-700"><ArrowLeft size={17}/>กลับหน้าหลัก</button>
          <div className="text-center">
            <div className="mx-auto grid h-16 w-16 place-items-center rounded-2xl bg-teal-50 text-teal-700"><Stethoscope size={32}/></div>
            <h1 className="mt-5 text-3xl font-black">พยาบาลประจำการ</h1>
            <p className="mt-2 text-sm text-slate-500">เลือกบทบาทของคุณสำหรับ Medication Event นี้</p>
          </div>
          <div className="mx-auto mt-9 grid max-w-3xl gap-5 md:grid-cols-2">
            <button onClick={() => navigate('/nurse/med')} className="group rounded-3xl border-2 border-teal-100 p-7 text-left transition hover:-translate-y-1 hover:border-teal-500 hover:bg-teal-50">
              <div className="flex items-center justify-between"><div className="grid h-14 w-14 place-items-center rounded-2xl bg-teal-700 text-white"><UserRound/></div><ArrowRight className="text-slate-300 group-hover:text-teal-700"/></div>
              <h2 className="mt-5 text-2xl font-bold">พยาบาลคนที่ 1</h2>
              <p className="mt-1 font-bold text-teal-700">Med Nurse</p>
              <p className="mt-3 text-sm leading-6 text-slate-500">ผู้เตรียมยา ผู้รับการนิเทศ และผู้บันทึกขั้นตอนก่อนบริหารยา</p>
            </button>
            <button onClick={() => navigate('/nurse/charge')} className="group rounded-3xl border-2 border-slate-200 p-7 text-left transition hover:-translate-y-1 hover:border-slate-500 hover:bg-slate-50">
              <div className="flex items-center justify-between"><div className="grid h-14 w-14 place-items-center rounded-2xl bg-slate-800 text-white"><ShieldCheck/></div><ArrowRight className="text-slate-300 group-hover:text-slate-700"/></div>
              <h2 className="mt-5 text-2xl font-bold">พยาบาลคนที่ 2</h2>
              <p className="mt-1 font-bold text-slate-700">Charge Nurse</p>
              <p className="mt-3 text-sm leading-6 text-slate-500">ผู้ตรวจสอบคำสั่งยา ผู้ทวนสอบ และผู้นิเทศการบริหารยา</p>
            </button>
          </div>
          <p className="mt-8 text-center text-xs text-slate-400">ระบบจะบันทึกชื่อพยาบาลและวันเวลาที่เกี่ยวข้องกับ Medication Event</p>
        </section>
      </main>
    </div>
  )
}
