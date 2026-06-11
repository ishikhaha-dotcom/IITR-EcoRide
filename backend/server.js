// ─── Campus Mobility Platform — Express + Socket.IO Server ──────────
// Central entry point: Express REST API + real-time Socket.IO layer.
// ─────────────────────────────────────────────────────────────────────

require('dotenv').config();

// Fix for Supabase SSL certs on Render
process.env.NODE_TLS_REJECT_UNAUTHORIZED = '0';

const http    = require('http');
const express = require('express');
const cors    = require('cors');
const jwt     = require('jsonwebtoken');
const { Server } = require('socket.io');
const pool    = require('./db');

const app    = express();
const server = http.createServer(app);
const PORT   = process.env.PORT || 5000;

// ── Socket.IO ─────────────────────────────────────────────────────────
const io = new Server(server, {
  cors: {
    origin: ['http://localhost:5173', 'http://localhost:5174', 'http://127.0.0.1:5173', 'https://frontend-ten-beta.vercel.app'],
    methods: ['GET', 'POST', 'PUT', 'DELETE'],
    credentials: true,
  },
});

app.set('io', io);

// Socket JWT auth middleware
io.use((socket, next) => {
  const token = socket.handshake.auth?.token;
  if (!token) return next(new Error('No auth token'));
  try {
    socket.user = jwt.verify(token, process.env.JWT_SECRET);
    next();
  } catch {
    next(new Error('Invalid token'));
  }
});

