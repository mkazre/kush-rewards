# KushRewards SA v2 – React Native app (Expo)

Mobile app UI for **KushRewards SA v2**, the store-compliant version: an information and community guide to cannabis clubs and venues for adults 18+ on the West Rand. Find and contact venues, read and write quick reviews, report and block, suggest venues, delete your account, and an admin panel for the owner. Operated by Convenient Living Solutions.

It mirrors the "KushRewards SA – v2" web app screen by screen. **No prices, price levels, product menus, stock, ordering, payments or deliveries anywhere.**

The UI is complete, typechecks cleanly and builds for iOS and Android. It needs a backend: **read `../docs/HANDOVER.md`** for what every screen element does and the exact API, database and rules to build. Read **`../docs/APP-STORE-COMPLIANCE.md`** before submitting to the App Store or Google Play.

## Quick start

```bash
npm install
npx expo install --fix   # align native module versions with the Expo SDK
npm run typecheck        # should print nothing
npx expo start           # i = iOS simulator, a = Android
```

Set your backend address in `app.json` before the app can load data:

```json
"extra": { "apiBaseUrl": "https://api.your-domain.co.za" }
```

Google sign-in needs the three Google client IDs in the same `extra` block, and Sign in with Apple needs the capability on the bundle ID (HANDOVER.md section 11). Test sign-in in a development build, not Expo Go.

## Where things are

| Path | What |
|---|---|
| `HANDOVER.md` | Full developer handover: every screen element, API, auth, database, rules, checklist |
| `APP-STORE-COMPLIANCE.md` | Store-policy reasoning, actions outside the code, listing text |
| `docs/schema.sql` | PostgreSQL schema (v2) |
| `src/types/api.ts` | The API contract (all request/response types) |
| `src/api/endpoints.ts` | One function per backend endpoint |
| `src/screens/` | Discover, Store (venue page), Reviews, AddStore (Suggest), Profile, Login, Admin, Legal |
| `src/components/` | Venue card, review card/sheet, report sheet, Community Rules card, About & legal, age gate, map, venue editor, `ui/` primitives |
| `src/lib/` | Opening hours, distances, suburbs, review tags, content filter, in-app legal text |
| `src/theme/theme.tsx` | Colours (light/dark), fonts, spacing |

## Stack

Expo SDK 57 · React Native 0.86 · React 19 · TypeScript (strict) · React Navigation 7 · TanStack React Query 5 · react-native-svg · lucide-react-native · expo-apple-authentication · expo-auth-session.
