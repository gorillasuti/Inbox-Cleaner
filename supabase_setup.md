# Supabase Setup Guide for Inbox Cleaner

Follow these steps to configure your Supabase project for Authentication, User Storage, and Premium Subscriptions.

## 1. Authentication
1.  Go to your Supabase Dashboard -> **Authentication** -> **Providers**.
2.  **Email**: Enable "Email".
    *   Disable "Confirm email" if you want instant access for testing (optional).
3.  **Google**: Enable "Google".
    *   You will need to set up a Google Cloud Project and get the `Client ID` and `Client Secret`.
    *   Add the "Redirect URL" from Supabase to your Google Cloud Console.

## 2. Database (User Profiles)
We need a table to store user details and their premium status.

1.  Go to the **SQL Editor** in Supabase.
2.  Run the following SQL to create the `profiles` table:

```sql
-- Create a table for public profiles
create table profiles (
  id uuid references auth.users on delete cascade not null primary key,
  email text,
  is_premium boolean default false,
  stripe_customer_id text,
  created_at timestamp with time zone default timezone('utc'::text, now()) not null
);

-- Set up Row Level Security (RLS)
alter table profiles enable row level security;

create policy "Public profiles are viewable by everyone." on profiles
  for select using (true);

create policy "Users can insert their own profile." on profiles
  for insert with check (auth.uid() = id);

create policy "Users can update own profile." on profiles
  for update using (auth.uid() = id);
```

## 3. Auto-Create Profile on Signup
Automatically create a profile entry when a new user signs up via Auth.

1.  Run this SQL in the **SQL Editor**:

```sql
-- Function to handle new user creation
create or replace function public.handle_new_user()
returns trigger as $$
begin
  insert into public.profiles (id, email)
  values (new.id, new.email);
  return new;
end;
$$ language plpgsql security definer;

-- Trigger to call the function
create trigger on_auth_user_created
  after insert on auth.users
  for each row execute procedure public.handle_new_user();
```

## 4. Stripe Integration (Overview)
To handle subscriptions:

1.  **Stripe**: Create a Product (e.g., "Inbox Cleaner Pro") and a Price ($2.99).
2.  **Webhook**: You need a backend to listen for Stripe Webhooks (`checkout.session.completed`, `customer.subscription.updated`).
3.  **Supabase Edge Functions**: The easiest way is to use Supabase Edge Functions.
    *   Create a function `stripe-webhook`.
    *   When a payment succeeds, update the `profiles` table: `update profiles set is_premium = true where email = ...`.

## 5. Extension Configuration
1.  Ensure you have copied your **Project URL** and **Anon Key** into `src/lib/supabase.js`.
2.  The extension uses a background worker to handle requests to avoid Gmail's security blocks.
