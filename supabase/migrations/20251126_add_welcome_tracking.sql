-- Add has_been_premium column to profiles table
ALTER TABLE public.profiles 
ADD COLUMN IF NOT EXISTS has_been_premium BOOLEAN DEFAULT FALSE;

-- Update existing premium users to have has_been_premium = true
UPDATE public.profiles 
SET has_been_premium = TRUE 
WHERE is_premium = TRUE;
