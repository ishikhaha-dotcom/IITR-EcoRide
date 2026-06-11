# IITR EcoRide Deployment Guide 🚀

Follow these quick steps to host your application live and push it to a public GitHub repository so it is fully reproducible.

---

## Part 1: Push Code to a Public GitHub Repository 💻

The code has already been initialized as a git repository locally with a clean `.gitignore` and committed!

1. Open your browser and go to [github.com/new](https://github.com/new).
2. Create a new repository named `iitr-ecoride`. Ensure it is **Public**. Do NOT initialize it with a README, gitignore, or license (they are already created).
3. Copy the repository URL (e.g., `https://github.com/YOUR_USERNAME/iitr-ecoride.git`).
4. In your terminal, run the following commands to link the repository and push:
   ```bash
   git remote add origin https://github.com/YOUR_USERNAME/iitr-ecoride.git
   git branch -M main
   git push -u origin main
   ```

---

## Part 2: Deploy Frontend on Vercel ⚡
*Vercel offers free, instant hosting for React/Vite frontends, just like the BookLoop demo.*

1. Go to [vercel.com](https://vercel.com) and log in with your GitHub account.
2. Click **Add New...** → **Project**.
3. Import your `iitr-ecoride` repository.
4. In the configuration:
   * **Framework Preset**: Vite
   * **Root Directory**: `frontend`
5. Under **Environment Variables**, add:
   * `VITE_API_URL` = `https://your-backend-url.onrender.com/api` (You will get this URL in the next part).
6. Click **Deploy**. Vercel will build your React frontend and give you a public URL (e.g., `https://iitr-ecoride.vercel.app`).

---

## Part 3: Deploy Backend on Render ⚙️
*Render is a free/affordable hosting service for Node.js API servers.*

1. Go to [render.com](https://render.com) and log in with your GitHub account.
2. Click **New** → **Web Service**.
3. Import your `iitr-ecoride` repository.
4. In the configuration:
   * **Runtime**: Node
   * **Build Command**: `cd backend && npm install`
   * **Start Command**: `cd backend && npm start`
5. Under **Environment Variables**, add the variables from your local `.env`:
   * `DATABASE_URL` = `your_supabase_postgresql_connection_string`
   * `JWT_SECRET` = `your_jwt_signing_secret`
   * `PORT` = `5000`
6. Click **Create Web Service**. Render will spin up the backend server and provide you with a public URL (e.g., `https://iitr-ecoride.onrender.com`).
   * *Note: Once Render completes, copy this URL and update the `VITE_API_URL` environment variable in your Vercel project configuration!*

---

## Part 4: Keep PostgreSQL Database on Supabase 📦
Your PostgreSQL database is already fully set up and running on Supabase! 
* The Render backend will connect to it automatically using the `DATABASE_URL` environment variable you provided.
