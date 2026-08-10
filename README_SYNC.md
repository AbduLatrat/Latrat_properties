Local server for booking emails and Git sync

1) Install Node dependencies

   npm install

2) Create a `.env` file (copy from `.env.example`) and fill in your SMTP credentials. For Gmail use an App Password.

3) Start the server locally

   npm start

4) The website will POST booking data to `http://localhost:3000/book` and the sync button will POST to `http://localhost:3000/sync`.

Notes:
- If SMTP is not configured the booking will be saved to `bookings.log` locally instead of being emailed.
- The `/sync` endpoint runs `git add -A`, `git commit -m "..."` and `git push`. Make sure your environment has git configured and remote set.
- For security set `SYNC_TOKEN` in `.env` and pass header `X-SYNC-TOKEN` when calling `/sync`.
