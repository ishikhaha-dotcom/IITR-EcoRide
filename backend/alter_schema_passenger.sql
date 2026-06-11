-- Add passenger_count to rides table
ALTER TABLE rides
ADD COLUMN passenger_count INT DEFAULT 1;

-- Add missing stats columns to driver_profiles
ALTER TABLE driver_profiles
ADD COLUMN total_rides INT DEFAULT 0,
ADD COLUMN total_ratings INT DEFAULT 0,
ADD COLUMN average_rating NUMERIC(3,1) DEFAULT 0.0;
