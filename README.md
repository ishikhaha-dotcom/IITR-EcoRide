# IITR EcoRide 🛺

Sustainable, community-driven e-rickshaw booking platform designed specifically for the Indian Institute of Technology Roorkee (IITR) campus.

---

## 📖 Project Overview
IITR EcoRide is a real-time e-rickshaw ride-hailing system tailored for the student and driver community at IIT Roorkee. It simplifies campus transit by introducing:
* **Interactive Live Maps** to find active drivers on campus.
* **Proportional Pricing** scaling dynamically by passenger count.
* **Dynamic Driver Bidding** allowing counter-offers.
* **AI-Backed Demand Forecasting** to pre-emptively position drivers at popular campus hubs.

---

## 🛠️ Technology Stack
* **Frontend**: React (Vite), Tailwind CSS, Chart.js, Socket.IO Client.
* **Backend**: Node.js, Express.js, Socket.IO Server, PostgreSQL (Supabase client).
* **Database**: PostgreSQL (hosted on Supabase) using the `pg` pool connector.

---

## ✨ Feature List

### 🧍 Passenger Dashboard
* **Real-time Map Picker**: Tap or search to select pickup/drop-off locations.
* **Live Ride Requesting**: Request a ride with customizable base fare & optional tips.
* **Proportional Scaling**: Fare multiplies dynamically based on passenger count (e.g. ₹10/person).
* **Counter-Offer System**: Negotiate live with drivers counter-bidding in real-time.
* **Live Chat**: Message drivers using quick contextual replies ("I'm coming", "I've reached") or free-text typing.
* **Scheduled Rides**: Book rides for a future time and date.

### 🚗 Driver Dashboard
* **Toggle Availability**: Switch online/offline to broadcast location.
* **Real-Time Bids**: Review passenger requests, place custom bid values, and win rides.
* **Interactive Ride States**: Step-by-step progress tracking (Accepted → In Progress → Completed).
* **Analytics Dashboard**: Review weekly wallet earnings, total rides, and feedback ratings.
* **Proactive Reminders**: Get automatic browser notifications 15 minutes before an accepted scheduled ride starts.

### 🔮 AI Insights & Demand Forecasting
* **Predicted Hotspots (Option A)**: Time-series model combining historical weekday baselines ($60\%$) and recent 2-hour trends ($40\%$) to predict future hotspots (e.g., MGCL Library, Lecture Hall Complex, Main Gate).
* **Historical Activity Charts**: Beautiful dark-theme bar charts tracking hourly ride statistics.

---

## ⚙️ Setup Instructions

### Prerequisites
* **Node.js** (v16.x or higher)
* **npm** (v8.x or higher)
* A running **PostgreSQL database** instance.

### Configuration
1. Clone this repository to your local machine.
2. In the `backend` directory, create a `.env` file containing:
   ```env
   PORT=5000
   DATABASE_URL=your_postgresql_connection_string
   JWT_SECRET=your_jwt_signing_secret
   ```

---

## 🚀 Running the Application

### 1. Database Migrations
Run the schema setup script to configure tables and indexes in your PostgreSQL database:
```bash
cd backend
npm run migrate # Run schema.sql and migrations
```

### 2. Run the Backend API Server
```bash
cd backend
npm install
npm start # Starts the API and WebSocket server on port 5000
```

### 3. Run the Frontend Development Server
```bash
cd frontend
npm install
npm run dev # Starts Vite dev server on http://localhost:5173
```

---

## 👨‍💻 Community Details
* **Tagline**: *For IITR Students, By IITR Students*
* **Footer**: *Made with 💙 for the IITR community*
