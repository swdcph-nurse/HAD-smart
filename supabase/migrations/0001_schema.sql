-- ============================================================
-- 0001_schema.sql
-- HAD Smart Alert & Supervision Dashboard
-- โครงสร้างตารางหลักทั้งหมด
-- ============================================================

create extension if not exists "pgcrypto"; -- สำหรับ gen_random_uuid()

-- ------------------------------------------------------------
-- ฟังก์ชันช่วยอัปเดต updated_at อัตโนมัติ
-- ------------------------------------------------------------
create or replace function public.set_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

-- ------------------------------------------------------------
-- wards: หอผู้ป่วย / หน่วยงาน
-- ------------------------------------------------------------
create table public.wards (
  id uuid primary key default gen_random_uuid(),
  name text not null unique,
  created_at timestamptz not null default now()
);

-- ------------------------------------------------------------
-- profiles: ข้อมูลผู้ใช้ (1:1 กับ auth.users) — ไม่เก็บข้อมูลผู้ป่วย
-- ------------------------------------------------------------
create table public.profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  display_code text not null,              -- รหัสแสดงผล เช่น "RN-014" ไม่ใช่ชื่อจริงถ้าต้องการปกปิด
  full_name text,                          -- ชื่อจริงสำหรับผู้ดูแลระบบเท่านั้น (เข้าถึงได้จำกัดผ่าน RLS)
  role text not null check (role in ('nurse','supervisor','pharmacist','admin','executive')),
  nurse_level text check (nurse_level in ('novice','advanced_beginner','competent','proficient','expert')),
  ward_id uuid references public.wards(id),
  is_active boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create trigger trg_profiles_updated_at
  before update on public.profiles
  for each row execute function public.set_updated_at();

create index idx_profiles_ward on public.profiles(ward_id);
create index idx_profiles_role on public.profiles(role);

