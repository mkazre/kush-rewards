# Deploying to cPanel (no Terminal needed)

How it works:

1. You push to `main` on GitHub.
2. **GitHub Actions** (`.github/workflows/deploy.yml`) runs the backend tests, builds the website, installs PHP packages, and pushes the finished bundle to the **`deploy`** branch.
3. A **cPanel cron job** checks the `deploy` branch every 5 minutes. When there's a new build, it copies the files into place and runs database migrations.

The server never needs Composer, Node or SSH.

```
~/repositories/kush-rewards   ← cPanel Git clone of the `deploy` branch
~/kushrewards_app             ← Laravel app (private, outside the web root) + your .env
~/public_html                 ← website, index.php, uploaded logos
```

## One-time setup

### 1. Make sure the first build exists
Push this repository to `main` (or run **Actions → Build and deploy → Run workflow** on GitHub). Wait until the run is green and a `deploy` branch appears.

### 2. PHP version
cPanel → **MultiPHP Manager** → set `kushrewards.online` to **PHP 8.2** or newer.
cPanel → **Select PHP Version → Extensions** (if shown): make sure `pdo_mysql`, `mbstring`, `fileinfo`, `openssl`, `tokenizer`, `ctype`, `xml` and `curl` are ticked.

### 3. Database
cPanel → **MySQL Databases**:
1. Create a database, e.g. `cpuser_kush`.
2. Create a user with a strong password.
3. Add the user to the database with **ALL PRIVILEGES**.

### 4. Clone the deploy branch
cPanel → **Git Version Control → Create**:
- **Clone URL:** `https://github.com/mkazre/kush-rewards.git`
- **Repository Path:** `repositories/kush-rewards`
- **Repository Name:** `kush-rewards`

After it's created, click **Manage → Basic Information → Checked-Out Branch** and choose **`deploy`**. Click **Update**.

### 5. Create the `.env` file
cPanel → **File Manager**:
1. In your home folder, create a folder `kushrewards_app`. (Tick *Settings → Show Hidden Files* so you can see `.env` files.)
2. Inside it, create a file named `.env`. Paste in the contents of [`deploy/env.production.example`](../deploy/env.production.example).
3. Fill in `DB_DATABASE`, `DB_USERNAME` and `DB_PASSWORD` from step 3, and your email in `ADMIN_EMAILS`.
4. Leave `APP_KEY` empty: the first deploy generates it.

### 6. First deploy
cPanel → **Git Version Control → Manage → Pull or Deploy → Deploy HEAD Commit**.
This runs `.cpanel.yml`, which:
- copies the app into `~/kushrewards_app` and the website into `~/public_html`;
- generates `APP_KEY`;
- creates the tables;
- seeds the demo data.

> **Back up `public_html` first** if it already contains a site: the deploy writes `index.php`, `.htaccess`, `app/` and `uploads/` into it.

### 7. Cron jobs
cPanel → **Cron Jobs**. Add two jobs. Check the PHP path in cPanel's PHP info; on most hosts it's `/usr/local/bin/php`, otherwise e.g. `/opt/cpanel/ea-php82/root/usr/bin/php`.

| Schedule | Command |
|---|---|
| Every minute (`* * * * *`) | `/usr/local/bin/php ~/kushrewards_app/artisan schedule:run >/dev/null 2>&1` |
| Every 5 minutes (`*/5 * * * *`) | `bash ~/repositories/kush-rewards/deploy/auto-update.sh >> ~/kush-deploy.log 2>&1` |

The first job runs migrations when needed, promotes `ADMIN_EMAILS` to admin, and clears expired sessions. The second job auto-deploys new builds from GitHub.
If your PHP is not at `/usr/local/bin/php`, use `PHP_BIN=/path/to/php bash ~/repositories/...` in the second command.

### 8. SSL
cPanel → **SSL/TLS Status** → run **AutoSSL** for `kushrewards.online`. The site forces HTTPS.

### 9. Check it
- https://kushrewards.online should show the age gate, then the venues map.
- https://kushrewards.online/api/stores/list should return JSON.
- Sign up with the email you put in `ADMIN_EMAILS`. Within a minute, refresh and the **Admin** tab appears.

## Everyday use

- **Deploy a change:** push to `main`. It's live within about 5 minutes of the GitHub Action finishing. To deploy immediately, use **Git Version Control → Update from Remote**, then **Deploy HEAD Commit**.
- **Logs:** `~/kush-deploy.log` (deploys) and `~/kushrewards_app/storage/logs/laravel.log` (errors).
- **Change settings:** edit `~/kushrewards_app/.env` in File Manager. Changes apply on the next request.

## Before launch

1. **Demo data:** set `SEED_DEMO=false` in `.env`. Then hide or delete the demo venues in Admin → Venues, or keep the ones you've edited into real venues. The demo reviewers can't sign in. Their emails end in `@demo.kushrewards.online`.
2. **Legal placeholders:** fill in the `[[...]]` values (company registration number, address, Information Officer, hosting provider) in `mobile/src/lib/legalContent.ts`. Both the website and the apps use them.
3. **Email:** create `support@kushrewards.online` in cPanel → Email Accounts.
4. **Google sign-in:** in Google Cloud Console → APIs & Services → Credentials, create OAuth clients:
   - **Web:** authorised JavaScript origin `https://kushrewards.online`.
   - **iOS:** bundle `za.co.kushrewards.app`.
   - **Android:** package `za.co.kushrewards.app` plus your signing SHA-1.

   Put the web ID in `GOOGLE_WEB_CLIENT_ID` and all three, comma-separated, in `GOOGLE_CLIENT_IDS`. Add the same IDs to `mobile/app.json → expo.extra`. Until then, email sign-in works on its own.
5. **Sign in with Apple** (iOS app): enable the capability for `za.co.kushrewards.app` in your Apple Developer account.

## Troubleshooting

| Symptom | Fix |
|---|---|
| "The website has not been built yet." | The deploy didn't copy `public_html/app`. Check `~/kush-deploy.log`, then run Deploy HEAD Commit again. |
| HTTP 500 on every page | `.env` missing or wrong database details. Temporarily set `APP_DEBUG=true` to see the error, then set it back. |
| API works, sign-in fails | Check `APP_URL=https://kushrewards.online` and that the site is on HTTPS (the session cookie is HTTPS-only in production). |
| Logo upload fails | `~/public_html/uploads/store-logos` must be writable (permissions 755). |
| Cron does nothing | Check the PHP path. Add `>> ~/kush-cron.log 2>&1` to the first job temporarily to see its output. |
