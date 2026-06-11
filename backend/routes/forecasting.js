const express = require('express');
const router = express.Router();
const pool = require('../db');

// ── GET /hotspots — Demand Forecasting Hotspots ──────────────────────────
router.get('/hotspots', async (req, res) => {
  try {
    // Determine target hour and day of week
    const now = new Date();
    // Allow client to pass timezone offset if desired, default to India Standard Time (UTC+5:30) or local server time
    const clientOffset = req.query.offset ? parseInt(req.query.offset) : 330; // 330 mins = 5.5 hours (IST)
    
    // Adjust now to client timezone
    const clientTime = new Date(now.getTime() + clientOffset * 60 * 1000);
    const targetHour = (clientTime.getUTCHours() + 1) % 24; // Forecast for the upcoming hour
    const targetDay = clientTime.getUTCDay() === 0 ? 7 : clientTime.getUTCDay(); // 1 (Mon) - 7 (Sun)

    // 1. Fetch historical average demand for the target day and hour
    const historicalResult = await pool.query(`
      SELECT 
        pickup_location,
        COUNT(*)::float / NULLIF(COUNT(DISTINCT DATE_TRUNC('day', requested_at)), 0) AS avg_rides
      FROM rides
      WHERE 
        EXTRACT(ISODOW FROM requested_at) = $1
        AND EXTRACT(HOUR FROM requested_at) = $2
        AND status IN ('completed', 'accepted', 'in_progress')
      GROUP BY pickup_location
    `, [targetDay, targetHour]);

    // 2. Fetch recent demand (rides created in the last 2 hours)
    const recentResult = await pool.query(`
      SELECT 
        pickup_location,
        COUNT(*)::float AS recent_rides
      FROM rides
      WHERE 
        requested_at >= NOW() - INTERVAL '2 hours'
        AND status IN ('completed', 'accepted', 'in_progress', 'requested')
      GROUP BY pickup_location
    `);

    // Organize database results into maps
    const historicalMap = new Map(historicalResult.rows.map(r => [r.pickup_location, parseFloat(r.avg_rides)]));
    const recentMap = new Map(recentResult.rows.map(r => [r.pickup_location, parseFloat(r.recent_rides)]));

    // Default set of popular locations to ensure the UI is rich even with a clean database
    const defaultLocations = [
      { name: 'Main Building', baseWeight: 1.2, activeHours: [9, 10, 11, 12, 13, 14, 15, 16, 17] },
      { name: 'MGCL Library', baseWeight: 1.5, activeHours: [18, 19, 20, 21, 22, 23, 0, 1, 2] },
      { name: 'Student Activity Centre (SAC)', baseWeight: 1.0, activeHours: [16, 17, 18, 19, 20, 21] },
      { name: 'Multi Activity Centre (MAC)', baseWeight: 1.1, activeHours: [12, 13, 14, 17, 18, 19, 20] },
      { name: 'Lecture Hall Complex (LHC)', baseWeight: 1.8, activeHours: [8, 9, 10, 11, 12, 14, 15, 16, 17] },
      { name: 'Rajendra Bhawan', baseWeight: 0.8, activeHours: [7, 8, 9, 12, 13, 19, 20, 21] },
      { name: 'Cautley Bhawan', baseWeight: 0.8, activeHours: [7, 8, 9, 12, 13, 19, 20, 21] },
      { name: 'Jawahar Bhawan', baseWeight: 0.9, activeHours: [7, 8, 9, 12, 13, 19, 20, 21] },
      { name: 'Main Gate / Century Gate', baseWeight: 1.4, activeHours: [8, 9, 10, 12, 13, 17, 18, 19, 20, 21, 22] },
      { name: 'JD Gate', baseWeight: 1.0, activeHours: [8, 9, 10, 17, 18, 19, 20, 21] }
    ];

    // Combine database predictions and fallback defaults
    const hotspots = defaultLocations.map(loc => {
      const histVal = historicalMap.get(loc.name) || 0;
      const recentVal = recentMap.get(loc.name) || 0;

      // Base time-based prediction: if active hours match, boost the baseline
      const isTimeActive = loc.activeHours.includes(targetHour);
      const simulatedBaseline = loc.baseWeight * (isTimeActive ? 1.5 : 0.4);

      // Score = (Recent * 0.4) + (Historical * 0.6)
      // If no data exists, we smoothly slide into the simulated time-based baseline
      let predictedCount;
      if (histVal === 0 && recentVal === 0) {
        predictedCount = simulatedBaseline;
      } else {
        predictedCount = (recentVal * 0.4) + (histVal * 0.6);
        // Slightly blend with baseline for smoother transitions
        predictedCount = (predictedCount * 0.7) + (simulatedBaseline * 0.3);
      }

      // Format score to 1 decimal place
      predictedCount = Math.round(predictedCount * 10) / 10;

      // Determine demand level
      let demandLevel = 'Low';
      if (predictedCount >= 1.5) {
        demandLevel = 'High';
      } else if (predictedCount >= 0.7) {
        demandLevel = 'Medium';
      }

      // Generate localized suggestions
      let recommendation = '';
      if (demandLevel === 'High') {
        recommendation = `High demand expected at ${loc.name}. Head here now to match requests instantly.`;
      } else if (demandLevel === 'Medium') {
        recommendation = `Moderate demand forecasted. Solid standby spot.`;
      } else {
        recommendation = `Quiet zone. Consider positioning near Campus Gates or Library.`;
      }

      return {
        location: loc.name,
        predictedCount,
        demandLevel,
        recommendation
      };
    });

    // Sort hotspots: High demand first, then by predicted count descending
    hotspots.sort((a, b) => b.predictedCount - a.predictedCount);

    res.json({
      targetHour,
      targetDay,
      hotspots
    });
  } catch (err) {
    console.error('Forecasting hotspots error:', err.message);
    res.status(500).json({ error: 'Server error generating demand forecast.' });
  }
});

module.exports = router;