io.on('connection', (socket) => {
  const { id, email, role } = socket.user;
  console.log(`🔌  Socket connected: ${email} (${role})`);

  // Each user joins their personal room for targeted events
  socket.join(id);

  // Drivers also join a shared broadcast room
  if (role === 'driver') socket.join('drivers');

  // ── Ride Request ─────────────────────────────────────────────────────
  socket.on('ride_request', async (payload) => {
    try {
      console.log(`🚗  ride_request from rider ${id}`);
      const baseFare = payload.baseFare || 10;
      const tip = payload.tip || 0;
      const totalOffer = baseFare + tip;

      // Fetch passenger details to allow Driver click-to-call
      const passengerResult = await pool.query(
        `SELECT phone_number FROM users WHERE id = $1`,
        [id]
      );
      const passengerPhone = passengerResult.rows[0]?.phone_number;

      // 2. Broadcast to all online drivers
      const requestPayload = {
        rideId: payload.rideId,
        riderId: id,
        pickup: payload.pickup,
        destination: payload.destination,
        baseFare,
        tip,
        totalOffer,
        passengerPhone,
        passengerCount: payload.passengerCount,
        isOnCampus: payload.isOnCampus
      };
      io.to('drivers').emit('new_ride_request', requestPayload);
    } catch (err) {
      console.error('Fetch pricing error:', err.message);
      io.to('drivers').emit('new_ride_request', payload);
    }
  });

  // ── Driver: notify the specific rider that their ride was accepted ──
  socket.on('ride_accepted', async ({ rideId, riderId, driverId, driverName }, callback) => {
    const client = await pool.connect();
    try {
      await client.query('BEGIN');
      
      const checkResult = await client.query(
        'SELECT status, driver_id FROM rides WHERE id = $1 FOR UPDATE',
        [rideId]
      );
      
      if (checkResult.rows.length === 0) {
        await client.query('ROLLBACK');
        const errObj = { error: 'Ride not found' };
        if (callback && typeof callback === 'function') callback(errObj);
        socket.emit('ride_acceptance_failed', errObj);
        return;
      }
      
      const ride = checkResult.rows[0];
      const dId = driverId || id;
      
      // If the ride is already taken by another driver or no longer requested
      if (ride.status === 'accepted' && ride.driver_id !== dId) {
        await client.query('ROLLBACK');
        const errObj = { error: 'This ride has already been taken' };
        if (callback && typeof callback === 'function') callback(errObj);
        socket.emit('ride_acceptance_failed', errObj);
        return;
      }
      
      await client.query('COMMIT');
      
      console.log(`✅  ride_accepted by ${email} for rider ${riderId}`);
      
      const driverResult = await pool.query(
        `SELECT u.phone_number, u.profile_pic, dp.vehicle_model, dp.license_plate
         FROM users u
         LEFT JOIN driver_profiles dp ON u.id = dp.driver_id
         WHERE u.id = $1`,
        [dId]
      );
      const driverInfo = driverResult.rows[0] || {};

      io.to(riderId).emit('ride_status_update', {
        rideId,
        status: 'accepted',
        driverId: dId,
        driverName,
        driverPhone: driverInfo.phone_number,
        driverPic: driverInfo.profile_pic,
        vehicleModel: driverInfo.vehicle_model,
        iitrPlate: driverInfo.license_plate
      });
      
      // Notify all drivers to remove this request from their dashboard
      io.to('drivers').emit('ride_taken', { rideId });

      if (callback && typeof callback === 'function') callback({ success: true });
    } catch (err) {
      await client.query('ROLLBACK');
      console.error('Ride accepted notification error:', err.message);
      const errObj = { error: 'Server error accepting ride' };
      if (callback && typeof callback === 'function') callback(errObj);
      socket.emit('ride_acceptance_failed', errObj);
    } finally {
      client.release();
    }
  });

  // ── Driver: ride has started ─────────────────────────────────────────
  socket.on('ride_started', ({ rideId, riderId }) => {
    console.log(`▶️  ride_started for rider ${riderId}`);
    io.to(riderId).emit('ride_status_update', { rideId, status: 'in_progress' });
  });

  // ── Driver: ride is complete ─────────────────────────────────────────
  socket.on('ride_ended', ({ rideId, riderId }) => {
    console.log(`🏁  ride_ended for rider ${riderId}`);
    io.to(riderId).emit('ride_status_update', { rideId, status: 'completed' });
  });

  // ── Cancel Ride ──────────────────────────────────────────────────────
  socket.on('cancel_ride', async ({ rideId, receiverId }) => {
    console.log(`❌  cancel_ride by ${email} for ride ${rideId}`);
    try {
      await pool.query("UPDATE rides SET status = 'cancelled' WHERE id = $1", [rideId]);
      if (receiverId) {
        io.to(receiverId).emit('ride_cancelled', { rideId, cancelledBy: id });
      } else {
        io.to('drivers').emit('ride_cancelled', { rideId, cancelledBy: id });
      }
    } catch (err) {
      console.error('Cancel ride error:', err.message);
    }
  });

  // ── Cancel Ride Request (Passenger) ──────────────────────────────────
  socket.on('cancel_ride_request', async ({ ride_id, reason }) => {
    console.log(`❌  cancel_ride_request by passenger ${email} for ride ${ride_id} - Reason: ${reason}`);
    try {
      await pool.query(
        "UPDATE rides SET status = 'cancelled', cancelled_by = 'passenger', cancellation_reason = $2 WHERE id = $1", 
        [ride_id, reason]
      );
      // Broadcast to ALL online drivers
      io.to('drivers').emit('ride_cancelled_by_passenger', { ride_id });
    } catch (err) {
      console.error('Cancel ride request error:', err.message);
    }
  });

  // ── Cancel Ride (Driver) ─────────────────────────────────────────────
  socket.on('driver_cancel_ride', async ({ ride_id, reason, riderId }) => {
    console.log(`❌  driver_cancel_ride by driver ${email} for ride ${ride_id} - Reason: ${reason}`);
    try {
      await pool.query(
        "UPDATE rides SET status = 'cancelled', cancelled_by = 'driver', cancellation_reason = $2 WHERE id = $1", 
        [ride_id, reason]
      );
      // Broadcast to specific passenger
      if (riderId) {
        io.to(riderId).emit('ride_cancelled_by_driver', { ride_id, reason });
      }
    } catch (err) {
      console.error('Driver cancel ride error:', err.message);
    }
  });

  // ── Chat: Send Message ───────────────────────────────────────────────
  socket.on('send_message', async ({ rideId, receiverId, message_text }) => {
    try {
      const result = await pool.query(
        `INSERT INTO messages (ride_id, sender_id, message_text)
         VALUES ($1, $2, $3) RETURNING *`,
        [rideId, id, message_text]
      );
      const newMsg = result.rows[0];
      io.to(receiverId).emit('new_message', newMsg);
      socket.emit('message_sent_success', newMsg);
    } catch (err) {
      console.error('Send message error:', err.message);
    }
  });

  // ── Fare Negotiation: Driver Counter Offer ───────────────────────────
  socket.on('driver_counter_offer', async ({ rideId, riderId, counterFare }) => {
    try {
      console.log(`💵  driver_counter_offer from ${email} for rider ${riderId}`);
      
      const rideResult = await pool.query(
        `SELECT pickup_location, pickup_lat, pickup_lng, dropoff_location, dropoff_lat, dropoff_lng 
         FROM rides WHERE id = $1`,
        [rideId]
      );
      
      if (rideResult.rows.length === 0) {
        socket.emit('bid_failed', { error: 'Ride not found.' });
        return;
      }
      
      const ride = rideResult.rows[0];
      const { isCoordinateOnCampus, isRideOutsideCampus } = require('./utils/geoUtils');
      
      let isOutside = false;
      if (ride.pickup_lat && ride.dropoff_lat) {
        const pickupOnCampus = isCoordinateOnCampus(ride.pickup_lat, ride.pickup_lng);
        const dropoffOnCampus = isCoordinateOnCampus(ride.dropoff_lat, ride.dropoff_lng);
        isOutside = !(pickupOnCampus && dropoffOnCampus);
      } else {
        isOutside = isRideOutsideCampus(ride.pickup_location, ride.dropoff_location);
      }
      
      if (!isOutside) {
        socket.emit('bid_failed', { error: 'Bidding is strictly prohibited on fixed-rate campus routes (Flat ₹10).' });
        return;
      }

      io.to(riderId).emit('receive_counter_offer', {
        rideId,
        driverId: id,
        driverName: socket.user.full_name,
        counterFare,
      });
    } catch (err) {
      console.error('Counter offer error:', err.message);
      socket.emit('bid_failed', { error: 'Server error processing bid.' });
    }
  });

  // ── Fare Negotiation: Passenger Accepts Counter Offer ────────────────
  socket.on('passenger_accept_counter', async ({ rideId, driverId, driverName, counterFare }) => {
    console.log(`✅  passenger_accept_counter for ride ${rideId} by driver ${driverId}`);
    try {
      await pool.query('BEGIN');
      
      const check = await pool.query('SELECT * FROM rides WHERE id = $1 FOR UPDATE', [rideId]);
      if (check.rows.length === 0 || check.rows[0].status !== 'requested') {
        await pool.query('ROLLBACK');
        socket.emit('bid_failed', { error: 'Ride no longer available or already accepted.' });
        return;
      }
      
      const result = await pool.query(
        `UPDATE rides
         SET driver_id = $1, base_fare = $2, status = 'accepted', accepted_at = NOW()
         WHERE id = $3
         RETURNING *`,
        [driverId, counterFare, rideId]
      );
      
      await pool.query('COMMIT');
      
      // Fetch passenger details for driver
      const passengerResult = await pool.query(
        `SELECT phone_number FROM users WHERE id = $1`,
        [id]
      );
      const passengerPhone = passengerResult.rows[0]?.phone_number;

      // Notify the winning driver
      io.to(driverId).emit('counter_offer_won', {
        rideId,
        riderId: id,
        status: 'accepted',
        newFare: counterFare,
        passengerPhone
      });
      
      // Fetch comprehensive driver details for the UI card
      const driverResult = await pool.query(
        `SELECT u.phone_number, u.profile_pic, dp.vehicle_model, dp.license_plate
         FROM users u
         LEFT JOIN driver_profiles dp ON u.id = dp.driver_id
         WHERE u.id = $1`,
        [driverId]
      );
      const driverInfo = driverResult.rows[0] || {};

      // Notify the passenger that it was successful
      socket.emit('ride_status_update', {
        rideId,
        status: 'accepted',
        driverId: driverId,
        driverName: driverName || 'Assigned Driver',
        driverPhone: driverInfo.phone_number,
        driverPic: driverInfo.profile_pic,
        vehicleModel: driverInfo.vehicle_model,
        iitrPlate: driverInfo.license_plate
      });

      // Trigger chat unlock for both users securely
      const chatUnlockPayload = { rideId, message: 'Negotiation complete. Chat is now live!' };
      io.to(driverId).emit('chat_unlocked', chatUnlockPayload);
      socket.emit('chat_unlocked', chatUnlockPayload);
      
    } catch (err) {
      await pool.query('ROLLBACK');
      console.error('Counter offer accept error:', err.message);
      socket.emit('bid_failed', { error: 'Server error accepting bid.' });
    }
  });

  // ── Real-Time Coordinate Tracking ────────────────────────────────────
  socket.on('update_driver_location', async ({ driver_id, lat, lng, active_rider_id }) => {
    const dId = driver_id || id;
    try {
      // 1. Update Database metrics
      await pool.query(
        `UPDATE driver_availability 
         SET current_lat = $1, current_lng = $2, updated_at = NOW() 
         WHERE driver_id = $3`,
        [lat, lng, dId]
      );

      // 2. Proximity Broadcaster: Global Fleet Array
      const onlineResult = await pool.query(
        `SELECT driver_id, current_lat, current_lng 
         FROM driver_availability 
         WHERE is_available = true AND current_lat IS NOT NULL`
      );
      io.emit('nearby_drivers_fleet', onlineResult.rows);

      // 3. Active Trip Relay: Targeted Passenger Sync
      if (active_rider_id) {
        io.to(active_rider_id).emit('live_trip_coordinate_sync', {
          driverId: dId,
          lat,
          lng
        });
      }
    } catch (err) {
      console.error('Location streaming error:', err.message);
    }
  });

  socket.on('disconnect', () => {
    console.log(`🔌  Socket disconnected: ${email}`);
  });
});

