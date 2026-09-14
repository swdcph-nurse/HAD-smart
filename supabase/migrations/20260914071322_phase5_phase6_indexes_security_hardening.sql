-- Performance indexes for the assessment and alert workflows.
create index if not exists idx_behavior_assessments_evaluator on public.behavior_assessments(evaluator_id);
create index if not exists idx_supervision_feedback_supervisor on public.supervision_feedback(supervisor_id);
create index if not exists idx_knowledge_tests_nurse_type_taken on public.knowledge_tests(nurse_id, test_type, taken_at desc);

-- Harden the generic timestamp trigger function against search_path manipulation.
alter function public.set_updated_at() set search_path = public;
