# Get Connected — October 2026 repair release (candidate)

This ZIP is a candidate update based on the Oct 4 repository snapshot. It has **not**
been deployed to the production Raspberry Pi. Test on a backup / staging environment.

## Changes

- Fixes the invalid nested `<form>` on My Profile: Add Song no longer triggers the
  outer profile form. The existing POST `/profiles/me/songs` route and 10-song limit remain.
- Adds a student's `needs_info` reply workflow (admin note shown to student, response
  submitted back to pending queue, admin sees the reply). One Alembic migration adds
  `verification_requests.student_response`.
- The bulletin's Connections badge now sums *incoming unread* message counts from
  existing `/chats` responses, with a 15-second refresh and hidden zero badge.
- Login rejects suspended/non-active accounts. Permanent deletion already exists in
  the original repository; no destructive extra deletion routines were added.
- Changes the browser tab title to `Get Connected`.
- Includes **example**, not active, Caddy configuration for React HTML navigation and
  backend JSON routes. Keep your existing Cloudflare tunnel setup intact.

## Before production deployment

1. Backup PostgreSQL AND the Pi's Caddyfile. A rollback of the code alone is not
   a database rollback. Do not run `alembic downgrade` on a live DB without review.
2. Confirm the running Pi deployment is based on this repository revision. It may
   have local changes absent from the ZIP.
3. In a test DB, run `alembic upgrade head` from the repository root using your
   existing virtual environment and safe environment variables.
4. Install frontend dependencies in the project's `frontend` folder with `npm ci`;
   run `npm run build` and `npm run lint`. Put the generated `dist` where your current
   Caddyfile expects it, using the *existing* deployment method.
5. Compare `/etc/caddy/Caddyfile` with `deployment/Caddyfile.example`; merge only
   the needed routing behavior, keeping custom routes. Run `sudo caddy validate
   --config /etc/caddy/Caddyfile`, then reload Caddy using your existing setup.
6. Restart FastAPI only after the migration has completed and backups exist.
7. Test each feature using two non-admin student accounts and one admin account:
   - add a song; navigate away/back; reload; confirm persistence and 10-song cap;
   - admin requests info, student sees question and submits, admin reads response;
   - one incoming unread chat message gives Connections (1); sender's unread stays 0;
   - marked-read message lowers count after next refresh;
   - F5 on `/chats/9`, `/connections`, `/my-profile` shows React rather than JSON;
   - tab says Get Connected;
   - suspended test account cannot log in and permanently deleted test account is
     absent from the users table and `/admin/users`.

## Still requires live Pi information

The reported **total users tally** isn't implemented as such in the uploaded React
repository. The original permanent-delete API really deletes the `users` row inside
one commit, or reports HTTP 409 if foreign keys prevent it. If a separate ESP32/Pi
monitor shows the old total, inspect its data source/cache; don't erase additional
users to force the tally down. Check `SELECT id, username, account_status FROM users
WHERE username = 'YOUR_TEST_USERNAME';` and `SELECT count(*) FROM users;` in psql.

The React HTML routing correction is a Caddy change, not a change applied to the ZIP's
running production configuration. Browser reload on a *chat* URL can initially return
its connections list after React mounts if the history state is missing (by design in
this repo). Improving deep-link chat restoration is a separate UX step.

## Checks completed in this environment

- Python modules compile successfully.
- Alembic revision graph has one head after adding the migration.
- The student information reply flow passed a small in-memory database round-trip.
- Full frontend `npm ci`/Vite build were not available: package downloads timed out
  in this environment, and the partial node_modules does not contain Vite's CLI.
