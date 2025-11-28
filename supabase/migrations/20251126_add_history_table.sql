
-- Create table for tracking unsubscribed history
create table public.unsubscribed_history (
  id uuid not null default gen_random_uuid (),
  user_id uuid not null references auth.users (id) on delete cascade,
  sender_name text not null,
  sender_email text not null,
  unsubscribed_at timestamp with time zone not null default now(),
  method text, -- 'post', 'mailto', 'get'
  constraint unsubscribed_history_pkey primary key (id)
);

-- Enable RLS
alter table public.unsubscribed_history enable row level security;

-- Policies
create policy "Users can view their own history" on public.unsubscribed_history
  for select using (auth.uid() = user_id);

create policy "Users can insert their own history" on public.unsubscribed_history
  for insert with check (auth.uid() = user_id);
