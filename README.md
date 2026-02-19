# Expense Tracker

Quick expense logging for your phone. Add amount → pick category → done.

**Categories:** Food, Transport, Shopping, Necessities, Groceries, Others.

## Run locally

- **Node.js 20+** required (Next.js 16 needs it).
- Install: `npm install`
- Dev: `npm run dev` → open [http://localhost:3000](http://localhost:3000)
- Build: `npm run build` then `npm start`

## Deploy to Vercel (use on iPhone)

1. Push this repo to GitHub (or connect your Git provider in Vercel).
2. Go to [vercel.com](https://vercel.com) → **Add New** → **Project** → import this repo.
3. Deploy (no env vars needed for the basic app).
4. On your iPhone: **Settings → Accessibility → Touch → Back Tap** → set **Triple Tap** to open a **Shortcut** that opens your Vercel app URL in Safari (or add the URL to Home Screen for a one-tap icon).

Data is stored in your browser (localStorage), so it stays on the device you use. Later you can add a database (e.g. Vercel Postgres) to sync across devices.
