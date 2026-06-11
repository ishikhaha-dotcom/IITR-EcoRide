// ─── Ride Routes ─────────────────────────────────────────────────────
// POST   /api/rides           — rider requests a new ride
// GET    /api/rides           — list rides for current user
// GET    /api/rides/:id       — get a single ride
// PATCH  /api/rides/:id/accept — driver accepts a requested ride
// PATCH  /api/rides/:id/status — update ride status
// ─────────────────────────────────────────────────────────────────────

const express = require('express');
const pool    = require('../db');
const auth    = require('../middleware/authMiddleware');
const { LOCATIONS, getHaversineDistance, calculateDistance, isRideOutsideCampus, isCoordinateOnCampus } = require('../utils/geoUtils');

const router = express.Router();
router.use((req,res,next) => { console.log('RIDES.JS RECEIVED:', req.method, req.url); next(); });

// All ride routes require authentication
router.use(auth);

// ── Valid status transitions ─────────────────────────────────────────
const VALID_TRANSITIONS = {
  requested:   ['accepted', 'cancelled'],
  accepted:    ['in_progress', 'cancelled'],
  in_progress: ['completed', 'cancelled'],
  completed:   [],
  cancelled:   [],
};

// ── POST / — Request a Ride ──────────────────────────────────────────
router.post('/', async (req, res) => {
  try {
    // Only riders can request rides
    if (req.user.role !== 'rider') {
      return res.status(403).json({ error: 'Only riders can request rides.' });
    }

    const {
      pickup_location, pickup_lat, pickup_lng,
      dropoff_location, dropoff_lat, dropoff_lng,
      isOutside, tip, passenger_count, is_scheduled, scheduled_for
    } = req.body;

    if (!pickup_location || !dropoff_location) {
      return res.status(400).json({
        error: 'pickup_location and dropoff_location are required.',
      });
    }

    // Pricing Engine
    let base_fare = 10;
    let calculatedIsOutside = false;

    // 1. Process custom coordinates if provided
    if (pickup_lat && pickup_lng && dropoff_lat && dropoff_lng) {
      const pLat = parseFloat(pickup_lat);
      const pLng = parseFloat(pickup_lng);
      const dLat = parseFloat(dropoff_lat);
      const dLng = parseFloat(dropoff_lng);

      const pickupOnCampus = isCoordinateOnCampus(pLat, pLng);
      const dropoffOnCampus = isCoordinateOnCampus(dLat, dLng);

      calculatedIsOutside = !(pickupOnCampus && dropoffOnCampus);

      if (calculatedIsOutside) {
        const distanceKm = getHaversineDistance(pLat, pLng, dLat, dLng);
        base_fare = Math.ceil(distanceKm * 12);
      }
    } 
    // 2. Utilize geoUtils if locations strictly match the known IIT Roorkee registry keys
    else if (LOCATIONS[pickup_location] && LOCATIONS[dropoff_location]) {
      calculatedIsOutside = isRideOutsideCampus(pickup_location, dropoff_location);
      if (calculatedIsOutside) {
        const distanceKm = calculateDistance(pickup_location, dropoff_location);
        base_fare = Math.ceil(distanceKm * 12);
      }
    } 
    // 3. Fallback to the passenger's UI selection if custom strings are used without coordinates
    else {
      calculatedIsOutside = isOutside;
      if (calculatedIsOutside) {
        base_fare = Math.ceil(2.5 * 12); // mock 2.5km distance fallback
      }
    }

    const finalPassengerCount = passenger_count || 1;
    // Multiply base fare by the number of passengers
    base_fare = base_fare * finalPassengerCount;

    const finalTip = parseFloat(tip) || 0;

    const finalScheduledFor = is_scheduled ? scheduled_for : null;
    const finalStatus = is_scheduled ? 'scheduled' : 'requested';

    const result = await pool.query(
      `INSERT INTO rides
         (rider_id, pickup_location, pickup_lat, pickup_lng,
          dropoff_location, dropoff_lat, dropoff_lng, base_fare, tip, passenger_count, is_scheduled, scheduled_for, status)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13)
       RETURNING *`,
      [
        req.user.id,
        pickup_location, pickup_lat || null, pickup_lng || null,
        dropoff_location, dropoff_lat || null, dropoff_lng || null,
        base_fare, finalTip, finalPassengerCount, is_scheduled || false, finalScheduledFor, finalStatus
      ],
    );

    res.status(201).json({ ride: result.rows[0] });
  } catch (err) {
    console.error('Create ride error:', err.message);
    res.status(500).json({ error: 'Server error creating ride.' });
  }
});

