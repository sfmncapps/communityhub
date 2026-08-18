THREE separate bugs found from your console log, all fixed:

1. RLS blocking the OAuth pending-record insert (the actual root
   cause of "no profile created"). Frontend was inserting into
   users_pending directly using the anon key, which RLS blocks.
   Moved this to a new backend endpoint (service_role, bypasses RLS):

     POST /auth/oauth-check

   COPY IN (overwrite):
     backend/src/controllers/authController.js
     backend/src/routes/authRoutes.js
     frontend/src/components/auth/LoginForm.jsx

2. Two more files still hardcoded the OLD lost-access Supabase
   project (src/supabaseClient.js and src/pages/supabaseClient.js
   — different from the correct src/config/supabaseClient.js).
   Directory.jsx, MyDirectory.jsx, and MyEvents.jsx were importing
   the stale ones, causing ERR_NAME_NOT_RESOLVED.

   COPY IN (overwrite):
     frontend/src/pages/MyDirectory.jsx
     frontend/src/pages/MyEvents.jsx
     frontend/src/pages/Directory.jsx

   DELETE these 2 files entirely (no longer used anywhere):
     frontend/src/supabaseClient.js
     frontend/src/pages/supabaseClient.js

3. The 404 on /api/auth/me means your backend is still running
   OLD code — your dev script is "node server.js" with no
   auto-reload, so every backend file change needs a manual
   restart. After copying files in:

     Ctrl+C the backend terminal, then: npm run dev

   (Optional but recommended: install nodemon and change the dev
   script to "nodemon server.js" so this stops happening.)

AFTER APPLYING ALL OF THE ABOVE: restart both frontend and backend,
then retry Google login with a fresh account (or delete the existing
auth.users row for sivareddy683970@gmail.com and its orphaned
users_pending row if any, to test clean).
