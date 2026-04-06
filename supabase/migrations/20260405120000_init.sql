-- ============================================================
-- KANBAN BOARD — FULL SCHEMA WITH RLS
-- ============================================================

create extension if not exists "pgcrypto";

-- ──────────────────────────────────────────────────────────
-- MEMBERS
-- ──────────────────────────────────────────────────────────
create table if not exists public.members (
  id              uuid primary key default gen_random_uuid(),
  user_id         uuid not null references auth.users(id) on delete cascade,
  name            text not null,
  email           text,
  avatar_color    text not null,
  avatar_initials text not null,
  created_at      timestamptz not null default now()
);

alter table public.members
  add column if not exists user_id uuid references auth.users(id) on delete cascade;

create index if not exists members_user_id_idx on public.members(user_id);

alter table public.members enable row level security;

drop policy if exists "Members are viewable by everyone" on public.members;
drop policy if exists "Authenticated users can insert members" on public.members;
drop policy if exists "Users can view their own members" on public.members;
drop policy if exists "Users can insert their own members" on public.members;
drop policy if exists "Users can update their own members" on public.members;
drop policy if exists "Users can delete their own members" on public.members;

create policy "Users can view their own members"
  on public.members for select
  using (auth.uid() = user_id);

create policy "Users can insert their own members"
  on public.members for insert
  with check (auth.uid() = user_id);

create policy "Users can update their own members"
  on public.members for update
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);

create policy "Users can delete their own members"
  on public.members for delete
  using (auth.uid() = user_id);

-- ──────────────────────────────────────────────────────────
-- LABELS
-- ──────────────────────────────────────────────────────────
create table if not exists public.labels (
  id         uuid primary key default gen_random_uuid(),
  user_id    uuid not null references auth.users(id) on delete cascade,
  name       text not null,
  color      text not null,
  created_at timestamptz not null default now()
);

alter table public.labels
  add column if not exists user_id uuid references auth.users(id) on delete cascade;

create index if not exists labels_user_id_idx on public.labels(user_id);

alter table public.labels enable row level security;

drop policy if exists "Labels are viewable by everyone" on public.labels;
drop policy if exists "Authenticated users can manage labels" on public.labels;
drop policy if exists "Users can view their own labels" on public.labels;
drop policy if exists "Users can insert their own labels" on public.labels;
drop policy if exists "Users can update their own labels" on public.labels;
drop policy if exists "Users can delete their own labels" on public.labels;

create policy "Users can view their own labels"
  on public.labels for select
  using (auth.uid() = user_id);

create policy "Users can insert their own labels"
  on public.labels for insert
  with check (auth.uid() = user_id);

create policy "Users can update their own labels"
  on public.labels for update
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);

create policy "Users can delete their own labels"
  on public.labels for delete
  using (auth.uid() = user_id);

-- ──────────────────────────────────────────────────────────
-- TASKS
-- ──────────────────────────────────────────────────────────
create table if not exists public.tasks (
  id           uuid primary key default gen_random_uuid(),
  title        text not null,
  description  text,
  status       text not null default 'todo'
                 check (status in ('todo', 'in_progress', 'in_review', 'done')),
  priority     text not null default 'normal'
                 check (priority in ('low', 'normal', 'high')),
  due_date     date,
  assignee_id  uuid references public.members(id) on delete set null,
  user_id      uuid not null references auth.users(id) on delete cascade,
  position     float8 not null default 0,
  created_at   timestamptz not null default now(),
  updated_at   timestamptz not null default now()
);

create index if not exists tasks_user_id_idx on public.tasks(user_id);
create index if not exists tasks_status_idx on public.tasks(status);

alter table public.tasks enable row level security;

drop policy if exists "Users see only their own tasks" on public.tasks;
drop policy if exists "Users can insert their own tasks" on public.tasks;
drop policy if exists "Users can update their own tasks" on public.tasks;
drop policy if exists "Users can delete their own tasks" on public.tasks;

create policy "Users see only their own tasks"
  on public.tasks for select
  using (auth.uid() = user_id);

create policy "Users can insert their own tasks"
  on public.tasks for insert
  with check (auth.uid() = user_id);

create policy "Users can update their own tasks"
  on public.tasks for update
  using (auth.uid() = user_id);

create policy "Users can delete their own tasks"
  on public.tasks for delete
  using (auth.uid() = user_id);

-- ──────────────────────────────────────────────────────────
-- TASK_ASSIGNEES (multi-assignee junction)
-- ──────────────────────────────────────────────────────────
create table if not exists public.task_assignees (
  task_id     uuid not null references public.tasks(id) on delete cascade,
  member_id   uuid not null references public.members(id) on delete cascade,
  created_at  timestamptz not null default now(),
  primary key (task_id, member_id)
);

create index if not exists task_assignees_task_id_idx on public.task_assignees(task_id);
create index if not exists task_assignees_member_id_idx on public.task_assignees(member_id);

alter table public.task_assignees enable row level security;

drop policy if exists "Task assignees follow task ownership" on public.task_assignees;

