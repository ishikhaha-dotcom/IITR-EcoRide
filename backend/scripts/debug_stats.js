require('dotenv').config({ path: require('path').resolve(__dirname, '..', '.env') });
const pool = require('../db');

async function debug() {
  try {
    // 1. Find the real driver user "iss"
    const users = await pool.query(`SELECT id, full_name, role FROM users WHERE role = 'driver' ORDER BY created_at DESC LIMIT 10`);
    console.log('\n── All Driver Users ──');
    users.rows.forEach(u => console.log(`  ${u.id} | ${u.full_name} | ${u.role}`));

    const driverId = users.rows.find(u => u.full_name === 'iss')?.id || users.rows[0]?.id;
    console.log(`\n── Debugging driver: ${driverId} ──`);

    // 2. Check rides for this driver
    const rides = await pool.query(`SELECT id, status, base_fare, tip, driver_id FROM rides WHERE driver_id = $1`, [driverId]);
    console.log(`\n── Rides for driver (${rides.rows.length} total) ──`);
    rides.rows.forEach(r => console.log(`  ${r.id} | status="${r.status}" | fare=${r.base_fare} | tip=${r.tip}`));

    // 3. Check distinct status values in rides table
    const statuses = await pool.query(`SELECT DISTINCT status, COUNT(*) as cnt FROM rides GROUP BY status`);
    console.log('\n── All ride status values in DB ──');
    statuses.rows.forEach(s => console.log(`  "${s.status}" → ${s.cnt} rides`));

    // 4. Check ratings for this driver
    const ratings = await pool.query(`SELECT * FROM ratings WHERE driver_id = $1`, [driverId]);
    console.log(`\n── Ratings for driver (${ratings.rows.length} total) ──`);
    ratings.rows.forEach(r => console.log(`  ride=${r.ride_id} | rating=${r.rating} | feedback="${r.feedback_text}"`));

    // 5. Run the exact same aggregation query that auth.js uses
    const statsResult = await pool.query(
      `SELECT 
         COALESCE(ROUND(AVG(rt.rating)::numeric, 2), 0) as average_rating,
         COALESCE(MAX(rd.completed_rides_count), 0) as completed_rides_count
       FROM users u
       LEFT JOIN ratings rt ON u.id = rt.driver_id
       LEFT JOIN (
         SELECT driver_id, COUNT(*) as completed_rides_count 
         FROM rides 
         WHERE status = 'completed'
         GROUP BY driver_id
       ) rd ON u.id = rd.driver_id
       WHERE u.id = $1`,
      [driverId]
    );
    console.log('\n── Aggregation query result ──');
    console.log(JSON.stringify(statsResult.rows[0], null, 2));

    // 6. Also try simple direct counts
    const directCount = await pool.query(
      `SELECT COUNT(*) as cnt FROM rides WHERE driver_id = $1 AND status = 'completed'`, [driverId]
    );
    console.log(`\n── Direct COUNT where status='completed': ${directCount.rows[0].cnt}`);
    
    const directCountUpper = await pool.query(
      `SELECT COUNT(*) as cnt FROM rides WHERE driver_id = $1 AND LOWER(status) = 'completed'`, [driverId]
    );
    console.log(`── Direct COUNT where LOWER(status)='completed': ${directCountUpper.rows[0].cnt}`);

    // 7. Show raw status bytes for this driver's rides
    const rawStatuses = await pool.query(
      `SELECT status, LENGTH(status) as len, encode(status::bytea, 'hex') as hex FROM rides WHERE driver_id = $1`, [driverId]
    );
    console.log('\n── Raw status values for this driver ──');
    rawStatuses.rows.forEach(r => console.log(`  status="${r.status}" len=${r.len} hex=${r.hex}`));

  } catch (err) {
    console.error('Debug error:', err);
  } finally {
    await pool.end();
  }
}

debug();
