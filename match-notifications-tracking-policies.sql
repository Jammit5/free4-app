-- Step 3: Enable RLS and create policies
ALTER TABLE public.match_notifications_sent ENABLE ROW LEVEL SECURITY;

-- Drop existing policies if they exist
DROP POLICY IF EXISTS "Users can view own notification records" ON public.match_notifications_sent;
DROP POLICY IF EXISTS "Service role can manage all notification records" ON public.match_notifications_sent;

CREATE POLICY "Users can view own notification records" 
ON public.match_notifications_sent 
FOR SELECT 
USING (auth.uid() = user_id);

CREATE POLICY "Service role can manage all notification records" 
ON public.match_notifications_sent 
FOR ALL 
USING (true)
WITH CHECK (true);