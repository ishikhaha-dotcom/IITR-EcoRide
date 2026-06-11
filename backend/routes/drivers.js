// ─── Driver Availability Routes ──────────────────────────────────────
// PUT  /api/drivers/availability    — toggle own availability + location
// GET  /api/drivers/available       — list all available drivers
// GET  /api/drivers/availability/me — get own availability record
// ─────────────────────────────────────────────────────────────────────

const express = require('express');
const pool    = require('../db');
const auth    = require('../middleware/authMiddleware');

const router = express.Router();

// All driver routes require authentication
router.use(auth);

// ── PUT /availability — Upsert Own Availability ─────────────────────
router.put('/availability', async (req, res) => {
  try {
    if (req.user.role !== 'driver') {
      return res.status(403).json({
        error: 'Only drivers can update availability.',
      });
    }

    const { is_available, current_lat, current_lng, heading } = req.body;

    if (typeof is_available !== 'boolean') {
      return res.status(400).json({
        error: 'is_available (boolean) is required.',
      });
    }

    // Upsert: insert if first time, update if already exists
    const result = await pool.query(
      `INSERT INTO driver_availability
         (driver_id, is_available, current_lat, current_lng, heading, updated_at)
       VALUES ($1, $2, $3, $4, $5, NOW())
       ON CONFLICT (driver_id)
       DO UPDATE SET
         is_available = EXCLUDED.is_available,
         current_lat  = EXCLUDED.current_lat,
         current_lng  = EXCLUDED.current_lng,
         heading      = EXCLUDED.heading,
         updated_at   = NOW()
       RETURNING *`,
      [
        req.user.id,
        is_available,
        current_lat || null,
        current_lng || null,
        heading || null,
      ],
    );

    res.json({ availability: result.rows[0] });
  } catch (err) {
    console.error('Update availability error:', err.message);
    res.status(500).json({ error: 'Server error updating availability.' });
  }
});

// ── GET /available — List All Available Drivers ─────────────────────
router.get('/available', async (req, res) => {
  try {
    const result = await pool.query(
      `SELECT
         da.driver_id,
         u.full_name,
         da.current_lat,
         da.current_lng,
         da.heading,
         da.updated_at
       FROM driver_availability da
       JOIN users u ON u.id = da.driver_id
       WHERE da.is_available = true
       ORDER BY da.updated_at DESC`,
    );

    res.json({ drivers: result.rows });
  } catch (err) {
    console.error('List available drivers error:', err.message);
    res.status(500).json({ error: 'Server error listing drivers.' });
  }
});

// ── GET /availability/me — Get Own Availability ─────────────────────
router.get('/availability/me', async (req, res) => {
  try {
    if (req.user.role !== 'driver') {
      return res.status(403).json({
        error: 'Only drivers can view their own availability.',
      });
    }

    const result = await pool.query(
      'SELECT * FROM driver_availability WHERE driver_id = $1',
      [req.user.id],
    );

    if (result.rows.length === 0) {
      return res.json({
        availability: null,
        message: 'No availability record yet. Use PUT /availability to set.',
      });
    }

    res.json({ availability: result.rows[0] });
  } catch (err) {
    console.error('Get own availability error:', err.message);
    res.status(500).json({ error: 'Server error fetching availability.' });
  }
});

module.exports = router;
