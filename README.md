# Splitly

A React + Vite installment and bill tracker with Supabase Auth/Postgres, RLS, JSON backup, onboarding, and a Netlify-ready PWA shell.

## 1. Put your icon files in place
Copy these six existing files into the project's `public/` folder, keeping the exact filenames:
- `android-chrome-192x192.png`
- `android-chrome-512x512.png`
- `apple-touch-icon.png`
- `favicon.ico`
- `favicon-16x16.png`
- `favicon-32x32.png`

The app currently uses a small panda emoji as a temporary in-app mark. Replace that with your panda artwork when you provide the image asset (the PWA/browser icon files are already wired).

## 2. Create the Supabase project
1. Go to https://supabase.com and create a new project.
2. Choose a strong database password and a region close to Singapore (for example, Southeast Asia if offered).
3. Wait for the database to finish provisioning.
4. In **Project Settings → API** (or **Data API / API Keys** in the current dashboard), copy the Project URL and the publishable/anon key. Never put the `service_role` key in a browser app.

## 3. Create the database tables and security
1. Open **SQL Editor** in the Supabase dashboard.
2. Open `supabase/schema.sql` from this project.
3. Paste the entire SQL file into a new query and click **Run**.
4. Open **Table Editor** and confirm `installment_plans` and `payment_items` exist.
5. Confirm RLS is enabled for both tables. The policies scope rows to `auth.uid()`.

## 4. Configure authentication
1. In **Authentication → Providers**, enable Email.
2. In **Authentication → URL Configuration**, set your local Site URL to `http://localhost:5173`.
3. Add `http://localhost:5173/**` to Redirect URLs.
4. For production, later add your Netlify site URL (and its redirect pattern) to the allowed Redirect URLs.
5. If email confirmation is enabled, sign-up sends a confirmation email. Confirm it before signing in.

## 5. Run locally
1. Install Node.js (current LTS) from https://nodejs.org.
2. Open a terminal in this project folder.
3. Run `npm install`.
4. Copy `.env.example` to `.env.local`.
5. Replace the values with your Supabase Project URL and publishable/anon key:
   ```
   VITE_SUPABASE_URL=https://YOUR_PROJECT.supabase.co
   VITE_SUPABASE_ANON_KEY=YOUR_SUPABASE_PUBLISHABLE_OR_ANON_KEY
   ```
6. Run `npm run dev`.
7. Open the local URL printed by Vite (usually `http://localhost:5173`), create an account, and add a test plan.
8. Run `npm run build` to verify the production build.

## 6. Deploy to Netlify
1. Push this project folder to a GitHub repository.
2. In Netlify, choose **Add new site → Import an existing project** and connect the repository.
3. Set build command to `npm run build` and publish directory to `dist` (also defined in `netlify.toml`).
4. In **Site configuration → Environment variables**, add `VITE_SUPABASE_URL` and `VITE_SUPABASE_ANON_KEY` with the same values used locally.
5. Deploy the site.
6. Copy your Netlify URL. In Supabase **Authentication → URL Configuration**, set the production Site URL to that URL and add the URL plus `/*` to Redirect URLs.
7. Redeploy after changing environment variables.

## 7. Add Splitly to iPhone Home Screen
1. Open the deployed HTTPS Netlify URL in Safari on your iPhone.
2. Tap Share → **Add to Home Screen**.
3. Check that the Splitly icon and name appear, then tap Add.

## Notes / current implementation boundaries
- The app supports equal schedules (rounding cents are assigned to the earliest months) and per-month custom amounts.
- Payment chips toggle paid/unpaid. Remaining balance and completion status are derived from payment rows.
- The dashboard month switcher previews any month. The due-soon alert counts unpaid payments due in the next five days in the selected month.
- JSON import creates new records; it does not deduplicate or overwrite existing plans. Export a fresh backup before importing repeatedly.
- The first-run tour flag is stored in localStorage per signed-in user on that browser/device; replay is available from Help and Settings.
- The app uses SGD formatting by default. Change `currency:'SGD'` in `src/App.jsx` if you need another currency.
- The included PWA manifest and icon references are ready, but a service worker/offline cache is not included yet. The site is installable as a home-screen web app; offline data access is not implemented.
- For production hardening, consider adding a server-side import transaction/RPC, email password-reset UI, and a service worker. Do not expose Supabase service-role credentials in frontend code.
