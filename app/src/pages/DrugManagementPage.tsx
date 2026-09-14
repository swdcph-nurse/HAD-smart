import { useEffect, useMemo, useState, type FormEvent } from 'react'
import { ArrowLeft, Download, FilePlus2, Pencil, Plus, Printer, QrCode, Search, ShieldCheck, X } from 'lucide-react'
import { useAuth } from '@/context/AuthContext'
import { supabase } from '@/lib/supabase'

type Drug = {
  id: string
  generic_name: string
  strength: string | null
  drug_group: string | null
  route: string | null
  version_year: number
  is_active: boolean
  notes: string | null
  administration_guidance: string | null
  learning_wi: string | null
  learning_patient_advice: string | null
  learning_emergency: string | null
  monitoring_guidance: string | null
  qr_enabled: boolean
  created_at: string
  updated_at: string
}

type DrugForm = {
  generic_name: string
  strength: string
  drug_group: string
  route: string
  version_year: string
  administration_guidance: string
  learning_wi: string
  monitoring_guidance: string
  learning_patient_advice: string
  learning_emergency: string
  notes: string
  qr_enabled: boolean
  is_active: boolean
}

const emptyForm: DrugForm = {
  generic_name: '', strength: '', drug_group: '', route: '', version_year: String(new Date().getFullYear() + 543),
  administration_guidance: '', learning_wi: '', monitoring_guidance: '', learning_patient_advice: '', learning_emergency: '', notes: '',
  qr_enabled: true, is_active: true,
}

function qrUrl(id: string) {
  return `https://api.qrserver.com/v1/create-qr-code/?size=280x280&margin=8&data=${encodeURIComponent(id)}`
}

function escapeHtml(value: string | null | undefined) {
  return String(value ?? '').replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;')
}

function buildCardHtml(drug: Drug) {
  const qr = qrUrl(drug.id)
  return `<!doctype html><html lang="th"><head><meta charset="utf-8"><title>HAD Smart QR Card - ${escapeHtml(drug.generic_name)}</title><style>body{font-family:Arial,'Noto Sans Thai',sans-serif;background:#f5f8fa;margin:0;padding:24px;color:#123} .card{width:760px;max-width:100%;margin:auto;background:#fff;border:2px solid #0b6fa4;border-radius:18px;padding:24px;box-sizing:border-box} h1{font-size:24px;margin:0 0 8px;color:#075985} h2{font-size:20px;margin:4px 0 12px} .meta{display:flex;gap:18px;flex-wrap:wrap;border-bottom:1px solid #dbe5ea;padding-bottom:14px}.label{font-size:12px;color:#64748b}.value{font-weight:700}.qr{display:block;width:250px;height:250px;margin:18px auto}.section{margin-top:14px;background:#f0f7fb;border-radius:12px;padding:12px}.section b{display:block;margin-bottom:5px;color:#075985}.section div{white-space:pre-wrap;line-height:1.5}.footer{margin-top:18px;text-align:center;font-size:12px;color:#64748b}@media print{body{background:#fff;padding:0}.card{border:1px solid #999;border-radius:0;width:100%;}}</style></head><body><article class="card"><h1>HAD Smart • QR Medication Card</h1><h2>${escapeHtml(drug.generic_name)}${drug.strength ? ` • ${escapeHtml(drug.strength)}` : ''}</h2><div class="meta"><div><div class="label">รหัส QR</div><div class="value">${escapeHtml(drug.id)}</div></div><div><div class="label">กลุ่มยา</div><div class="value">${escapeHtml(drug.drug_group || '-')}</div></div><div><div class="label">วิธีให้ยา</div><div class="value">${escapeHtml(drug.route || '-')}</div></div><div><div class="label">ปีข้อมูล</div><div class="value">${escapeHtml(String(drug.version_year))}</div></div></div><img class="qr" src="${qr}" alt="QR Code ${escapeHtml(drug.id)}"><div class="section"><b>การบริหารยา</b><div>${escapeHtml(drug.administration_guidance || '-')}</div></div><div class="section"><b>การเฝ้าระวัง / ข้อควรระวัง</b><div>${escapeHtml(drug.monitoring_guidance || '-')}</div></div><div class="section"><b>WI / แนวทาง</b><div>${escapeHtml(drug.learning_wi || '-')}</div></div><div class="section"><b>คำแนะนำผู้ป่วย</b><div>${escapeHtml(drug.learning_patient_advice || '-')}</div></div><div class="section"><b>การจัดการภาวะฉุกเฉิน</b><div>${escapeHtml(drug.learning_emergency || '-')}</div></div><div class="footer">HAD Smart | Safe Medication, Better Care</div></article></body></html>`
}

