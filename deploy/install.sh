#!/bin/bash
# Installs the built `deploy` branch on cPanel. Run by .cpanel.yml ("Deploy HEAD Commit")
# and by auto-update.sh (cron). Never touches ~/kushrewards_app/.env or uploaded logos.
set -euo pipefail

REPO="$(cd "$(dirname "$0")/.." && pwd)"
APP="$HOME/kushrewards_app"
WEB="$HOME/public_html"
PHP="${PHP_BIN:-/usr/local/bin/php}"

mkdir -p "$APP" "$WEB"

# Laravel app (outside the web root).
cp -R "$REPO/backend/." "$APP/"
mkdir -p "$APP/storage/framework/cache/data" "$APP/storage/framework/sessions" "$APP/storage/framework/views" "$APP/storage/logs" "$APP/bootstrap/cache"

# Public files: the website build, .htaccess, favicon, robots. Old hashed assets are replaced.
rm -rf "$WEB/app"
cp -R "$APP/public/." "$WEB/"
cp "$REPO/deploy/public_html/index.php" "$WEB/index.php"
mkdir -p "$WEB/uploads/store-logos"
cp "$REPO/deploy/public_html/uploads.htaccess" "$WEB/uploads/.htaccess"

if [ ! -f "$APP/.env" ]; then
  echo "Missing $APP/.env: create it from deploy/env.production.example (docs/DEPLOYMENT.md)." >&2
  exit 1
fi

# First deploy: create the encryption key so nobody has to run artisan by hand.
if grep -qE '^APP_KEY=\s*$' "$APP/.env"; then
  "$PHP" "$APP/artisan" key:generate --force
fi

"$PHP" "$APP/artisan" optimize:clear --quiet || true
"$PHP" "$APP/artisan" kush:deploy
echo "Deployed $(git -C "$REPO" rev-parse --short HEAD 2>/dev/null || echo build) at $(date)"
