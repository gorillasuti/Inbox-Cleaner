-- Add onboarding tracking to profiles table
ALTER TABLE profiles 
ADD COLUMN IF NOT EXISTS has_seen_onboarding BOOLEAN DEFAULT FALSE;

-- Create index for faster queries
CREATE INDEX IF NOT EXISTS idx_profiles_onboarding ON profiles(has_seen_onboarding);

-- Comment
COMMENT ON COLUMN profiles.has_seen_onboarding IS 'Tracks whether user has completed the onboarding tutorial';
