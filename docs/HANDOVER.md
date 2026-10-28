# KushRewards SA v2 – Developer Handover

**Version:** 2.0 (store-compliant) · **Date:** 19 October 2026 · **Operated by:** Convenient Living Solutions
**Prepared for:** the developer building the backend and continuing the mobile app

This package is the React Native (Expo) version of **KushRewards SA – v2**, ported screen by screen from the v2 web app (Floot project "KushRewards SA – v2", the reference implementation). The UI is complete, typechecks cleanly and builds for iOS and Android. **It needs a backend.** This document explains what every element on screen does, why it is there, and exactly what the backend must provide.

> **v2 in one sentence:** an information and community guide to cannabis clubs and venues for adults 18+, built to pass Apple App Store and Google Play review. It **never** shows prices, price levels, product menus or stock, and never takes orders, payments or deliveries. See `APP-STORE-COMPLIANCE.md` for the store-policy reasoning and listing text.

---

## Contents

1. [What the app is](#1-what-the-app-is)
2. [Project setup and structure](#2-project-setup-and-structure)
3. [App-wide elements](#3-app-wide-elements)
4. [Screens, element by element](#4-screens-element-by-element)
5. [Authentication and sessions](#5-authentication-and-sessions)
6. [API reference](#6-api-reference)
7. [Database](#7-database)
8. [Business rules](#8-business-rules)
9. [Content filter, moderation and Community Rules](#9-content-filter-moderation-and-community-rules)
10. [Legal, privacy and security](#10-legal-privacy-and-security)
11. [Configuration and assets](#11-configuration-and-assets)
12. [Differences from the v2 web app](#12-differences-from-the-v2-web-app)
13. [What is not built yet](#13-what-is-not-built-yet)
14. [Acceptance checklist](#14-acceptance-checklist)

---

## 1. What the app is

KushRewards SA helps adults (18+) in South Africa find cannabis clubs, lounges and venues, starting in Roodepoort and the West Rand, and contact them. People can:

- browse venues on a schematic map and in a list sorted by distance, with opening hours, features and star ratings;
- message a venue on WhatsApp, call it, or get directions (every tap is counted);
- read and write quick reviews (stars + venue tags + optional comment), report reviews and block reviewers;
- suggest a missing venue for the owner to approve, and report wrong information.

The app owner (admin) approves suggested venues, edits venues, handles reports, moderates reviews, and sees how many WhatsApp/call/directions taps each venue received. **Those tap counts are what is sold to venues** as paid "Verified"/"Partner" listings.

**What the app never does:** sell cannabis, show prices or product menus, take orders or payments, arrange deliveries, or share a user's details or location with venues. WhatsApp opens the user's own chat with the venue; the app never sees the messages.

**Users and roles**

| Role | Can do |
|---|---|
| Visitor (no account) | Browse, search, filter, view venues and reviews, contact venues, read the legal pages |
| Signed-in user (`user`) | Plus, **after accepting the Community Rules**: write/edit reviews, report and block, suggest venues, report wrong info, see own suggestions, delete own account |
| Admin (`admin`) | Plus: the Admin tab (approve venues, edit venues, reports, review moderation, tap counts) |

---

## 2. Project setup and structure

**Stack:** Expo SDK 57, React Native 0.86, React 19, TypeScript (strict), React Navigation 7 (bottom tabs + native stack), TanStack React Query 5, react-native-svg (map, flag, leaf), lucide-react-native (icons), expo-location, expo-secure-store, expo-auth-session (Google), expo-apple-authentication (Apple), expo-image-picker (admin logo upload), expo-build-properties (Android target SDK 36).

```bash
npm install
npx expo install --fix      # aligns native module versions with the installed Expo SDK
npm run typecheck           # tsc --noEmit, passes cleanly
npx expo start              # i = iOS simulator, a = Android, or a dev build on a phone
```

Set `expo.extra.apiBaseUrl` in `app.json` to your backend first (section 11). Until then every request shows "The app has no backend address yet".

```
App.tsx                      Providers (fonts, React Query, theme, toasts, auth, location) + navigation + age gate
index.ts                     Expo entry
app.json                     App config, permission texts, backend URL, Google client IDs, legal URLs
docs/schema.sql              PostgreSQL schema (v2)
src/
  config.ts                  Reads app.json extra values (API URL, Google IDs, legal URLs, listed venue types)
  types/api.ts               THE API CONTRACT: every request/response type
  api/client.ts              fetch wrapper: base URL, Bearer token, error handling
  api/endpoints.ts           One function per endpoint
  api/uploads.ts             Venue logo upload (presigned PUT)
  hooks/useAuth.tsx          Session state, sign-in, sign-out, updateUser, deleteAccount
  hooks/useGoogleSignIn.ts   Google sign-in flow
  hooks/useAppleSignIn.ts    Sign in with Apple (iOS)
  hooks/useUserLocation.tsx  Suburb / GPS location (stays on the phone)
  hooks/queries.ts           React Query hooks + cache keys
  lib/storeUtils.ts          Suburbs, opening-hours logic, distance, WhatsApp/tel/maps links
  lib/reviewTags.ts          Venue-only review tags, retired tags, star labels
  lib/contentFilter.ts       Client copy of the content filter (section 9)
  lib/legalContent.ts        In-app Privacy Policy, Terms, Community Rules, Support text
  lib/storage.ts             AsyncStorage + SecureStore wrappers
  theme/theme.tsx            Colours (light/dark), fonts, spacing, theme switch
  navigation/                Tabs + stack, route types
  components/                Reusable pieces (sections 3 and 4)
    ui/                      Design-kit primitives: AppText, Button, TextField, Chip, Segmented, Sheet, SelectSheet, Feedback
  screens/                   Discover, Store (venue page), Reviews, AddStore (Suggest), Profile, Login, Admin, Legal
```

Internal names still say "store" (`StoreScreen`, `/stores/list`, table `stores`) because they mirror the database. **Every user-facing word is "venue".**

**How data flows:** screens call hooks in `hooks/queries.ts` (reads) or `useMutation(api.x)` (writes). After a write, the screen invalidates the matching cache key so lists refresh. All backend calls go through `api/endpoints.ts`; nothing else touches the network except Google/Apple sign-in, the logo PUT, and opening WhatsApp/phone/maps/email links.

---

## 3. App-wide elements

### 3.1 Brand header – `components/BrandHeader.tsx`
**Shows:** the wordmark "Kush 🍃 Rewards" with a South African flag, top-left of every tab screen; "Kush" in the text colour, "Rewards" in brand green, Righteous font.
**Purpose:** brand identity; tapping it returns to Discover. **Backend:** none.
**Note:** the web app uses a leaf photo (one for light mode, one for dark). This package draws a vector leaf (`LeafMark`) that works in both themes. To use the photos instead, export them as transparent PNGs into `assets/` and swap `<LeafMark />` for an `<Image>`.

### 3.2 Age gate – `components/AgeGate.tsx`
**Shows:** full-screen "Enter your date of birth", the line "KushRewards SA is a guide to cannabis clubs and venues in South Africa for adults aged 18 and over.", three number-only fields **DD / MM / YYYY** (empty by default, auto-advance), **Continue**, and the note "We don't store your date of birth. KushRewards doesn't sell cannabis or take orders."
**Validation:** all fields filled ("Enter your full date of birth."); a real calendar date, not in the future, year from 1900 ("That date doesn't look right. Please check it.").
**Result:** 18+ → saves `kr-age-ok = "1"` on the device and continues. Under 18 → "Sorry, adults only – You need to be 18 or older to use KushRewards SA" and saves `"0"`, so it can't simply be retried.
**Purpose:** neutral age screening for a cannabis-related app (both stores; a Yes/No button is weaker evidence). **Backend:** none. The date of birth is never stored or sent.
**Not shown on:** the in-app Legal screens are reachable from the sign-in small print and Profile, both behind the gate in the app; on the **website**, `/privacy`, `/terms`, `/community-rules`, `/support` and `/delete-account` must bypass the gate (store reviewers open them without the app).

### 3.3 Bottom tab bar – `navigation/RootNavigator.tsx`
**Tabs:** Discover · Reviews · **Suggest** · Profile · Admin (Admin only when the user's `role` is `admin`).
**Stack screens on top:** Store (venue page), Login (modal), Legal.
**Backend:** `role` on the user object.

### 3.4 Theme – `theme/theme.tsx`
Light: pale sage background, bottle-green ink, white cards. Dark: deep forest green. Marigold accent used sparingly (partner badges, stars, placeholders on legal pages). Light / Dark / Auto picker in Profile, stored on device. **Backend:** none.

### 3.5 Toasts – `components/ui/Feedback.tsx`
Short messages at the top ("Thanks for your review!", "You won't see reviews from Thato any more."). Error toasts and form errors show the backend's `error` message **verbatim**, so write backend errors for end users (section 6.1).

### 3.6 Sign-in card – `components/SignInCard.tsx`
Shown wherever an action needs an account. A title, a reason, **Sign in with Apple** (iOS, same prominence as Google), **Continue with Google**, "Sign in with email", and the small print "By continuing you confirm you're 18 or older and agree to our Terms of Use and Privacy Policy" (both open the in-app Legal screen).
**Backend:** `POST /auth/apple`, `POST /auth/google` (section 6.3).

### 3.7 Community Rules card – `components/RequireTerms.tsx`
Wraps every posting form (review sheet, Suggest form, wrong-info report). If the signed-in user's `termsAcceptedAt` is null it shows, instead of the form:
- **Community rules** with five bullets: Be honest: only review venues you've actually visited. · No offering, buying or selling of cannabis or anything else, and no prices or menus. · No harassment, hate speech, threats or personal information about others. · No sexual content, spam or advertising. · Nothing involving anyone under 18.
- "Posts that break these rules are removed and repeat offenders are banned. Read the full Terms of Use and Community Rules." (links open the Legal screen)
- **I agree** → `POST /account/accept_terms`, then the form appears.

**Purpose:** Google Play User Generated Content policy and Apple 1.2 require users to accept terms that forbid objectionable content before posting. **The backend must enforce it too** (403 until accepted, section 6.4).

### 3.8 Location – `hooks/useUserLocation.tsx`
Defaults to the centre of Roodepoort. Pick a suburb or tap **Near me** for GPS (coarse location on Android). Saved on the device and used **only on the phone** to sort venues by distance. **Location is never sent to the backend** (stated in the Privacy Policy; keep it that way).

---

## 4. Screens, element by element

### 4.1 Discover (home tab) – `screens/DiscoverScreen.tsx`

| Element | What it does / why | Powered by |
|---|---|---|
| **"Showing venues near" + area picker** | Pick one of 19 West Rand / Joburg suburbs to sort venues by distance from its centre. Shows "Your location" when GPS is used. | `SUBURBS` in `lib/storeUtils.ts` |
| **Near me** | GPS for "your location". "Finding…" while locating; an error line if permission is denied. | Phone only |
| **Search box** | Filters by venue name or suburb. | Client-side over `GET /stores/list` |
| **Filter chips** | Open now · Partners · one chip per listed venue type (Dispensary · Private club · Lounge). Different chips combine (AND); type chips combine with each other (OR). | Client-side; "Open now" uses `openState()` on `hours` in phone time |
| **Schematic map** | A pin per listed venue plus a blue "you" dot, auto-fitted, "Not to scale · tap a pin". Partner pins are green, others grey. Tap → venue page. No map API key. | `latitude`, `longitude` |
| **"N venues near X" + Clear** | Count after filters; Clear resets them. | Client-side |
| **Venue cards** | Nearest first (4.1.1). | `GET /stores/list` |
| **Empty state** | "No venues match these filters." / "No venues are listed yet." | |
| **"Know a venue that's missing?" card** | "Suggest it and we'll check it and put it on the map." → Suggest tab. | |
| **Pull to refresh** | Re-fetches the list. | |

Which venue types appear is set by `listedStoreTypes` in `app.json` (default: all three, as in the v2 web app). Setting `["club","lounge"]` launches without dispensaries; the app then hides those venues and their chip (see `APP-STORE-COMPLIANCE.md`).

#### 4.1.1 Venue card – `components/StoreCard.tsx`
- **Logo or monogram:** venue logo on a dark tile, or initials in a tinted square by type. From `logoUrl`, `name`, `type`.
- **Name**, **Partner** badge (`isPartner`), **distance** (calculated on the phone).
- **Type · Suburb · ★ 4.6 (12):** stars only when the venue has visible reviews (`rating`).
- **Open/closed line:** "Open · till 20:00" (green), "Closed · opens 10:00" (red) or "Hours not listed".
- **Features line:** "Features: Quiet · Backup power · Card payments and more" (first 3).
- **No product tags and no price or price level** (v2).
- **Tap:** opens the venue page.

### 4.2 Venue page – `screens/StoreScreen.tsx`

| Section / element | What it does / why | Powered by |
|---|---|---|
| **Back button** | Returns to the previous screen. | |
| **Partner venue badge** | Shown for paying partner venues. | `isPartner` |
| **Logo/monogram, name, type · suburb · distance, open/closed, star line** | Identity and status. Stars hidden when there are no reviews. | Venue fields, `rating` |
| **Contact** section | Three buttons (below), the privacy line, then the information notice. Replaces v1's "What's available". | |
| **WhatsApp** (green) | Opens WhatsApp with "Hi {venue}, I found you on KushRewards SA. I have a question: ". Disabled ("No WhatsApp") without a number. **Counts a tap.** | `whatsapp`; `POST /stores/tap` `whatsapp` |
| **Call** | Calls `phone`, else `whatsapp`; disabled ("No phone") if neither. **Counts a tap.** | `POST /stores/tap` `call` |
| **Directions** | Google Maps directions to the pin. **Counts a tap.** | `POST /stores/tap` `directions` |
| **Privacy line** | "WhatsApp opens your own chat with the venue. KushRewards never sees your messages." | |
| **Information notice** (grey box, info icon) | "KushRewards is an information guide for adults 18+. We don't sell cannabis, take orders or arrange deliveries. Follow South African law: cannabis is for private use only, and never drive under the influence." Required wording for store review; keep it. | |
| **Reviews** | Big average, stars, count, up to 3 "most mentioned" tags, the 3 latest reviews, "Show all N reviews". Button "Write a review" or "Edit your review". Reviews by people you blocked are not shown. | `rating`; `GET /reviews/list?storeId=` |
| **Opening hours** | Mon–Sun table, today highlighted, "Closed" days, "midnight" for 00:00, optional note. Empty: "Hours not listed yet. Message the venue to check." | `hours`, `hoursNote` |
| **Details** | Address (or suburb) and WhatsApp number. **No Price row** (v2). | Venue fields |
| **Features** | Labelled feature tags. | `features` |
| **"Added by the KushRewards community."** | For venues created from an approved suggestion. | `isCommunity` |
| **Report wrong info about this venue** | Opens the report sheet (4.2.1). | |

Tap tracking is fire-and-forget: WhatsApp/phone/maps open immediately; the app never waits for or shows errors from `POST /stores/tap`.

#### 4.2.1 Report sheet – `components/ReportSheet.tsx`
Pick what's wrong (**Hours · Closed for good · Location · Contact · Other**; "Price level" was removed in v2), describe it (3–500 chars, placeholder "e.g. Closes at 20:00 on Sundays"), **Send report** → "Thanks! We'll check it and fix the listing." Signed out: sign-in card. First time: Community Rules card. Only the **offensive-language** check applies (a report may need to contain a new phone number). **Backend:** `POST /reports/create`. Lands in Admin → Reports.

### 4.3 Reviews tab – `screens/ReviewsScreen.tsx`

| Element | What it does / why | Powered by |
|---|---|---|
| **Title + intro** | "What locals say about venues on the West Rand. Been somewhere lately? Rate it in 10 seconds." | |
| **Write a review** | Opens the review sheet with a venue picker (4.3.2). | |
| **Latest / My reviews** | Latest: newest visible reviews across live venues (50), minus blocked people. My reviews: the user's own, including any the admin hid ("Hidden by admin"). Signed out: sign-in card on "My reviews". | `GET /reviews/list?limit=50`, `GET /reviews/list?mine=1&limit=100` |
| **Review cards** | 4.3.1, with the venue name on top (tap → venue). | |
| **Empty states** | "No reviews yet. Be the first: tap Write a review." / "You haven't reviewed a venue yet." | |

#### 4.3.1 Review card – `components/ReviewItem.tsx`
Stars + label (Poor / Not great / Okay / Good / Excellent), "Hidden by admin" pill (own reviews only), tags (green praise, grey problems; retired v1 tags are never shown), optional comment, footer with the **reviewer's first name**, "(you)", date. Right side:
- your own review: **Edit**;
- someone else's, signed in: **Report** and **Block** side by side;
- signed out: **Report**, which opens Sign in.

**Report** → confirm "Report this review? We'll check it against our Community Rules, usually within 24 hours." → `POST /reviews/report` → "Reported".
**Block** → confirm "Block {first name}? You won't see their reviews any more. They won't be told." → `POST /reviews/block` → toast "You won't see reviews from {name} any more." and the lists refresh without that person.
**Backend:** `authorName` must be the **first name only**; never send surnames, emails or user IDs in public review data.

#### 4.3.2 Review sheet – `components/ReviewSheet.tsx`
1. **Venue picker** (only from the Reviews tab), sorted by distance.
2. **Your rating:** 1–5 stars with the word label.
3. **Tags** (max 6): 4–5 stars "What did you like?" → Friendly staff, Clean & safe, Great vibe, Comfortable space, Knowledgeable staff, Quick service, Easy parking. 1–2 stars "What went wrong?" → Long wait, Unfriendly staff, Not clean, Too noisy, Hard to find. 3 stars "What stood out?" → the first 4 praise + first 3 problem tags. Changing stars drops tags that no longer apply.
4. **Anything to add? (optional):** ≤ 500 chars, placeholder "e.g. Relaxed lounge, friendly staff and easy parking", hint "Shown with your first name only. Reviews that mention prices or offers to buy or sell are removed."
5. **Post review / Update review.** The comment is checked by the content filter first (section 9); the error shows in the form.

Signed out → sign-in card. First post → Community Rules card. Re-reviewing the same venue loads and **updates** the existing review (one per person per venue). **Backend:** `POST /reviews/save` (upsert); the app then refreshes reviews and the venue list.

### 4.4 Suggest tab – `screens/AddStoreScreen.tsx`
Title **"Suggest a venue"**: "Know a cannabis club or venue that isn't listed? Tell us about it. We check every venue before it goes on the map, usually within 72 hours." Signed out: sign-in card. First post: Community Rules card. Form:

| Field | Rules |
|---|---|
| Venue name | Required, 2–80. If it shares key words with a listed venue: "This might already be listed as {venue} in {suburb}." with a link (client-side check) |
| Type | Segmented, from the listed venue types |
| Suburb | From the suburb list |
| Street address or landmark | ≤ 200 |
| WhatsApp or phone number | ≤ 30. **Address or WhatsApp is required** so the admin can verify |
| Opening hours (optional) | Free text ≤ 200, content-filtered |
| Anything else? (optional) | ≤ 500, content-filtered |
| I own or manage this venue | Owner suggestions are sales leads (flagged in the admin queue) |

**No price question** (v2). **Send for approval** → "Thanks, we've got it" with "Add another" / "See my submissions". **Backend:** `POST /submissions/create` (max 5 waiting per user).

### 4.5 Profile tab – `screens/ProfileScreen.tsx`
- Signed out: sign-in card ("Sign in to write reviews, suggest venues and report wrong info. Browsing venues needs no account.").
- Signed in: avatar, name, email; **Open the admin panel** (admins).
- **My venue suggestions:** name, suburb, date, admin note, status pill Pending / Needs info / Approved (tap → venue) / Not approved; **Suggest** shortcut. `GET /submissions/mine`.
- **Settings:** Theme Light / Dark / Auto; **Sign out** (`POST /auth/logout`).
- **About & legal** (`components/AboutLegal.tsx`): description ("KushRewards SA is an information guide to cannabis clubs and venues for adults 18+ in South Africa. We don't sell cannabis, take orders, handle payments or arrange deliveries, and we never share your details with venues. Cannabis is legal in South Africa for private use by adults only; trading in it is not. Never drive under the influence."), rows **Privacy Policy · Terms of Use · Community Rules** (in-app Legal screen), **Contact support (support@kushrewards.co.za)** (opens email), **Help & FAQ** (Legal → Support), and for signed-in users **Delete my account** (4.5.1). Then "© 2026 Convenient Living Solutions. KushRewards SA is operated by Convenient Living Solutions."
- Footer: "18+ only. Information guide only: no sales, orders, payments or deliveries."

#### 4.5.1 Delete my account
Confirm: "Delete your account? This permanently deletes your account, your reviews, venue suggestions and reports. It can't be undone." → `POST /account/delete` → signed out, toast "Your account has been deleted." A backend error (e.g. last admin) is shown as a toast. Required by Apple 5.1.1(v) and Google Play.

### 4.6 Sign in screen – `screens/LoginScreen.tsx`
Sign in with Apple (iOS) and Continue with Google, or "Sign in with email and password instead" → Sign in / Create account (name, email, password ≥ 8). Cancel closes it. Backend: `/auth/apple`, `/auth/google`, `/auth/login_with_password`, `/auth/register_with_password`.

### 4.7 Legal screen – `screens/LegalScreen.tsx`
One screen, four documents, text in `lib/legalContent.ts` (copied from the v2 web pages): **Privacy Policy**, **Terms of Use**, **Community Rules**, **Support** (email button + FAQ). Each shows "Last updated 16 October 2026" (not on Support) and the copyright line. Values the owner must still fill in are shown **highlighted in brackets**: company registration number, physical address, Information Officer name and email, hosting provider, backup retention period. **Backend:** none. Keep this text and the website pages identical.

### 4.8 Admin tab – `screens/AdminScreen.tsx` (role `admin` only)

**Stat tiles:** Live venues (→ Venues filtered to live) · WhatsApp taps, last 30 days · Signed-up users.
**Section chips:** Queue (pending count) · Venues · Reports (open count) · Reviews (reported count). Opens on Queue if anything is waiting. **There is no Settings section in v2.** All data comes from `GET /admin/overview`.

**Queue** – suggestions awaiting a decision: name, type, suburb, submitter and date, status pill, address, WhatsApp, hours, notes, submitter email, an owner-lead banner if `isOwner`, a note field (shown to the submitter), **Approve** / **Needs info** / **Reject**. "Call or visit a venue before approving it…" Below: "Recently decided" (last 10). `POST /admin/submission_decide`. Approving creates a live venue at the suburb centre; the admin then edits the pin and hours.

**Venues** – every venue (live and hidden), All / Live / Hidden filter, **Add venue**. Each card: logo and name (tap to edit), "View public page", type · suburb · Partner · Hidden, edit button, **taps in the last 30 days** (WhatsApp, calls, directions) and all-time total. Edit/Add opens the **venue editor** (`components/StoreEditor.tsx`):

| Editor field | Notes |
|---|---|
| Logo | Pick from photos → `POST /admin/logo_upload` + PUT → "Save to apply it". Remove logo. PNG/JPG/WEBP/GIF/SVG ≤ 5 MB |
| Name, Type, Suburb | |
| Live / Hidden | Hidden venues disappear from the public app but keep data and taps |
| Street address | |
| Map pin | Paste a Google Maps link or "-26.16, 27.87" → Set; "Use suburb centre"; "Check on Google Maps". Inside South Africa only |
| WhatsApp, Phone (if different) | |
| Opening hours | Per day Open + open/close (HH:MM); "Copy Monday to every day"; note |
| Features | 12 preset tags |
| Partner venue | Partner badge and green pin |

**No price level and no products/prices** (v2). `POST /admin/store_save`.

**Reports** – open wrong-info reports: venue, field, reporter, date, details; **Edit venue**, **Fixed** (`confirmed`), **Dismiss** (`dismissed`). `POST /admin/report_resolve`.

**Reviews** – latest 100, reported first: venue, stars, **full name and email** (admin only), date, tags, comment, "Hidden" / "Reported N×" pill; **Hide review** / **Show again** / **Keep, clear reports**. Hidden reviews stop counting towards ratings. `POST /admin/review_status`. Aim to act on reports within 24 hours (the Community Rules promise this).

---

## 5. Authentication and sessions

The web app uses an HTTP-only cookie. **The mobile app uses a bearer token:**

1. Every sign-in endpoint returns `{ token, user }`.
2. The app keeps `token` in secure storage (Keychain / Keystore) and sends `Authorization: Bearer <token>`.
3. `GET /auth/session` returns `{ user }` for a valid token, **401** otherwise. On any 401 the app drops the token and shows signed-out UI.

**User object (every endpoint that returns one):**
`{ id, email, displayName, avatarUrl | null, role: "user" | "admin", termsAcceptedAt: string | null }`. **`termsAcceptedAt` must always be present** (null = not accepted); the app uses it to decide whether to show the Community Rules card.

**Server implementation**
- Token = 32+ random bytes, base64url. Store only `sha256(token)` in `sessions.id` with `user_id` and `expires_at = now + 7 days`; slide it forward on use.
- `POST /auth/logout` deletes the session row. `DELETE FROM users` (account deletion) removes sessions via cascade.
- Read `users.role` on every request; admin routes return **403 "Only the app owner can do this."**
- **First admin:** sign in once, then `UPDATE users SET role='admin' WHERE lower(email)='<owner email>';`

**Google:** the phone sends a Google **ID token** to `POST /auth/google`. Verify it (signature, `iss` accounts.google.com, `aud` ∈ your web/iOS/Android client IDs, not expired, `email_verified`). Find the user by `oauth_accounts(provider='google', provider_user_id=sub)`, else by `lower(email)` (link), else create (`display_name` = Google name, `avatar_url` = picture).

**Apple** (iOS; required by Guideline 4.8 because Google is offered): `POST /auth/apple { identityToken, givenName, familyName }`. Verify against `https://appleid.apple.com/auth/keys` (`iss` `https://appleid.apple.com`, `aud` `za.co.kushrewards.app`, not expired). `provider='apple'`, `provider_user_id = sub`. Apple sends the name **only the first time**: save it then; otherwise use the email's local part or "KushRewards user". Private-relay emails are normal emails.

**Email + password:** register (unique case-insensitive email, password ≥ 8, `displayName`, bcrypt cost ≥ 10 in `user_passwords`); login with a generic "Invalid email or password"; **5 failed attempts in 15 minutes lock that email for 15 minutes** (429 "Too many attempts. Try again in N minutes."), logged in `login_attempts`.

---

## 6. API reference

### 6.1 Conventions
- Base URL `expo.extra.apiBaseUrl` (e.g. `https://api.kushrewards.co.za`); paths are appended. Only `GET` and `POST`.
- JSON, **camelCase** keys, ISO-8601 date strings.
- **Errors:** non-2xx with `{ "error": "Human-readable message" }`, shown to the user verbatim. 400 validation/content filter · 401 not signed in · 403 not admin **or Community Rules not accepted** · 404 · 409 · 429 · 500.
- Exact types: `src/types/api.ts` is the contract.

### 6.2 Endpoint summary

| Method | Path | Auth | Used by |
|---|---|---|---|
| GET | `/auth/session` | Bearer | App launch |
| POST | `/auth/google` | – | Sign-in card, Login |
| POST | `/auth/apple` | – | Sign-in card, Login (iOS) |
| POST | `/auth/login_with_password` | – | Login |
| POST | `/auth/register_with_password` | – | Login |
| POST | `/auth/logout` | user | Profile |
| POST | `/account/accept_terms` | user | Community Rules card |
| POST | `/account/delete` | user | Profile → Delete my account |
| GET | `/stores/list` | optional | Discover, venue page, pickers |
| POST | `/stores/tap` | optional | Venue page buttons |
| GET | `/reviews/list` | optional (required for `mine`) | Reviews tab, venue page, review sheet |
| POST | `/reviews/save` | user + rules | Review sheet |
| POST | `/reviews/report` | user | Review card → Report |
| POST | `/reviews/block` | user | Review card → Block |
| POST | `/submissions/create` | user + rules | Suggest tab |
| GET | `/submissions/mine` | user | Profile |
| POST | `/reports/create` | user + rules | Report sheet |
| GET | `/admin/overview` | admin | Admin tab |
| POST | `/admin/store_save` | admin | Venue editor |
| POST | `/admin/submission_decide` | admin | Admin → Queue |
| POST | `/admin/report_resolve` | admin | Admin → Reports |
| POST | `/admin/review_status` | admin | Admin → Reviews |
| POST | `/admin/logo_upload` | admin | Venue editor (logo) |

"user + rules" = signed in **and** `terms_accepted_at` not null, else **403 "Please accept the Community Rules first."**

Paths match the v2 web app's `/_api/...` endpoints one for one (drop the `/_api` prefix), except `/auth/apple` and the token-based auth responses, which are mobile-only (section 12).

### 6.3 Auth and account

**`GET /auth/session`** → `200 { user }` · 401.
**`POST /auth/google`** `{ idToken }` → `200 { token, user }` · 401 "Google sign-in failed. Please try again."
**`POST /auth/apple`** `{ identityToken, givenName, familyName }` → `200 { token, user }` · 401 "Apple sign-in failed. Please try again."
**`POST /auth/login_with_password`** `{ email, password }` → `200 { token, user }` · 401 · 429.
**`POST /auth/register_with_password`** `{ email, password, displayName }` → `200 { token, user }` · 400 · 409 "An account with this email already exists."
**`POST /auth/logout`** `{}` → `200 { ok: true }`.

**`POST /account/accept_terms`** `{}` → `200 { termsAcceptedAt }` (sets `users.terms_accepted_at = now()`).

**`POST /account/delete`** `{}` → `200 { ok: true }`
- If the caller is an admin and the **only** admin: 400 "You're the only admin. Make someone else an admin before deleting your account."
- Otherwise, in one transaction: `DELETE FROM login_attempts WHERE email = $email; DELETE FROM users WHERE id = $id;` The schema's foreign keys then delete sessions, password, linked Google/Apple accounts, reviews, venue suggestions, wrong-info reports, blocks and review reports, set `contact_taps.user_id` and `stores.added_by` to null. The token stops working.
- The **same email can sign up again** as a brand-new account (`termsAcceptedAt` null).

### 6.4 Venues (public)

**`GET /stores/list`** → `200 { stores: PublicStore[] }`
```json
{
  "stores": [{
    "id": 19, "name": "Paradise Lounge", "type": "lounge", "status": "live",
    "suburb": "Lindhaven", "address": "131 Progress Rd",
    "latitude": -26.137, "longitude": 27.842,
    "whatsapp": "+27 69 992 4827", "phone": null,
    "hours": { "mon": { "open": "07:00", "close": "20:00" }, "sun": null },
    "hoursNote": null,
    "products": [],
    "features": ["Quiet", "Backup power"],
    "isPartner": false, "isCommunity": true, "logoUrl": "https://…/logo.png",
    "rating": { "average": 4.6, "count": 12, "topTags": ["Friendly staff", "Great vibe"] },
    "createdAt": "…", "updatedAt": "…"
  }]
}
```
Rules:
- Only `status = 'live'`, ordered by name (the app re-sorts by distance).
- **`products` is always `[]`. Never return `priceLevel`, product prices, `priceIndoor/Greenhouse/Outdoor`, `priceMode`, `productTypes` or `addedBy`.** Select the columns explicitly rather than `SELECT *`. This is enforced server-side, not just in the app.
- `rating` from **visible** reviews: `average` rounded to 1 decimal, `count`, `topTags` = 3 most-picked **positive** tags **excluding retired tags** (Good quality, Fair prices, Pricey, Poor quality, Out of stock). `null` when no visible reviews.
- Public; a 30–60 s cache is fine.

**`POST /stores/tap`** `{ storeId, kind }` → `200 { ok: true }` · 404 "Venue not found" if not live. Insert into `contact_taps` with `user_id` if a valid token is sent. Light de-duplication (same device + venue + kind within 10 s) keeps counts credible.

### 6.5 Reviews

**`GET /reviews/list`** `storeId?`, `mine=1?`, `limit?` (1–100, default 30) → `200 { reviews: PublicReview[] }`
- Default: `status='visible'` reviews of live venues, newest `updated_at` first, optional `storeId`.
- **If a valid token is sent, exclude reviews whose author the caller has blocked** (`user_blocks`). Signed-out callers see everything visible.
- `mine=1`: auth required (401 "Please sign in to see your reviews."); all the user's reviews including hidden, with `isHidden`.
- `authorName` = first word of `display_name`; `isMine`; `tags` with retired tags removed.

`PublicReview = { id, storeId, storeName, stars, tags[], comment | null, createdAt, updatedAt, authorName, isMine, isHidden }`

**`POST /reviews/save`** `{ storeId, stars, tags, comment }` → `200 { id }`
- user + rules (403 otherwise). Content filter on `comment` → 400 with the filter message (section 9). Venue must be live (404 "That venue isn't listed any more.").
- `stars` 1–5; `tags` ≤ 6, each one of the **12 venue tags** (reject anything else, including retired tags), duplicates removed; `comment` trimmed, ≤ 500, empty → null.
- **Upsert on (store_id, user_id)**; on update change stars/tags/comment/`updated_at` only (a hidden review stays hidden).

**`POST /reviews/report`** `{ reviewId }` → `200 { ok: true }`
- Auth required; not your own review (404 "Couldn't report that review.").
- In one transaction: `INSERT INTO review_reports … ON CONFLICT DO NOTHING`; only if a row was inserted, `report_count = report_count + 1`. **A repeat report returns 200 without raising the count.**

**`POST /reviews/block`** `{ reviewId }` → `200 { ok: true, name }`
- Auth required. Look up the review's author (404 "Couldn't find that review."); 400 "You can't block yourself."
- `INSERT INTO user_blocks (blocker_id, blocked_id) … ON CONFLICT DO NOTHING`. Return the author's **first name** for the toast. The blocked person is not notified.

### 6.6 Venue suggestions and wrong-info reports

**`POST /submissions/create`** `{ name, type, suburb, address, whatsapp, hoursNote, isOwner, notes }` → `200 { id }`
- user + rules. Content filter on `notes` and `hoursNote` → 400.
- Validation: name 2–80 ("Enter the venue's name"), type enum, suburb 2–60, address ≤ 200, whatsapp ≤ 30, hoursNote ≤ 200, notes ≤ 500.
- 400 "Add a street address or a WhatsApp number so we can check the venue." when both are empty.
- 429 "You have 5 venues waiting for approval. Please wait for those first."
- Insert with `price_level = 2` (legacy column; never asked).

**`GET /submissions/mine`** → `200 { submissions }` (latest 50, newest first; no `priceLevel`).

**`POST /reports/create`** `{ storeId, field, details }` → `200 { id }`
- user + rules. **Offensive-language check only** on `details` → 400.
- `field` ∈ Hours · Closed for good · Location · Contact · Other; details 3–500 ("Tell us what's wrong in a few words").

### 6.7 Admin (role `admin`, else 403)

**`GET /admin/overview`** → `200 { stores, submissions, reports, reviews, userCount }`
- `stores`: all venues (live + hidden) by name, **without** `products`/`priceLevel`/price columns, each with `taps30` and `tapsAll` per kind.
- `submissions`: latest 100 with `submitterName`, `submitterEmail` (no `priceLevel`).
- `reports`: latest 100 with `storeName`, `reporterName`.
- `reviews`: latest 100 ordered by `report_count` desc then `updated_at` desc, with `storeName`, `authorName` (full), `authorEmail`.
- No `priceMode` / `productTypes` (v2).

**`POST /admin/store_save`** `{ id | null, name, type, suburb, address, latitude, longitude, whatsapp, phone, hours, hoursNote, features, isPartner, status, logoUrl }` → `200 { id }`
- Create when `id` is null, else update (404 "Venue not found"). Validation: name 2–80; suburb 2–60; address ≤ 200; lat −35…−22, lng 16…33; whatsapp/phone ≤ 30 (empty → null); hours per day `{open, close}` "HH:MM" or null; hoursNote ≤ 200; features ≤ 12 (1–30 chars each); logoUrl ≤ 500 or null. Set `updated_at`.
- **Do not touch `price_level` or `products`** on update; new venues get the column defaults.

**`POST /admin/submission_decide`** `{ id, action: "approve" | "needs_info" | "reject", reason }` → `200 { storeId | null }`
- Lock the row; 404 if missing; 409 "This submission was already decided." if approved/rejected.
- needs_info / reject: set status, `decision_reason`, `decided_at`.
- approve: create a live venue at the suburb centre (fallback Roodepoort), `is_community = true`, `added_by` = submitter, `hours = {}`, `features = []`; mark approved with `store_id`.

**`POST /admin/report_resolve`** `{ id, status: "confirmed" | "dismissed" }` → `200 { ok: true }` (set `resolved_at`).

**`POST /admin/review_status`** `{ id, status: "visible" | "hidden" }` → `200 { ok: true }`; `visible` also resets `report_count` to 0.

**`POST /admin/logo_upload`** `{ contentType, sizeBytes }` → `200 { presignedUrl, headers, url }`. png/jpeg/webp/gif/svg+xml, ≤ 5 MB ("Logo must be 5 MB or smaller"). Presigned **PUT** to public storage at `store-logos/<uuid>.<ext>`; the app PUTs, then saves `url` via `store_save`. Sanitise SVGs or convert to PNG.

---

## 7. Database

Full DDL: **`docs/schema.sql`** (PostgreSQL 14+). It loads cleanly and its delete cascades were tested (deleting a user removes their reviews, review reports, blocks, suggestions and reports, and nulls their contact taps and `stores.added_by`).

| Table | Purpose |
|---|---|
| `users` | Accounts: email, display name, avatar, role, **`terms_accepted_at`** |
| `user_passwords` | bcrypt hashes (cascade) |
| `oauth_accounts` | Linked Google / Apple accounts (cascade) |
| `sessions` | Hashed tokens, 7-day sliding expiry (cascade) |
| `login_attempts` | Failed-login throttling (deleted by email on account deletion) |
| `password_reset_codes` | Optional reset codes (cascade) |
| `stores` | The venues. `hours` JSON, `features` text array; `added_by` → SET NULL. `price_level` and `products` are v1 legacy, never exposed |
| `store_submissions` | Venue suggestions and decisions (cascade on submitter) |
| `info_reports` | Wrong-info reports (cascade on reporter) |
| `contact_taps` | Every WhatsApp/call/directions tap; `user_id` → SET NULL |
| `reviews` | One per user per venue; `status`; `report_count` (cascade) |
| `review_reports` | **v2:** one row per (review, reporter); PK makes repeat reports no-ops |
| `user_blocks` | **v2:** (blocker, blocked); no self-blocking |
| `app_settings` | v1 legacy (`price_mode` fixed at `level`); no v2 code reads it |

**Migrating data:** v2's data lives in the Floot-hosted Postgres behind "KushRewards SA – v2" (a full copy of v1's data: 19 venues, users, reviews, suggestions). Ask the owner for an export or a read-only connection string. The schema matches it column for column, plus `sessions.id` holding a token hash and `'apple'` as a provider.

---

## 8. Business rules

1. **No selling, anywhere.** No prices, price levels, product menus, stock, ordering, payments or delivery in any public response or screen. `products` is always `[]`.
2. **Posting needs the Community Rules.** Reviews, suggestions and wrong-info reports return 403 until `terms_accepted_at` is set.
3. **One review per person per venue**, editable; ratings use visible reviews only; public reviews show the first name only.
4. **Report once per review per user**; repeat reports succeed silently.
5. **Blocking hides the blocked person's reviews from the blocker only**, everywhere they're listed; ratings still count them.
6. **Hidden venues** never appear publicly, can't be reviewed, tapped or reported, but stay in Admin with their history.
7. **Approving a suggestion** creates a live community venue at the suburb centre.
8. **Suggestion limit:** 5 waiting per user.
9. **Suburbs list** (`SUBURBS`, 19 suburbs with centres): the backend needs the same list for approvals; keep copies identical.
10. **Opening hours** are evaluated on the phone in local time; `close "00:00"` = midnight; close earlier than open = past midnight.
11. **Tap counts stay honest:** no taps on hidden venues; consider de-duplication; venues can't add their own.
12. **Admin-only data** (emails, full names, tap counts) never appears in public responses.
13. **Account deletion** is immediate and complete (section 6.3); the last admin can't delete themselves.

---

## 9. Content filter, moderation and Community Rules

The backend is the real gatekeeper; `lib/contentFilter.ts` is the same filter in the app for instant feedback. The v2 web app's version is `helpers/contentFilter.tsx`; port it as-is.

**Full check** (review comments, suggestion `notes` and `hoursNote`) → 400 **"Please remove prices, contact details, links or offers to buy or sell."** when the text matches any of:
- prices: `R75`, `R 150`, `100 rand`, `zar`, `rand(s)`, `per gram|g|ounce|oz`;
- words: price(s/d/ing), cheap(er/est), discount(s), special(s), deal(s), buy(ing), sell(ing/s), order(s/ing), deliver(s/y/ies), stock(s), menu(s);
- South African phone numbers (`+27…` / `0xx xxx xxxx`);
- links (`http`, `www.`, `.co.za`, `.com`, `.net`, `.org`) and `@handles`.

**Offensive check** (all of the above, and on its own for wrong-info reports) → 400 **"Please keep it respectful: remove offensive language."** for a short slur/profanity list (extend it over time).

**Moderation loop:** reported reviews rise to the top of Admin → Reviews with "Reported N×"; the admin hides abusive ones and bans repeat offenders (set their role or delete the account). The Community Rules promise reports are reviewed **within 24 hours**; store reviewers check this, so staff it.

---

## 10. Legal, privacy and security

- **South African cannabis law:** private use by adults is legal; trading is not. Advertising cannabis for sale can count as dealing, which is why v2 shows no prices, menus or stock and uses neutral venue wording. Don't add ordering, payments or price features without legal sign-off and a store-policy review.
- **Age gate:** date-of-birth check, only pass/fail stored on the device. Store listings must be rated 17+ (Apple) / Mature 17+ or 18+ (Google) and geo-restricted to South Africa.
- **Location stays on the device**; the backend never receives coordinates.
- **Contact privacy:** WhatsApp and calls happen outside the app; only the tap is recorded.
- **POPIA:** the in-app and web Privacy Policy name **Convenient Living Solutions** as responsible party, with placeholders for registration number, address and Information Officer. Fill them in before launch. Support: `support@kushrewards.co.za`.
- **Web pages required by the stores:** `/privacy`, `/terms`, `/community-rules`, `/support` and `/delete-account` must be public, need no sign-in, and **bypass the age gate** (they already do in the v2 web app). `/delete-account` must let a user sign in and confirm deletion (Google Play web-deletion requirement).
- **Security:** HTTPS only; hashed tokens; bcrypt; server-side validation of every input; parameterised SQL; admin checks on every admin route; rate-limit auth and posting (e.g. 10 reviews/hour per user).

---

## 11. Configuration and assets

`app.json → expo.extra`:

| Key | What to set |
|---|---|
| `apiBaseUrl` | Backend base URL, no trailing slash |
| `googleWebClientId` | Google OAuth **web** client ID (also used to verify tokens server-side) |
| `googleIosClientId` | Google OAuth **iOS** client ID (bundle `za.co.kushrewards.app`) |
| `googleAndroidClientId` | Google OAuth **Android** client ID (package `za.co.kushrewards.app` + SHA-1) |
| `supportEmail` | `support@kushrewards.co.za` (used in About & legal and the Legal screens) |
| `privacyUrl`, `termsUrl`, `communityRulesUrl`, `deleteAccountUrl` | Public web URLs for the store listings (the app itself shows the in-app copies) |
| `listedStoreTypes` | Venue types to show: default all three; `["club","lounge"]` to launch without dispensaries |

iOS: `usesAppleSignIn: true` (Sign in with Apple capability). Android: only `ACCESS_COARSE_LOCATION` plus defaults; fine location, camera, media and storage permissions are blocked; target SDK 36 via expo-build-properties.

Google and Apple sign-in need a **development build** (`npx expo run:ios|android` or EAS), not Expo Go.

Before store submission add the app icon and splash (`expo.icon`, `expo.splash`). Fonts (bundled): Figtree (body), Schibsted Grotesk (headings), Righteous (wordmark).

---

## 12. Differences from the v2 web app

The screens and rules match the v2 web app. Mobile-only differences:

| Area | v2 web app | This mobile app |
|---|---|---|
| Sessions | HTTP-only cookie | Bearer token; sign-in endpoints must return `{ token, user }` |
| Sign-in options | Google + email | **Apple** (iOS) + Google + email; add `POST /auth/apple` |
| Age-gate storage | `localStorage` | AsyncStorage (`kr-age-ok`) |
| Legal pages | Web routes with a footer on every page | In-app Legal screen + copyright line in About & legal; the web routes are still needed for the store listings |
| Account deletion | Profile and `/delete-account` page | Profile (the web page stays on the website) |
| Privacy Policy "who processes it" | Names Floot as host | Placeholder `[hosting provider]` (you choose the backend host) and adds Apple sign-in |
| Map | Schematic SVG | Same schematic SVG (swap for react-native-maps if wanted) |
| Admin logo upload | Browser file picker | Photo library picker (expo-image-picker) |

---

## 13. What is not built yet

No UI or API yet:
- Points and rewards (reviews, verified visits), tiers, counter check-ins (QR).
- Paid listing tiers beyond the `isPartner` flag.
- Password reset screens on mobile.
- Push notifications (e.g. "your venue was approved").
- Real map tiles.

Anything involving payments, rewards with monetary value, or venue promotions needs a store-policy and legal review first.

---

## 14. Acceptance checklist

**Browsing (signed out)**
- [ ] First launch shows the date-of-birth gate; an under-18 date locks the app (also after restart); an adult date passes; nothing but pass/fail is stored.
- [ ] Discover lists only live venues, nearest first; suburb change re-sorts; Near me asks permission.
- [ ] Search, Open now, Partners and type chips filter correctly; Clear resets.
- [ ] Venue cards and pages show **no prices, price levels, product tags or "What's available"**; `GET /stores/list` returns `products: []` for every venue and no price fields.
- [ ] Venue page shows the Contact buttons, privacy line and information notice; each button records exactly one tap.
- [ ] Legal screens open from Profile and from the sign-in small print.

**Signed in**
- [ ] Apple (iOS), Google and email sign-in work; the session survives a restart; sign-out clears it.
- [ ] A new user sees the Community Rules card before the first review, suggestion or report; the backend returns 403 before "I agree".
- [ ] A review containing "R80 per gram" or a phone number is rejected with the filter message; offensive words get the respectful message.
- [ ] Reviewing the same venue again edits the existing review; the rating updates.
- [ ] Reporting a review twice raises `report_count` once.
- [ ] Blocking a reviewer hides their reviews for me only (still visible signed out).
- [ ] Suggest: address-or-WhatsApp rule; 6th waiting suggestion refused; appears in Profile.
- [ ] Wrong-info report accepts a phone number and appears in Admin → Reports.
- [ ] Delete my account removes the user and their content, signs out, and the same email can register again with `termsAcceptedAt` null. The last admin gets the error.

**Admin**
- [ ] Admin tab only for admins; admin endpoints 403 for others; no Settings section.
- [ ] Approve creates a live venue at the suburb centre; deciding twice returns 409.
- [ ] Venue editor saves every field; existing `price_level`/`products` stay unchanged; logo upload works; hiding removes the venue from public lists.
- [ ] Tap counts match recorded taps; Hide/Show review behaves as described.

---

*The reference implementation is the Floot project "KushRewards SA – v2" (preview only, not published). Every screen here mirrors it as of 16–19 October 2026.*
