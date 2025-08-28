-- Add column to track if name has been changed
ALTER TABLE public.profiles 
ADD COLUMN name_changed_at TIMESTAMP WITH TIME ZONE DEFAULT NULL;

-- Add comment for clarity
COMMENT ON COLUMN public.profiles.name_changed_at IS 'Timestamp when user changed their name (can only be done once)';