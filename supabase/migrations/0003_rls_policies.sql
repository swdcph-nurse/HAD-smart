-- ============================================================
-- 0003_rls_policies.sql
-- Row Level Security ทุกตารางที่มีข้อมูลบุคคล/เหตุการณ์
-- + ฟังก์ชันช่วย (helper) อ่าน role/ward ของผู้ใช้ปัจจุบัน
-- ============================================================

-- ------------------------------------------------------------
-- Helper functions (security definer เพื่อเลี่ยง recursive RLS)
-- ------------------------------------------------------------
create or replace function public.current_role()
returns text
language sql security definer stable
set search_path = public
as $$
  select role from public.profiles where id = auth.uid();
$$;

create or replace function public.current_ward()
returns uuid
language sql security definer stable
set search_path = public
as $$
  select ward_id from public.profiles where id = auth.uid();
$$;

create or replace function public.is_supervisory()
returns boolean
language sql security definer stable
set search_path = public
as $$
  select coalesce(public.current_role() in ('supervisor','admin','executive'), false);
$$;

-- ------------------------------------------------------------
-- สร้าง profile อัตโนมัติเมื่อมีผู้ใช้สมัครใหม่ผ่าน Supabase Auth
-- ตั้ง role เริ่มต้นเป็น nurse, ยังไม่มี ward — ผู้ดูแลระบบต้อง
-- assign ward/role ที่แท้จริงภายหลัง (ป้องกันผู้สมัครตั้ง role เอง)
-- ------------------------------------------------------------
create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  insert into public.profiles (id, display_code, role)
  values (new.id, coalesce(new.raw_user_meta_data->>'display_code', 'PENDING'), 'nurse');
  return new;
end;
$$;

create trigger trg_handle_new_user
  after insert on auth.users
  for each row execute function public.handle_new_user();

-- ------------------------------------------------------------
-- ป้องกันไม่ให้ผู้ใช้ทั่วไปยกระดับสิทธิ์ตัวเอง (เปลี่ยน role/ward)
-- อนุญาตเฉพาะ admin เท่านั้นที่แก้ role หรือ ward_id ได้
-- ------------------------------------------------------------
create or replace function public.guard_profile_role_change()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  -- อนุญาตให้ข้ามการตรวจสอบเมื่อรันผ่าน Supabase SQL Editor / migration
  -- (เชื่อมต่อฐานข้อมูลในฐานะ postgres/supabase_admin โดยตรง ไม่ผ่าน PostgREST
  -- จึงไม่มี JWT ทำให้ auth.role() เป็น null) หรือรันผ่าน service_role key ฝั่งเซิร์ฟเวอร์
  if current_user in ('postgres', 'supabase_admin')
     or coalesce(auth.role(), '') = 'service_role' then
    return new;
  end if;

  if (new.role is distinct from old.role or new.ward_id is distinct from old.ward_id)
     and public.current_role() is distinct from 'admin' then
    raise exception 'ไม่มีสิทธิ์เปลี่ยน role หรือ ward — ต้องดำเนินการโดยผู้ดูแลระบบเท่านั้น';
  end if;
  return new;
end;
$$;

create trigger trg_guard_profile_role_change
  before update on public.profiles
  for each row execute function public.guard_profile_role_change();

-- ============================================================
-- เปิดใช้งาน RLS
-- ============================================================
alter table public.wards enable row level security;
alter table public.profiles enable row level security;
alter table public.had_drugs enable row level security;
alter table public.checklist_templates enable row level security;
alter table public.checklist_items enable row level security;
alter table public.checklist_responses enable row level security;
alter table public.alerts enable row level security;
alter table public.behavior_assessment_items enable row level security;
alter table public.behavior_assessments enable row level security;
alter table public.knowledge_tests enable row level security;
alter table public.supervision_feedback enable row level security;
alter table public.audit_log enable row level security;

-- ------------------------------------------------------------
-- wards — อ่านได้ทุกคนที่ login, แก้ไขได้เฉพาะ admin
-- ------------------------------------------------------------
create policy wards_select on public.wards
  for select using (auth.role() = 'authenticated');

create policy wards_admin_write on public.wards
  for all using (public.current_role() = 'admin')
  with check (public.current_role() = 'admin');

-- ------------------------------------------------------------
-- profiles
-- ------------------------------------------------------------
create policy profiles_select_self_or_ward on public.profiles
  for select using (
    id = auth.uid()
    or public.current_role() = 'admin'
    or (public.is_supervisory() and ward_id = public.current_ward())
  );

create policy profiles_update_self_or_admin on public.profiles
  for update using (id = auth.uid() or public.current_role() = 'admin')
  with check (id = auth.uid() or public.current_role() = 'admin');

