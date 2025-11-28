-- Create bug_reports table
create table if not exists public.bug_reports (
  id uuid default gen_random_uuid() primary key,
  user_id uuid references auth.users(id) on delete cascade not null,
  type text not null, -- 'bug', 'feature', 'other'
  description text not null,
  metadata jsonb default '{}'::jsonb, -- browser info, app version, etc.
  created_at timestamp with time zone default timezone('utc'::text, now()) not null,
  status text default 'open' -- 'open', 'in_progress', 'resolved', 'closed'
);

-- Enable RLS
alter table public.bug_reports enable row level security;

-- Policies
create policy "Users can insert their own bug reports"
  on public.bug_reports for insert
  with check (auth.uid() = user_id);

create policy "Users can view their own bug reports"
  on public.bug_reports for select
  using (auth.uid() = user_id);
