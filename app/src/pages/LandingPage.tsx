import { useNavigate } from 'react-router-dom'
import { ArrowRight, LockKeyhole, ShieldCheck, Stethoscope, UserRound } from 'lucide-react'

const HAD_SMART_LOGO = '/had-smart.png?v=20260916'

export function LandingPage() {
  const navigate = useNavigate()
  return (
    <div className="min-h-dvh bg-gradient-to-br from-slate-50 via-white to-teal-50 text-slate-900">
      <main className="mx-auto flex min-h-dvh max-w-6xl items-center px-5 py-10 md:px-8">
        <div className="w-full">
          <section className="mx-auto max-w-4xl text-center">
            <img
              src={HAD_SMART_LOGO}
              alt="HAD Smart"
              className="mx-auto h-20 w-20 rounded-[28px] object-cover shadow-xl"
            />
            <p className="mt-6 text-sm font-bold tracking-[0.18em] text-teal-700">SWD • NURSING DIGITAL SAFETY</p>
            <h1 className="mt-3 text-4xl font-black tracking-tight md:text-6xl">HAD Smart</h1>
            <p className="mx-auto mt-4 max-w-2xl text-lg font-medium text-slate-600 md:text-xl">
              ระบบนิเทศ ติดตาม และเสริมความปลอดภัยในการบริหารยาความเสี่ยงสูง
            </p>
            <p className="mx-auto mt-3 max-w-xl text-sm leading-6 text-slate-500">
              High Alert Drug Smart Workflow — เรียนรู้ก่อนให้ยา เตรียมยาอย่างเป็นระบบ ตรวจสอบโดยพยาบาล 2 คน และบันทึกการนิเทศครบวงจร
            </p>
          </section>

          <section className="mx-auto mt-10 grid max-w-4xl gap-5 md:grid-cols-2">
            <button onClick={() => navigate('/login')} className="group rounded-3xl border border-slate-200 bg-white p-7 text-left shadow-sm transition hover:-translate-y-1 hover:border-teal-300 hover:shadow-lg">
              <div className="flex items-start justify-between">
                <div className="grid h-14 w-14 place-items-center rounded-2xl bg-slate-900 text-white"><LockKeyhole /></div>
                <ArrowRight className="text-slate-300 transition group-hover:translate-x-1 group-hover:text-teal-600" />
              </div>
              <h2 className="mt-5 text-2xl font-bold">ผู้ดูแลระบบ</h2>
              <p className="mt-2 text-sm leading-6 text-slate-500">เข้าสู่ระบบด้วย Email และรหัสผ่านของผู้ดูแลระบบจากระบบเดิม เพื่อจัดการข้อมูลและการตั้งค่าระบบ</p>
            </button>

            <button onClick={() => navigate('/nurse')} className="group rounded-3xl border border-teal-100 bg-white p-7 text-left shadow-sm transition hover:-translate-y-1 hover:border-teal-300 hover:shadow-lg">
              <div className="flex items-start justify-between">
                <div className="grid h-14 w-14 place-items-center rounded-2xl bg-teal-700 text-white"><Stethoscope /></div>
                <ArrowRight className="text-slate-300 transition group-hover:translate-x-1 group-hover:text-teal-600" />
              </div>
              <h2 className="mt-5 text-2xl font-bold">พยาบาลประจำการ</h2>
              <p className="mt-2 text-sm leading-6 text-slate-500">เลือกบทบาทการปฏิบัติงานใน Medication Event โดยไม่ต้องเข้าสู่ระบบด้วยบัญชีผู้ใช้</p>
              <div className="mt-5 flex flex-wrap gap-2 text-xs font-bold">
                <span className="rounded-full bg-teal-50 px-3 py-1.5 text-teal-800"><UserRound className="mr-1 inline" size={14}/>Med Nurse</span>
                <span className="rounded-full bg-slate-100 px-3 py-1.5 text-slate-700"><ShieldCheck className="mr-1 inline" size={14}/>Charge Nurse</span>
              </div>
            </button>
          </section>

          <p className="mt-10 text-center text-xs text-slate-400">โรงพยาบาลสมเด็จพระยุพราชสว่างแดนดิน • HAD Smart</p>
        </div>
      </main>
    </div>
  )
}
