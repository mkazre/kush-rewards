# Publishing KushRewards SA on Google Play

A step-by-step guide from the built app to a live listing. Allow 1–3 weeks the first time: new developer accounts need identity checks and, for personal accounts, a 14-day closed test.

Listing text, ratings answers and policy reasoning are in [APP-STORE-COMPLIANCE.md](APP-STORE-COMPLIANCE.md) §6.2. Store artwork is in [store-assets/](store-assets).

---

## 0. What you need first

| Item | Where |
|---|---|
| Google Play developer account (US$25, once) | https://play.google.com/console/signup. Choose **Organisation** (Convenient Living Solutions) if you can: it needs a D-U-N-S number but **skips the 12-tester / 14-day test**. A personal account works too (see step 6). |
| The production app file (`.aab`) | Built by EAS: Expo dashboard → **khuphukiles-team / kush-rewards → Builds** → the latest **production** Android build → **Download**. |
| Website live with the legal pages | https://kushrewards.online/privacy, /terms, /support, /delete-account (no age gate on these). |
| Demo reviewer account | Create one in **Admin → Users → Add user** (role: Customer), e.g. `playreview@kushrewards.online`. Google's reviewers use it. |
| Legal details filled in | **Admin → Settings → Legal details** (registration number, address, Information Officer). |
| Demo data removed | **Admin → Settings → Remove demo data**, then add your real venues. Reviewers will check that listings look real. |
| Support mailbox | `support@kushrewards.online` in cPanel → Email Accounts. |

## 1. Build a new app file (whenever the app changes)

```powershell
cd "C:\Users\Mkhaliphi.Mnguni\OneDrive - Smollan\Desktop\Sites\Kush Rewards\mobile"
npx eas-cli build -p android --profile production
```

The build takes 10–25 minutes on Expo's servers. EAS raises the version code automatically. Your signing key (upload key) is stored safely by Expo; never delete it from the Expo dashboard.

Changes to the website, venues, splash screens, legal details or Google settings **don't need a new app build**: the app reads them from the server.

## 2. Create the app in Play Console

1. **Play Console → Create app**.
2. App name `KushRewards SA: Club Guide`, language English (South Africa), **App**, **Free**.
3. Tick the declarations (Developer Program Policies, US export laws) → **Create app**.

## 3. Store listing (Grow → Store presence → Main store listing)

| Field | Value |
|---|---|
| App name | `KushRewards SA: Club Guide` |
| Short description | `Find cannabis clubs and venues near you: hours, directions and honest reviews.` |
| Full description | Copy from APP-STORE-COMPLIANCE.md §6.1 "Description" |
| App icon (512×512) | `docs/store-assets/play-icon-512.png` |
| Feature graphic (1024×500) | `docs/store-assets/feature-graphic-1024x500.png` |
| Phone screenshots (2–8) | Take them on a phone with the installed app: Discover with the map, a venue page, Reviews, the Suggest form. Don't show anything that looks like prices or products. |
| Category | Lifestyle |
| Email | support@kushrewards.online |
| Website | https://kushrewards.online |
| Privacy policy | https://kushrewards.online/privacy |

## 4. App content (Policy → App content): answer every section

- **Privacy policy:** `https://kushrewards.online/privacy`
- **App access:** *All or some functionality is restricted* → **Add instructions**:
  - Name: Demo account
  - Username / password: the demo reviewer account from step 0
  - Instructions: *"On first launch enter any date of birth over 18 (e.g. 01 01 1990). Browse Discover and open a venue. Sign in with the demo account to write a review, report or block a review, and suggest a venue. Account deletion: Profile → About & legal → Delete my account."*
