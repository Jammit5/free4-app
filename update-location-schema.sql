-- Add GPS coordinates to free4_events table
ALTER TABLE free4_events 
ADD COLUMN latitude DECIMAL(10, 8),
ADD COLUMN longitude DECIMAL(11, 8);

-- Add index for location queries
CREATE INDEX idx_free4_events_location ON free4_events(latitude, longitude);