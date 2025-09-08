-- Fix multi-device push subscriptions
-- Remove the unique constraint on user_id to allow multiple devices per user

-- Remove the unique constraint
ALTER TABLE public.push_subscriptions DROP CONSTRAINT IF EXISTS push_subscriptions_user_id_key;

-- Add device_info column to distinguish devices
ALTER TABLE public.push_subscriptions ADD COLUMN IF NOT EXISTS device_info JSONB DEFAULT '{}';

-- Add unique constraint on user_id + endpoint to prevent duplicate subscriptions from same device
ALTER TABLE public.push_subscriptions ADD CONSTRAINT unique_user_endpoint 
UNIQUE (user_id, (subscription->>'endpoint'));

-- Update RLS policies to allow multiple subscriptions per user
DROP POLICY IF EXISTS "Users can manage own push subscriptions" ON public.push_subscriptions;
DROP POLICY IF EXISTS "Service role can read all subscriptions" ON public.push_subscriptions;

-- Recreate policies with multi-device support
CREATE POLICY "Users can manage own push subscriptions" 
ON public.push_subscriptions 
FOR ALL 
USING (auth.uid() = user_id);

CREATE POLICY "Service role can read all subscriptions" 
ON public.push_subscriptions 
FOR SELECT 
USING (auth.role() = 'service_role');