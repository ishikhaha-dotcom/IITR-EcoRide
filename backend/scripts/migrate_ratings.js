const pool = require('../db');

async function runMigration() {
  try {
    await pool.query(`
      CREATE TABLE IF NOT EXISTS ratings (
        id SERIAL PRIMARY KEY,
        ride_id UUID REFERENCES rides(id) ON DELETE CASCADE,
        passenger_id UUID REFERENCES users(id) ON DELETE CASCADE,
        driver_id UUID REFERENCES users(id) ON DELETE CASCADE,
        rating INT CHECK (rating >= 1 AND rating <= 5),
        feedback_text TEXT
      );
    `);
    console.log("✅ Ratings table successfully created.");
    process.exit(0);
  } catch (err) {
    console.error("❌ Migration failed:", err.message);
    process.exit(1);
  }
}

runMigration();
