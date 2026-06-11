const pool = require('../db');

async function runMigration() {
  try {
    // 1. Alter users table
    await pool.query(`
      ALTER TABLE users
      ADD COLUMN IF NOT EXISTS phone_number VARCHAR(20),
      ADD COLUMN IF NOT EXISTS profile_pic TEXT DEFAULT 'https://images.unsplash.com/photo-1535713875002-d1d0cf377fde?auto=format&fit=crop&w=150&q=80';
    `);
    console.log("✅ Users table successfully updated.");

    // 2. Create driver_profiles extension table
    await pool.query(`
      CREATE TABLE IF NOT EXISTS driver_profiles (
        user_id UUID PRIMARY KEY REFERENCES users(id) ON DELETE CASCADE,
        vehicle_model VARCHAR(255),
        iitr_authority_plate VARCHAR(255),
        updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
      );
    `);
    console.log("✅ driver_profiles table successfully created.");

    process.exit(0);
  } catch (err) {
    console.error("❌ Migration failed:", err.message);
    process.exit(1);
  }
}

runMigration();
