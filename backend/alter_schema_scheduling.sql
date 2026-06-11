-- ═══════════════════════════════════════════════════════════════════════
-- Ride Scheduling Migration
-- ═══════════════════════════════════════════════════════════════════════

ALTER TABLE rides 
ADD COLUMN IF NOT EXISTS is_scheduled BOOLEAN DEFAULT false,
ADD COLUMN IF NOT EXISTS scheduled_for TIMESTAMPTZ;

-- Add a new status for scheduled rides that haven't been picked up yet
-- Actually, we can use 'scheduled' as a status. But the current check constraint restricts status:
-- CHECK (status IN ('requested', 'accepted', 'in_progress', 'completed', 'cancelled'))
-- We need to drop the existing check constraint and add a new one.

ALTER TABLE rides DROP CONSTRAINT IF EXISTS rides_status_check;

ALTER TABLE rides ADD CONSTRAINT rides_status_check 
  CHECK (status IN (
    'requested',
    'scheduled',
    'accepted',
    'in_progress',
    'completed',
    'cancelled'
  ));
