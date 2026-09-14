import { supabase } from '@/lib/supabase'
import type { NurseLevel, Profile, Shift } from '@/lib/types'

export interface BehaviorAssessmentItem {
  id: string
  item_no: number
  item_text: string
  is_critical: boolean
}

export interface BehaviorAssessment {
  id: string
  nurse_id: string
  evaluator_id: string
  ward_id: string
  shift: Shift | null
  scores: Record<string, boolean>
  total_score: number
  critical_items_passed: boolean
  result: 'pass' | 'coaching' | 'individual_plan'
  evaluated_at: string
}

export interface KnowledgeTest {
  id: string
  nurse_id: string
  test_type: 'pre' | 'post'
  score: number
  max_score: number
  taken_at: string
}

export interface AssessmentSummary {
  pre: KnowledgeTest | null
  post: KnowledgeTest | null
}

export const NURSE_LEVEL_LABEL_TH: Record<NurseLevel, string> = {
  novice: 'Novice',
  advanced_beginner: 'Advanced Beginner',
  competent: 'Competent',
  proficient: 'Proficient',
  expert: 'Expert',
}

export async function fetchBehaviorItems(): Promise<BehaviorAssessmentItem[]> {
  const { data, error } = await supabase
    .from('behavior_assessment_items')
    .select('id,item_no,item_text,is_critical')
    .order('item_no', { ascending: true })
  if (error) throw new Error(`โหลดแบบประเมินพฤติกรรมไม่สำเร็จ: ${error.message}`)
  return (data ?? []) as BehaviorAssessmentItem[]
}

export async function fetchEligibleNurses(currentProfile: Profile): Promise<Profile[]> {
  let query = supabase
    .from('profiles')
    .select('id,display_code,full_name,role,nurse_level,ward_id,is_active')
    .eq('role', 'nurse')
    .eq('is_active', true)
    .order('display_code', { ascending: true })

  if (currentProfile.role !== 'admin' && currentProfile.role !== 'executive' && currentProfile.ward_id) {
    query = query.eq('ward_id', currentProfile.ward_id)
  }

  const { data, error } = await query
  if (error) throw new Error(`โหลดรายชื่อพยาบาลไม่สำเร็จ: ${error.message}`)
  return (data ?? []) as Profile[]
}

export function calculateBehaviorResult(
  items: BehaviorAssessmentItem[],
  scores: Record<string, boolean>,
): Pick<BehaviorAssessment, 'total_score' | 'critical_items_passed' | 'result'> {
  const totalScore = items.reduce((sum, item) => sum + (scores[item.id] === true ? 1 : 0), 0)
  const criticalItemsPassed = items.filter((item) => item.is_critical).every((item) => scores[item.id] === true)
  const result = totalScore < 16 ? 'individual_plan' : totalScore >= 18 && criticalItemsPassed ? 'pass' : 'coaching'
  return { total_score: totalScore, critical_items_passed: criticalItemsPassed, result }
}

export async function submitBehaviorAssessment(input: {
  nurseId: string
  evaluatorId: string
  wardId: string
  shift: Shift
  scores: Record<string, boolean>
  items: BehaviorAssessmentItem[]
}): Promise<BehaviorAssessment> {
  const result = calculateBehaviorResult(input.items, input.scores)
  const { data, error } = await supabase
    .from('behavior_assessments')
    .insert({
      nurse_id: input.nurseId,
      evaluator_id: input.evaluatorId,
      ward_id: input.wardId,
      shift: input.shift,
      scores: input.scores,
      ...result,
    })
    .select()
    .single()
  if (error) throw new Error(`บันทึกแบบประเมินไม่สำเร็จ: ${error.message}`)
  return data as BehaviorAssessment
}

export async function fetchBehaviorHistory(nurseId: string, limit = 10): Promise<BehaviorAssessment[]> {
  const { data, error } = await supabase
    .from('behavior_assessments')
    .select('*')
    .eq('nurse_id', nurseId)
    .order('evaluated_at', { ascending: false })
    .limit(limit)
  if (error) throw new Error(`โหลดประวัติแบบประเมินไม่สำเร็จ: ${error.message}`)
  return (data ?? []) as BehaviorAssessment[]
}

export async function submitKnowledgeTest(input: {
  nurseId: string
  testType: 'pre' | 'post'
  score: number
  maxScore: number
}): Promise<KnowledgeTest> {
  const { data, error } = await supabase
    .from('knowledge_tests')
    .insert({ nurse_id: input.nurseId, test_type: input.testType, score: input.score, max_score: input.maxScore })
    .select()
    .single()
  if (error) throw new Error(`บันทึกผลแบบทดสอบไม่สำเร็จ: ${error.message}`)
  return data as KnowledgeTest
}

export async function fetchKnowledgeHistory(nurseId: string, limit = 20): Promise<KnowledgeTest[]> {
  const { data, error } = await supabase
    .from('knowledge_tests')
    .select('*')
    .eq('nurse_id', nurseId)
    .order('taken_at', { ascending: false })
    .limit(limit)
  if (error) throw new Error(`โหลดผล Pre/Post-test ไม่สำเร็จ: ${error.message}`)
  return (data ?? []) as KnowledgeTest[]
}
