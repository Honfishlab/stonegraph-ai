-- TUS resumable uploads table
-- Enables:
-- - Files > 50MB (bypasses Supabase Storage limit)
-- - Resumable uploads (network interruption recovery)
-- - Progress tracking
-- - Multi-file support

create table public.tus_uploads (
  id uuid primary key default gen_random_uuid(),
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
  status text not null default 'uploading', -- uploading, complete, finalized, error
  memory_id uuid references public.memories(id) on delete set null,
  created_at timestamp with time zone not null default now(),
  updated_at timestamp with time zone not null default now()
);

-- Indexes for performance
create index idx_tus_uploads_user_id on public.tus_uploads(user_id);
create index idx_tus_uploads_status on public.tus_uploads(status);
create index idx_tus_uploads_family_id on public.tus_uploads(family_id);
create index idx_tus_uploads_created_at on public.tus_uploads(created_at desc);

-- RLS policies
alter table public.tus_uploads enable row level security;

-- Users can see their own uploads
create policy "Users can view own uploads"
  on public.tus_uploads for select
  using (auth.uid() = user_id);

-- Users can insert their own uploads
create policy "Users can insert own uploads"
  on public.tus_uploads for insert
  with check (auth.uid() = user_id);

-- Users can update their own uploads
create policy "Users can update own uploads"
  on public.tus_uploads for update
  using (auth.uid() = user_id);

-- Service role can do anything (for finalization)
create policy "Service role full access"
  on public.tus_uploads for all
  using (auth.role() = 'service_role');

-- Updated at trigger
create trigger on_tus_uploads_updated
  before update on public.tus_uploads
  for each row
  execute procedure public.handle_updated_at();
