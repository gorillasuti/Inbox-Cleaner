
-- Add DELETE policy for unsubscribed_history
create policy "Users can delete their own history" on public.unsubscribed_history
  for delete using (auth.uid() = user_id);
