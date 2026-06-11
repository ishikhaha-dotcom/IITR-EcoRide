const fs = require('fs');
const path = require('path');
const pool = require('./db');

async function runMigrations() {
  const client = await pool.connect();
  try {
    console.log('Starting Digital Payments database migrations...');
    const sqlPath = path.join(__dirname, 'alter_schema_payments.sql');
    const sql = fs.readFileSync(sqlPath, 'utf8');

    await client.query('BEGIN');
    await client.query(sql);
    await client.query('COMMIT');
    
    console.log('✅ Migrations applied successfully!');
  } catch (error) {
    await client.query('ROLLBACK');
    console.error('❌ Migration failed:', error.message);
  } finally {
    client.release();
    pool.end();
  }
}

runMigrations();
