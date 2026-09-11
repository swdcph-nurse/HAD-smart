// ------------------------------------------------------------
// Types ที่สะท้อนโครงสร้างตารางใน Supabase (ดู supabase/migrations)
// ------------------------------------------------------------

export type Role = 'nurse' | 'supervisor' | 'pharmacist' | 'admin' | 'executive'

export type NurseLevel =
  | 'novice'
  | 'advanced_beginner'
  | 'competent'
  | 'proficient'
  | 'expert'

export type AlertLevel = 'red' | 'orange' | 'yellow' | 'green'

export type ResponseStatus = 'open' | 'alert' | 'closed'

export type Shift = 'morning' | 'afternoon' | 'night'

export interface Ward {
  id: string
  name: string
}

export interface Profile {
  id: string
  display_code: string
  full_name: string | null
  role: Role
  nurse_level: NurseLevel | null
  ward_id: string | null
  is_active: boolean
}

export interface HadDrug {
  id: string
  generic_name: string
  drug_group: string | null
  route: string | null
  version_year: number
  is_active: boolean
}

export type ChecklistPhase = 'before' | 'during' | 'after'

export interface ChecklistTemplate {
  id: string
  name: string
  phase: ChecklistPhase
  is_active: boolean
}

export interface ChecklistItem {
  id: string
  template_id: string
  item_text: string
  is_critical: boolean
  learning_link: string | null
  sort_order: number
}

export interface ChecklistResponse {
  id: string
  template_id: string
  performed_by: string
  ward_id: string
  drug_id: string | null
  bed_code: string
  shift: Shift
  responses: Record<string, boolean>
  status: ResponseStatus
  computed_level: AlertLevel
  triggered_items: string[]
  filled_at: string
  created_at: string
}

export interface AlertRecord {
  id: string
  response_id: string
  ward_id: string
  level: AlertLevel
  triggered_items: string[]
  opened_at: string
  closed_at: string | null
  corrective_action: string | null
  verified_by: string | null
  closed_by: string | null
}

export const ROLE_LABEL_TH: Record<Role, string> = {
  nurse: 'พยาบาลผู้ปฏิบัติ',
  supervisor: 'หัวหน้าเวร / ผู้นิเทศ',
  pharmacist: 'เภสัชกร',
  admin: 'ผู้ดูแลระบบ',
  executive: 'ผู้บริหาร',
}

export const ALERT_LEVEL_LABEL_TH: Record<AlertLevel, string> = {
  red: 'วิกฤต — ต้องแก้ไขทันที',
  orange: 'ไม่ผ่านบางข้อ',
  yellow: 'กรอกไม่ครบ',
  green: 'ครบถ้วนสมบูรณ์',
}