create policy profiles_admin_insert on public.profiles
  for insert with check (public.current_role() = 'admin');
  -- หมายเหตุ: การสร้างแถวปกติเกิดผ่าน trigger handle_new_user (security definer)
  -- policy นี้ครอบคลุมกรณี admin สร้าง/แก้ไขบัญชีแทนผู้ใช้

-- ------------------------------------------------------------
-- had_drugs — อ่านได้ทุกคน, เขียนได้เฉพาะ pharmacist/admin
-- ------------------------------------------------------------
create policy had_drugs_select on public.had_drugs
  for select using (auth.role() = 'authenticated');

create policy had_drugs_write on public.had_drugs
  for all using (public.current_role() in ('pharmacist','admin'))
  with check (public.current_role() in ('pharmacist','admin'));

-- ------------------------------------------------------------
-- checklist_templates / checklist_items — อ่านได้ทุกคน, เขียนได้ pharmacist/admin
-- ------------------------------------------------------------
create policy checklist_templates_select on public.checklist_templates
  for select using (auth.role() = 'authenticated');

create policy checklist_templates_write on public.checklist_templates
  for all using (public.current_role() in ('pharmacist','admin'))
  with check (public.current_role() in ('pharmacist','admin'));

create policy checklist_items_select on public.checklist_items
  for select using (auth.role() = 'authenticated');

create policy checklist_items_write on public.checklist_items
  for all using (public.current_role() in ('pharmacist','admin'))
  with check (public.current_role() in ('pharmacist','admin'));

-- ------------------------------------------------------------
-- checklist_responses
-- ------------------------------------------------------------
create policy responses_insert_own on public.checklist_responses
  for insert with check (
    performed_by = auth.uid()
    and ward_id = public.current_ward()
  );

create policy responses_select on public.checklist_responses
  for select using (
    performed_by = auth.uid()
    or public.current_role() = 'admin'
    or (public.is_supervisory() and ward_id = public.current_ward())
  );

create policy responses_update on public.checklist_responses
  for update using (
    (performed_by = auth.uid() and status = 'open')
    or public.current_role() = 'admin'
    or (public.is_supervisory() and ward_id = public.current_ward())
  );

-- ------------------------------------------------------------
-- alerts
-- ------------------------------------------------------------
create policy alerts_select on public.alerts
  for select using (
    public.current_role() = 'admin'
    or (public.is_supervisory() and ward_id = public.current_ward())
    or exists (
      select 1 from public.checklist_responses r
      where r.id = alerts.response_id and r.performed_by = auth.uid()
    )
  );

create policy alerts_update_close on public.alerts
  for update using (
    public.current_role() = 'admin'
    or (public.is_supervisory() and ward_id = public.current_ward())
    or verified_by = auth.uid()
  );

-- ------------------------------------------------------------
-- behavior_assessment_items — อ้างอิงสาธารณะสำหรับผู้ที่ login
-- ------------------------------------------------------------
create policy assessment_items_select on public.behavior_assessment_items
  for select using (auth.role() = 'authenticated');

-- ------------------------------------------------------------
-- behavior_assessments
-- ------------------------------------------------------------
create policy assessments_select on public.behavior_assessments
  for select using (
    nurse_id = auth.uid()
    or evaluator_id = auth.uid()
    or public.current_role() = 'admin'
    or (public.is_supervisory() and ward_id = public.current_ward())
  );

create policy assessments_insert on public.behavior_assessments
  for insert with check (
    evaluator_id = auth.uid() and public.is_supervisory()
  );

create policy assessments_update on public.behavior_assessments
  for update using (
    evaluator_id = auth.uid() or public.current_role() = 'admin'
  );

-- ------------------------------------------------------------
-- knowledge_tests
-- ------------------------------------------------------------
create policy tests_select on public.knowledge_tests
  for select using (
    nurse_id = auth.uid() or public.is_supervisory()
  );

create policy tests_insert on public.knowledge_tests
  for insert with check (
    nurse_id = auth.uid() or public.current_role() in ('admin','supervisor')
  );

-- ------------------------------------------------------------
-- supervision_feedback
-- ------------------------------------------------------------
create policy feedback_select on public.supervision_feedback
  for select using (
    nurse_id = auth.uid()
    or supervisor_id = auth.uid()
    or public.current_role() = 'admin'
    or (public.is_supervisory() and ward_id = public.current_ward())
  );

create policy feedback_insert on public.supervision_feedback
  for insert with check (
    supervisor_id = auth.uid() and public.is_supervisory()
  );

-- ------------------------------------------------------------
-- audit_log — อ่านได้เฉพาะ admin, เขียนได้ผ่าน security-definer trigger เท่านั้น
-- (ไม่มี insert policy สำหรับผู้ใช้ทั่วไป = ปฏิเสธโดยดีฟอลต์)
-- ------------------------------------------------------------
create policy audit_log_select_admin on public.audit_log
  for select using (public.current_role() = 'admin');
