# Phase 4: Demand Forecasting (Machine Learning/Time-Series) 🤖

This is the final phase of the Campus Ride App roadmap. The goal is to predict future ride demand and high-activity hotspots to help drivers position themselves effectively before requests even happen.

The user has selected **Option A (Node.js + PostgreSQL Time-Series Analytics)** for its performance, simplicity, and ease of deployment.

## Finalized Approach (Option A)

We will implement a time-series forecasting model using historical ride data stored in PostgreSQL. The prediction will combine:
1. **Historical Location Baselines**: Grouping completed/ongoing rides by day-of-week, hour-of-day, and pickup location.
2. **Recent Trends**: Factoring in ride activity in the last 1–2 hours to adjust predictions for current real-time spikes.
3. **Exponential Smoothing**: Calculating a weighted "Demand Score" (High, Medium, Low) for each location for the *upcoming hour*.

---

## Proposed Changes

### 1. Database & Prediction Logic
We will write a query that analyzes historical rides to find patterns:
- Calculate average demand for a given location, weekday, and hour of the day.
- Fetch recent demand (rides created in the last 2 hours).
- Calculate a predicted demand score using a simple formula:
  $$\text{Predicted Demand} = \alpha \times \text{Recent Demand} + (1 - \alpha) \times \text{Historical Avg Demand}$$
  Where $\alpha = 0.4$ weight for real-time trends, and $0.6$ weight for historical patterns.

### 2. Backend Route
#### [NEW] `routes/forecasting.js`
- Create `GET /api/forecasting/hotspots`
- Input: Optional timezone offset.
- Output: An array of locations with their calculated `predictedCount`, `demandLevel` ('High' | 'Medium' | 'Low'), and `recommendation` text.

#### [MODIFY] [server.js](file:///c:/Users/Ishika/Desktop/campus-ride-app/backend/server.js)
- Register the `/api/forecasting` route handler.

### 3. Frontend Visualization
#### [MODIFY] [Insights.jsx](file:///c:/Users/Ishika/Desktop/campus-ride-app/frontend/src/pages/Insights.jsx)
- Update the page style to be cohesive with the professional 3D dark blue/pastel dashboard aesthetic.
- Add a new visual section: **"🔮 AI Demand Forecast"**
- Show a horizontal bar chart of forecasted hotspots for the next hour.
- Provide a clean list of hotspots with pastel pills ('High' = Soft Red/Coral, 'Medium' = Soft Orange, 'Low' = Soft Blue).
- Add micro-animations/hover-effects to make cards feel premium.

---

## Verification Plan

### Automated/Manual Verification
- Query `/api/forecasting/hotspots` directly to verify JSON output schema.
- Open the Insights page to verify that the demand forecast widgets render perfectly and follow the dark-blue theme with pastels.
