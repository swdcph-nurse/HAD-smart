import { supabase } from '@/lib/supabase'
import type {
  ChecklistItem,
  ChecklistPhase,
  ChecklistResponse,
  ChecklistTemplate,
  HadDrug,
  Shift,
} from '@/lib/types'

export async function fetchTemplateByPhase(phase: ChecklistPhase): Promise<ChecklistTemplate> {
  const { data, error } = await supabase
    .from('checklist_templates')
    .select('*')
    .eq('phase', phase)
    .eq('is_active', true)
    .limit(1)
    .single()

  if (error) throw new Error(`โหลดแบบตรวจสอบไม่สำเร็จ: ${error.message}`)
  return data as ChecklistTemplate
}

export async function fetchItemsByTemplate(templateId: string): Promise<ChecklistItem[]> {
  const { data, error } = await supabase
    .from('checklist_items')
    .select('*')
    .eq('template_id', templateId)
    .order('sort_order', { ascending: true })

  if (error) throw new Error(`โหลดรายการตรวจสอบไม่สำเร็จ: ${error.message}`)
  return (data ?? []) as ChecklistItem[]
}

export async function fetchActiveDrugs(): Promise<HadDrug[]> {
  const { data, error } = await supabase
    .from('had_drugs')
    .select('*')
    .eq('is_active', true)
    .order('generic_name', { ascending: true })

  if (error) throw new Error(`โหลดรายการยาไม่สำเร็จ: ${error.message}`)
  return (data ?? []) as HadDrug[]
}

export interface SubmitChecklistInput {
  templateId: string
  performedBy: string
  wardId: string
  drugId: string
  bedCode: string
  shift: Shift
  /** key = checklist_item.id, value = ตอบผ่าน (true) หรือไม่ผ่าน (false) */
  responses: Record<string, boolean>
}

/**
 * บันทึกผล checklist — สถานะ/ระดับ Alert คำนวณฝั่งฐานข้อมูล (trigger)
 * ดังนั้นค่า computed_level / status / triggered_items ในผลลัพธ์ที่คืนมา
 * คือค่าที่ผ่านการประเมินจริงแล้ว ไม่ใช่ค่าที่ client คำนวณเอง
 */
export async function submitChecklistResponse(
  input: SubmitChecklistInput,
): Promise<ChecklistResponse> {
  const { data, error } = await supabase
    .from('checklist_responses')
    .insert({
      template_id: input.templateId,
      performed_by: input.performedBy,
      ward_id: input.wardId,
      drug_id: input.drugId,
      bed_code: input.bedCode,
      shift: input.shift,
      responses: input.responses,
      filled_at: new Date().toISOString(),
    })
    .select()
    .single()

  if (error) throw new Error(`บันทึกไม่สำเร็จ: ${error.message}`)
  return data as ChecklistResponse
}

export async function fetchMyRecentResponses(userId: string, limit = 10): Promise<ChecklistResponse[]> {
  const { data, error } = await supabase
    .from('checklist_responses')
    .select('*')
    .eq('performed_by', userId)
    .order('created_at', { ascending: false })
    .limit(limit)

  if (error) throw new Error(`โหลดประวัติไม่สำเร็จ: ${error.message}`)
  return (data ?? []) as ChecklistResponse[]
}
