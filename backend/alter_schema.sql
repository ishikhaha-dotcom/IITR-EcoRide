-- ═══════════════════════════════════════════════════════════════════════
-- Campus Mobility Platform — Phase 3 Migrations
-- ═══════════════════════════════════════════════════════════════════════

-- ─── 1. Update RIDES Table ────────────────────────────────────────────
-- Add base_fare, tip, and otp columns.
ALTER TABLE rides 
ADD COLUMN IF NOT EXISTS base_fare NUMERIC,
ADD COLUMN IF NOT EXISTS tip NUMERIC DEFAULT 0,
ADD COLUMN IF NOT EXISTS otp VARCHAR(4);

-- Note: The rides.status column already supports 'cancelled' based on
-- the original CHECK constraint: 
-- CHECK (status IN ('requested', 'accepted', 'in_progress', 'completed', 'cancelled'))

-- ─── 2. Create MESSAGES Table ─────────────────────────────────────────
CREATE TABLE IF NOT EXISTS messages (
  id            UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  ride_id       UUID NOT NULL REFERENCES rides(id) ON DELETE CASCADE,
  sender_id     UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  message_text  TEXT NOT NULL,
  created_at    TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Index for querying messages for a specific ride quickly
CREATE INDEX IF NOT EXISTS idx_messages_ride ON messages(ride_id);

-- ─── 3. Create RATINGS Table ──────────────────────────────────────────
CREATE TABLE IF NOT EXISTS ratings (
  id            SERIAL PRIMARY KEY,
  ride_id       UUID REFERENCES rides(id) ON DELETE CASCADE,
  passenger_id  UUID REFERENCES users(id) ON DELETE CASCADE,
  driver_id     UUID REFERENCES users(id) ON DELETE CASCADE,
  rating        INT CHECK (rating >= 1 AND rating <= 5),
  feedback_text TEXT
);
