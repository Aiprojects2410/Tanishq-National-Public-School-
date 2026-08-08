-- TNPS core workflow migration reference.
-- Applied to the dedicated TNPS Supabase project.

create table if not exists public.notifications (
  id uuid primary key default gen_random_uuid(),
  recipient_id uuid not null references public.profiles(id) on delete cascade,
  title text not null,
  body text not null,
  type text not null default 'info',
  read_at timestamptz,
  created_at timestamptz not null default now()
);

create table if not exists public.leave_requests (
  id uuid primary key default gen_random_uuid(),
  requester_id uuid not null references public.profiles(id) on delete cascade,
  start_date date not null,
  end_date date not null,
  reason text not null,
  status text not null default 'pending' check (status in ('pending','approved','rejected')),
  reviewed_by uuid references public.profiles(id),
  reviewed_at timestamptz,
  created_at timestamptz not null default now()
);

create table if not exists public.classes (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  section text not null default 'A',
  academic_session text,
  active boolean not null default true,
  created_at timestamptz not null default now(),
  unique(name, section, academic_session)
);

-- Public QR lookup returns school-approved identification data only.
-- Aadhaar and private documents are intentionally excluded.
-- The QR itself stores an opaque token, not database UUIDs.

-- Ticket status changes are restricted to the Developer role server-side.
-- Attendance duplicate prevention is enforced by the dedicated attendance RPC/unique constraints.

-- Exam percentage is calculated from marks, never manually supplied by teachers.
