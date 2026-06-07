-- Appointment type for private calendar entries (Saudi HR market)

alter table public.calendar_appointments
  add column if not exists appointment_type text not null default 'meeting';

alter table public.calendar_appointments
  drop constraint if exists calendar_appointments_type_check;

alter table public.calendar_appointments
  add constraint calendar_appointments_type_check
  check (
    appointment_type in (
      'meeting',
      'interview',
      'leave',
      'review',
      'training'
    )
  );

create index if not exists calendar_appointments_type_idx
  on public.calendar_appointments (company_id, created_by, appointment_type);
