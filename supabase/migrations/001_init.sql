create extension if not exists pgcrypto;

do $$ begin
  create type public.answer_option as enum ('A','B','C','D');
exception when duplicate_object then null; end $$;

do $$ begin
  create type public.question_status as enum ('draft','active','closed');
exception when duplicate_object then null; end $$;

do $$ begin
  create type public.class_status as enum ('draft','active','completed');
exception when duplicate_object then null; end $$;

create table if not exists public.teachers (
  id uuid primary key references auth.users(id) on delete cascade,
  name text not null,
  email text not null,
  created_at timestamptz not null default now()
);

create table if not exists public.classes (
  id uuid primary key default gen_random_uuid(),
  teacher_id uuid not null references public.teachers(id) on delete cascade,
  class_name text not null,
  start_date date not null,
  end_date date not null,
  status public.class_status not null default 'draft',
  current_day int not null default 1 check (current_day between 1 and 5),
  show_student_results boolean not null default false,
  created_at timestamptz not null default now(),
  constraint class_date_order check (end_date >= start_date)
);

create table if not exists public.groups (
  id uuid primary key default gen_random_uuid(),
  class_id uuid not null references public.classes(id) on delete cascade,
  group_name text not null,
  login_id text not null unique,
  password_hash text not null,
  login_secret_enc text,
  auth_version int not null default 1,
  is_active boolean not null default true,
  last_login_at timestamptz,
  created_at timestamptz not null default now(),
  unique(class_id, group_name)
);

create table if not exists public.class_days (
  id uuid primary key default gen_random_uuid(),
  class_id uuid not null references public.classes(id) on delete cascade,
  day_number int not null check (day_number between 1 and 5),
  date date,
  status text not null default 'pending' check (status in ('pending','active','completed')),
  created_at timestamptz not null default now(),
  unique(class_id, day_number)
);

create table if not exists public.questions (
  id uuid primary key default gen_random_uuid(),
  class_id uuid not null references public.classes(id) on delete cascade,
  class_day_id uuid not null references public.class_days(id) on delete cascade,
  question_number int not null check (question_number > 0),
  correct_option public.answer_option not null,
  status public.question_status not null default 'draft',
  activated_at timestamptz,
  closed_at timestamptz,
  created_at timestamptz not null default now(),
  unique(class_day_id, question_number)
);

create unique index if not exists one_active_question_per_class
  on public.questions(class_id)
  where status = 'active';

create table if not exists public.attempts (
  id uuid primary key default gen_random_uuid(),
  question_id uuid not null references public.questions(id) on delete cascade,
  group_id uuid not null references public.groups(id) on delete cascade,
  selected_option public.answer_option not null,
  attempt_number int not null check (attempt_number between 1 and 4),
  is_correct boolean not null,
  points_awarded int not null default 0 check (points_awarded in (0,1,3,4)),
  created_at timestamptz not null default now(),
  unique(question_id, group_id, selected_option),
  unique(question_id, group_id, attempt_number)
);

create table if not exists public.question_results (
  id uuid primary key default gen_random_uuid(),
  question_id uuid not null references public.questions(id) on delete cascade,
  group_id uuid not null references public.groups(id) on delete cascade,
  attempt_count int not null default 0 check (attempt_count between 0 and 4),
  completed boolean not null default false,
  points int not null default 0 check (points in (0,1,3,4)),
  completed_at timestamptz,
  unique(question_id, group_id)
);

create table if not exists public.class_activity_events (
  id bigint generated always as identity primary key,
  class_id uuid not null references public.classes(id) on delete cascade,
  event_type text not null,
  created_at timestamptz not null default now()
);

create index if not exists attempts_question_group_idx on public.attempts(question_id, group_id);
create index if not exists results_group_idx on public.question_results(group_id);
create index if not exists questions_class_day_idx on public.questions(class_id, class_day_id);
create index if not exists events_class_created_idx on public.class_activity_events(class_id, created_at desc);

create or replace function public.create_five_class_days()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  insert into public.class_days(class_id, day_number, date)
  select new.id, d, new.start_date + (d - 1)
  from generate_series(1,5) d;
  return new;
end;
$$;

