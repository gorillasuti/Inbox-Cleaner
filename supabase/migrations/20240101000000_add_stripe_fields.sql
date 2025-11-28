alter table profiles
add column if not exists stripe_customer_id text,
add column if not exists stripe_subscription_id text,
add column if not exists subscription_status text default 'free',
add column if not exists subscription_end_date timestamptz;

-- Create an index for faster lookups
create index if not exists profiles_stripe_customer_id_idx on profiles(stripe_customer_id);