- **Ads:** No.
- **Content rating:** start the questionnaire, choose *Reference, News or Educational*. Answer **Yes** to references to drugs (cannabis) and to user-generated content and user interaction. Answer **No** to purchases, gambling, violence, sexual content and sharing location with other users. Expect an 18+ / Mature rating.
- **Target audience:** **18 and over** only.
- **News app:** No. **Government app:** No. **Financial features:** None. **Health:** None.
- **Data safety:**
  - Data collected: **Personal info** → Name, Email address, User IDs (purpose: account management, app functionality). **App activity** → App interactions (analytics), Other user-generated content (app functionality). **Photos** (admins uploading venue logos only; optional).
  - **Location: not collected.** The app uses GPS only on the phone to sort venues by distance; it is never sent to the server.
  - Shared with third parties: **No**. Encrypted in transit: **Yes**. Users can request deletion: **Yes**.
- **Account deletion:** URL `https://kushrewards.online/delete-account`.
- **Advertising ID:** No.

## 5. App signing and Google sign-in

1. **Release → Setup → App signing:** keep the default **Google Play App Signing**. Google re-signs the app with its own key.
2. Copy the two SHA-1 fingerprints you need:
   - the **App signing key certificate** SHA-1, from Play Console on this page;
   - the **upload key** SHA-1, from running `npx eas-cli credentials -p android` → *production* → it shows the keystore SHA-1.
3. In **Google Cloud Console → APIs & Services → Credentials** (same project as the website's Google login):
   - **OAuth consent screen:** External, app name KushRewards SA, support email, logo, privacy and terms URLs → **Publish app**.
   - **Create credentials → OAuth client ID → Web application:** add authorised JavaScript origin `https://kushrewards.online`. Copy the client ID.
   - **Create credentials → OAuth client ID → Android:** package `za.co.kushrewards.app`, SHA-1 = the **App signing key** SHA-1. Create a second Android client with the **upload key** SHA-1 so test builds work too.
4. On the website, go to **Admin → Settings → Google sign-in**: paste the **Web client ID** and one **Android client ID**, then **Save**. The "Continue with Google" button appears in the app and on the website. No new app build is needed.

If Google sign-in on the phone says *"isn't set up for this app yet"*, a SHA-1 is missing or the package name is wrong in step 3.

## 6. Testing track

- **Organisation account:** go straight to step 7. An internal test with your own email first is still a good idea.
- **Personal account (created after Nov 2023):** **Testing → Closed testing → Create track**, upload the `.aab`, add **at least 12 testers** (Google accounts) and keep them opted in for **14 days**. Then apply for production access from the Dashboard.

To test: **Testing → Internal testing → Create release → upload the .aab → testers → copy the link**, open it on your phone and install from Play.

## 7. Production release

1. **Release → Production → Countries/regions:** add **South Africa only**.
2. **Create new release** → upload the `.aab` from step 0.
3. Release name `2.0.0`. Release notes: *"First release: find cannabis clubs and venues near you, opening hours, directions and honest reviews. For adults 18+."*
4. **Review release** → fix any warnings → **Start rollout to Production**.
5. Review usually takes 1–7 days. Watch your email and **Inbox** in Play Console.

## 8. If Google rejects it

- **Marijuana policy:** Google bans apps that facilitate the *sale* of cannabis. KushRewards shows no prices, menus, orders or delivery, and filters reviews for them. Reply citing that it is an information directory (APP-STORE-COMPLIANCE.md §1 and §6.1 reviewer notes). The safest change if it is still rejected: list only clubs and lounges, not dispensaries. Set `LISTED_TYPES` in `web/src/lib/site.ts` and `listedStoreTypes` in `mobile/app.json`, then rebuild.
- **User-generated content:** point to Report / Block on reviews, the Community Rules acceptance, the content filter and Admin → Reviews.
- **Login credentials don't work:** check the demo account in Admin → Users.

## 9. Updating the app later

1. Change the code and push to GitHub.
2. Run `npx eas-cli build -p android --profile production`.
3. Play Console → Production → **Create new release** → upload the new `.aab` → roll out.

Optional: `npx eas-cli submit -p android` uploads the build for you after a one-time Google service-account setup (https://docs.expo.dev/submit/android/).
