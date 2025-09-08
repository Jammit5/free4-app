-- Match Notification Tracking Table
-- This prevents duplicate notifications for the same match

CREATE TABLE public.match_notifications_sent (
    id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
    match_id UUID REFERENCES public.matches(id) ON DELETE CASCADE NOT NULL,
    user_id UUID REFERENCES public.profiles(id) ON DELETE CASCADE NOT NULL,
    sent_at TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc'::text, NOW()) NOT NULL,
    
    -- Ensure one notification per match per user
    UNIQUE(match_id, user_id)
);

-- Create index for faster lookups
CREATE INDEX idx_match_notifications_match_id ON public.match_notifications_sent(match_id);
CREATE INDEX idx_match_notifications_user_id ON public.match_notifications_sent(user_id);

-- Row Level Security (RLS) policies
ALTER TABLE public.match_notifications_sent ENABLE ROW LEVEL SECURITY;

-- Policy: Users can only see their own notification records
CREATE POLICY "Users can view own notification records" 
ON public.match_notifications_sent 
FOR SELECT 
USING (auth.uid() = user_id);

-- Policy: Allow service role to manage all records (for API operations)
CREATE POLICY "Service role can manage all notification records" 
ON public.match_notifications_sent 
FOR ALL 
USING (auth.role() = 'service_role');