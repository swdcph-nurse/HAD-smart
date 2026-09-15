import { useEffect, useMemo, useState, type FormEvent } from 'react'
import { Download, FilePlus2, Pencil, Plus, Printer, QrCode, Search, ShieldCheck, X, BookOpen } from 'lucide-react'
import { useAuth } from '@/context/AuthContext'
import { supabase } from '@/lib/supabase'

type Drug = {
  id: string
  generic_name: string
  compatible_solutions: string | null
  preparation_method: string | null
  injection_duration: string | null
  other_precautions: string | null
  is_active: boolean
  qr_enabled: boolean
  created_at: string
  updated_at: string
}

type DrugForm = {
  generic_name: string
  compatible_solutions: string
  preparation_method: string
  injection_duration: string
  other_precautions: string
}

const emptyForm: DrugForm = {
  generic_name: '',
  compatible_solutions: '',
  preparation_method: '',
  injection_duration: '',
  other_precautions: '',
}

function qrUrl(id: string) {
  return `https://api.qrserver.com/v1/create-qr-code/?size=520x520&margin=8&data=${encodeURIComponent(id)}`
}

function escapeHtml(value: string | null | undefined) {
  return String(value ?? '').replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/\"/g, '&quot;')
}

function buildCardHtml(drug: Drug) {
  const value = (v: string | null | undefined) => escapeHtml(v || '-')
  return `<!doctype html><html lang="th"><head><meta charset="utf-8"><title>HAD Smart QR Card - ${escapeHtml(drug.generic_name)}</title><style>@page{size:95cm 20cm;margin:0}*{box-sizing:border-box}html,body{margin:0;padding:0;width:95cm;height:20cm}body{font-family:Arial,'Noto Sans Thai',sans-serif;background:#fff;color:#123}.card{width:95cm;height:20cm;padding:1cm 1.2cm;display:grid;grid-template-columns:17cm 1fr 12cm;grid-template-rows:auto 1fr;gap:.45cm 1cm;border:1px solid #0b6fa4;background:#fff;overflow:hidden}.title{grid-column:1/-1;border-bottom:2px solid #d7e6ed;padding-bottom:.3cm;display:flex;align-items:end;justify-content:space-between}.title h1{font-size:28pt;margin:0;color:#075985}.title p{font-size:12pt;margin:.08cm 0 0;color:#64748b}.left{grid-column:1;grid-row:2;align-self:center}.left h2{font-size:25pt;margin:0 0 .4cm;color:#0f172a}.info{grid-column:2;grid-row:2;display:flex;flex-direction:column;gap:.24cm;min-width:0}.section{border-left:5px solid #0b6fa4;padding:.12cm .35cm;background:#f3f8fb;min-height:2.05cm}.section b{display:block;font-size:13.5pt;color:#075985;margin-bottom:.06cm}.section div{font-size:11pt;line-height:1.3;white-space:pre-wrap}.qr{grid-column:3;grid-row:2;width:10.8cm;height:10.8cm;object-fit:contain;align-self:center;justify-self:center}.badge{display:inline-block;padding:.16cm .35cm;border-radius:99px;background:#e6f4f1;color:#08756b;font-size:10.5pt;font-weight:700}</style></head><body><article class="card"><header class="title"><div><h1>HAD Smart • High Alert Drug</h1><p>Medication QR Card • 95 × 20 cm</p></div><span class="badge">สแกน QR เพื่อเรียนรู้ข้อมูลยา</span></header><section class="left"><h2>1. ชื่อยา</h2><div style="font-size:22pt;font-weight:700;color:#075985">${escapeHtml(drug.generic_name)}</div></section><section class="info"><div class="section"><b>2. สารละลายที่ใช้ได้</b><div>${value(drug.compatible_solutions)}</div></div><div class="section"><b>3. วิธีเตรียมยา</b><div>${value(drug.preparation_method)}</div></div><div class="section"><b>4. ระยะเวลาที่ฉีด</b><div>${value(drug.injection_duration)}</div></div><div class="section"><b>5. อื่นๆ / ข้อควรระวัง</b><div>${value(drug.other_precautions)}</div></div></section><img class="qr" src="${qrUrl(drug.id)}" alt="QR Code ${escapeHtml(drug.id)}"></article></body></html>`
}

