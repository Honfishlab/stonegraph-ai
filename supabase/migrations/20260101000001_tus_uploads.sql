-- Create the reusable trigger function first
create or replace function handle_updated_at()
returns trigger as $$
begin
  new.updated_at = now();
  return new;
end;
$$ language plpgsql;

-- TUS resumable uploads table
create table if not exists public.tus_uploads (
  id uuid primary key,
  user_id uuid not null references auth.users(id) on delete cascade,
  family_id uuid not null,
  file_name text not null,
  file_size bigint not null,
  file_type text not null,
  bytes_uploaded bigint not null default 0,
  title text not null,
  description text,
  memory_type text not null default 'photo',
  metadata jsonb,
  status text not null default 'uploading',
  memory_id uuid references public.memories(id) on delete set null,
  created_at timestamp with time zone not null default now(),
  updated_at timestamp with time zone not null default now()
);

create index if not exists idx_tus_uploads_user_id on public.tus_uploads(user_id);
create index if not exists idx_tus_uploads_status on public.tus_uploads(status);
create index if not exists idx_tus_uploads_family_id on public.tus_uploads(family_id);

alter table public.tus_uploads enable row level security;

-- Drop existing policies if any, then recreate
drop policy if exists "Users can view own uploads" on public.tus_uploads;
drop policy if exists "Users can insert own uploads" on public.tus_uploads;
drop policy if exists "Users can update own uploads" on public.tus_uploads;
drop policy if exists "Service role full access" on public.tus_uploads;

create policy "Users can view own uploads"
  on public.tus_uploads for select
  using (auth.uid() = user_id);

create policy "Users can insert own uploads"
  on public.tus_uploads for insert
  with check (auth.uid() = user_id);

create policy "Users can update own uploads"
  on public.tus_uploads for update
  using (auth.uid() = user_id);

create policy "Service role full access"
  on public.tus_uploads for all
  using (auth.role() = 'service_role');

-- Add trigger if not exists
drop trigger if exists on_tus_uploads_updated on public.tus_uploads;
create trigger on_tus_uploads_updated
  before update on public.tus_uploads
  for each row
  execute procedure handle_updated_at();

-- Verify
select 'tus_uploads' as table_name, count(*) as row_count from tus_uploads;