function FormField({ label, value, onChange, placeholder, textarea = false }: { label: string; value: string; onChange: (v: string) => void; placeholder?: string; textarea?: boolean }) {
  const cls = 'mt-1 w-full rounded-xl border border-border bg-white px-3 py-2.5 text-sm outline-none focus:border-accent'
  return <label className="block text-sm font-medium text-ink">{label}{textarea ? <textarea rows={4} value={value} onChange={e => onChange(e.target.value)} placeholder={placeholder} className={cls} /> : <input value={value} onChange={e => onChange(e.target.value)} placeholder={placeholder} className={cls} />}</label>
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
  const [selectedCard, setSelectedCard] = useState<Drug | null>(null)

  async function loadDrugs() {
    const r = await supabase.from('had_drugs').select('*').order('generic_name')
    if (r.error) setError(r.error.message)
    else setDrugs((r.data ?? []) as Drug[])
  }

  useEffect(() => { if (profile?.role === 'admin') void loadDrugs() }, [profile?.role])

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase()
    if (!q) return drugs
    return drugs.filter(d => [d.generic_name, d.strength, d.drug_group, d.route, d.id].some(v => String(v ?? '').toLowerCase().includes(q)))
  }, [drugs, search])

  function openNew() { setEditing(null); setForm(emptyForm); setError(''); setMessage('') }
  function openEdit(drug: Drug) {
    setEditing(drug)
    setForm({ generic_name: drug.generic_name, strength: drug.strength ?? '', drug_group: drug.drug_group ?? '', route: drug.route ?? '', version_year: String(drug.version_year), administration_guidance: drug.administration_guidance ?? '', learning_wi: drug.learning_wi ?? '', monitoring_guidance: drug.monitoring_guidance ?? '', learning_patient_advice: drug.learning_patient_advice ?? '', learning_emergency: drug.learning_emergency ?? '', notes: drug.notes ?? '', qr_enabled: drug.qr_enabled, is_active: drug.is_active })
    setError(''); setMessage('')
  }

  async function saveDrug(e: FormEvent) {
    e.preventDefault(); setError(''); setMessage('')
    if (!form.generic_name.trim()) { setError('กรุณาระบุชื่อยา'); return }
    const version = Number(form.version_year)
    if (!Number.isInteger(version) || version < 2500 || version > 2700) { setError('ปีข้อมูลไม่ถูกต้อง'); return }
    setBusy(true)
    const payload = {
      generic_name: form.generic_name.trim(), strength: form.strength.trim() || null, drug_group: form.drug_group.trim() || null, route: form.route.trim() || null,
      version_year: version, administration_guidance: form.administration_guidance.trim() || null, learning_wi: form.learning_wi.trim() || null,
      monitoring_guidance: form.monitoring_guidance.trim() || null, learning_patient_advice: form.learning_patient_advice.trim() || null,
      learning_emergency: form.learning_emergency.trim() || null, notes: form.notes.trim() || null, qr_enabled: form.qr_enabled, is_active: form.is_active,
      ...(editing ? {} : { created_by: profile?.id }),
    }
    const r = editing ? await supabase.from('had_drugs').update(payload).eq('id', editing.id) : await supabase.from('had_drugs').insert(payload)
    setBusy(false)
    if (r.error) { setError(r.error.message); return }
    setMessage(editing ? 'บันทึกการแก้ไขรายการยาแล้ว' : 'เพิ่มรายการยาแล้ว และสร้าง QR Code ได้ทันที')
    await loadDrugs()
    if (!editing) setForm(emptyForm)
  }

  async function toggleDrug(drug: Drug) {
    setError(''); setMessage(''); setBusy(true)
    const r = await supabase.from('had_drugs').update({ is_active: !drug.is_active, qr_enabled: !drug.is_active ? drug.qr_enabled : false }).eq('id', drug.id)
    setBusy(false)
    if (r.error) setError(r.error.message); else { setMessage(drug.is_active ? 'ปิดใช้งานรายการยาแล้ว' : 'เปิดใช้งานรายการยาแล้ว'); await loadDrugs() }
  }

  function downloadCard(drug: Drug) {
    const blob = new Blob([buildCardHtml(drug)], { type: 'text/html;charset=utf-8' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a'); a.href = url; a.download = `HAD-Smart-QR-${drug.generic_name.replace(/[^\wก-๙]+/g, '-')}.html`; a.click(); URL.revokeObjectURL(url)
  }

  function printCard() {
    window.print()
  }

  if (profile?.role !== 'admin') return null

  return <div className="space-y-6 print:bg-white">
    <div className="flex flex-wrap items-start justify-between gap-3 print:hidden">
      <div><div className="flex items-center gap-2"><ShieldCheck size={20} className="text-accent"/><h1 className="text-xl font-semibold text-ink">จัดการรายการยา</h1></div><p className="mt-1 text-sm text-ink-muted">เพิ่ม แก้ไข เปิด/ปิดใช้งาน และสร้าง QR Medication Card สำหรับพยาบาล</p></div>
      <button onClick={openNew} className="inline-flex items-center gap-2 rounded-xl bg-accent px-4 py-2.5 text-sm font-semibold text-white"><Plus size={17}/>เพิ่มรายการยา</button>
    </div>

    {message && <div className="rounded-xl border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm text-emerald-700 print:hidden">{message}</div>}
    {error && <div className="rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700 print:hidden">{error}</div>}

    <section className="rounded-2xl border border-border bg-surface p-4 print:hidden">
      <div className="relative"><Search size={17} className="absolute left-3 top-3 text-ink-muted"/><input value={search} onChange={e => setSearch(e.target.value)} placeholder="ค้นหาชื่อยา กลุ่มยา วิธีให้ยา หรือรหัส QR" className="w-full rounded-xl border border-border bg-white py-2.5 pl-10 pr-3 text-sm"/></div>
      <div className="mt-4 overflow-x-auto"><table className="w-full min-w-[800px] text-sm"><thead><tr className="border-b border-border text-left text-xs text-ink-muted"><th className="px-3 py-2">ยา</th><th>กลุ่มยา</th><th>วิธีให้ยา</th><th>สถานะ</th><th>QR</th><th className="text-right">จัดการ</th></tr></thead><tbody>{filtered.map(d => <tr key={d.id} className="border-b border-border/70 last:border-0"><td className="px-3 py-3"><div className="font-semibold text-ink">{d.generic_name}{d.strength ? ` ${d.strength}` : ''}</div><div className="text-[11px] text-ink-muted">QR: {d.id}</div></td><td>{d.drug_group || '-'}</td><td>{d.route || '-'}</td><td><span className={d.is_active ? 'rounded-full bg-emerald-100 px-2 py-1 text-xs text-emerald-700' : 'rounded-full bg-slate-100 px-2 py-1 text-xs text-slate-500'}>{d.is_active ? 'ใช้งาน' : 'ปิดใช้งาน'}</span></td><td><button disabled={!d.is_active || !d.qr_enabled} onClick={() => setSelectedCard(d)} className="inline-flex items-center gap-1 rounded-lg border border-accent px-2.5 py-1.5 text-xs font-semibold text-accent disabled:cursor-not-allowed disabled:opacity-40"><QrCode size={14}/>QR Card</button></td><td className="text-right"><div className="flex justify-end gap-2"><button onClick={() => openEdit(d)} className="inline-flex items-center gap-1 rounded-lg border border-border px-2.5 py-1.5 text-xs"><Pencil size={14}/>แก้ไข</button><button disabled={busy} onClick={() => void toggleDrug(d)} className="rounded-lg border border-border px-2.5 py-1.5 text-xs">{d.is_active ? 'ปิดใช้งาน' : 'เปิดใช้งาน'}</button></div></td></tr>)}</tbody></table>{filtered.length === 0 && <p className="py-8 text-center text-sm text-ink-muted">ไม่พบรายการยา</p>}</div>
    </section>

    {(editing || !form.generic_name) && <section className="rounded-2xl border border-border bg-surface p-5 print:hidden"><div className="mb-4 flex items-center justify-between"><div><h2 className="font-semibold text-ink">{editing ? 'แก้ไขรายการยา' : 'เพิ่มรายการยา'}</h2><p className="text-xs text-ink-muted">ข้อมูลส่วนนี้จะถูกใช้ใน Learning Popup และ QR Medication Card</p></div>{editing && <button onClick={openNew} className="rounded-lg p-2 text-ink-muted hover:bg-surface-sunken"><X size={18}/></button>}</div><form onSubmit={saveDrug} className="space-y-4"><div className="grid gap-4 md:grid-cols-2"><FormField label="ชื่อยา (Generic Name) *" value={form.generic_name} onChange={v => setForm(f => ({...f,generic_name:v}))} placeholder="เช่น Morphine sulfate"/><FormField label="ความแรง / Strength" value={form.strength} onChange={v => setForm(f => ({...f,strength:v}))} placeholder="เช่น 10 mg/mL"/><FormField label="กลุ่มยา" value={form.drug_group} onChange={v => setForm(f => ({...f,drug_group:v}))} placeholder="เช่น Opioid"/><FormField label="วิธีให้ยา / Route" value={form.route} onChange={v => setForm(f => ({...f,route:v}))} placeholder="เช่น IV"/><FormField label="ปีข้อมูล / Version Year" value={form.version_year} onChange={v => setForm(f => ({...f,version_year:v}))}/></div><div className="grid gap-4 md:grid-cols-2"><FormField label="WI / แนวทาง" value={form.learning_wi} onChange={v => setForm(f => ({...f,learning_wi:v}))} textarea/><FormField label="การบริหารยา" value={form.administration_guidance} onChange={v => setForm(f => ({...f,administration_guidance:v}))} textarea/><FormField label="การเฝ้าระวัง / ข้อควรระวัง" value={form.monitoring_guidance} onChange={v => setForm(f => ({...f,monitoring_guidance:v}))} textarea/><FormField label="คำแนะนำผู้ป่วย" value={form.learning_patient_advice} onChange={v => setForm(f => ({...f,learning_patient_advice:v}))} textarea/><FormField label="การจัดการภาวะฉุกเฉิน" value={form.learning_emergency} onChange={v => setForm(f => ({...f,learning_emergency:v}))} textarea/><FormField label="หมายเหตุ" value={form.notes} onChange={v => setForm(f => ({...f,notes:v}))} textarea/></div><div className="flex flex-wrap gap-5 text-sm"><label className="inline-flex items-center gap-2"><input type="checkbox" checked={form.is_active} onChange={e => setForm(f => ({...f,is_active:e.target.checked}))}/>เปิดใช้งานรายการยา</label><label className="inline-flex items-center gap-2"><input type="checkbox" checked={form.qr_enabled} onChange={e => setForm(f => ({...f,qr_enabled:e.target.checked}))}/>เปิดใช้งาน QR</label></div><button disabled={busy} className="inline-flex items-center gap-2 rounded-xl bg-accent px-5 py-2.5 text-sm font-semibold text-white disabled:opacity-50"><FilePlus2 size={17}/>{busy ? 'กำลังบันทึก…' : editing ? 'บันทึกการแก้ไข' : 'เพิ่มรายการยา'}</button></form></section>}

    {selectedCard && <div className="fixed inset-0 z-50 overflow-y-auto bg-black/50 p-4 print:static print:bg-white print:p-0"><div className="mx-auto my-4 max-w-4xl rounded-2xl bg-white p-5 shadow-xl print:my-0 print:max-w-none print:rounded-none print:p-0 print:shadow-none"><div className="mb-4 flex items-center justify-between print:hidden"><div><h2 className="font-semibold text-ink">QR Medication Card</h2><p className="text-xs text-ink-muted">QR นี้เก็บรหัสรายการยา เพื่อให้หน้า Nurse Kiosk เรียกข้อมูลยาได้</p></div><button onClick={() => setSelectedCard(null)} className="rounded-lg p-2 hover:bg-surface-sunken"><X size={18}/></button></div><article id="print-card" className="mx-auto max-w-3xl rounded-2xl border-2 border-accent bg-white p-5 print:max-w-none print:rounded-none"><div className="text-center"><p className="text-sm font-semibold text-accent">HAD Smart • QR Medication Card</p><h3 className="mt-1 text-2xl font-bold text-ink">{selectedCard.generic_name}{selectedCard.strength ? ` • ${selectedCard.strength}` : ''}</h3><p className="mt-1 text-xs text-ink-muted">รหัส QR: {selectedCard.id}</p></div><img src={qrUrl(selectedCard.id)} alt={`QR ${selectedCard.generic_name}`} className="mx-auto my-4 h-64 w-64"/><div className="grid gap-3 md:grid-cols-2"><CardSection title="การบริหารยา" text={selectedCard.administration_guidance}/><CardSection title="การเฝ้าระวัง / ข้อควรระวัง" text={selectedCard.monitoring_guidance}/><CardSection title="WI / แนวทาง" text={selectedCard.learning_wi}/><CardSection title="คำแนะนำผู้ป่วย" text={selectedCard.learning_patient_advice}/><CardSection title="การจัดการภาวะฉุกเฉิน" text={selectedCard.learning_emergency}/><CardSection title="ข้อมูลยา" text={`กลุ่มยา: ${selectedCard.drug_group || '-'}\nวิธีให้ยา: ${selectedCard.route || '-'}\nปีข้อมูล: ${selectedCard.version_year}`}/></div><p className="mt-4 text-center text-[11px] text-ink-muted">HAD Smart | Safe Medication, Better Care</p></article><div className="mt-4 flex flex-wrap justify-center gap-2 print:hidden"><button onClick={() => downloadCard(selectedCard)} className="inline-flex items-center gap-2 rounded-xl bg-accent px-4 py-2.5 text-sm font-semibold text-white"><Download size={16}/>ดาวน์โหลด Card (HTML)</button><button onClick={printCard} className="inline-flex items-center gap-2 rounded-xl border border-border px-4 py-2.5 text-sm font-semibold"><Printer size={16}/>พิมพ์ / บันทึก PDF</button><button onClick={() => setSelectedCard(null)} className="rounded-xl border border-border px-4 py-2.5 text-sm">ปิด</button></div></div></div>}
  </div>
}

function CardSection({ title, text }: { title: string; text: string | null }) {
  return <section className="rounded-xl bg-accent-soft/60 p-3"><h4 className="text-sm font-semibold text-accent">{title}</h4><p className="mt-1 whitespace-pre-wrap text-xs leading-5 text-ink">{text || '-'}</p></section>
}
