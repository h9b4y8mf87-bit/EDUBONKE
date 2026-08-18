-- EduBonke pre-pilot hardening
-- 2026-08-18
--
-- Adds traceable application -> student/enrolment conversion without duplicate
-- applicant data entry. The transaction is intentionally database-owned so a
-- partial student/enrolment conversion cannot be committed.

alter table public.students
  add column if not exists source_application_id uuid
  references public.applications(id) on delete restrict;

create unique index if not exists students_source_application_idx
  on public.students(institution_id, source_application_id)
  where source_application_id is not null;

drop trigger if exists tenant_students_source_application_id on public.students;
create trigger tenant_students_source_application_id
  before insert or update of source_application_id on public.students
  for each row execute function public.enforce_tenant_reference('source_application_id','applications');

create or replace function public.enrol_accepted_application(
  p_application_id uuid,
  p_student_number text,
  p_academic_period_id uuid,
  p_class_id uuid,
  p_expected_end_date date
) returns uuid
language plpgsql
security definer
set search_path = public
as $$
declare
  selected_application public.applications%rowtype;
  new_student_id uuid;
begin
  if auth.uid() is null then
    raise exception 'Authentication required';
  end if;

  select *
    into selected_application
    from public.applications
   where id = p_application_id
   for update;

  if selected_application.id is null then
    raise exception 'Application was not found';
  end if;

  if not public.has_institution_role(
    selected_application.institution_id,
    array['college_admin','academic_manager']
  ) then
    raise exception 'You are not authorised to enrol this applicant';
  end if;

  if selected_application.status <> 'accepted' then
    raise exception 'Only accepted applications can be enrolled';
  end if;

  if coalesce(trim(p_student_number), '') = '' then
    raise exception 'A college-issued student number is required';
  end if;

  if p_expected_end_date is null or p_expected_end_date < selected_application.intake_date then
    raise exception 'Expected end date must be on or after the intake date';
  end if;

  if exists (
    select 1
      from public.students
     where institution_id = selected_application.institution_id
       and source_application_id = selected_application.id
  ) then
    raise exception 'This application has already been converted to a student';
  end if;

  if p_class_id is not null and not exists (
    select 1
      from public.classes
     where id = p_class_id
       and institution_id = selected_application.institution_id
       and programme_id = selected_application.programme_id
  ) then
    raise exception 'Selected class does not belong to the accepted programme';
  end if;

  insert into public.students(
    institution_id,
    source_application_id,
    student_number,
    first_name,
    last_name,
    email,
    phone,
    status,
    created_by
  ) values (
    selected_application.institution_id,
    selected_application.id,
    upper(trim(p_student_number)),
    selected_application.first_name,
    selected_application.last_name,
    lower(trim(selected_application.email)),
    selected_application.phone,
    'active',
    auth.uid()
  )
  returning id into new_student_id;

  insert into public.enrolments(
    institution_id,
    student_id,
    programme_id,
    academic_period_id,
    class_id,
    start_date,
    expected_end_date,
    status,
    created_by
  ) values (
    selected_application.institution_id,
    new_student_id,
    selected_application.programme_id,
    p_academic_period_id,
    p_class_id,
    selected_application.intake_date,
    p_expected_end_date,
    'active',
    auth.uid()
  );

  update public.applications
     set reviewed_by = coalesce(reviewed_by, auth.uid()),
         updated_at = now()
   where id = selected_application.id;

  return new_student_id;
end;
$$;

revoke all on function public.enrol_accepted_application(uuid,text,uuid,uuid,date) from public;
grant execute on function public.enrol_accepted_application(uuid,text,uuid,uuid,date) to authenticated;
