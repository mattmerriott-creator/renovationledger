# RenovationLedger

Project tracking for real estate investors. Rehabs and new builds, single family and multi family. Budget, transactions, draws, comps, lender-ready reports.

Note: the project folder is still named `buildledger` locally (that was the working name during the build). The app, domain, and all user-facing branding are RenovationLedger — only the folder path is unchanged. Rename the folder yourself later if you want the path to match; nothing in the code depends on the folder's name.

## Run it

```bash
cd ~/buildledger
npm install
npm run dev
```

Open http://localhost:3000. Create an account on the signup page. All data lives in `buildledger.db` (SQLite) in this folder. Back that file up and you have backed up everything.

## Live comps

Zillow retired its public comps API, so live sold comps come from RentCast (same public-record/MLS data, pulled by distance from the project address). Every comp links to its Zillow page for verification.

1. Get a free key at https://app.rentcast.io/app/api (50 lookups a month free)
2. Copy `.env.example` to `.env.local`
3. Set `RENTCAST_API_KEY=your_key`
4. Restart the app

Without a key the comps page shows sample data, clearly labeled. Comps results are cached 24 hours per address to stay inside the free tier.

## Budget calculator

Every project starts from a 19-category default template — delete lines you don't need, add your own (septic, pool, garage, anything). Each line prices two ways: type a flat total, or enter a Qty and Unit cost and it calculates live (1,250 sqft × $4.50, 12 windows × $150). Units: job, sqft, each, lf, sq, sheet, month. Actuals from logged transactions land against each line for budget vs. actual.

## Receipt scanning

Attach a receipt photo or PDF to any transaction. With an `ANTHROPIC_API_KEY` in `.env.local`, the Scan button reads the vendor, date, total, and suggests the budget category (roughly a cent or two per scan, billed to your Anthropic account). Without a key, receipts still attach; you type the fields. Files are stored in `uploads/` and only served to the logged-in owner.

## Photos

Each project has a Photos tab. Tag photos Before / In progress / Finished and caption them. Finished photos are marked for the lender report automatically; toggle any photo in or out.

## Reports

Every project has a Report tab:
- One-page lender report: deal summary, work-completed rundown (your summary plus per-category scope and cost), budget vs. actual, draw schedule, transaction ledger, and property photos. Print or save as PDF from the browser.
- CSV downloads for budget, transactions, and draws.

## Going live

1. Push this folder to GitHub
2. Deploy anywhere that runs Node with a persistent disk (Railway, Render, Fly.io, or a $6/mo DigitalOcean droplet). Vercel will NOT work as-is because SQLite needs a disk that persists.
3. Set `SITE_URL=https://yourdomain.com` in the environment so SEO tags and the sitemap use the real domain
4. Submit the sitemap in Google Search Console

## Paywall (when ready)

The pieces are already in place:
- Every user has a `plan` column in the database, currently `'free'`
- Add Stripe Checkout: on successful subscription webhook, set `plan = 'pro'`
- Gate project creation in `lib/actions.ts` (`createProject`) on the plan

## Stack

Next.js 15 (App Router, server actions), SQLite via better-sqlite3, no other services. Auth is email + password (scrypt-hashed) with 30-day session cookies. Design follows the Spaciaz design system.
