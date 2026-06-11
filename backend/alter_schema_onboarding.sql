-- ═══════════════════════════════════════════════════════════════════════
-- Driver Onboarding Migration
-- ═══════════════════════════════════════════════════════════════════════

DROP TABLE IF EXISTS driver_profiles CASCADE;

CREATE TABLE driver_profiles (
  driver_id       UUID PRIMARY KEY REFERENCES users(id) ON DELETE CASCADE,
  vehicle_model   VARCHAR(255) NOT NULL,
  license_plate   VARCHAR(100) NOT NULL,
  created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at      TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Index for quick lookups
CREATE INDEX IF NOT EXISTS idx_driver_profiles_plate ON driver_profiles(license_plate);
