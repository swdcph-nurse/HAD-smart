-- ============================================================
-- 0002_alert_engine.sql
-- ตรรกะคำนวณระดับ Alert อัตโนมัติจาก checklist_responses
-- แดง = ข้อวิกฤตไม่ผ่าน / ส้ม = ข้อทั่วไปไม่ผ่าน /
-- เหลือง = มีข้อที่ยังไม่ตอบ / เขียว = ครบถ้วนสมบูรณ์
-- ============================================================

alter table public.checklist_responses
  add column computed_level text check (computed_level in ('red','orange','yellow','green')),
  add column triggered_items jsonb not null default '[]'::jsonb;

-- ------------------------------------------------------------
-- ฟังก์ชันประเมินผลก่อนบันทึก (BEFORE INSERT/UPDATE)
-- กำหนด status / computed_level / triggered_items ให้แถวนั้น
-- ------------------------------------------------------------
create or replace function public.evaluate_checklist_response()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  v_item record;
  v_val jsonb;
  v_has_critical_fail boolean := false;
  v_has_normal_fail boolean := false;
  v_has_missing boolean := false;
  v_triggered jsonb := '[]'::jsonb;
begin
  for v_item in
    select id, is_critical
    from public.checklist_items
    where template_id = new.template_id
  loop
    v_val := new.responses -> v_item.id::text;

    if v_val is null then
      v_has_missing := true;
      if v_item.is_critical then
        v_has_critical_fail := true;
      end if;
      v_triggered := v_triggered || to_jsonb(v_item.id::text);
    elsif not (v_val)::boolean then
      v_triggered := v_triggered || to_jsonb(v_item.id::text);
      if v_item.is_critical then
        v_has_critical_fail := true;
      else
        v_has_normal_fail := true;
      end if;
    end if;
  end loop;

  if v_has_critical_fail then
    new.computed_level := 'red';
  elsif v_has_normal_fail then
    new.computed_level := 'orange';
  elsif v_has_missing then
    new.computed_level := 'yellow';
  else
    new.computed_level := 'green';
  end if;

  new.triggered_items := v_triggered;
  new.status := case when new.computed_level = 'green' then 'closed' else 'alert' end;

  return new;
end;
$$;

create trigger trg_evaluate_checklist_response
  before insert or update of responses on public.checklist_responses
  for each row execute function public.evaluate_checklist_response();

-- ------------------------------------------------------------
-- ฟังก์ชันสร้างแถว alerts อัตโนมัติหลังบันทึก (AFTER INSERT)
-- สร้างเฉพาะตอนสร้าง response ใหม่ที่ไม่ใช่ระดับ green
-- การ "ปิด Alert" เป็นการกระทำที่ต้องยืนยันโดยผู้ใช้ (ดู 0003 RLS)
-- ------------------------------------------------------------
create or replace function public.create_alert_from_response()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  if new.computed_level is distinct from 'green' then
    insert into public.alerts (response_id, ward_id, level, triggered_items)
    values (new.id, new.ward_id, new.computed_level, new.triggered_items);
  end if;
  return new;
end;
$$;

create trigger trg_create_alert_from_response
  after insert on public.checklist_responses
  for each row execute function public.create_alert_from_response();

-- ------------------------------------------------------------
-- เมื่อปิด Alert (closed_at ถูกตั้งค่า) ให้ปรับสถานะ response กลับเป็น closed
-- ------------------------------------------------------------
create or replace function public.on_alert_closed()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  if new.closed_at is not null and old.closed_at is null then
    update public.checklist_responses
    set status = 'closed'
    where id = new.response_id;

    insert into public.audit_log (actor_id, action, entity_table, entity_id, detail)
    values (
      new.closed_by,
      'close_alert',
      'alerts',
      new.id,
      jsonb_build_object('level', new.level, 'corrective_action', new.corrective_action)
    );
  end if;
  return new;
end;
$$;

create trigger trg_on_alert_closed
  after update of closed_at on public.alerts
  for each row execute function public.on_alert_closed();
