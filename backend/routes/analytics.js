const express = require('express');
const router = express.Router();
const pool = require('../db');

// ── GET /demand — Demand Analytics ──────────────────────────────────────
router.get('/demand', async (req, res) => {
  try {
    // 1. Peak Hours (count rides grouped by hour of the day)
    const peakHoursResult = await pool.query(`
      SELECT 
        EXTRACT(HOUR FROM requested_at) AS hour,
        COUNT(*) AS count
      FROM rides
      WHERE status IN ('completed', 'accepted', 'in_progress')
      GROUP BY hour
      ORDER BY hour ASC
    `);

    // 2. Popular Pickup Locations
    const pickupLocationsResult = await pool.query(`
      SELECT 
        pickup_location,
        COUNT(*) AS count
      FROM rides
      WHERE status IN ('completed', 'accepted', 'in_progress')
      GROUP BY pickup_location
      ORDER BY count DESC
      LIMIT 10
    `);

    // 3. Popular Dropoff Locations
    const dropoffLocationsResult = await pool.query(`
      SELECT 
        dropoff_location,
        COUNT(*) AS count
      FROM rides
      WHERE status IN ('completed', 'accepted', 'in_progress')
      GROUP BY dropoff_location
      ORDER BY count DESC
      LIMIT 10
    `);

    res.json({
      peakHours: peakHoursResult.rows.map(r => ({ hour: parseInt(r.hour), count: parseInt(r.count) })),
      popularPickups: pickupLocationsResult.rows.map(r => ({ location: r.pickup_location, count: parseInt(r.count) })),
      popularDropoffs: dropoffLocationsResult.rows.map(r => ({ location: r.dropoff_location, count: parseInt(r.count) }))
    });
  } catch (err) {
    console.error('Analytics demand error:', err.message);
    res.status(500).json({ error: 'Server error generating demand analytics.' });
  }
});

module.exports = router;
