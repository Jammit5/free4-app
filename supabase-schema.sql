-- Free4 App Database Schema

-- Enable UUID extension
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- Users table (extends Supabase auth.users)
CREATE TABLE public.profiles (
    id UUID REFERENCES auth.users ON DELETE CASCADE,
    email TEXT NOT NULL,
    full_name TEXT,
    avatar_url TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc'::text, NOW()) NOT NULL,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc'::text, NOW()) NOT NULL,
    PRIMARY KEY (id)
);

-- Friends/Connections table
CREATE TABLE public.friendships (
    id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
    requester_id UUID REFERENCES public.profiles(id) ON DELETE CASCADE NOT NULL,
    addressee_id UUID REFERENCES public.profiles(id) ON DELETE CASCADE NOT NULL,
    status TEXT CHECK (status IN ('pending', 'accepted', 'declined')) DEFAULT 'pending',
    created_at TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc'::text, NOW()) NOT NULL,
    UNIQUE(requester_id, addressee_id)
);

-- Free4 Events table
CREATE TABLE public.free4_events (
    id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
    user_id UUID REFERENCES public.profiles(id) ON DELETE CASCADE NOT NULL,
    title TEXT NOT NULL, -- "Coffee", "Lunch", "Online-Zocken", etc.
    description TEXT,
    start_time TIMESTAMP WITH TIME ZONE NOT NULL,
    end_time TIMESTAMP WITH TIME ZONE NOT NULL,
    location_type TEXT CHECK (location_type IN ('physical', 'online')) DEFAULT 'physical',
    location_name TEXT, -- "Starbucks Mitte" or "Online"
    latitude DECIMAL(10,8), -- NULL for online events
    longitude DECIMAL(11,8), -- NULL for online events
    radius_km INTEGER DEFAULT 1, -- Max travel distance
    visibility TEXT CHECK (visibility IN ('all_friends', 'selected_friends', 'groups', 'overlap_only')) DEFAULT 'all_friends',
    auto_delete_after TIMESTAMP WITH TIME ZONE, -- Auto-generated: end_time + buffer
    created_at TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc'::text, NOW()) NOT NULL,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc'::text, NOW()) NOT NULL
);

-- Event visibility for selected friends
CREATE TABLE public.event_visibility (
    id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
    event_id UUID REFERENCES public.free4_events(id) ON DELETE CASCADE NOT NULL,
    friend_id UUID REFERENCES public.profiles(id) ON DELETE CASCADE NOT NULL,
    UNIQUE(event_id, friend_id)
);

-- Groups for event visibility
CREATE TABLE public.friend_groups (
    id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
    owner_id UUID REFERENCES public.profiles(id) ON DELETE CASCADE NOT NULL,
    name TEXT NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc'::text, NOW()) NOT NULL
);

-- Group memberships
CREATE TABLE public.group_members (
    id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
    group_id UUID REFERENCES public.friend_groups(id) ON DELETE CASCADE NOT NULL,
    friend_id UUID REFERENCES public.profiles(id) ON DELETE CASCADE NOT NULL,
    UNIQUE(group_id, friend_id)
);

-- Event group visibility
CREATE TABLE public.event_group_visibility (
    id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
    event_id UUID REFERENCES public.free4_events(id) ON DELETE CASCADE NOT NULL,
    group_id UUID REFERENCES public.friend_groups(id) ON DELETE CASCADE NOT NULL,
    UNIQUE(event_id, group_id)
);

-- RLS (Row Level Security) Policies
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.friendships ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.free4_events ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.event_visibility ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.friend_groups ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.group_members ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.event_group_visibility ENABLE ROW LEVEL SECURITY;

-- Profiles policies
CREATE POLICY "Public profiles are viewable by everyone" ON public.profiles
    FOR SELECT USING (true);
CREATE POLICY "Users can insert their own profile" ON public.profiles
    FOR INSERT WITH CHECK (auth.uid() = id);
CREATE POLICY "Users can update own profile" ON public.profiles
    FOR UPDATE USING (auth.uid() = id);

-- Friendships policies
CREATE POLICY "Users can view friendships they're part of" ON public.friendships
    FOR SELECT USING (auth.uid() = requester_id OR auth.uid() = addressee_id);
CREATE POLICY "Users can create friendship requests" ON public.friendships
    FOR INSERT WITH CHECK (auth.uid() = requester_id);
CREATE POLICY "Users can update friendship status" ON public.friendships
    FOR UPDATE USING (auth.uid() = addressee_id OR auth.uid() = requester_id);

-- Free4 Events policies
CREATE POLICY "Users can view their own events" ON public.free4_events
    FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Users can insert their own events" ON public.free4_events
    FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users can update their own events" ON public.free4_events
    FOR UPDATE USING (auth.uid() = user_id);
CREATE POLICY "Users can delete their own events" ON public.free4_events
    FOR DELETE USING (auth.uid() = user_id);

-- Functions for automatic cleanup
CREATE OR REPLACE FUNCTION delete_expired_events()
RETURNS void AS $$
BEGIN
    DELETE FROM public.free4_events 
    WHERE auto_delete_after < NOW();
END;
$$ LANGUAGE plpgsql;

-- Trigger to set auto_delete_after
CREATE OR REPLACE FUNCTION set_auto_delete_time()
RETURNS TRIGGER AS $$
BEGIN
    NEW.auto_delete_after = NEW.end_time + INTERVAL '1 hour';
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER set_auto_delete_trigger
    BEFORE INSERT OR UPDATE ON public.free4_events
    FOR EACH ROW EXECUTE FUNCTION set_auto_delete_time();

-- Update updated_at timestamps
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = TIMEZONE('utc'::text, NOW());
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER update_profiles_updated_at BEFORE UPDATE ON public.profiles
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_events_updated_at BEFORE UPDATE ON public.free4_events
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();