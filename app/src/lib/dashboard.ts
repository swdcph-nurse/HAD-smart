import { supabase } from '@/lib/supabase'
import type { AlertLevel, AlertRecord, ChecklistItem, ChecklistResponse } from '@/lib/types'

export interface AlertWithResponse extends AlertRecord {
  response: Pick<ChecklistResponse, 'bed_code' | 'shift' | 'performed_by'> | null
}

/** Alert ที่ยังไม่ปิด — RLS จะจำกัดตาม ward ให้อัตโนมัติ (admin เห็นทุก ward) */
export async function fetchOpenAlerts(): Promise<AlertWithResponse[]> {
  const { data, error } = await supabase
    .from('alerts')
    .select('*, response:checklist_responses(bed_code, shift, performed_by)')
    .is('closed_at', null)
    .order('opened_at', { ascending: false })

  if (error) throw new Error(`โหลดรายการ Alert ไม่สำเร็จ: ${error.message}`)
  return (data ?? []) as unknown as AlertWithResponse[]
}

/** Alert ของฉันเอง (สำหรับพยาบาลดูสถานะที่ตัวเองบันทึกไว้) */
export async function fetchMyAlerts(userId: string, limit = 20): Promise<AlertWithResponse[]> {
  const { data, error } = await supabase
    .from('alerts')
    .select('*, response:checklist_responses!inner(bed_code, shift, performed_by)')
    .eq('response.performed_by', userId)
    .order('opened_at', { ascending: false })
    .limit(limit)

  if (error) throw new Error(`โหลดรายการ Alert ไม่สำเร็จ: ${error.message}`)
  return (data ?? []) as unknown as AlertWithResponse[]
}

export interface CloseAlertInput {
  alertId: string
  closedBy: string
  verifiedBy: string
  correctiveAction: string
}

export async function closeAlert(input: CloseAlertInput): Promise<void> {
  const { error } = await supabase
    .from('alerts')
    .update({
      closed_at: new Date().toISOString(),
      closed_by: input.closedBy,
      verified_by: input.verifiedBy,
      corrective_action: input.correctiveAction,
    })
    .eq('id', input.alertId)

  if (error) throw new Error(`ปิด Alert ไม่สำเร็จ: ${error.message}`)
}

/** สรุปจำนวน response แยกตามระดับ ภายในช่วงวันที่กำหนด (ค่าเริ่มต้น 30 วันล่าสุด) */
export async function fetchLevelBreakdown(days = 30): Promise<Record<AlertLevel, number>> {
  const since = new Date(Date.now() - days * 24 * 60 * 60 * 1000).toISOString()
  const { data, error } = await supabase
    .from('checklist_responses')
    .select('computed_level')
    .gte('created_at', since)

  if (error) throw new Error(`โหลดสรุปข้อมูลไม่สำเร็จ: ${error.message}`)

  const breakdown: Record<AlertLevel, number> = { red: 0, orange: 0, yellow: 0, green: 0 }
  for (const row of data ?? []) {
    const level = row.computed_level as AlertLevel
    breakdown[level] = (breakdown[level] ?? 0) + 1
  }
  return breakdown
}

export interface TrendPoint {
  date: string
  total: number
  alerts: number
}

/** จำนวนการบันทึกต่อวัน ย้อนหลัง n วัน — ใช้พล็อตกราฟแนวโน้ม */
export async function fetchDailyTrend(days = 14): Promise<TrendPoint[]> {
  const since = new Date(Date.now() - days * 24 * 60 * 60 * 1000)
  since.setHours(0, 0, 0, 0)

  const { data, error } = await supabase
    .from('checklist_responses')
    .select('created_at, computed_level')
    .gte('created_at', since.toISOString())

  if (error) throw new Error(`โหลดข้อมูลแนวโน้มไม่สำเร็จ: ${error.message}`)

  const buckets = new Map<string, TrendPoint>()
  for (let i = 0; i < days; i++) {
    const d = new Date(since)
    d.setDate(d.getDate() + i)
    const key = d.toLocaleDateString('th-TH', { day: '2-digit', month: '2-digit' })
    buckets.set(key, { date: key, total: 0, alerts: 0 })
  }

  for (const row of data ?? []) {
    const key = new Date(row.created_at).toLocaleDateString('th-TH', { day: '2-digit', month: '2-digit' })
    const bucket = buckets.get(key)
    if (!bucket) continue
    bucket.total += 1
    if (row.computed_level !== 'green') bucket.alerts += 1
  }

  return Array.from(buckets.values())
}

export interface FailedItemStat {
  itemId: string
  itemText: string
  isCritical: boolean
  count: number
}

/** ข้อที่ไม่ผ่าน/ไม่ได้ตอบบ่อยที่สุด ภายในช่วงวันที่กำหนด (top N) */
export async function fetchTopFailedItems(days = 30, limit = 5): Promise<FailedItemStat[]> {
  const since = new Date(Date.now() - days * 24 * 60 * 60 * 1000).toISOString()
  const { data, error } = await supabase
    .from('checklist_responses')
    .select('triggered_items')
    .gte('created_at', since)
    .neq('computed_level', 'green')

  if (error) throw new Error(`โหลดสถิติรายการไม่ผ่านไม่สำเร็จ: ${error.message}`)

  const tally = new Map<string, number>()
  for (const row of data ?? []) {
    const ids = (row.triggered_items ?? []) as string[]
    for (const id of ids) tally.set(id, (tally.get(id) ?? 0) + 1)
  }

  const topIds = Array.from(tally.entries())
    .sort((a, b) => b[1] - a[1])
    .slice(0, limit)
    .map(([id]) => id)

  if (topIds.length === 0) return []

  const { data: items, error: itemsError } = await supabase
    .from('checklist_items')
    .select('id, item_text, is_critical')
    .in('id', topIds)

  if (itemsError) throw new Error(`โหลดรายละเอียดข้อไม่สำเร็จ: ${itemsError.message}`)

  const itemMap = new Map((items as ChecklistItem[]).map((i) => [i.id, i]))
  return topIds
    .map((id) => {
      const item = itemMap.get(id)
      if (!item) return null
      return { itemId: id, itemText: item.item_text, isCritical: item.is_critical, count: tally.get(id) ?? 0 }
    })
    .filter((x): x is FailedItemStat => x !== null)
}
