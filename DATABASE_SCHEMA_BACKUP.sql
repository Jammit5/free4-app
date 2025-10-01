-- Free4 App - Complete Database Schema Backup
-- This file contains all table definitions, indexes, and RLS policies
-- Use this to recreate the database structure if needed

-- =====================================================
-- PROFILES TABLE (extends auth.users)
-- =====================================================

CREATE TABLE profiles (
    id uuid REFERENCES auth.users(id) ON DELETE CASCADE PRIMARY KEY,
    email text,
    full_name text,
    avatar_url text,
    phone_number text,
    phone_consent boolean DEFAULT false,
    latitude double precision,
    longitude double precision,
    location_name text,
    push_notifications_enabled boolean DEFAULT true,
    created_at timestamp with time zone DEFAULT timezone('utc'::text, now()) NOT NULL,
    updated_at timestamp with time zone DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- RLS Policies for profiles
ALTER TABLE profiles ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own profile" ON profiles
    FOR SELECT USING (auth.uid() = id);

CREATE POLICY "Users can update own profile" ON profiles
    FOR UPDATE USING (auth.uid() = id);

CREATE POLICY "Users can insert own profile" ON profiles
    FOR INSERT WITH CHECK (auth.uid() = id);

-- =====================================================
-- FREE4_EVENTS TABLE
-- =====================================================

CREATE TABLE free4_events (
    id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
    user_id uuid REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
    title text NOT NULL,
    start_time timestamp with time zone NOT NULL,
    end_time timestamp with time zone NOT NULL,
    latitude double precision NOT NULL,
    longitude double precision NOT NULL,
    location_name text,
    radius_km integer DEFAULT 5 NOT NULL,
    created_at timestamp with time zone DEFAULT timezone('utc'::text, now()) NOT NULL,
    updated_at timestamp with time zone DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- Indexes for performance
CREATE INDEX idx_free4_events_user_id ON free4_events(user_id);
CREATE INDEX idx_free4_events_start_time ON free4_events(start_time);
CREATE INDEX idx_free4_events_end_time ON free4_events(end_time);
CREATE INDEX idx_free4_events_location ON free4_events(latitude, longitude);

-- RLS Policies for free4_events
ALTER TABLE free4_events ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own events" ON free4_events
    FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own events" ON free4_events
    FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own events" ON free4_events
    FOR UPDATE USING (auth.uid() = user_id);

CREATE POLICY "Users can delete own events" ON free4_events
    FOR DELETE USING (auth.uid() = user_id);

-- Policy to allow friends to see each other's events for matching
CREATE POLICY "Friends can view each other's events" ON free4_events
    FOR SELECT USING (
        EXISTS (
            SELECT 1 FROM friendships
            WHERE (user_id = auth.uid() AND friend_id = free4_events.user_id AND status = 'accepted')
            OR (friend_id = auth.uid() AND user_id = free4_events.user_id AND status = 'accepted')
        )
    );

-- =====================================================
-- MATCHES TABLE
-- =====================================================

CREATE TABLE matches (
    id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
    user_free4_id uuid REFERENCES free4_events(id) ON DELETE CASCADE NOT NULL,
    matched_free4_id uuid REFERENCES free4_events(id) ON DELETE CASCADE NOT NULL,
    time_overlap_minutes integer NOT NULL,
    distance_km double precision NOT NULL,
    meeting_point_lat double precision NOT NULL,
    meeting_point_lng double precision NOT NULL,
    score integer NOT NULL,
    created_at timestamp with time zone DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- Indexes for performance
CREATE INDEX idx_matches_user_free4_id ON matches(user_free4_id);
CREATE INDEX idx_matches_matched_free4_id ON matches(matched_free4_id);
CREATE INDEX idx_matches_created_at ON matches(created_at);

-- Unique constraint to prevent duplicate matches
CREATE UNIQUE INDEX idx_matches_unique_pair ON matches(
    LEAST(user_free4_id, matched_free4_id),
    GREATEST(user_free4_id, matched_free4_id)
);

-- RLS Policies for matches
ALTER TABLE matches ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view matches involving their events" ON matches
    FOR SELECT USING (
        EXISTS (
            SELECT 1 FROM free4_events
            WHERE (free4_events.id = matches.user_free4_id OR free4_events.id = matches.matched_free4_id)
            AND free4_events.user_id = auth.uid()
        )
    );

-- =====================================================
-- FRIENDSHIPS TABLE
-- =====================================================

CREATE TABLE friendships (
    id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
    user_id uuid REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
    friend_id uuid REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
    status text DEFAULT 'pending' NOT NULL CHECK (status IN ('pending', 'accepted', 'declined')),
    created_at timestamp with time zone DEFAULT timezone('utc'::text, now()) NOT NULL,
    updated_at timestamp with time zone DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- Indexes for performance
CREATE INDEX idx_friendships_user_id ON friendships(user_id);
CREATE INDEX idx_friendships_friend_id ON friendships(friend_id);
CREATE INDEX idx_friendships_status ON friendships(status);

-- Unique constraint to prevent duplicate friendship requests
CREATE UNIQUE INDEX idx_friendships_unique_pair ON friendships(
    LEAST(user_id, friend_id),
    GREATEST(user_id, friend_id)
);

-- RLS Policies for friendships
ALTER TABLE friendships ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view friendships involving them" ON friendships
    FOR SELECT USING (auth.uid() = user_id OR auth.uid() = friend_id);

CREATE POLICY "Users can create friendship requests" ON friendships
    FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update friendships involving them" ON friendships
    FOR UPDATE USING (auth.uid() = user_id OR auth.uid() = friend_id);

-- =====================================================
-- PUSH_SUBSCRIPTIONS TABLE
-- =====================================================

CREATE TABLE push_subscriptions (
    id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
    user_id uuid REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
    endpoint text NOT NULL,
    p256dh text NOT NULL,
    auth text NOT NULL,
    created_at timestamp with time zone DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- Indexes for performance
CREATE INDEX idx_push_subscriptions_user_id ON push_subscriptions(user_id);
CREATE UNIQUE INDEX idx_push_subscriptions_endpoint ON push_subscriptions(endpoint);

-- RLS Policies for push_subscriptions
ALTER TABLE push_subscriptions ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own push subscriptions" ON push_subscriptions
    FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own push subscriptions" ON push_subscriptions
    FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own push subscriptions" ON push_subscriptions
    FOR UPDATE USING (auth.uid() = user_id);

CREATE POLICY "Users can delete own push subscriptions" ON push_subscriptions
    FOR DELETE USING (auth.uid() = user_id);

-- =====================================================
-- NOTIFICATION_QUEUE TABLE
-- =====================================================

CREATE TABLE notification_queue (
    id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
    user_id uuid REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
    notification_type text NOT NULL,
    notification_data jsonb NOT NULL,
    retry_count integer DEFAULT 0 NOT NULL,
    created_at timestamp with time zone DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- Indexes for performance
CREATE INDEX idx_notification_queue_user_id ON notification_queue(user_id);
CREATE INDEX idx_notification_queue_created_at ON notification_queue(created_at);
CREATE INDEX idx_notification_queue_type ON notification_queue(notification_type);

-- RLS Policies for notification_queue
ALTER TABLE notification_queue ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own notification queue" ON notification_queue
    FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own notifications" ON notification_queue
    FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can delete own notifications" ON notification_queue
    FOR DELETE USING (auth.uid() = user_id);

-- =====================================================
-- STORAGE CONFIGURATION
-- =====================================================

-- Create avatars bucket
INSERT INTO storage.buckets (id, name, public)
VALUES ('avatars', 'avatars', true);

-- RLS Policies for avatars storage
CREATE POLICY "Avatar images are publicly accessible" ON storage.objects
    FOR SELECT USING (bucket_id = 'avatars');

CREATE POLICY "Users can upload their own avatar" ON storage.objects
    FOR INSERT WITH CHECK (bucket_id = 'avatars' AND auth.uid()::text = (storage.foldername(name))[1]);

CREATE POLICY "Users can update their own avatar" ON storage.objects
    FOR UPDATE USING (bucket_id = 'avatars' AND auth.uid()::text = (storage.foldername(name))[1]);

CREATE POLICY "Users can delete their own avatar" ON storage.objects
    FOR DELETE USING (bucket_id = 'avatars' AND auth.uid()::text = (storage.foldername(name))[1]);

-- =====================================================
-- FUNCTIONS AND TRIGGERS
-- =====================================================

-- Function to update updated_at timestamp
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = timezone('utc'::text, now());
    RETURN NEW;
END;
$$ language 'plpgsql';

-- Triggers for updated_at
CREATE TRIGGER update_profiles_updated_at
    BEFORE UPDATE ON profiles
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_free4_events_updated_at
    BEFORE UPDATE ON free4_events
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_friendships_updated_at
    BEFORE UPDATE ON friendships
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

-- =====================================================
-- REALTIME CONFIGURATION
-- =====================================================

-- Enable realtime for matches table (for dashboard updates)
ALTER PUBLICATION supabase_realtime ADD TABLE matches;

-- =====================================================
-- ADMIN USERS CONFIGURATION
-- =====================================================

-- Note: Admin users are defined in code as:
-- jammit@gmail.com (production)
-- decapitaro@hotmail.com (development)

-- =====================================================
-- IMPORTANT NOTES FOR RESTORATION
-- =====================================================

/*
1. This schema assumes Supabase auth is properly configured
2. All tables have RLS enabled for security
3. The profiles table is automatically populated via trigger when users sign up
4. Push subscriptions are managed by the application
5. Storage bucket 'avatars' must be created manually in Supabase dashboard
6. Realtime subscriptions require publication to be enabled
7. Admin access is controlled by email addresses in the application code

For complete restoration:
1. Run this SQL in Supabase SQL Editor
2. Create the 'avatars' storage bucket
3. Configure authentication providers in Supabase auth settings
4. Verify RLS policies are active
5. Test with a user registration to ensure triggers work
*/