create policy "Task assignees follow task ownership"
  on public.task_assignees for all
  using (
    exists (select 1 from public.tasks t where t.id = task_id and t.user_id = auth.uid())
    and exists (select 1 from public.members m where m.id = member_id and m.user_id = auth.uid())
  )
  with check (
    exists (select 1 from public.tasks t where t.id = task_id and t.user_id = auth.uid())
    and exists (select 1 from public.members m where m.id = member_id and m.user_id = auth.uid())
  );

insert into public.task_assignees (task_id, member_id)
select id, assignee_id
from public.tasks
where assignee_id is not null
on conflict do nothing;

-- ──────────────────────────────────────────────────────────
-- TASK_LABELS (junction)
-- ──────────────────────────────────────────────────────────
create table if not exists public.task_labels (
  task_id  uuid not null references public.tasks(id) on delete cascade,
  label_id uuid not null references public.labels(id) on delete cascade,
  primary key (task_id, label_id)
);

alter table public.task_labels enable row level security;

drop policy if exists "Task labels follow task ownership" on public.task_labels;

create policy "Task labels follow task ownership"
  on public.task_labels for all
  using (
    exists (select 1 from public.tasks t where t.id = task_id and t.user_id = auth.uid())
    and exists (select 1 from public.labels l where l.id = label_id and l.user_id = auth.uid())
  )
  with check (
    exists (select 1 from public.tasks t where t.id = task_id and t.user_id = auth.uid())
    and exists (select 1 from public.labels l where l.id = label_id and l.user_id = auth.uid())
  );

-- ──────────────────────────────────────────────────────────
-- COMMENTS
-- ──────────────────────────────────────────────────────────
create table if not exists public.comments (
  id          uuid primary key default gen_random_uuid(),
  task_id     uuid not null references public.tasks(id) on delete cascade,
  user_id     uuid not null references auth.users(id) on delete cascade,
  content     text not null,
  author_name text,
  created_at  timestamptz not null default now()
);

create index if not exists comments_task_id_idx on public.comments(task_id);

alter table public.comments enable row level security;

drop policy if exists "Users can read comments on their tasks" on public.comments;
drop policy if exists "Users can add comments to their tasks" on public.comments;

create policy "Users can read comments on their tasks"
  on public.comments for select
  using (
    exists (select 1 from public.tasks t where t.id = task_id and t.user_id = auth.uid())
  );

create policy "Users can add comments to their tasks"
  on public.comments for insert
  with check (
    auth.uid() = user_id
    and exists (select 1 from public.tasks t where t.id = task_id and t.user_id = auth.uid())
  );

-- ──────────────────────────────────────────────────────────
-- ATTACHMENTS (stub — for count display)
-- ──────────────────────────────────────────────────────────
create table if not exists public.attachments (
  id         uuid primary key default gen_random_uuid(),
  task_id    uuid not null references public.tasks(id) on delete cascade,
  user_id    uuid not null references auth.users(id) on delete cascade,
  name       text not null,
  url        text not null,
  created_at timestamptz not null default now()
);

alter table public.attachments enable row level security;

drop policy if exists "Users see attachments on their tasks" on public.attachments;

create policy "Users see attachments on their tasks"
  on public.attachments for select
  using (
    exists (select 1 from public.tasks t where t.id = task_id and t.user_id = auth.uid())
  );

-- ──────────────────────────────────────────────────────────
-- ACTIVITY LOGS
-- ──────────────────────────────────────────────────────────
create table if not exists public.activity_logs (
  id         uuid primary key default gen_random_uuid(),
  task_id    uuid not null references public.tasks(id) on delete cascade,
  user_id    uuid not null references auth.users(id) on delete cascade,
  action     text not null,
  field_name text,
  old_value  text,
  new_value  text,
  created_at timestamptz not null default now()
);

create index if not exists activity_logs_task_id_idx on public.activity_logs(task_id);

alter table public.activity_logs enable row level security;

drop policy if exists "Users see activity on their tasks" on public.activity_logs;
drop policy if exists "Users can log activity on their tasks" on public.activity_logs;

create policy "Users see activity on their tasks"
  on public.activity_logs for select
  using (
    exists (select 1 from public.tasks t where t.id = task_id and t.user_id = auth.uid())
  );

create policy "Users can log activity on their tasks"
  on public.activity_logs for insert
  with check (
    auth.uid() = user_id
    and exists (select 1 from public.tasks t where t.id = task_id and t.user_id = auth.uid())
  );

-- ──────────────────────────────────────────────────────────
-- REALTIME (enable for live updates)
-- ──────────────────────────────────────────────────────────
do $$
begin
  if not exists (
    select 1
    from pg_publication_tables
    where pubname = 'supabase_realtime'
      and schemaname = 'public'
      and tablename = 'tasks'
  ) then
    alter publication supabase_realtime add table public.tasks;
  end if;

  if not exists (
    select 1
    from pg_publication_tables
    where pubname = 'supabase_realtime'
      and schemaname = 'public'
      and tablename = 'comments'
  ) then
    alter publication supabase_realtime add table public.comments;
  end if;
end
$$;
