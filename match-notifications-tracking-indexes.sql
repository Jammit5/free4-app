-- Step 2: Create indexes
CREATE INDEX idx_match_notifications_match_id ON public.match_notifications_sent(match_id);
CREATE INDEX idx_match_notifications_user_id ON public.match_notifications_sent(user_id);