// ── GET / — List Rides for Current User ──────────────────────────────
router.get('/', async (req, res) => {
  try {
    let query;
    const params = [req.user.id];

    if (req.user.role === 'driver') {
      // Drivers see rides assigned to them
      query = `SELECT * FROM rides
               WHERE driver_id = $1
               ORDER BY requested_at DESC`;
    } else {
      // Riders see their own rides
      query = `SELECT * FROM rides
               WHERE rider_id = $1
               ORDER BY requested_at DESC`;
    }

    const result = await pool.query(query, params);
    res.json({ rides: result.rows });
  } catch (err) {
    console.error('List rides error:', err.message);
    res.status(500).json({ error: 'Server error listing rides.' });
  }
});

// ── GET /upcoming — List upcoming scheduled rides for current user ──
router.get('/upcoming', async (req, res) => {
  try {
    let query;
    const params = [req.user.id];

    if (req.user.role === 'driver') {
      // Drivers see scheduled rides assigned to them
      query = `SELECT * FROM rides
               WHERE driver_id = $1 AND is_scheduled = true AND status IN ('scheduled', 'accepted')
               ORDER BY scheduled_for ASC`;
    } else {
      // Riders see their own upcoming scheduled rides
      query = `SELECT * FROM rides
               WHERE rider_id = $1 AND is_scheduled = true AND status IN ('scheduled', 'accepted')
               ORDER BY scheduled_for ASC`;
    }

    const result = await pool.query(query, params);
    res.json({ rides: result.rows });
  } catch (err) {
    console.error('List upcoming rides error:', err.message);
    res.status(500).json({ error: 'Server error listing upcoming rides.' });
  }
});

// ── GET /scheduled — List available scheduled rides for drivers ──────
router.get('/scheduled', async (req, res) => {
  try {
    if (req.user.role !== 'driver') {
      return res.status(403).json({ error: 'Only drivers can view available scheduled rides.' });
    }

    // Return scheduled rides that have not been accepted yet
    const query = `SELECT r.*, u.full_name as passenger_name 
                   FROM rides r
                   JOIN users u ON r.rider_id = u.id
                   WHERE r.is_scheduled = true AND r.status = 'scheduled' AND r.driver_id IS NULL
                   ORDER BY r.scheduled_for ASC`;

    const result = await pool.query(query);
    res.json({ rides: result.rows });
  } catch (err) {
    console.error('List available scheduled rides error:', err.message);
    res.status(500).json({ error: 'Server error listing scheduled rides.' });
  }
});

// ── POST /rate — Submit ride rating ────────────────────────────────
router.post('/rate', async (req, res) => { console.log('INSIDE RATE ROUTE!'); 
  try {
    const { ride_id, rating, feedback_text } = req.body;
    const passengerId = req.user.id;
    
    if (!rating || rating < 1 || rating > 5) {
      return res.status(400).json({ error: 'Valid rating between 1 and 5 is required.' });
    }

    const checkRide = await pool.query('SELECT * FROM rides WHERE id = $1', [ride_id]);
    if (checkRide.rows.length === 0) return res.status(404).json({ error: 'Ride not found' });
    const ride = checkRide.rows[0];

    if (ride.rider_id !== passengerId) {
      return res.status(403).json({ error: 'Only the rider can rate this ride.' });
    }
    if (ride.status !== 'completed') {
      return res.status(400).json({ error: 'Can only rate completed rides.' });
    }

    const result = await pool.query(
      `INSERT INTO ratings (ride_id, passenger_id, driver_id, rating, feedback_text)
       VALUES ($1, $2, $3, $4, $5) RETURNING *`,
      [ride_id, passengerId, ride.driver_id, rating, feedback_text]
    );

    // Update the materialized stats in driver_profiles
    const updatedStatsResult = await pool.query(
      `UPDATE driver_profiles 
       SET total_ratings = total_ratings + 1,
           average_rating = (
             SELECT COALESCE(ROUND(AVG(rating), 1), 0) 
             FROM ratings 
             WHERE driver_id = $1
           )
       WHERE driver_id = $1
       RETURNING total_ratings, average_rating, total_rides`,
      [ride.driver_id]
    );
    const newStats = updatedStatsResult.rows[0];

    const io = req.app.get('io');
    if (io) {
      io.to(ride.driver_id).emit('stats_updated');
      io.to(ride.driver_id).emit('driver_rating_received', {
        rating,
        feedback_text: feedback_text || '',
        total_ratings: parseInt(newStats.total_ratings, 10),
        average_rating: parseFloat(newStats.average_rating),
        total_rides: parseInt(newStats.total_rides, 10)
      });
    }

    res.status(201).json({ rating: result.rows[0] });
  } catch (err) {
    console.error('Submit rating error:', err.message);
    res.status(500).json({ error: 'Server error submitting rating.' });
  }
});

// ── GET /:id — Get Single Ride ───────────────────────────────────────
router.get('/:id', async (req, res) => {
  try {
    const result = await pool.query(
      'SELECT * FROM rides WHERE id = $1',
      [req.params.id],
    );

    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Ride not found.' });
    }

    const ride = result.rows[0];

    // Only the rider or assigned driver can view the ride
    if (ride.rider_id !== req.user.id && ride.driver_id !== req.user.id) {
      return res.status(403).json({ error: 'Access denied.' });
    }

    res.json({ ride });
  } catch (err) {
    console.error('Get ride error:', err.message);
    res.status(500).json({ error: 'Server error fetching ride.' });
  }
});