// ── Express Middleware ────────────────────────────────────────────────
app.use(cors({
  origin: ['http://localhost:5173', 'http://localhost:5174', 'http://127.0.0.1:5173', 'https://frontend-ten-beta.vercel.app'],
  credentials: true,
}));
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// ── Request Logger ────────────────────────────────────────────────────
app.use((req, _res, next) => {
  console.log(`${new Date().toISOString()}  ${req.method}  ${req.url}`);
  next();
});

// ── Health-check ──────────────────────────────────────────────────────
app.get('/api/health', async (_req, res) => {
  try {
    const result = await pool.query('SELECT NOW()');
    res.json({ status: 'ok', timestamp: result.rows[0].now });
  } catch (err) {
    console.error('Health-check failed:', err.message);
    res.status(500).json({ status: 'error', message: err.message });
  }
});

// ── Route Modules ─────────────────────────────────────────────────────
const authRoutes        = require('./routes/auth');
const rideRoutes        = require('./routes/rides');
const driverRoutes      = require('./routes/drivers');
const analyticsRoutes   = require('./routes/analytics');
const forecastingRoutes = require('./routes/forecasting');

app.use('/api/auth',        authRoutes);
app.use('/api/rides',       rideRoutes);
app.use('/api/drivers',     driverRoutes);
app.use('/api/analytics',   analyticsRoutes);
app.use('/api/forecasting', forecastingRoutes);

// ── 404 Catch-all ─────────────────────────────────────────────────────
app.use((_req, res) => {
  console.log('404 on', _req.method, _req.url); res.status(404).json({ error: 'Route not found' });
});

// ── Global Error Handler ──────────────────────────────────────────────
app.use((err, _req, res, _next) => {
  console.error('Unhandled error:', err.stack);
  res.status(500).json({ error: 'Internal server error' });
});

// ── Start (HTTP server wraps Express + Socket.IO) ─────────────────────
server.listen(PORT, () => {
  console.log(`🚀  Campus Mobility API running → http://localhost:${PORT}`);
});

module.exports = { app, io };
