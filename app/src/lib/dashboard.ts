import { supabase } from '@/lib/supabase'

export interface SupervisionRow {
  id: string
  created_at: string
  supervised_total: number | null
  supervised_critical_passed: boolean | null
  supervised_scores: unknown
  self_total: number | null
  self_critical_passed: boolean | null
  status: string
  drug_name: string | null
  nurse1_name: string | null
  nurse2_name: string | null
}

export interface SupervisionItemStat {
  no: number
  text: string
  critical: boolean
  pass: number
  total: number
  rate: number
}

export interface SupervisionDashboardData {
  rows: SupervisionRow[]
  itemStats: SupervisionItemStat[]
  total: number
  completed: number
  complete20: number
  criticalPass: number
  completeBoth: number
  average20: number | null
  averageCritical: number | null
  workflowCloseRate: number | null
}

export const SUPERVISION_ITEMS = [
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
] as const

function asBool(value: unknown): boolean {
  return value === true || value === 1 || value === 'true'
}

function asScores(value: unknown): boolean[] {
  return Array.isArray(value) ? value.map(asBool) : []
}

export async function fetchMedicationSupervision(
  from: string,
  to: string,
  drugId?: string,
): Promise<SupervisionDashboardData> {
  const end = new Date(`${to}T23:59:59.999`).toISOString()
  const start = new Date(`${from}T00:00:00.000`).toISOString()

  const { data, error } = await supabase.rpc('admin_fetch_medication_supervision', {
    p_from: start,
    p_to: end,
    p_drug_id: drugId || null,
  })

  if (error) throw new Error(`โหลดผลการนิเทศไม่สำเร็จ: ${error.message}`)

  const rows: SupervisionRow[] = (data ?? []).map((r: any) => ({
    id: r.id,
    created_at: r.created_at,
    supervised_total: r.supervised_total,
    supervised_critical_passed: r.supervised_critical_passed,
    supervised_scores: r.supervised_scores,
    self_total: r.self_total,
    self_critical_passed: r.self_critical_passed,
    status: r.workflow_status ?? 'completed',
    drug_name: r.drug_name ?? null,
    nurse1_name: r.nurse1_name ?? null,
    nurse2_name: r.nurse2_name ?? null,
  }))

  const itemStats = SUPERVISION_ITEMS.map((item, index) => {
    const total = rows.length
    const pass = rows.reduce((sum, row) => sum + (asScores(row.supervised_scores)[index] ? 1 : 0), 0)
    return { ...item, total, pass, rate: total ? Math.round((pass / total) * 1000) / 10 : 0 }
  })

  const completed = rows.filter((r) => r.status === 'completed').length
  const complete20 = rows.filter((r) => r.supervised_total === 20).length
  const criticalPass = rows.filter((r) => r.supervised_critical_passed === true).length
  const completeBoth = rows.filter((r) => r.supervised_total === 20 && r.supervised_critical_passed === true).length
  const average20 = rows.length ? Math.round((rows.reduce((s, r) => s + (r.supervised_total ?? 0), 0) / rows.length) * 10) / 10 : null
  const criticalCount = SUPERVISION_ITEMS.filter((i) => i.critical).length
  const averageCritical = rows.length
    ? Math.round((rows.reduce((s, r) => s + SUPERVISION_ITEMS.reduce((n, item, i) => n + (item.critical && asScores(r.supervised_scores)[i] ? 1 : 0), 0), 0) / (rows.length * criticalCount)) * 1000) / 10
    : null

  return {
    rows,
    itemStats,
    total: rows.length,
    completed,
    complete20,
    criticalPass,
    completeBoth,
    average20,
    averageCritical,
    workflowCloseRate: rows.length ? Math.round((completed / rows.length) * 1000) / 10 : null,
  }
}

export async function fetchActiveHadDrugs(): Promise<{ id: string; generic_name: string }[]> {
  const { data, error } = await supabase.from('had_drugs').select('id, generic_name').eq('is_active', true).order('generic_name')
  if (error) throw new Error(`โหลดรายการยาไม่สำเร็จ: ${error.message}`)
  return (data ?? []) as { id: string; generic_name: string }[]
}
