require('dotenv').config({ path: require('path').resolve(__dirname, '..', '.env') });
const pool = require('../db');
const jwt = require('jsonwebtoken');

async function debug() {
  try {
    // Get the iss user
    const res = await pool.query(`SELECT id, full_name, email, role FROM users WHERE full_name = 'iss'`);
    const user = res.rows[0];
    console.log('DB user record:', JSON.stringify(user));
    console.log('  role in DB:', JSON.stringify(user.role));
    console.log('  role === "driver":', user.role === 'driver');
    
    // Check what the profile route would do
    const isDriver = user.role === 'driver';
    console.log('  isDriver check:', isDriver);
    
    // Also check if there's any whitespace or hidden characters in the role
    console.log('  role bytes:', Buffer.from(user.role).toString('hex'));
    console.log('  role length:', user.role.length);
    console.log('  role trimmed:', JSON.stringify(user.role.trim()));
    
    // Simulate what a JWT token for this user would look like
    const token = jwt.sign(
      { id: user.id, email: user.email, role: user.role },
      process.env.JWT_SECRET,
      { expiresIn: '24h' }
    );
    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    console.log('\nJWT decoded role:', JSON.stringify(decoded.role));
    console.log('JWT decoded role === "driver":', decoded.role === 'driver');
    
    // Run the full profile flow exactly as auth.js does it
    console.log('\n── Simulating full auth.js /profile flow ──');
    
    const userResult = await pool.query(
      `SELECT u.id, u.full_name, u.email, u.phone, u.phone_number, u.role, u.profile_pic, u.created_at, u.updated_at,
              dp.vehicle_model, dp.iitr_authority_plate
       FROM users u
       LEFT JOIN driver_profiles dp ON u.id = dp.user_id
       WHERE u.id = $1`,
      [user.id]
    );
    const dbUser = userResult.rows[0];
    console.log('  user.role from joined query:', JSON.stringify(dbUser.role));
    
    const isDriverFromQuery = dbUser.role === 'driver';
    console.log('  isDriver (from query):', isDriverFromQuery);
    
    // The ride history
    const rideQuery = isDriverFromQuery 
      ? `SELECT * FROM rides WHERE driver_id = $1 ORDER BY requested_at DESC`
      : `SELECT * FROM rides WHERE rider_id = $1 ORDER BY requested_at DESC`;
    const ridesResult = await pool.query(rideQuery, [user.id]);
    console.log('  ride_history count:', ridesResult.rows.length);
    
    let average_rating = 0;
    let completed_rides_count = 0;
    
    if (isDriverFromQuery) {
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
        [user.id]
      );
      if (statsResult.rows.length > 0) {
        average_rating = parseFloat(statsResult.rows[0].average_rating);
        completed_rides_count = parseInt(statsResult.rows[0].completed_rides_count, 10);
      }
    }
    
    const responsePayload = { 
      user: {
        ...dbUser,
        average_rating,
        completed_rides_count
      },
      ride_history: ridesResult.rows,
      average_rating,
      completed_rides_count
    };
    
    console.log('\n── Final response payload (stats only) ──');
    console.log('  average_rating:', responsePayload.average_rating);
    console.log('  completed_rides_count:', responsePayload.completed_rides_count);
    console.log('  user.average_rating:', responsePayload.user.average_rating);
    console.log('  user.completed_rides_count:', responsePayload.user.completed_rides_count);
    console.log('  ride_history length:', responsePayload.ride_history.length);
    
  } catch (err) {
    console.error('Error:', err);
  } finally {
    await pool.end();
  }
}
debug();
