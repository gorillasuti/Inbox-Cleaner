-- Add cancel_at_period_end column to profiles table
ALTER TABLE public.profiles 
ADD COLUMN IF NOT EXISTS cancel_at_period_end BOOLEAN DEFAULT FALSE;

-- Update existing records to have a default value
UPDATE public.profiles 
SET cancel_at_period_end = FALSE 
WHERE cancel_at_period_end IS NULL;
