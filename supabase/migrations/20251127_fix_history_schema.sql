-- Add method column if it doesn't exist
do $$
begin
  if not exists (select 1 from information_schema.columns where table_name = 'unsubscribed_history' and column_name = 'method') then
    alter table public.unsubscribed_history add column method text;
  end if;
end $$;
