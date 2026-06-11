-- ═══════════════════════════════════════════════════════════════════════
-- Digital Payments Migration
-- ═══════════════════════════════════════════════════════════════════════

ALTER TABLE rides 
ADD COLUMN IF NOT EXISTS payment_status VARCHAR(50) DEFAULT 'pending',
ADD COLUMN IF NOT EXISTS payment_method VARCHAR(50) DEFAULT 'cash';

-- Add a check constraint for payment status
ALTER TABLE rides DROP CONSTRAINT IF EXISTS rides_payment_status_check;
ALTER TABLE rides ADD CONSTRAINT rides_payment_status_check 
  CHECK (payment_status IN ('pending', 'completed', 'failed'));

-- Add a check constraint for payment method
ALTER TABLE rides DROP CONSTRAINT IF EXISTS rides_payment_method_check;
ALTER TABLE rides ADD CONSTRAINT rides_payment_method_check 
  CHECK (payment_method IN ('cash', 'upi', 'wallet'));