drop trigger if exists classes_create_days on public.classes;
create trigger classes_create_days
after insert on public.classes
for each row execute function public.create_five_class_days();

create or replace function public.submit_group_attempt(
  p_question_id uuid,
  p_group_id uuid,
  p_option public.answer_option
)
returns table (
  correct boolean,
  attempt_number int,
  points_earned int,
  completed boolean
)
language plpgsql
security definer
set search_path = public
as $$
declare
  v_question public.questions%rowtype;
  v_group public.groups%rowtype;
  v_existing public.question_results%rowtype;
  v_attempt int;
  v_correct boolean;
  v_points int := 0;
begin
  -- Serialize attempts for this group/question pair.
  perform pg_advisory_xact_lock(hashtextextended(p_question_id::text || ':' || p_group_id::text, 0));

  select * into v_question
  from public.questions
  where id = p_question_id;

  if not found then raise exception 'QUESTION_NOT_FOUND'; end if;
  if v_question.status <> 'active' then raise exception 'QUESTION_NOT_ACTIVE'; end if;

  select * into v_group
  from public.groups
  where id = p_group_id and is_active = true;

  if not found then raise exception 'GROUP_NOT_FOUND_OR_INACTIVE'; end if;
  if v_group.class_id <> v_question.class_id then raise exception 'GROUP_CLASS_MISMATCH'; end if;

  select * into v_existing
  from public.question_results
  where question_id = p_question_id and group_id = p_group_id;

  if found and v_existing.completed then raise exception 'QUESTION_ALREADY_COMPLETED'; end if;

  if exists (
    select 1 from public.attempts
    where question_id = p_question_id
      and group_id = p_group_id
      and selected_option = p_option
  ) then
    raise exception 'OPTION_ALREADY_ATTEMPTED';
  end if;

  select count(*)::int + 1 into v_attempt
  from public.attempts
  where question_id = p_question_id and group_id = p_group_id;

  if v_attempt > 4 then raise exception 'NO_ATTEMPTS_REMAINING'; end if;

  v_correct := (p_option = v_question.correct_option);

  if v_correct then
    v_points := case v_attempt
      when 1 then 4
      when 2 then 3
      when 3 then 1
      else 0
    end;
  end if;

  insert into public.attempts(
    question_id, group_id, selected_option, attempt_number, is_correct, points_awarded
  ) values (
    p_question_id, p_group_id, p_option, v_attempt, v_correct, v_points
  );

  insert into public.question_results(
    question_id, group_id, attempt_count, completed, points, completed_at
  ) values (
    p_question_id, p_group_id, v_attempt, v_correct, v_points,
    case when v_correct then now() else null end
  )
  on conflict (question_id, group_id)
  do update set
    attempt_count = excluded.attempt_count,
    completed = excluded.completed,
    points = excluded.points,
    completed_at = excluded.completed_at;

  insert into public.class_activity_events(class_id, event_type)
  values (v_question.class_id, case when v_correct then 'group_completed_question' else 'attempt_recorded' end);

  return query select v_correct, v_attempt, v_points, v_correct;
end;
$$;

revoke all on function public.submit_group_attempt(uuid, uuid, public.answer_option) from public, anon, authenticated;
grant execute on function public.submit_group_attempt(uuid, uuid, public.answer_option) to service_role;

alter table public.teachers enable row level security;
alter table public.classes enable row level security;
alter table public.groups enable row level security;
alter table public.class_days enable row level security;
alter table public.questions enable row level security;
alter table public.attempts enable row level security;
alter table public.question_results enable row level security;
alter table public.class_activity_events enable row level security;

-- The application server uses the service-role key for protected reads/writes.
-- The only table exposed to anonymous realtime subscribers is the sanitized
-- activity event table. It contains no answers, attempts, group names, or scores.
drop policy if exists "public can read sanitized class events" on public.class_activity_events;
create policy "public can read sanitized class events"
  on public.class_activity_events
  for select
  to anon, authenticated
  using (true);

grant select on public.class_activity_events to anon, authenticated;

-- Supabase Realtime needs this table in the publication.
do $$ begin
  alter publication supabase_realtime add table public.class_activity_events;
exception when duplicate_object then null; end $$;
