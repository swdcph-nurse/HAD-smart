alter table public.medication_workflows drop constraint if exists medication_workflows_status_check;
alter table public.medication_workflows add constraint medication_workflows_status_check check (status = any (array['pending_review'::text,'correction_required'::text,'pending_re_review'::text,'ready_to_administer'::text,'completed'::text]));

create or replace function public.kiosk_list_pending_events(p_nurse_id uuid)
returns setof jsonb
language sql
security definer
set search_path = public
as $$
  select jsonb_build_object(
    'id',w.id,'status',w.status,'drug_name',d.generic_name,
    'bed_code',w.bed_or_room,'hn',w.hn,'patient_name',w.patient_name,
    'ordered_ratio',w.ordered_ratio,'dose_amount',w.dose_amount,
    'diluent',w.diluent,'diluent_volume',w.diluent_volume,
    'administration_rate_ml_hr',w.administration_rate_ml_hr,
    'nurse1_id',w.nurse1_id,'nurse2_id',w.nurse2_id,
    'correction_note',w.nurse2_review_note,
    'nurse1_correction_ack_at',w.nurse1_correction_ack_at,
    'nurse2_reviewed_at',w.nurse2_reviewed_at
  )
  from public.medication_workflows w
  join public.had_drugs d on d.id=w.drug_id
  where (
    (w.status='pending_review' and w.nurse1_id<>p_nurse_id and w.nurse2_id is null)
    or (w.status='correction_required' and w.nurse1_id=p_nurse_id)
    or (w.status='pending_re_review' and (w.nurse1_id=p_nurse_id or w.nurse2_id=p_nurse_id))
  )
  order by w.created_at;
$$;

create or replace function public.kiosk_submit_assessment(p_event_id uuid, p_nurse1_id uuid, p_nurse2_id uuid, p_answers jsonb)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  v public.medication_workflows%rowtype;
  v_total int:=0;
  v_critical boolean:=true;
  i int;
  iscrit boolean;
  val boolean;
  existing uuid;
begin
  select * into v from public.medication_workflows where id=p_event_id for update;
  if not found then raise exception 'ไม่พบ Medication Event'; end if;
  if v.nurse1_id<>p_nurse1_id or v.nurse2_id<>p_nurse2_id then raise exception 'ข้อมูลพยาบาลไม่ตรงกับรายการ'; end if;
  if p_nurse1_id=p_nurse2_id then raise exception 'พยาบาลคนที่ 1 และ 2 ต้องเป็นคนละคน'; end if;
  if v.status<>'ready_to_administer' then raise exception 'ต้องผ่านการตรวจสอบก่อนประเมิน'; end if;
  if jsonb_typeof(p_answers)<>'array' or jsonb_array_length(p_answers)<>20 then raise exception 'ต้องตอบแบบประเมินครบ 20 ข้อ'; end if;
  for i in 1..20 loop
    val:=coalesce((p_answers->>(i-1))::boolean,false);
    v_total:=v_total+case when val then 1 else 0 end;
    select is_critical into iscrit from public.behavior_assessment_items where item_no=i;
    if coalesce(iscrit,false) and not val then v_critical:=false; end if;
  end loop;
  select id into existing from public.medication_assessment_sessions where workflow_id=p_event_id;
  if existing is null then
    insert into public.medication_assessment_sessions(workflow_id,nurse1_id,nurse2_id,self_scores,self_total,self_critical_passed,self_submitted_at,supervised_scores,supervised_total,supervised_critical_passed,supervised_submitted_at)
    values(p_event_id,p_nurse1_id,p_nurse2_id,p_answers,v_total,v_critical,now(),p_answers,v_total,v_critical,now());
  else
    update public.medication_assessment_sessions set nurse1_id=p_nurse1_id,nurse2_id=p_nurse2_id,self_scores=p_answers,self_total=v_total,self_critical_passed=v_critical,self_submitted_at=now(),supervised_scores=p_answers,supervised_total=v_total,supervised_critical_passed=v_critical,supervised_submitted_at=now(),updated_at=now() where id=existing;
  end if;
  update public.medication_workflows set status='completed',updated_at=now() where id=p_event_id;
  return jsonb_build_object('event_id',p_event_id,'self_total',v_total,'critical_passed',v_critical,'status','completed');
end;
$$;