function FormField({ label, value, onChange, placeholder }: { label: string; value: string; onChange: (v: string) => void; placeholder?: string }) {
  return <label className="block text-sm font-medium text-ink">{label}<textarea rows={4} value={value} onChange={e => onChange(e.target.value)} placeholder={placeholder} className="mt-1 w-full rounded-xl border border-border bg-white px-3 py-2.5 text-sm outline-none focus:border-accent" /></label>
}

export function DrugManagementPage() {
  const { profile } = useAuth()
  const [drugs, setDrugs] = useState<Drug[]>([])
  const [search, setSearch] = useState('')
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState('')
  const [message, setMessage] = useState('')
  const [editing, setEditing] = useState<Drug | null>(null)
  const [form, setForm] = useState<DrugForm>(emptyForm)
  const [learnDrug, setLearnDrug] = useState<Drug | null>(null)
  const [selectedCard, setSelectedCard] = useState<Drug | null>(null)

  async function loadDrugs() {
    const r = await supabase.from('had_drugs').select('id,generic_name,compatible_solutions,preparation_method,injection_duration,other_precautions,is_active,qr_enabled,created_at,updated_at').order('generic_name')
    if (r.error) setError(r.error.message)
    else setDrugs((r.data ?? []) as Drug[])
  }

  useEffect(() => { if (profile?.role === 'admin') void loadDrugs() }, [profile?.role])

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase()
    if (!q) return drugs
    return drugs.filter(d => [d.generic_name, d.compatible_solutions, d.preparation_method, d.injection_duration, d.other_precautions, d.id].some(v => String(v ?? '').toLowerCase().includes(q)))
  }, [drugs, search])

  function openNew() { setEditing(null); setForm(emptyForm); setError(''); setMessage('') }

  function openEdit(d: Drug) {
    setEditing(d)
    setForm({ generic_name: d.generic_name, compatible_solutions: d.compatible_solutions ?? '', preparation_method: d.preparation_method ?? '', injection_duration: d.injection_duration ?? '', other_precautions: d.other_precautions ?? '' })
    setError(''); setMessage('')
  }

  async function saveDrug(e: FormEvent) {
    e.preventDefault(); setError(''); setMessage('')
    if (!form.generic_name.trim()) { setError('กรุณาระบุชื่อยา'); return }
    setBusy(true)
    const payload = {
      generic_name: form.generic_name.trim(),
      compatible_solutions: form.compatible_solutions.trim() || null,
      preparation_method: form.preparation_method.trim() || null,
      injection_duration: form.injection_duration.trim() || null,
      other_precautions: form.other_precautions.trim() || null,
      ...(editing ? {} : { created_by: profile?.id }),
    }
    const r = editing ? await supabase.from('had_drugs').update(payload).eq('id', editing.id) : await supabase.from('had_drugs').insert(payload)
    setBusy(false)
    if (r.error) { setError(r.error.message); return }
    setMessage(editing ? 'บันทึกข้อมูลรายการยาแล้ว' : 'เพิ่มรายการยาแล้ว ระบบสร้างรหัสยาและ QR ให้อัตโนมัติ')
    await loadDrugs(); setEditing(null); setForm(emptyForm)
  }

  async function toggleDrug(d: Drug) {
    setBusy(true); setError('')
    const r = await supabase.from('had_drugs').update({ is_active: !d.is_active, qr_enabled: !d.is_active }).eq('id', d.id)
    setBusy(false)
    if (r.error) setError(r.error.message)
    else { setMessage(d.is_active ? 'ปิดใช้งานรายการยาแล้ว' : 'เปิดใช้งานรายการยาแล้ว'); await loadDrugs() }
  }

  function downloadCard(d: Drug) {
    const blob = new Blob([buildCardHtml(d)], { type: 'text/html;charset=utf-8' })
    const url = URL.createObjectURL(blob); const a = document.createElement('a'); a.href = url
    a.download = `HAD-Smart-QR-${d.generic_name.replace(/[^\wก-๙]+/g, '-')}-95x20cm.html`; a.click(); URL.revokeObjectURL(url)
  }

  function printSelected() {
    if (!selectedCard) return
    const printWindow = window.open('', '_blank', 'noopener,noreferrer')
    if (!printWindow) { setError('ไม่สามารถเปิดหน้าพิมพ์ได้ กรุณาอนุญาต Pop-up ของเว็บไซต์ก่อน'); return }
    printWindow.document.open(); printWindow.document.write(buildCardHtml(selectedCard)); printWindow.document.close()
    printWindow.onload = () => window.setTimeout(() => printWindow.print(), 300)
  }

  if (profile?.role !== 'admin') return null

  return <div className="space-y-6 print:bg-white">
    <div className="flex flex-wrap items-start justify-between gap-3 print:hidden">
      <div><div className="flex items-center gap-2"><ShieldCheck size={20} className="text-accent"/><h1 className="text-xl font-semibold text-ink">จัดการรายการยา</h1></div><p className="mt-1 text-sm text-ink-muted">จัดการข้อมูลยา 5 หัวข้อ และสร้าง QR Medication Card ขนาด 95 × 20 ซม.</p></div>
      <button onClick={openNew} className="inline-flex items-center gap-2 rounded-xl bg-accent px-4 py-2.5 text-sm font-semibold text-white"><Plus size={17}/>เพิ่มรายการยา</button>
    </div>
    {message && <div className="rounded-xl border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm text-emerald-700 print:hidden">{message}</div>}
    {error && <div className="rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700 print:hidden">{error}</div>}
    <section className="rounded-2xl border border-border bg-surface p-4 print:hidden">
      <div className="relative"><Search size={17} className="absolute left-3 top-3 text-ink-muted"/><input value={search} onChange={e => setSearch(e.target.value)} placeholder="ค้นหาชื่อยา หรือข้อมูลยา" className="w-full rounded-xl border border-border bg-white py-2.5 pl-10 pr-3 text-sm"/></div>
      <div className="mt-4 overflow-x-auto"><table className="w-full min-w-[760px] text-sm"><thead><tr className="border-b border-border text-left text-xs text-ink-muted"><th className="px-3 py-2">ชื่อยา</th><th>สารละลายที่ใช้ได้</th><th>ระยะเวลาที่ฉีด</th><th>สถานะ</th><th>จัดการ</th></tr></thead><tbody>{filtered.map(d => <tr key={d.id} className="border-b border-border/70 last:border-0"><td className="px-3 py-3"><div className="font-semibold text-ink">{d.generic_name}</div><div className="text-[10px] text-ink-muted">รหัสยา: {d.id}</div></td><td><div className="max-w-[260px] truncate">{d.compatible_solutions || '-'}</div></td><td>{d.injection_duration || '-'}</td><td><span className={d.is_active ? 'rounded-full bg-emerald-100 px-2 py-1 text-xs text-emerald-700' : 'rounded-full bg-slate-100 px-2 py-1 text-xs text-slate-500'}>{d.is_active ? 'ใช้งาน' : 'ปิดใช้งาน'}</span></td><td><div className="flex gap-1"><button disabled={!d.is_active || !d.qr_enabled} onClick={() => setSelectedCard(d)} className="inline-flex items-center gap-1 rounded-lg border border-accent px-2.5 py-1.5 text-xs font-semibold text-accent disabled:opacity-40"><QrCode size={14}/>QR Card</button><button disabled={!d.is_active} onClick={() => setLearnDrug(d)} className="inline-flex items-center gap-1 rounded-lg border border-border px-2.5 py-1.5 text-xs"><BookOpen size={14}/>Learn</button><button onClick={() => openEdit(d)} className="inline-flex items-center gap-1 rounded-lg border border-border px-2.5 py-1.5 text-xs"><Pencil size={14}/>แก้ไข</button><button disabled={busy} onClick={() => void toggleDrug(d)} className="rounded-lg border border-border px-2.5 py-1.5 text-xs">{d.is_active ? 'ปิดใช้งาน' : 'เปิดใช้งาน'}</button></div></td></tr>)}</tbody></table>{filtered.length === 0 && <p className="py-8 text-center text-sm text-ink-muted">ไม่พบรายการยา</p>}</div>
    </section>
    <section className="rounded-2xl border border-border bg-surface p-5 print:hidden"><div className="mb-4 flex items-center justify-between"><div><h2 className="font-semibold text-ink">{editing ? 'แก้ไขรายการยา' : 'เพิ่มรายการยา'}</h2><p className="text-xs text-ink-muted">ข้อมูลที่จะปรากฏใน Learning และ QR Card</p></div>{editing && <button onClick={openNew} className="rounded-lg p-2 text-ink-muted hover:bg-surface-sunken"><X size={18}/></button>}</div>
      <form onSubmit={saveDrug} className="space-y-4"><div className="grid gap-4 md:grid-cols-2">
        <FormField label="1. ชื่อยา *" value={form.generic_name} onChange={v => setForm(f => ({ ...f, generic_name: v }))} placeholder="เช่น Morphine sulfate"/>
        <FormField label="2. สารละลายที่ใช้ได้" value={form.compatible_solutions} onChange={v => setForm(f => ({ ...f, compatible_solutions: v }))} placeholder="เช่น NSS, D5W ตามแนวทางที่กำหนด"/>
        <FormField label="3. วิธีเตรียมยา" value={form.preparation_method} onChange={v => setForm(f => ({ ...f, preparation_method: v }))} placeholder="ระบุขั้นตอนการเจือจาง/เตรียมยา"/>
        <FormField label="4. ระยะเวลาที่ฉีด" value={form.injection_duration} onChange={v => setForm(f => ({ ...f, injection_duration: v }))} placeholder="เช่น ฉีดภายใน 5 นาที หรือ Infuse 30 นาที"/>
        <div className="md:col-span-2"><FormField label="5. อื่นๆ / ข้อควรระวัง" value={form.other_precautions} onChange={v => setForm(f => ({ ...f, other_precautions: v }))} placeholder="ระบุข้อควรระวัง การเฝ้าระวัง หรือข้อมูลสำคัญอื่นๆ"/></div>
      </div><button disabled={busy} className="inline-flex items-center gap-2 rounded-xl bg-accent px-5 py-2.5 text-sm font-semibold text-white disabled:opacity-50">{editing ? <Pencil size={16}/> : <FilePlus2 size={16}/>} {busy ? 'กำลังบันทึก…' : editing ? 'บันทึกการแก้ไข' : 'บันทึกรายการยา'}</button></form>
    </section>
    {learnDrug && <div className="fixed inset-0 z-50 grid place-items-center bg-slate-950/50 p-4 print:hidden"><div className="max-h-[90vh] w-full max-w-4xl overflow-auto rounded-3xl bg-white p-6 shadow-2xl"><div className="flex items-start justify-between gap-4"><div><div className="text-xs font-semibold text-accent">LEARNING</div><h2 className="mt-1 text-2xl font-bold text-ink">{learnDrug.generic_name}</h2><p className="text-sm text-ink-muted">ทบทวนข้อมูลยา 5 หัวข้อ</p></div><button onClick={() => setLearnDrug(null)} className="rounded-xl p-2 hover:bg-slate-100"><X size={20}/></button></div><div className="mt-5 grid gap-3 md:grid-cols-2">{[['1. ชื่อยา',learnDrug.generic_name],['2. สารละลายที่ใช้ได้',learnDrug.compatible_solutions],['3. วิธีเตรียมยา',learnDrug.preparation_method],['4. ระยะเวลาที่ฉีด',learnDrug.injection_duration],['5. อื่นๆ / ข้อควรระวัง',learnDrug.other_precautions]].map(([label,value]) => <div key={String(label)} className="rounded-2xl bg-slate-50 p-4"><b className="text-accent">{label}</b><div className="mt-2 whitespace-pre-wrap text-sm leading-6 text-ink">{String(value || '-')}</div></div>)}</div><div className="mt-5 rounded-2xl border border-amber-200 bg-amber-50 p-4 text-sm text-amber-900"><b>Clinical Safety Check:</b> ตรวจทานข้อมูลกับคำสั่งแพทย์ ฉลากยา และแนวทางของโรงพยาบาลก่อนเตรียมยา</div></div></div>}
    {selectedCard && <div className="fixed inset-0 z-50 grid place-items-center bg-slate-950/50 p-4 print:bg-white print:p-0"><div className="w-full max-w-6xl overflow-auto rounded-3xl bg-white p-4 shadow-2xl print:max-w-none print:rounded-none print:p-0"><div className="mb-3 flex flex-wrap justify-end gap-2 print:hidden"><button onClick={() => downloadCard(selectedCard)} className="inline-flex items-center gap-2 rounded-xl border border-border px-4 py-2 text-sm"><Download size={16}/>ดาวน์โหลด Card</button><button onClick={printSelected} className="inline-flex items-center gap-2 rounded-xl bg-accent px-4 py-2 text-sm font-semibold text-white"><Printer size={16}/>พิมพ์ 95 × 20 ซม.</button><button onClick={() => setSelectedCard(null)} className="rounded-xl p-2 hover:bg-slate-100"><X size={18}/></button></div><div className="overflow-auto print:overflow-visible"><iframe title="QR Card Preview" srcDoc={buildCardHtml(selectedCard)} className="h-[260px] w-full border-0 print:h-auto" /></div></div></div>}
  </div>
}
