-- Migration: Multi-Device Push Notifications with Global User Preference
-- Run these commands in your Supabase SQL Editor

-- 1. Add global push notification preference to profiles table
ALTER TABLE public.profiles 
ADD COLUMN IF NOT EXISTS push_notifications_enabled BOOLEAN DEFAULT FALSE;

-- 2. Drop the unique constraint to allow multiple devices per user
ALTER TABLE public.push_subscriptions 
DROP CONSTRAINT IF EXISTS push_subscriptions_user_id_key;

-- 3. Add device identifier to push_subscriptions
ALTER TABLE public.push_subscriptions 
ADD COLUMN IF NOT EXISTS device_id TEXT;

-- 4. Add unique constraint for user_id + device_id combination
ALTER TABLE public.push_subscriptions 
ADD CONSTRAINT push_subscriptions_user_device_unique 
UNIQUE(user_id, device_id);

-- 5. Add device_info column to store device details (optional, for debugging)
ALTER TABLE public.push_subscriptions 
ADD COLUMN IF NOT EXISTS device_info JSONB DEFAULT '{}'::JSONB;

-- 6. Update existing push_subscriptions to have a device_id
-- This sets a default device_id for existing subscriptions
UPDATE public.push_subscriptions 
SET device_id = 'default-device-' || SUBSTRING(id::text FROM 1 FOR 8)
WHERE device_id IS NULL;

-- 7. Make device_id NOT NULL after setting defaults
ALTER TABLE public.push_subscriptions 
ALTER COLUMN device_id SET NOT NULL;

-- 8. Create index for faster lookups by user and device
CREATE INDEX IF NOT EXISTS idx_push_subscriptions_user_device 
ON public.push_subscriptions(user_id, device_id);

-- 9. Set existing users with subscriptions to have push_notifications_enabled = true
UPDATE public.profiles 
SET push_notifications_enabled = true 
WHERE id IN (SELECT DISTINCT user_id FROM public.push_subscriptions);