-- ------------------------------------------------------------
-- had_drugs: รายการยาความเสี่ยงสูง (มีเวอร์ชันตามปี)
-- ------------------------------------------------------------
create table public.had_drugs (
  id uuid primary key default gen_random_uuid(),
  generic_name text not null,
  drug_group text,
  route text,
  version_year int not null,
  is_active boolean not null default true,
  notes text,
  created_by uuid references public.profiles(id),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create trigger trg_had_drugs_updated_at
  before update on public.had_drugs
  for each row execute function public.set_updated_at();

create index idx_had_drugs_version on public.had_drugs(version_year);
create index idx_had_drugs_active on public.had_drugs(is_active);

-- ------------------------------------------------------------
-- checklist_templates / checklist_items: แบบตรวจสอบ QR Checklist
-- ------------------------------------------------------------
create table public.checklist_templates (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  phase text not null check (phase in ('before','during','after')),
  is_active boolean not null default true,
  created_at timestamptz not null default now()
);

create table public.checklist_items (
  id uuid primary key default gen_random_uuid(),
  template_id uuid not null references public.checklist_templates(id) on delete cascade,
  item_text text not null,
  is_critical boolean not null default false,   -- ข้อวิกฤตที่ต้องครบ 100%
  learning_link text,                            -- ลิงก์ WI/แนวทางที่เกี่ยวข้อง
  sort_order int not null default 0
);

create index idx_checklist_items_template on public.checklist_items(template_id);

-- ------------------------------------------------------------
-- checklist_responses: การบันทึกผลใช้งานจริงหน้างาน
-- ไม่มีชื่อ/HN ผู้ป่วย ใช้ bed_code (รหัสปกปิด) แทน
-- ------------------------------------------------------------
create table public.checklist_responses (
  id uuid primary key default gen_random_uuid(),
  template_id uuid not null references public.checklist_templates(id),
  performed_by uuid not null references public.profiles(id),
  ward_id uuid not null references public.wards(id),
  drug_id uuid references public.had_drugs(id),
  bed_code text not null,
  shift text not null check (shift in ('morning','afternoon','night')),
  responses jsonb not null default '{}'::jsonb,  -- { "<checklist_item_id>": true|false }
  status text not null default 'open' check (status in ('open','alert','closed')),
  filled_at timestamptz not null default now(),  -- เวลาที่กรอกจริงหน้างาน (ฝั่ง client)
  synced_at timestamptz not null default now(),  -- เวลาที่ sync เข้า Supabase สำเร็จ (อาจต่างกันถ้าออฟไลน์)
  created_at timestamptz not null default now()
);

create index idx_responses_ward on public.checklist_responses(ward_id);
create index idx_responses_performer on public.checklist_responses(performed_by);
create index idx_responses_status on public.checklist_responses(status);
create index idx_responses_created on public.checklist_responses(created_at);

-- ------------------------------------------------------------
-- alerts: รายการแจ้งเตือนที่เกิดจาก checklist_responses
-- ------------------------------------------------------------
create table public.alerts (
  id uuid primary key default gen_random_uuid(),
  response_id uuid not null references public.checklist_responses(id) on delete cascade,
  ward_id uuid not null references public.wards(id),
  level text not null check (level in ('red','orange','yellow','green')),
  triggered_items jsonb not null default '[]'::jsonb, -- array ของ checklist_item_id ที่ไม่ผ่าน
  opened_at timestamptz not null default now(),
  closed_at timestamptz,
  corrective_action text,
  verified_by uuid references public.profiles(id),   -- พยาบาลผู้ร่วมตรวจสอบ (คนที่ 2)
  closed_by uuid references public.profiles(id),
  created_at timestamptz not null default now()
);

create index idx_alerts_ward on public.alerts(ward_id);
create index idx_alerts_level on public.alerts(level);
create index idx_alerts_open on public.alerts(closed_at) where closed_at is null;

-- ------------------------------------------------------------
-- behavior_assessment_items: มาสเตอร์ข้อคำถามประเมินพฤติกรรม 20 ข้อ
-- ------------------------------------------------------------
create table public.behavior_assessment_items (
  id uuid primary key default gen_random_uuid(),
  item_no int not null unique,
  item_text text not null,
  is_critical boolean not null default false -- ข้อ 4,10,12,16 ตามแผนโครงการ
);

-- ------------------------------------------------------------
-- behavior_assessments: ผลการประเมินพฤติกรรมรายบุคคล
-- ------------------------------------------------------------
create table public.behavior_assessments (
  id uuid primary key default gen_random_uuid(),
  nurse_id uuid not null references public.profiles(id),
  evaluator_id uuid not null references public.profiles(id),
  ward_id uuid not null references public.wards(id),
  shift text check (shift in ('morning','afternoon','night')),
  scores jsonb not null default '{}'::jsonb,  -- { "<item_no>": 1|0 }
  total_score int not null default 0,
  critical_items_passed boolean not null default false,
  result text not null check (result in ('pass','coaching','individual_plan')),
  evaluated_at timestamptz not null default now(),
  created_at timestamptz not null default now()
);

create index idx_assessments_nurse on public.behavior_assessments(nurse_id);
create index idx_assessments_ward on public.behavior_assessments(ward_id);

-- ------------------------------------------------------------
-- knowledge_tests: Pre/Post-test ความรู้
-- ------------------------------------------------------------
create table public.knowledge_tests (
  id uuid primary key default gen_random_uuid(),
  nurse_id uuid not null references public.profiles(id),
  test_type text not null check (test_type in ('pre','post')),
  score numeric not null,
  max_score numeric not null default 100,
  taken_at timestamptz not null default now()
);

create index idx_tests_nurse on public.knowledge_tests(nurse_id);

-- ------------------------------------------------------------
-- supervision_feedback: แบบบันทึกข้อมูลย้อนกลับจากการนิเทศ
-- ------------------------------------------------------------
create table public.supervision_feedback (
  id uuid primary key default gen_random_uuid(),
  nurse_id uuid not null references public.profiles(id),
  supervisor_id uuid not null references public.profiles(id),
  ward_id uuid not null references public.wards(id),
  strengths text,
  improvement_points text,
  root_cause text,
  action_plan text,
  reassessment_date date,
  created_at timestamptz not null default now()
);

create index idx_feedback_nurse on public.supervision_feedback(nurse_id);
create index idx_feedback_ward on public.supervision_feedback(ward_id);

-- ------------------------------------------------------------
-- audit_log: บันทึกเหตุการณ์สำคัญเพื่อการตรวจสอบย้อนหลัง (immutable)
-- ------------------------------------------------------------
create table public.audit_log (
  id bigint generated always as identity primary key,
  actor_id uuid references public.profiles(id),
  action text not null,
  entity_table text not null,
  entity_id uuid,
  detail jsonb,
  created_at timestamptz not null default now()
);

create index idx_audit_actor on public.audit_log(actor_id);
create index idx_audit_entity on public.audit_log(entity_table, entity_id);
