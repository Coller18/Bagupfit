# Gupfit customer frontend

This is the public customer website. It is separate from `gupfit-frontend`, which remains the sub-admin dashboard. The landing page is at `/`; the separate booking and account page is at `/booking`.

The page loads active barbers from `GET /api/barbers/` and open appointment times from `GET /api/availability/`. Customers create a Supabase Auth account, confirm their email, then sign in to book through `POST /api/bookings/` and see their own appointments at `GET /api/my/bookings/`.

## Run locally

1. Start the Django backend with its Supabase environment variables set:

   ```powershell
   cd D:\NewGupfit\gupfit_backend
   python manage.py runserver
   ```

2. In a separate PowerShell window:

   ```powershell
   cd D:\NewGupfit\gupfit-customer-frontend
   npm install
   npm run dev
   ```

3. Open `http://localhost:5174`.

Before running the frontend, copy `.env.example` to `.env.local` and set `VITE_SUPABASE_PUBLISHABLE_KEY` to the project's publishable key. Add `http://localhost:5174/booking` to the Supabase Auth redirect URL allowlist and enable email confirmation.

Set the same publishable key in the backend PowerShell session as `SUPABASE_PUBLISHABLE_KEY`, then run `python manage.py migrate` and restart Django. The URL defaults to this project's Supabase URL. Never use a Supabase secret or service-role key in the browser.
