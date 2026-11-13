# Gupfit frontend

React and Vite sub-admin dashboard for the Gupfit Django API.

## Run locally

1. In `gupfit_backend`, keep the PowerShell window with the Supabase database environment variables set, then run:

   ```powershell
   python manage.py migrate
   python manage.py runserver
   ```

2. In a second PowerShell window, start the frontend:

   ```powershell
   cd D:\NewGupfit\gupfit-frontend
   npm run dev
   ```

3. Open `http://localhost:5173` and sign in with a staff account assigned to the **Sub-admin** group.

The dashboard can add barbers, publish date-and-time availability slots, and view customer bookings. Customers can create bookings through `POST /api/bookings/`; open slots are listed at `GET /api/availability/`. To use a different backend address, copy `.env.example` to `.env.local`, change `VITE_API_BASE_URL`, and restart Vite. The local environment file is ignored by Git.
