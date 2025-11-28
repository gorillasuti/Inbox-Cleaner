-- Create a function to allow users to delete their own account
create or replace function delete_own_user()
returns void
language plpgsql
security definer
as $$
begin
  delete from auth.users
  where id = auth.uid();
end;
$$;

-- Grant execute permission to authenticated users
grant execute on function delete_own_user to authenticated;
