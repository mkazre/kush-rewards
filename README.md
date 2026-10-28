# KushRewards SA

An information and community guide to cannabis clubs, lounges and venues for adults 18+ in South Africa, starting in Roodepoort and the West Rand. Operated by Convenient Living Solutions. Live at **https://kushrewards.online**.

It never shows prices, menus or stock, and never takes orders, payments or deliveries (see [docs/APP-STORE-COMPLIANCE.md](docs/APP-STORE-COMPLIANCE.md)).

## What's in this repository

| Folder | What it is |
|---|---|
| [`backend/`](backend) | **Laravel 12 API** (PHP 8.2, MySQL). Every endpoint in the handover, under `/api`. Also serves the website. |
| [`web/`](web) | **Website**: React 19 + Vite + Tailwind CSS 4 + React Router. Built into `backend/public/app`. |
| [`mobile/`](mobile) | **iOS and Android apps**: React Native + Expo. |
| [`deploy/`](deploy) | cPanel install scripts, production `.env` template, `public_html/index.php`. |
| [`docs/`](docs) | [Handover](docs/HANDOVER.md) (what every screen does, API contract, rules), [store compliance](docs/APP-STORE-COMPLIANCE.md), [deployment guide](docs/DEPLOYMENT.md), original PostgreSQL schema. |

The website and the apps share one set of rules. `web/` imports the API types, content filter, review tags, suburb list and legal text straight from `mobile/src` (alias `@shared`), so the two can't drift apart. The backend has PHP copies of the content filter, tags and suburbs in `backend/app/Support/`. Keep them in step.

```
          https://kushrewards.online
                     │
       ┌─────────────┴─────────────┐
   /api/*  (Laravel)        everything else → React website (public/app)
       │
     MySQL
       ▲
  Expo apps call https://kushrewards.online/api with a Bearer token
  (the website uses the same token in an HTTP-only cookie)
```

## Run it locally

You need PHP 8.2+, Composer and Node 20+.

```bash
# 1. API (SQLite locally, with demo data)
cd backend
composer install
cp .env.example .env && php artisan key:generate
touch database/database.sqlite
php artisan kush:deploy          # migrate + seed demo venues
php artisan serve                # http://127.0.0.1:8000

# 2. Website (hot reload; /api is proxied to :8000)
cd web
npm install
npm run dev                      # http://localhost:5173

# 3. Mobile app
cd mobile
npm install && npx expo install --fix
# For local testing, point expo.extra.apiBaseUrl in app.json at http://<your-PC-IP>:8000/api
npx expo start
```

To make yourself an admin locally, sign up on the website, then add your email to `ADMIN_EMAILS` in `backend/.env` and run `php artisan kush:deploy`.

Tests: `cd backend && php artisan test` (covers the handover's acceptance checklist). Typecheck: `cd web && npm run typecheck`.

## Deploying

Push to `main`. GitHub Actions tests and builds everything and publishes the `deploy` branch, and the cPanel cron job installs it within 5 minutes. First-time setup: [docs/DEPLOYMENT.md](docs/DEPLOYMENT.md).

## Customising the website

- **Colours and fonts:** `web/src/index.css` (light and dark tokens at the top, reusable `btn`, `card`, `chip`, `input` styles below).
- **Site settings:** `web/src/lib/site.ts` (venue types shown, map tiles, support email fallback).
- **Pages:** `web/src/pages/`. **Shared pieces:** `web/src/components/`.
- **Legal text:** `mobile/src/lib/legalContent.ts` (used by both the website and the app). Fill in the `[[placeholders]]` before launch.
