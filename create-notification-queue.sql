-- Create notification queue table for failed push notifications
CREATE TABLE IF NOT EXISTS notification_queue (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  notification_type VARCHAR(50) NOT NULL,
  notification_data JSONB NOT NULL,
  failed_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  retry_count INTEGER DEFAULT 0,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Add index for efficient user lookups
CREATE INDEX IF NOT EXISTS idx_notification_queue_user_id ON notification_queue(user_id);

-- Add RLS policy
ALTER TABLE notification_queue ENABLE ROW LEVEL SECURITY;

-- Allow users to read their own queued notifications
CREATE POLICY "Users can read own notification queue" ON notification_queue
  FOR SELECT USING (auth.uid() = user_id);

-- Allow service role to manage notification queue
CREATE POLICY "Service role can manage notification queue" ON notification_queue
  FOR ALL USING (auth.jwt() ->> 'role' = 'service_role');