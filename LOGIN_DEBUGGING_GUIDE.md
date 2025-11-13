# Login Debugging & Setup Guide

## What I Fixed

I've identified and fixed the login issue:

1. **Created `.env.local` in the frontend** — The Vite app needs this to connect to the backend API at `http://localhost:5000`.
2. **Enhanced AuthContext** — Added proper error handling and state management so error messages from the backend are displayed.
3. **Improved Login page** — Shows error messages inline (bad credentials, connection issues, etc.) instead of generic alerts.
4. **Enhanced API client** — Added response interceptor that catches errors and provides helpful messages if the backend isn't reachable.
5. **Created `.env.example` in backend** — For reference and reproducibility.

---

## Quick Start (Steps to Get Login Working)

### Prerequisites
- MongoDB running on `localhost:27017` (or update `MONGO_URI` in backend `.env`)
- Node.js 16+ installed
- Two terminal windows or tabs

### Step 1: Prepare the Backend

```powershell
cd 'c:\Users\Aman Sinha\Desktop\React_websites\restaurant-saas\backend'
npm install
```

Verify your `.env` file has:
```properties
MONGO_URI=mongodb://localhost:27017/restaurant_saas
NODE_ENV=development
PORT=5000
JWT_SECRET=your_jwt_secret_key_here
JWT_REFRESH_SECRET=your_refresh_secret_key_here
FRONTEND_URL=http://localhost:3000
CORS_ORIGIN=http://localhost:3000
```

### Step 2: Seed the Platform Admin

Run the seed script to create the default admin account:

```powershell
node src/seedPlatformAdmin.js
```

You should see:
```
✅ Connected to MongoDB
✅ Platform admin created successfully:
Email: admin@platform.com
Password: Admin@123

You can now login with these credentials at:
http://localhost:3000/platform/login
```

### Step 3: Start the Backend Server

```powershell
npm run dev
```

You should see:
```
✅ Server running on port 5000 in development mode
```

### Step 4: Prepare and Start Frontend (in a new terminal)

```powershell
cd 'c:\Users\Aman Sinha\Desktop\React_websites\restaurant-saas\frontend'
npm install
npm run dev
```

You should see:
```
VITE v7.1.7  ready in 123 ms

➜  Local:   http://localhost:5173/
```

### Step 5: Test Login

1. Open **http://localhost:5173** in your browser
2. You'll be redirected to the login page
3. Enter credentials:
   - **Email:** `admin@platform.com`
   - **Password:** `Admin@123`
4. Click **Sign in**

If successful, you'll see the **Platform Owners** dashboard.

---

## Troubleshooting Login Errors

### Error: "No response from server..."
- Backend isn't running on port 5000
- Check the terminal where you ran `npm run dev` in the backend
- Verify `MONGO_URI` in backend `.env` is correct and MongoDB is running

### Error: "Invalid email or password"
- Credentials are wrong, or the seed script wasn't run
- Run the seed script again: `node src/seedPlatformAdmin.js`
- Or manually verify the admin exists in MongoDB

### Error: "Cannot find module 'react-router-dom'..."
- You didn't run `npm install` in frontend
- Run: `npm install`

### Error: Connection refused at `localhost:5000`
- Backend is not running
- Start backend with: `npm run dev`

---

## What's Next

Once login is working:
1. Go to **http://localhost:5173/platform** (or click the navbar link)
2. You'll see the **Owners list**
3. Try:
   - Click **+ New Owner** to create an owner (modal form)
   - Click **Stats** to see platform metrics
   - Click **Edit** to modify an owner
   - Click **View** to see owner details
   - Use **Activate/Deactivate**, **Delete**, **Reset PW** buttons

---

## Files Changed

### Frontend
- **Created:** `.env.local` — API base URL configuration
- **Updated:** `src/contexts/AuthContext.tsx` — Better error handling
- **Updated:** `src/platform/pages/Login.tsx` — Error display
- **Updated:** `src/api/client.ts` — Response error interceptor

### Backend
- **Created:** `.env.example` — Environment variable reference

---

## API Endpoints Used

- `POST /api/platform/login` — Platform admin login
- `GET /api/platform/owners` — List all owners
- `POST /api/platform/owners` — Create new owner
- `GET /api/platform/owners/:id` — Get owner details
- `PUT /api/platform/owners/:id` — Update owner
- `PATCH /api/platform/owners/:id/status` — Toggle owner status
- `DELETE /api/platform/owners/:id` — Delete owner
- `POST /api/platform/owners/:id/reset-password` — Reset owner password
- `GET /api/platform/stats` — Platform statistics

---

## Notes

- The frontend stores the access token in `localStorage` — it persists across page refreshes
- The backend sets a refresh token in an httpOnly cookie for security
- Error messages from the backend are now displayed on the login page
- The API client automatically includes the access token in all requests via the `Authorization` header
