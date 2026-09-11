import { useEffect, useMemo, useState } from 'react'
import { useParams, Navigate, Link } from 'react-router-dom'
import { ExternalLink, ShieldAlert } from 'lucide-react'
import { useAuth } from '@/context/AuthContext'
import {
  fetchActiveDrugs,
  fetchItemsByTemplate,
  fetchTemplateByPhase,
  submitChecklistResponse,
} from '@/lib/checklist'
import type {
  AlertLevel,
  ChecklistItem,
  ChecklistPhase,
  ChecklistResponse,
  ChecklistTemplate,
  HadDrug,
  Shift,
} from '@/lib/types'
import { ALERT_LEVEL_LABEL_TH } from '@/lib/types'
import { LoadingScreen } from '@/components/ui/LoadingScreen'

const VALID_PHASES: ChecklistPhase[] = ['before', 'during', 'after']

const PHASE_TITLE: Record<ChecklistPhase, string> = {
  before: 'ก่อนให้ยา',
  during: 'ขณะให้ยา',
  after: 'หลังให้ยา',
}

const SHIFT_OPTIONS: Array<{ value: Shift; label: string }> = [
  { value: 'morning', label: 'เวรเช้า' },
  { value: 'afternoon', label: 'เวรบ่าย' },
  { value: 'night', label: 'เวรดึก' },
]

const LEVEL_STYLE: Record<AlertLevel, { bg: string; text: string; border: string }> = {
  red: { bg: 'bg-alert-red-soft', text: 'text-alert-red', border: 'border-alert-red/30' },
  orange: { bg: 'bg-alert-orange-soft', text: 'text-alert-orange', border: 'border-alert-orange/30' },
  yellow: { bg: 'bg-alert-yellow-soft', text: 'text-alert-yellow', border: 'border-alert-yellow/30' },
  green: { bg: 'bg-alert-green-soft', text: 'text-alert-green', border: 'border-alert-green/30' },
}