// ── PATCH /:id/accept — Driver Accepts a Ride ───────────────────────
router.patch('/:id/accept', async (req, res) => {
  const client = await pool.connect();
  try {
    if (req.user.role !== 'driver') {
      return res.status(403).json({ error: 'Only drivers can accept rides.' });
    }

    await client.query('BEGIN');

    // Fetch ride with FOR UPDATE lock to prevent race conditions
    const check = await client.query(
      'SELECT * FROM rides WHERE id = $1 FOR UPDATE',
      [req.params.id],
    );

    if (check.rows.length === 0) {
      await client.query('ROLLBACK');
      return res.status(404).json({ error: 'Ride not found.' });
    }

    const ride = check.rows[0];

    if (ride.status !== 'requested' && ride.status !== 'scheduled') {
      await client.query('ROLLBACK');
      return res.status(409).json({
        error: `Cannot accept a ride with status "${ride.status}".`,
      });
    }

    const result = await client.query(
      `UPDATE rides
       SET driver_id = $1, status = 'accepted', accepted_at = NOW()
       WHERE id = $2
       RETURNING *`,
      [req.user.id, req.params.id],
    );

    await client.query('COMMIT');
    const acceptedRide = result.rows[0];
    
    // Broadcast ride_taken to all online drivers
    const io = req.app.get('io');
    if (io) {
      io.to('drivers').emit('ride_taken', { rideId: acceptedRide.id });
    }

    res.json({ ride: acceptedRide });
  } catch (err) {
    await client.query('ROLLBACK');
    console.error('Accept ride error:', err.message);
    res.status(500).json({ error: 'Server error accepting ride.' });
  } finally {
    client.release();
  }
});

  // ── PATCH /:id/status — Update Ride Status ──────────────────────────
router.patch('/:id/status', async (req, res) => {
  try {
    const { status, otp } = req.body;

    if (!status) {
      return res.status(400).json({ error: 'status is required.' });
    }

    // Fetch the current ride
    const check = await pool.query(
      'SELECT * FROM rides WHERE id = $1',
      [req.params.id],
    );

    if (check.rows.length === 0) {
      return res.status(404).json({ error: 'Ride not found.' });
    }

    const ride = check.rows[0];

    // Verify caller is the rider or assigned driver
    if (ride.rider_id !== req.user.id && ride.driver_id !== req.user.id) {
      return res.status(403).json({ error: 'Access denied.' });
    }

    // Validate status transition
    const allowed = VALID_TRANSITIONS[ride.status] || [];
    if (!allowed.includes(status)) {
      return res.status(400).json({
        error: `Cannot transition from "${ride.status}" to "${status}".`,
        allowed_transitions: allowed,
      });
    }

    // Build dynamic SET clause for timestamps
    let extraSet = '';
    if (status === 'accepted') extraSet = ', accepted_at = NOW()';
    if (status === 'completed') extraSet = ', completed_at = NOW()';

    const result = await pool.query(
      `UPDATE rides
       SET status = $1 ${extraSet}
       WHERE id = $2
       RETURNING *`,
      [status, req.params.id]
    );
    const updatedRide = result.rows[0];

    // If ride is completed, update total_rides in driver_profiles
    if (status === 'completed') {
      await pool.query(
        `UPDATE driver_profiles 
         SET total_rides = total_rides + 1 
         WHERE driver_id = $1`,
        [updatedRide.driver_id]
      );
    }
    
    res.json({ ride: updatedRide });
  } catch (err) {
    console.error('Update ride status error:', err.message);
    res.status(500).json({ error: 'Server error updating ride status.' });
  }
});


// ── POST /:id/pay — Simulate Payment ──────────────────────────────
router.post('/:id/pay', async (req, res) => {
  try {
    const { payment_method } = req.body;
    
    // Validate method
    if (!['upi', 'cash', 'wallet'].includes(payment_method)) {
      return res.status(400).json({ error: 'Invalid payment method.' });
    }

    const check = await pool.query('SELECT * FROM rides WHERE id = $1', [req.params.id]);
    if (check.rows.length === 0) return res.status(404).json({ error: 'Ride not found.' });
    const ride = check.rows[0];

    if (ride.rider_id !== req.user.id) {
      return res.status(403).json({ error: 'Only the passenger can pay for this ride.' });
    }

    // Update payment status
    const result = await pool.query(
      `UPDATE rides
       SET payment_status = 'completed', payment_method = $1
       WHERE id = $2
       RETURNING *`,
      [payment_method, req.params.id]
    );

    res.json({ ride: result.rows[0], success: true });
  } catch (err) {
    console.error('Payment simulation error:', err.message);
    res.status(500).json({ error: 'Server error processing payment.' });
  }
});

module.exports = router;
