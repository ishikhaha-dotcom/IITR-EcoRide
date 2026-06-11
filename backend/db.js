// ─── Database Connection Pool ────────────────────────────────────────
// Uses the `pg` library to create a reusable connection pool backed by
// the Supabase PostgreSQL instance referenced in DATABASE_URL.
// ─────────────────────────────────────────────────────────────────────

const { Pool } = require('pg');
require('dotenv').config();

const connectionString = process.env.DATABASE_URL ? process.env.DATABASE_URL.split('?')[0] : '';

const pool = new Pool({
  connectionString,
  ssl: {
    rejectUnauthorized: false, // required for Supabase hosted Postgres
  },
  max: 10,               // max simultaneous connections
  idleTimeoutMillis: 30000,
  connectionTimeoutMillis: 5000,
});

// Emit a one-time confirmation when the pool is first used
pool.on('connect', () => {
  console.log('📦  Connected to Supabase PostgreSQL');
});

pool.on('error', (err) => {
  console.error('❌  Unexpected database pool error:', err.message);
  process.exit(1);
});

module.exports = pool;
