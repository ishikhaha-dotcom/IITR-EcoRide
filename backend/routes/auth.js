// ─── Auth Routes ─────────────────────────────────────────────────────
// POST /api/auth/register  — create a new user, return JWT
// POST /api/auth/login     — authenticate, return JWT
// GET  /api/auth/profile   — return current user (requires auth)
// ─────────────────────────────────────────────────────────────────────

const express = require('express');
const bcrypt  = require('bcryptjs');
const jwt     = require('jsonwebtoken');
const pool    = require('../db');
const auth    = require('../middleware/authMiddleware');

const router  = express.Router();
const JWT_SECRET  = process.env.JWT_SECRET;
const JWT_EXPIRES = '24h';

// ── Helper: sign a token ─────────────────────────────────────────────
function signToken(user) {
  return jwt.sign(
    { id: user.id, email: user.email, role: user.role },
    JWT_SECRET,
    { expiresIn: JWT_EXPIRES },
  );
}

// ── POST /register ───────────────────────────────────────────────────
router.post('/register', async (req, res) => {
  try {
    const { full_name, email, password, phone, role } = req.body;

    // Basic validation
    if (!full_name || !email || !password) {
      return res.status(400).json({
        error: 'full_name, email, and password are required.',
      });
    }

    // Validate role if provided
    const validRoles = ['rider', 'driver', 'admin'];
    const userRole = role || 'rider';
    if (!validRoles.includes(userRole)) {
      return res.status(400).json({
        error: `role must be one of: ${validRoles.join(', ')}`,
      });
    }

    // Hash password
    const salt = await bcrypt.genSalt(10);
    const password_hash = await bcrypt.hash(password, salt);

    // Insert user
    const result = await pool.query(
      `INSERT INTO users (full_name, email, password_hash, phone, role)
       VALUES ($1, $2, $3, $4, $5)
       RETURNING id, full_name, email, phone, role, created_at`,
      [full_name, email, password_hash, phone || null, userRole],
    );

    const user = result.rows[0];
    const token = signToken(user);

    res.status(201).json({ token, user });
  } catch (err) {
    // Unique constraint violation (duplicate email)
    if (err.code === '23505') {
      return res.status(409).json({ error: 'Email is already registered.' });
    }
    console.error('Register error:', err.message);
    res.status(500).json({ error: 'Server error during registration.' });
  }
});

// ── POST /login ──────────────────────────────────────────────────────
router.post('/login', async (req, res) => {
  try {
    const { email, password } = req.body;

    if (!email || !password) {
      return res.status(400).json({
        error: 'email and password are required.',
      });
    }

    // Look up user
    const result = await pool.query(
      'SELECT * FROM users WHERE email = $1',
      [email],
    );

    if (result.rows.length === 0) {
      return res.status(401).json({ error: 'Invalid email or password.' });
    }

    const user = result.rows[0];

    // Compare password
    const valid = await bcrypt.compare(password, user.password_hash);
    if (!valid) {
      return res.status(401).json({ error: 'Invalid email or password.' });
    }

    const token = signToken(user);

    // Return user without password_hash
    const { password_hash, ...safeUser } = user;
    res.json({ token, user: safeUser });
  } catch (err) {
    console.error('Login error:', err.message);
    res.status(500).json({ error: 'Server error during login.' });
  }
});

// ── GET /profile ─────────────────────────────────────────────────────
router.get('/profile', auth, async (req, res) => {
  try {
    // 1. Fetch user data merged with driver profile
    const userResult = await pool.query(
      `SELECT u.id, u.full_name, u.email, u.phone, u.phone_number, u.role, u.profile_pic, u.created_at, u.updated_at,
              dp.vehicle_model, 
              dp.license_plate
       FROM users u
       LEFT JOIN driver_profiles dp ON u.id = dp.driver_id
       WHERE u.id = $1`,
      [req.user.id]
    );

    if (userResult.rows.length === 0) {
      return res.status(404).json({ error: 'User not found.' });
    }
    const user = userResult.rows[0];

    // 2. Fetch ride history
    const isDriver = user.role === 'driver';
    const rideQuery = isDriver 
      ? `SELECT * FROM rides WHERE driver_id = $1 ORDER BY requested_at DESC`
      : `SELECT * FROM rides WHERE rider_id = $1 ORDER BY requested_at DESC`;
    
    const ridesResult = await pool.query(rideQuery, [req.user.id]);

    let average_rating = 0;
    let total_ratings = 0;
    let total_rides = 0;

    if (isDriver) {
      const statsResult = await pool.query(
        `SELECT 
           COALESCE(ROUND(AVG(rt.rating)::numeric, 2), 0) as average_rating,
           COUNT(rt.rating) as total_ratings,
           COALESCE(MAX(rd.completed_rides_count), 0) as total_rides
         FROM users u
         LEFT JOIN ratings rt ON u.id = rt.driver_id
         LEFT JOIN (
           SELECT driver_id, COUNT(*) as completed_rides_count 
           FROM rides 
           WHERE status = 'completed'
           GROUP BY driver_id
         ) rd ON u.id = rd.driver_id
         WHERE u.id = $1`,
        [req.user.id]
      );
      if (statsResult.rows.length > 0) {
        average_rating = parseFloat(statsResult.rows[0].average_rating);
        total_ratings = parseInt(statsResult.rows[0].total_ratings, 10);
        total_rides = parseInt(statsResult.rows[0].total_rides, 10);
      }
    }

    res.json({ 
      user: {
        ...user,
        average_rating,
        total_ratings,
        total_rides
      },
      ride_history: ridesResult.rows,
      average_rating,
      total_ratings,
      total_rides
    });
  } catch (err) {
    console.error('Profile error:', err.message);
    res.status(500).json({ error: 'Server error fetching profile.' });
  }
});

// ── PUT /profile ─────────────────────────────────────────────────────
router.put('/profile', auth, async (req, res) => {
  try {
    const { phone_number, vehicle_model, license_plate } = req.body;
    
    // Update user table
    await pool.query(
      `UPDATE users SET phone_number = $1, updated_at = NOW() WHERE id = $2`,
      [phone_number, req.user.id]
    );

    // If driver, update driver_profiles table
    if (req.user.role === 'driver') {
      await pool.query(
        `INSERT INTO driver_profiles (driver_id, vehicle_model, license_plate, updated_at)
         VALUES ($1, $2, $3, NOW())
         ON CONFLICT (driver_id) 
         DO UPDATE SET vehicle_model = EXCLUDED.vehicle_model, 
                       license_plate = EXCLUDED.license_plate,
                       updated_at = NOW()`,
        [req.user.id, vehicle_model, license_plate]
      );
    }

    res.json({ message: 'Profile updated successfully.' });
  } catch (err) {
    console.error('Update profile error:', err.message);
    res.status(500).json({ error: 'Server error updating profile.' });
  }
});

module.exports = router;
