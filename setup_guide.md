# Comprehensive Setup Guide: Inbox Cleaner

This guide covers everything needed to set up the backend services for Inbox Cleaner: **Supabase**, **Google Cloud**, and **Stripe**.

---

## Part 1: Supabase Setup (Backend & Auth)

Supabase handles user authentication and stores user profiles.

### 1. Create a Project
1.  Go to [Supabase](https://supabase.com/) and sign in.
2.  Click **New Project**.
3.  Name it `inbox-cleaner`.
4.  Set a strong database password (save this!).
5.  Choose a region close to your users.

### 2. Database Schema
We need a table to store user data and premium status.
1.  Go to the **SQL Editor** (sidebar icon with `>_`).
2.  Paste and run this SQL:

```sql
-- Create profiles table
create table public.profiles (
  id uuid references auth.users on delete cascade not null primary key,
  email text,
  is_premium boolean default false,
  stripe_customer_id text,
  created_at timestamp with time zone default timezone('utc'::text, now()) not null
);

-- Enable Row Level Security (RLS)
alter table public.profiles enable row level security;

-- Policies
create policy "Public profiles are viewable by everyone." on public.profiles
  for select using (true);

create policy "Users can insert their own profile." on public.profiles
  for insert with check (auth.uid() = id);

create policy "Users can update own profile." on public.profiles
  for update using (auth.uid() = id);

-- Trigger to auto-create profile on signup
create or replace function public.handle_new_user()
returns trigger as $$
begin
  insert into public.profiles (id, email)
  values (new.id, new.email);
  return new;
end;
$$ language plpgsql security definer;

create trigger on_auth_user_created
  after insert on auth.users
  for each row execute procedure public.handle_new_user();
```

### 3. Get API Credentials
1.  Go to **Project Settings** (gear icon) -> **API**.
2.  Copy the **Project URL**.
3.  Copy the **anon** public key.
4.  **CRITICAL**: Open `src/lib/supabase.js` and replace `YOUR_PROJECT_ID` (in the URL) and `YOUR_ANON_KEY` with these values.
    *   Example URL: `https://abcdefghijklm.supabase.co`
    *   Example Key: `eyJhbGciOiJIUzI1NiIsIn...`

---

## Part 2: Google Cloud Setup (OAuth)

Required for "Sign in with Google".

### 1. Create Project
1.  Go to [Google Cloud Console](https://console.cloud.google.com/).
2.  Create a **New Project** named `Inbox Cleaner`.

### 2. OAuth Consent Screen
1.  Go to **APIs & Services** -> **OAuth consent screen**.
2.  Select **External** and click Create.
3.  **App Information**:
    *   App name: `Inbox Cleaner`
    *   User support email: Your email.
4.  **Authorized Domains**: Add `supabase.co`.
5.  Save and Continue.

### 3. Create Credentials
1.  Go to **Credentials** -> **Create Credentials** -> **OAuth client ID**.
2.  Application type: **Web application**.
3.  Name: `Supabase Auth`.
4.  **Authorized Redirect URIs**:
    *   You need your Supabase Callback URL.
    *   Go to Supabase Dashboard -> **Authentication** -> **Providers** -> **Google**.
    *   Copy the **Callback URL (for OAuth)** (e.g., `https://xyz.supabase.co/auth/v1/callback`).
    *   Paste this into Google Cloud's "Authorized redirect URIs".
5.  Click **Create**.
6.  Copy the **Client ID** and **Client Secret**.

### 4. Link to Supabase
1.  Back in Supabase -> **Authentication** -> **Providers** -> **Google**.
2.  Paste the **Client ID** and **Client Secret**.
3.  **Scopes**: We need to ask for permission to read/modify emails.
    *   Under **Url Parameters** (or "Scopes" in some UI versions), add: `https://www.googleapis.com/auth/gmail.modify`.
    *   *Note: This might be a comma-separated list or a text field depending on the UI.*
4.  Enable the provider and click **Save**.

### 5. Enable Gmail API in Google Cloud
1.  Go back to [Google Cloud Console](https://console.cloud.google.com/).
2.  Go to **APIs & Services** -> **Library**.
3.  Search for "Gmail API".
4.  Click **Enable**.

> **Important**: Because this app accesses sensitive user data (emails), Google will show a "Not Verified" warning on the login screen unless you go through a verification process. For testing, add your email as a **Test User** in **OAuth consent screen**.

---

## Part 3: Stripe Setup (Payments)

Required to charge for "Pro" features.

### 1. Create Account & Product
1.  Go to [Stripe](https://stripe.com/) and sign up.
2.  Go to **Products** -> **Add Product**.
3.  Name: `Inbox Cleaner Pro`.
4.  Price: `$2.99` (or your choice).
5.  Billing period: **Monthly** (Recurring).
6.  Save product.

### 2. Webhook Setup (Connecting Stripe to Supabase)
We need Stripe to tell Supabase when a user pays.

1.  **Supabase Edge Function**:
    *   You'll need to deploy a function to handle webhooks. (This requires Supabase CLI, which is advanced. For a simpler start, you can manually toggle `is_premium` in the database for paid users, or use a no-code tool like Zapier).
    *   **Simpler Path**: Use **Stripe Payment Links**.
        *   Go to your Product -> Create Payment Link.
        *   Set the "After payment" redirect URL to a "Thank You" page (or your extension's landing page).

### 3. Get API Keys
1.  Go to **Developers** -> **API keys**.
2.  Copy the **Publishable key** and **Secret key**.
3.  (If implementing backend) Use these in your Edge Function.

---

## Part 4: Extension Final Config

1.  Open `src/lib/supabase.js`.
2.  Ensure your `SUPABASE_URL` and `SUPABASE_ANON_KEY` are correct.
3.  Run `npm run build`.
4.  Load the `dist` folder into Chrome.
