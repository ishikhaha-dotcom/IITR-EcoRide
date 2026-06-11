-- ═══════════════════════════════════════════════════════════════════════
-- Campus Mobility Platform — Phase 1 DDL
-- Run this script in the Supabase SQL Editor (Dashboard → SQL Editor).
-- ═══════════════════════════════════════════════════════════════════════

-- Enable the pgcrypto extension (used for gen_random_uuid)
CREATE EXTENSION IF NOT EXISTS pgcrypto;

-- ─── 1. USERS ────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS users (
  id            UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  full_name     VARCHAR(120)  NOT NULL,
  email         VARCHAR(255)  NOT NULL UNIQUE,
  password_hash VARCHAR(255)  NOT NULL,
  phone         VARCHAR(20),
  role          VARCHAR(10)   NOT NULL DEFAULT 'rider'
                CHECK (role IN ('rider', 'driver', 'admin')),
  created_at    TIMESTAMPTZ   NOT NULL DEFAULT NOW(),
  updated_at    TIMESTAMPTZ   NOT NULL DEFAULT NOW()
);

-- ─── 2. DRIVER_AVAILABILITY ─────────────────────────────────────────
CREATE TABLE IF NOT EXISTS driver_availability (
  id            UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  driver_id     UUID          NOT NULL
                REFERENCES users(id) ON DELETE CASCADE,
  is_available  BOOLEAN       NOT NULL DEFAULT false,
  current_lat   DOUBLE PRECISION,
  current_lng   DOUBLE PRECISION,
  heading       VARCHAR(255),               -- e.g. "North Campus Gate"
  updated_at    TIMESTAMPTZ   NOT NULL DEFAULT NOW(),

  -- each driver has at most one availability row
  CONSTRAINT uq_driver_availability UNIQUE (driver_id)
);

-- ─── 3. RIDES ────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS rides (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  rider_id        UUID          NOT NULL
                  REFERENCES users(id) ON DELETE CASCADE,
  driver_id       UUID
                  REFERENCES users(id) ON DELETE SET NULL,
  pickup_location VARCHAR(255)  NOT NULL,
  pickup_lat      DOUBLE PRECISION,
  pickup_lng      DOUBLE PRECISION,
  dropoff_location VARCHAR(255) NOT NULL,
  dropoff_lat     DOUBLE PRECISION,
  dropoff_lng     DOUBLE PRECISION,
  status          VARCHAR(20)   NOT NULL DEFAULT 'requested'
                  CHECK (status IN (
                    'requested',
                    'accepted',
                    'in_progress',
                    'completed',
                    'cancelled'
                  )),
  requested_at    TIMESTAMPTZ   NOT NULL DEFAULT NOW(),
  accepted_at     TIMESTAMPTZ,
  completed_at    TIMESTAMPTZ
);

-- ─── 4. RATINGS ───────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS ratings (
  id            SERIAL PRIMARY KEY,
  ride_id       UUID REFERENCES rides(id) ON DELETE CASCADE,
  passenger_id  UUID REFERENCES users(id) ON DELETE CASCADE,
  driver_id     UUID REFERENCES users(id) ON DELETE CASCADE,
  rating        INT CHECK (rating >= 1 AND rating <= 5),
  feedback_text TEXT
);

-- ─── Indexes for frequent queries ───────────────────────────────────
CREATE INDEX IF NOT EXISTS idx_rides_rider  ON rides(rider_id);
CREATE INDEX IF NOT EXISTS idx_rides_driver ON rides(driver_id);
CREATE INDEX IF NOT EXISTS idx_rides_status ON rides(status);
CREATE INDEX IF NOT EXISTS idx_driver_avail ON driver_availability(is_available);