export function ChecklistFormPage() {
  const { phase } = useParams<{ phase: string }>()
  const { profile, session } = useAuth()

  const [template, setTemplate] = useState<ChecklistTemplate | null>(null)
  const [items, setItems] = useState<ChecklistItem[]>([])
  const [drugs, setDrugs] = useState<HadDrug[]>([])
  const [loading, setLoading] = useState(true)
  const [loadError, setLoadError] = useState<string | null>(null)

  const [drugId, setDrugId] = useState('')
  const [bedCode, setBedCode] = useState('')
  const [shift, setShift] = useState<Shift>('morning')
  const [answers, setAnswers] = useState<Record<string, boolean>>({})
  const [submitting, setSubmitting] = useState(false)
  const [submitError, setSubmitError] = useState<string | null>(null)
  const [result, setResult] = useState<ChecklistResponse | null>(null)

  const isValidPhase = phase && VALID_PHASES.includes(phase as ChecklistPhase)

  useEffect(() => {
    if (!isValidPhase) return
    setLoading(true)
    setLoadError(null)
    Promise.all([
      fetchTemplateByPhase(phase as ChecklistPhase),
      fetchActiveDrugs(),
    ])
      .then(async ([tpl, drugList]) => {
        setTemplate(tpl)
        setDrugs(drugList)
        const itemList = await fetchItemsByTemplate(tpl.id)
        setItems(itemList)
      })
      .catch((err: Error) => setLoadError(err.message))
      .finally(() => setLoading(false))
  }, [phase, isValidPhase])

  const answeredCount = Object.keys(answers).length
  const criticalItems = useMemo(() => items.filter((i) => i.is_critical), [items])

  if (!isValidPhase) return <Navigate to="/checklist" replace />
  if (loading) return <LoadingScreen label="กำลังโหลดแบบตรวจสอบ" />
  if (loadError) {
    return (
      <div className="rounded-lg border border-alert-red/30 bg-alert-red-soft px-4 py-3 text-sm text-alert-red">
        {loadError}
      </div>
    )
  }

  async function handleSubmit() {
    if (!profile?.ward_id || !session || !template) return
    setSubmitting(true)
    setSubmitError(null)
    try {
      const response = await submitChecklistResponse({
        templateId: template.id,
        performedBy: session.user.id,
        wardId: profile.ward_id,
        drugId,
        bedCode: bedCode.trim(),
        shift,
        responses: answers,
      })
      setResult(response)
    } catch (err) {
      setSubmitError(err instanceof Error ? err.message : 'บันทึกไม่สำเร็จ กรุณาลองใหม่')
    } finally {
      setSubmitting(false)
    }
  }

  function resetForm() {
    setResult(null)
    setAnswers({})
    setBedCode('')
  }

  if (result) {
    return <ResultView result={result} items={items} onReset={resetForm} />
  }

  const canSubmit = !!drugId && bedCode.trim().length > 0 && !submitting

  return (
    <div className="max-w-2xl space-y-6">
      <section>
        <p className="text-xs font-medium text-accent">QR Checklist</p>
        <h1 className="mt-0.5 text-xl font-semibold text-ink">{PHASE_TITLE[phase as ChecklistPhase]}</h1>
        {criticalItems.length > 0 && (
          <p className="mt-1.5 flex items-center gap-1.5 text-xs text-ink-muted">
            <ShieldAlert className="h-3.5 w-3.5 text-alert-red" />
            มีข้อวิกฤต {criticalItems.length} ข้อที่ต้องผ่าน 100% — ไม่ผ่านข้อใดข้อหนึ่งจะขึ้น Alert สีแดงทันที
          </p>
        )}
      </section>

      {/* ข้อมูลบริบท: ยา / เตียง / เวร */}
      <section className="grid gap-3 rounded-lg border border-border bg-surface p-4 sm:grid-cols-3">
        <div>
          <label className="mb-1.5 block text-xs font-medium text-ink-muted">ยา High-Alert</label>
          <select
            value={drugId}
            onChange={(e) => setDrugId(e.target.value)}
            className="w-full rounded-md border border-border bg-surface px-3 py-2 text-sm text-ink focus:border-accent"
          >
            <option value="">เลือกยา…</option>
            {drugs.map((d) => (
              <option key={d.id} value={d.id}>
                {d.generic_name}
              </option>
            ))}
          </select>
        </div>
        <div>
          <label className="mb-1.5 block text-xs font-medium text-ink-muted">รหัสเตียง</label>
          <input
            value={bedCode}
            onChange={(e) => setBedCode(e.target.value)}
            placeholder="เช่น BED-08"
            className="w-full rounded-md border border-border bg-surface px-3 py-2 text-sm text-ink placeholder:text-ink-muted/60 focus:border-accent"
          />
        </div>
        <div>
          <label className="mb-1.5 block text-xs font-medium text-ink-muted">เวร</label>
          <select
            value={shift}
            onChange={(e) => setShift(e.target.value as Shift)}
            className="w-full rounded-md border border-border bg-surface px-3 py-2 text-sm text-ink focus:border-accent"
          >
            {SHIFT_OPTIONS.map((s) => (
              <option key={s.value} value={s.value}>
                {s.label}
              </option>
            ))}
          </select>
        </div>
      </section>

      {/* รายการตรวจสอบ */}
      <section className="space-y-2">
        <div className="flex items-center justify-between">
          <h2 className="text-sm font-medium text-ink-muted">รายการตรวจสอบ</h2>
          <span className="text-xs text-ink-muted">
            ตอบแล้ว {answeredCount}/{items.length}
          </span>
        </div>

        <div className="divide-y divide-border overflow-hidden rounded-lg border border-border bg-surface">
          {items.map((item, idx) => (
            <ChecklistItemRow
              key={item.id}
              index={idx + 1}
              item={item}
              value={answers[item.id]}
              onChange={(val) => setAnswers((prev) => ({ ...prev, [item.id]: val }))}
            />
          ))}
        </div>
      </section>

      {submitError && (
        <p className="rounded-md bg-alert-red-soft px-3 py-2 text-sm text-alert-red">{submitError}</p>
      )}

      {!profile?.ward_id && (
        <p className="rounded-md bg-alert-orange-soft px-3 py-2 text-sm text-alert-orange">
          บัญชีนี้ยังไม่ถูกกำหนดหอผู้ป่วย — บันทึกไม่ได้จนกว่าผู้ดูแลระบบจะกำหนด ward ให้
        </p>
      )}

      <button
        onClick={() => void handleSubmit()}
        disabled={!canSubmit || !profile?.ward_id}
        className="w-full rounded-md bg-ink py-3 text-sm font-medium text-white transition-colors hover:bg-ink/90 disabled:opacity-50"
      >
        {submitting ? 'กำลังบันทึก…' : 'บันทึกผลตรวจสอบ'}
      </button>
    </div>
  )
}

