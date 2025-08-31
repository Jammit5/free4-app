-- Server-side matching system for Free4 app
-- This table stores pre-calculated matches between Free4 entries

CREATE TABLE IF NOT EXISTS matches (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    
    -- Match participants
    user_free4_id UUID NOT NULL REFERENCES free4_events(id) ON DELETE CASCADE,
    matched_free4_id UUID NOT NULL REFERENCES free4_events(id) ON DELETE CASCADE,
    
    -- Match metadata
    match_score DECIMAL(5,2) NOT NULL, -- 0.00 to 100.00
    overlap_start TIMESTAMP WITH TIME ZONE NOT NULL,
    overlap_end TIMESTAMP WITH TIME ZONE NOT NULL,
    overlap_duration_minutes INTEGER NOT NULL,
    
    -- Geospatial data
    distance_km DECIMAL(6,2) NOT NULL,
    meeting_point_lat DECIMAL(10,8),
    meeting_point_lng DECIMAL(11,8),
    
    -- Match status
    status VARCHAR(20) DEFAULT 'active' CHECK (status IN ('active', 'expired', 'dismissed')),
    
    -- Timestamps
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    
    -- Constraints
    CONSTRAINT matches_unique_pair UNIQUE(user_free4_id, matched_free4_id),
    CONSTRAINT matches_no_self_match CHECK (user_free4_id != matched_free4_id)
);

-- Indexes for performance
CREATE INDEX IF NOT EXISTS idx_matches_user_free4_id ON matches(user_free4_id);
CREATE INDEX IF NOT EXISTS idx_matches_matched_free4_id ON matches(matched_free4_id);
CREATE INDEX IF NOT EXISTS idx_matches_status ON matches(status);
CREATE INDEX IF NOT EXISTS idx_matches_match_score ON matches(match_score DESC);
CREATE INDEX IF NOT EXISTS idx_matches_created_at ON matches(created_at DESC);

-- RLS (Row Level Security) policies
ALTER TABLE matches ENABLE ROW LEVEL SECURITY;

-- Users can only see matches for their own Free4s
CREATE POLICY "Users can view their own matches" ON matches
    FOR SELECT
    USING (
        user_free4_id IN (
            SELECT id FROM free4_events WHERE user_id = auth.uid()
        )
    );

-- Function to automatically update updated_at timestamp
CREATE OR REPLACE FUNCTION update_matches_updated_at()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Trigger for updated_at
DROP TRIGGER IF EXISTS trigger_update_matches_updated_at ON matches;
CREATE TRIGGER trigger_update_matches_updated_at
    BEFORE UPDATE ON matches
    FOR EACH ROW
    EXECUTE FUNCTION update_matches_updated_at();

-- View for easier querying with user data
CREATE OR REPLACE VIEW match_details AS
SELECT 
    m.*,
    -- User Free4 data
    uf.title as user_title,
    uf.start_time as user_start_time,
    uf.end_time as user_end_time,
    uf.location_name as user_location_name,
    uf.latitude as user_latitude,
    uf.longitude as user_longitude,
    uf.radius_km as user_radius_km,
    up.full_name as user_name,
    up.avatar_url as user_avatar_url,
    
    -- Matched Free4 data
    mf.title as matched_title,
    mf.start_time as matched_start_time,
    mf.end_time as matched_end_time,
    mf.location_name as matched_location_name,
    mf.latitude as matched_latitude,
    mf.longitude as matched_longitude,
    mf.radius_km as matched_radius_km,
    mp.full_name as matched_name,
    mp.avatar_url as matched_avatar_url
    
FROM matches m
JOIN free4_events uf ON m.user_free4_id = uf.id
JOIN profiles up ON uf.user_id = up.id
JOIN free4_events mf ON m.matched_free4_id = mf.id
JOIN profiles mp ON mf.user_id = mp.id;