function ChecklistItemRow({
  index,
  item,
  value,
  onChange,
}: {
  index: number
  item: ChecklistItem
  value: boolean | undefined
  onChange: (val: boolean) => void
}) {
  return (
    <div className={`flex items-start gap-3 px-4 py-3.5 ${item.is_critical ? 'bg-alert-red-soft/30' : ''}`}>
      <span className="mt-0.5 text-xs font-medium text-ink-muted">{index}</span>
      <div className="flex-1">
        <p className="text-sm text-ink">
          {item.item_text}
          {item.is_critical && (
            <span className="ml-2 inline-block rounded-full bg-alert-red-soft px-2 py-0.5 text-[10px] font-medium text-alert-red">
              ข้อวิกฤต
            </span>
          )}
        </p>
        {item.learning_link && (
          <a
            href={item.learning_link}
            target="_blank"
            rel="noreferrer"
            className="mt-1 inline-flex items-center gap-1 text-xs text-accent hover:underline"
          >
            แนวทางที่เกี่ยวข้อง <ExternalLink className="h-3 w-3" />
          </a>
        )}
      </div>
      <div className="flex shrink-0 gap-1.5">
        <button
          type="button"
          onClick={() => onChange(true)}
          className={`rounded-md px-3 py-1.5 text-xs font-medium transition-colors ${
            value === true ? 'bg-alert-green text-white' : 'bg-surface-sunken text-ink-muted hover:text-ink'
          }`}
        >
          ผ่าน
        </button>
        <button
          type="button"
          onClick={() => onChange(false)}
          className={`rounded-md px-3 py-1.5 text-xs font-medium transition-colors ${
            value === false ? 'bg-alert-red text-white' : 'bg-surface-sunken text-ink-muted hover:text-ink'
          }`}
        >
          ไม่ผ่าน
        </button>
      </div>
    </div>
  )
}

function ResultView({
  result,
  items,
  onReset,
}: {
  result: ChecklistResponse
  items: ChecklistItem[]
  onReset: () => void
}) {
  const style = LEVEL_STYLE[result.computed_level]
  const triggeredTexts = result.triggered_items
    .map((id) => items.find((i) => i.id === id)?.item_text)
    .filter((t): t is string => !!t)

  return (
    <div className="max-w-xl space-y-5">
      <div className={`rounded-lg border ${style.border} ${style.bg} px-5 py-4`}>
        <p className={`text-sm font-semibold ${style.text}`}>{ALERT_LEVEL_LABEL_TH[result.computed_level]}</p>
        <p className="mt-1 text-xs text-ink-muted">
          เตียง {result.bed_code} · บันทึกเมื่อ{' '}
          {new Date(result.created_at).toLocaleString('th-TH', { hour: '2-digit', minute: '2-digit' })}
        </p>
      </div>

      {triggeredTexts.length > 0 && (
        <div className="rounded-lg border border-border bg-surface p-4">
          <p className="mb-2 text-sm font-medium text-ink">ข้อที่ต้องดำเนินการ</p>
          <ul className="space-y-1.5">
            {triggeredTexts.map((t) => (
              <li key={t} className="text-sm text-ink-muted">
                • {t}
              </li>
            ))}
          </ul>
          <p className="mt-3 text-xs text-ink-muted">
            รายการนี้ถูกส่งเข้าระบบติดตาม Alert แล้ว หัวหน้าเวรจะเห็นและติดตามการแก้ไขต่อไป
          </p>
        </div>
      )}

      <div className="flex gap-3">
        <button
          onClick={onReset}
          className="flex-1 rounded-md bg-ink py-2.5 text-sm font-medium text-white hover:bg-ink/90"
        >
          บันทึกรายการถัดไป
        </button>
        <Link
          to="/checklist"
          className="flex-1 rounded-md border border-border py-2.5 text-center text-sm font-medium text-ink hover:bg-surface-sunken"
        >
          กลับหน้า Checklist
        </Link>
      </div>
    </div>
  )
}
