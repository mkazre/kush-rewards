# KushRewards SA – App Store & Google Play Compliance Guide

**Version:** 2.0 · **Date:** 19 October 2026 · **Applies to:** the React Native (Expo) v2 app in this folder and the "KushRewards SA – v2" web app
**Audience:** the owner and the developer preparing the App Store and Google Play submissions

> This guide is a careful reading of the published store policies, not legal advice and not a guarantee of approval. Both stores judge cannabis apps case by case. Get a short written opinion from a South African attorney before launch (see 6.1).

---

## 1. Verdict

**The original export (v1.0) would almost certainly have been rejected by both stores.** The main reason: it showed cannabis prices per gram and product menus (Indoor, Outdoor, Hydro…), next to a WhatsApp button and the line "Stock changes daily. Confirm with the store on WhatsApp." That is a sales menu with a way to arrange pickup.

- **Google Play** bans any app that facilitates the sale of marijuana "regardless of legality". Its listed violations include "assisting users in arranging delivery or pick up of marijuana".
- **Apple** allows facilitating cannabis sales only for "licensed or otherwise legal cannabis dispensaries". **Retail cannabis sales are not legal in South Africa** (section 2), so that exception doesn't apply.

On top of that, v1.0 was missing several standard requirements: Sign in with Apple, in-app account deletion, privacy policy and terms links, terms acceptance before posting, and the ability to block abusive users.

**v2 (this build, matching the KushRewards SA – v2 web app) fixes all of the above in the app code.** It now presents KushRewards as what both stores allow: an **information and community guide to cannabis clubs and venues for adults**. It shows hours, location, directions, features and honest reviews, with no prices, no menus, no stock, no ordering and no payments.

What still has to happen outside the code is in section 5, and the remaining judgement calls are in section 4.

---

## 2. Legal context that drives the decisions

- **Private use is legal; trade is not.** Since the 2018 Constitutional Court ruling, adults may use and grow cannabis privately. The Cannabis for Private Purposes Act (2024) has **not been operationalised** and does **not** legalise retail sales. In June 2026 the lawyer Paul-Michael Keichel told BusinessTech that cannabis shops "remain technically illegal", and that any trade in cannabis is prohibited by the Drugs and Drug Trafficking Act. The only exception is licensed medicinal cannabis under the Medicines Act.
- **Draft private-use regulations** (possession and cultivation limits) were published for comment in February 2026. They don't create a commercial market.

**What this means for the stores:**
- Apple won't treat South African shops as "licensed or otherwise legal dispensaries". The app must not facilitate any sale.
- Google bans sales facilitation everywhere, legal or not.
- Information and location ("locator") apps are the accepted model. Dispensary-finder apps have stayed on Google Play after the 2019 ban by removing in-app purchasing and keeping only information and location.

---

## 3. Requirement-by-requirement check

| # | Requirement | Source | v1.0 | v2 (this build) |
|---|---|---|---|---|
| 1 | No facilitating cannabis sales (no prices, menus, ordering, arranging pickup/delivery) | Google Play *Marijuana* & *Illegal Activities*; Apple 1.4.3 | ❌ prices, product menus, "confirm stock on WhatsApp" | ✅ Removed everywhere: venue page, cards, admin editor, suggestion form, review tags. Product data is dropped even if the server sends it (`hooks/queries.ts`) |
| 2 | Don't encourage consumption | Apple 1.4.3; Google *Inappropriate Content* | ⚠️ "Good quality", "Fair prices", "Out of stock" tags | ✅ Venue-only tags; "information only, private use, don't drive" notice on every venue page and in About |
| 3 | Age restriction for 18+ content | Apple 4.7.5 / age ratings; Google target audience | ⚠️ "Yes, I'm 18" button | ✅ Neutral date-of-birth age gate; failing it locks the app; the date is not stored |
| 4 | Sign in with Apple when Google sign-in is offered | Apple 4.8 | ❌ | ✅ Apple button on iOS with equal prominence (`useAppleSignIn.ts`, `SignInCard.tsx`) |
| 5 | In-app account deletion | Apple 5.1.1(v); Google account deletion policy | ❌ | ✅ Profile → About & legal → Delete my account (confirm dialog, deletes everything server-side) |
| 6 | Web link to request deletion | Google account deletion policy | ❌ | ⏳ URL set in `app.json` (`deleteAccountUrl`); the page must be built (5.3) |
| 7 | Privacy policy link in the app and listing | Apple 5.1.1(i); Google User Data policy | ❌ | ✅ in-app Privacy Policy, Terms and Community Rules screens + web pages in the v2 web app · ⏳ fill in placeholders (5.3) |
| 8 | Accept terms before posting user content | Google *User Generated Content* | ❌ | ✅ "Community rules" card before the first review, suggestion or report; server must enforce (HANDOVER 6.8) |
| 9 | Filter objectionable content | Apple 1.2 | ⚠️ admin hide only | ✅ App blocks prices, contact details, links, buy/sell words and slurs in reviews; same check required on the server |
| 10 | Report content + timely response | Apple 1.2; Google UGC | ✅ report | ✅ report with confirmation, one report per user (server), 24-hour moderation target |
| 11 | Block abusive users | Apple 1.2; Google UGC (public content) | ❌ | ✅ "Block" on every review by someone else |
| 12 | Published support contact | Apple 1.5 / 1.2 | ❌ | ✅ Contact support in About & legal (`supportEmail`) |
| 13 | Location only when needed, explained | Both | ✅ | ✅ Coarse location only; precise and background location blocked; text explains it stays on the phone |
| 14 | No unnecessary sensitive permissions | Google *Permissions* & *Photo and Video Permissions* | ⚠️ defaults | ✅ Camera, microphone, media-library, storage and overlay permissions blocked (logo upload uses the system photo picker) |
| 15 | Android target API level | Google: API 36 for new apps from 31 Aug 2026 | ✅ 36 | ✅ pinned to 36 in `app.json` |
| 16 | Encryption export answer | Apple | – | ✅ `ITSAppUsesNonExemptEncryption: false` |
| 17 | Regulated field submitted by a legal entity | Apple 5.1.1(ix) ("legal cannabis use") | – | ⏳ owner action (5.1) |
| 18 | Geo-restrict | Apple 5.1.1(ix) | – | ⏳ set availability to South Africa only in both consoles (5.2) |
| 19 | Working backend + demo account for review | Apple 2.1; Google *App access* | – | ⏳ backend must be live (HANDOVER) |
| 20 | Store artwork suitable for all ages | Apple 2.3.8 (metadata must suit 4+) | – | ⏳ icon and screenshots guidance (5.4) |

✅ done in code · ⏳ owner/developer action outside the app · ❌ missing · ⚠️ risky

---

## 4. Judgement calls and remaining risks

### 4.1 Listing retail "dispensaries" (the biggest remaining risk)
Even without prices, an Apple reviewer may see a list of businesses that sell cannabis in a country where that is illegal, and reject under 1.4.3 or as facilitating illegal activity. Google is more relaxed about locator apps, but the same reading is possible.

- **Lowest risk:** launch listing **private clubs and lounges only**. Change one line in `app.json`, `"listedStoreTypes": ["club", "lounge"]`, and dispensaries disappear from the map, list, filters and forms. Add them back later in an update once approved and with legal advice.
- **Current setting:** all three types are listed (`["dispensary", "club", "lounge"]`), as you asked to keep the product unchanged. If Apple rejects for this reason, switch to clubs and lounges and resubmit.

### 4.2 The name "KushRewards" and future reward features
- "Kush" is cannabis slang. Similar apps (Weedmaps, Leafly) use cannabis names in their listings, so this alone shouldn't cause a rejection.
- **"Rewards" plus planned points for store visits is a real risk.** Rewarding people for visiting or buying from cannabis sellers "encourages consumption" (Apple 1.4.3) and incentivises sales. The app has no rewards today. **Don't add points tied to visits, check-ins or purchases.** Points for contributions only (useful reviews, accurate venue info) are much safer.
- If a reviewer queries the name, explain in the review notes that "Rewards" refers to community contribution points, not purchases.

### 4.3 Which website reviewers will see
Reviewers often open the Support/Marketing URL and the website behind the app. The **v2 web app** ("KushRewards SA – v2") shows no prices, menus or ordering and has the legal pages built in, so **publish v2 (not v1) on kushrewards.co.za** before submitting. The original v1 web app still has "Rand per gram" switched on and product menus; it must not be what reviewers find.

### 4.4 Partner (paid) listings
Charging venues for a "Partner" badge or better placement is ordinary directory advertising and is allowed. Don't let partners publish prices, specials, menus or "order now" content in the app.

### 4.5 WhatsApp / call buttons
Contacting a venue is what any directory (or Google Maps) offers, and is fine. What made v1.0 risky was combining it with prices and stock. Keep the pre-filled message neutral ("I have a question"), and never pre-fill anything about products or orders.

---

## 5. Actions outside the code (must be done before submitting)

### 5.1 Accounts and legal entity
- **Apple:** enrol in the Apple Developer Program as an **organisation**, not an individual (US$99/year). Apple 5.1.1(ix) says apps in highly regulated fields, explicitly including "legal cannabis use", should be submitted by a legal entity. You need a registered company (Convenient Living Solutions), a free **D-U-N-S number** for it, and a company website on its own domain.
- **Google Play:** create an **organisation** developer account (US$25 once) for the same company. New *personal* accounts must first run a closed test with **at least 12 testers opted in for 14 consecutive days** before they can publish.
- Use the same company name on both stores, in the privacy policy and on the website.

### 5.2 Availability
- Make the app available in **South Africa only** (App Store Connect → Pricing and Availability; Play Console → Production → Countries/regions). This satisfies Apple's geo-restriction expectation and matches the legal analysis.
- Free app, no in-app purchases, no ads.

### 5.3 Web pages on kushrewards.co.za (URLs already set in `app.json`)

**Built in the v2 web app** (`/privacy`, `/terms`, `/community-rules`, `/support`, `/delete-account`, public and outside the age gate) and copied into the mobile app's Legal screen. Before launch, fill in the highlighted placeholders: company registration number, physical address, Information Officer name and email, backup retention period, and (mobile copy) the hosting provider. What each page covers:
| Page | Must contain |
|---|---|
| `/privacy` | Responsible party (company name, address, Information Officer under POPIA); what is collected (name, email, sign-in IDs, reviews/suggestions/reports, contact-tap events, admin logo uploads); what is *not* collected (location stays on the phone, no ads, no tracking, no sale of data); purposes; processors (hosting, storage, Google/Apple sign-in); retention; how to delete (in app + web link); the Information Regulator complaint route; contact email |
| `/terms` | 18+ only; information service, no sales/orders/payments; users must follow SA law; prohibited content (mirror the Community Rules); moderation and account termination; disclaimers |
| `/community-rules` | The five rules shown in the app (`RequireTerms.tsx`) with examples; how to report; 24-hour moderation target |
| `/delete-account` | "Delete your KushRewards SA account": sign in or email verification → confirm → deletes everything (same as the in-app option). Must name "KushRewards SA" exactly as listed on Google Play |
| Support URL (e.g. `/support`) | Contact email, short FAQ |

Make sure `support@kushrewards.co.za` exists and is monitored.

### 5.4 Icon, screenshots and artwork
- Apple requires store metadata (icon, screenshots, preview) to suit a **4+** audience even when the app is 18+. Google applies similar standards to listings.
- **App icon:** avoid a cannabis leaf or smoking imagery. Use the wordmark initials "KR", a map pin, or the gold-coin shape without the leaf. The leaf can stay inside the app.
- **Screenshots:** the Discover map and list, a venue page (hours, contact, reviews), the Reviews tab, and the age gate. Use real venue names and logos only with the venue's permission. No prices, products or consumption.
- **Avoid "stoner" sticker art and any known characters** (for example cartoon characters from TV shows or films). That style signals glamorised drug use to reviewers, and copyrighted characters will get the listing removed.

### 5.5 Backend and review access
- The backend must be **live during review** with real or realistic venues in Roodepoort and the West Rand, at least a few reviews, and all endpoints and server-side rules in HANDOVER section 6.
- Create a **demo account** for reviewers (email + password) with terms already accepted, and keep it working. Don't give reviewers admin access unless asked.
- Moderation: check reports at least daily and act within 24 hours.

---

## 6. Ready-to-paste store listing content

### 6.1 Apple App Store Connect

| Field | Value |
|---|---|
| App name (≤30) | `KushRewards SA: Club Guide` |
| Subtitle (≤30) | `Cannabis clubs & venue reviews` |
| Primary / secondary category | Lifestyle / Navigation |
| Keywords (≤100) | `cannabis,club,lounge,venue,guide,reviews,south africa,roodepoort,west rand,johannesburg,map,nearby` |
| Promotional text | A local guide to cannabis clubs and lounges for adults 18+. Information only: no sales or orders. |
| Support URL | https://kushrewards.co.za/support |
| Privacy Policy URL | https://kushrewards.co.za/privacy |
| Availability | South Africa only |
| Price | Free, no in-app purchases |

**Description**
```
KushRewards SA is a local guide to cannabis clubs, lounges and venues for adults aged 18 and over in South Africa, starting in Roodepoort and the West Rand.

• Find venues near you on a map or in a list sorted by distance
• See opening hours, address, features (parking, lounge seating, backup power…) and whether a venue is open now
• Get directions, or contact a venue directly by phone or WhatsApp
• Read and write quick, honest reviews about the venue experience
• Suggest a venue that's missing, or report wrong information

KushRewards is an information service only. We don't sell cannabis, show prices or menus, take orders, handle payments or arrange deliveries, and we never share your details with venues. Your location stays on your phone.

Cannabis is legal in South Africa for private use by adults. Please follow the law, use responsibly and never drive under the influence.
```

**Age rating questionnaire (answer honestly; the result should be 18+)**
- Alcohol, Tobacco, or Drug Use or References: **Frequent**
- User-Generated Content: **Yes**
- Messaging and chat: **No** (WhatsApp/calls open outside the app)
- Unrestricted web access: **No**
- Medical or treatment information: **None**
- Everything else (violence, sexual content, profanity, gambling, horror, contests): **None**
- Age assurance: the app has an in-app age gate (date of birth)

**App Privacy ("nutrition label")** – no tracking:
| Data type | Purpose | Linked to user |
|---|---|---|
| Contact Info: Name, Email Address | App Functionality | Yes |
| Identifiers: User ID | App Functionality | Yes |
| User Content: Other User Content (reviews, venue suggestions, reports) | App Functionality | Yes |
| User Content: Photos (venue logos uploaded by admins only) | App Functionality | Yes |
| Usage Data: Product Interaction (taps on Call/WhatsApp/Directions) | Analytics | Yes, when signed in |

Location is **not** collected: it's used only on the device.

**Notes for the reviewer (App Review Information → Notes)**
```
KushRewards SA is an information directory and review app for adults (18+) in South Africa. It lists cannabis clubs and venues with opening hours, location, features and community reviews.

It does NOT facilitate any sale: there are no prices, product menus, carts, orders, payments or delivery features, and user reviews are filtered to block prices and offers to buy or sell. In South Africa adults may lawfully possess and use cannabis privately (Constitutional Court, 2018; Cannabis for Private Purposes Act, 2024); the app only provides venue information. The app is available in South Africa only and is submitted by Convenient Living Solutions.

How to test:
1. On first launch enter any date of birth that makes you 18+ (e.g. 01 01 1990).
2. Browse Discover, open a venue, view hours/contact/reviews.
3. Sign in with the demo account: [email] / [password], or Sign in with Apple.
4. User-generated content: on any review by another user tap "Report" or "Block". Write a review from a venue page (Community Rules are accepted on first post).
5. Account deletion: Profile → About & legal → Delete my account.
Support: support@kushrewards.co.za
```

### 6.2 Google Play Console

| Field | Value |
|---|---|
| App name (≤30) | `KushRewards SA: Club Guide` |
| Short description (≤80) | `Find cannabis clubs and venues near you: hours, directions and honest reviews.` |
| Full description | Same as the Apple description above |
| Category | Lifestyle |
| Tags | Lifestyle, Local, Maps & Navigation (as available) |
| Contact details | support@kushrewards.co.za · https://kushrewards.co.za |
| Privacy policy | https://kushrewards.co.za/privacy |
| Countries | South Africa only |
| Ads | No ads |

**App content declarations**
- **App access:** "All or some functionality is restricted" → give the demo account and the same test steps as the Apple notes.
- **Content rating (IARC questionnaire):** category *Reference, News or Educational* (or *Social/Communication* if asked about UGC). Answer **Yes** to references to drugs (cannabis), **Yes** to user interaction/user-generated content, **No** to purchases, gambling, violence, sexual content and sharing location with other users. Expect an 18+/Mature rating.
- **Target audience and content:** **18 and over only**. Not designed for children.
- **News app:** No · **Government app:** No · **Financial features:** None · **Health:** None.
- **Data safety:**
  - Data collected: Personal info → Name, Email address, User IDs (account management, app functionality); Photos (admin logo uploads only, app functionality, optional); App activity → App interactions (analytics), Other user-generated content (app functionality).
  - Location: **not collected** (processed only on the device).
  - Data shared with third parties: **None**. Data encrypted in transit: **Yes**.
  - Users can request deletion: **Yes**, in the app and at https://kushrewards.co.za/delete-account.
- **Account deletion URL:** https://kushrewards.co.za/delete-account
- **Testing:** if the developer account is a new *personal* account, run the 12-tester / 14-day closed test first. An organisation account avoids this.

---

## 7. What changed in the code (v1.0 → v2)

| Area | Change | Files |
|---|---|---|
| Prices & menus | Removed the "What's available" menu, per-gram prices, price level, "stock" and "menu" wording; product data dropped client-side | `screens/StoreScreen.tsx`, `components/StoreCard.tsx`, `hooks/queries.ts`; deleted `PriceLevel.tsx`, `ProductTypesEditor.tsx`, `lib/productTypes.ts` |
| Admin | Removed the Settings tab (price display, product list); removed price/product fields from the venue editor and submission cards | `screens/AdminScreen.tsx`, `components/StoreEditor.tsx` |
| Suggest a venue | Removed price level; tab renamed "Suggest"; venue wording | `screens/AddStoreScreen.tsx`, `navigation/RootNavigator.tsx` |
| Venue types | `listedStoreTypes` switch (4.1) | `config.ts`, `app.json` |
| Information notice | "Information only, no sales, private use, don't drive" on every venue page and in About | `screens/StoreScreen.tsx`, `components/AboutLegal.tsx` |
| Age gate | Neutral date of birth; failure is remembered | `components/AgeGate.tsx` |
| Sign in with Apple | iOS button, `/auth/apple` | `hooks/useAppleSignIn.ts`, `components/SignInCard.tsx`, `screens/LoginScreen.tsx` |
| Terms acceptance | Community Rules card before first post; `termsAcceptedAt` on the user | `components/RequireTerms.tsx`, `hooks/useAuth.tsx` |
| UGC safety | Block reviewer, confirm-to-report, signed-out "Report" asks to sign in, content filter, venue-only tags | `components/ReviewItem.tsx`, `lib/contentFilter.ts`, `lib/reviewTags.ts`, `components/ReviewSheet.tsx`, `components/ReportSheet.tsx` |
| Account deletion & legal | About & legal: in-app Privacy Policy, Terms, Community Rules, Support/FAQ, contact email, delete account, company footer | `components/AboutLegal.tsx`, `screens/LegalScreen.tsx`, `lib/legalContent.ts`, `screens/ProfileScreen.tsx` |
| Permissions & build | Coarse location only; camera/mic/media/storage/overlay blocked; Android target 36; Apple sign-in entitlement; encryption flag | `app.json` |
| Backend contract | Endpoints match the v2 web app (`/account/accept_terms`, `/account/delete`, `/reviews/block`, one-report-per-user) plus `/auth/apple` and bearer tokens | `HANDOVER.md` section 6, `types/api.ts`, `api/endpoints.ts`, `docs/schema.sql` (`terms_accepted_at`, `review_reports`, `user_blocks`, deletion cascades) |

---

## 8. Submission checklist

- [ ] Company registered; D-U-N-S number; Apple organisation account; Google organisation account
- [ ] Attorney's short opinion letter on file (information-only directory, no sales)
- [ ] v2 web app published on kushrewards.co.za (not v1); website shows no prices, menus or ordering (4.3)
- [ ] Decide `listedStoreTypes` (4.1)
- [ ] Privacy, Terms, Community Rules, Delete-account and Support pages live with placeholders filled in; support inbox monitored
- [ ] Backend live with all v2 endpoints and server-side rules (terms enforcement, content filter, blocks, one-report-per-user, deletion)
- [ ] Google OAuth client IDs (web/iOS/Android) and Apple Sign-In capability set up; values in `app.json`
- [ ] App icon (no leaf) and splash screen added; 4+-appropriate screenshots
- [ ] Demo reviewer account created, terms accepted, a few reviews present
- [ ] Availability: South Africa only; free; no ads
- [ ] Apple: age rating 18+, App Privacy answers, review notes pasted
- [ ] Google: content rating, target audience 18+, data safety, app access, account deletion URL
- [ ] Production builds (EAS) tested on a real iPhone and Android phone: age gate, sign-in (Apple/Google/email), review, block, report, suggest, delete account

---

## 9. Sources

- Apple, *App Review Guidelines* (1.2, 1.4.3, 1.5, 2.1, 2.3.8, 4.7.5, 4.8, 5.1.1(i), 5.1.1(v), 5.1.1(ix)): https://developer.apple.com/app-store/review/guidelines/
- Apple, *Age ratings values and definitions*: https://developer.apple.com/help/app-store-connect/reference/age-ratings
- Google Play, *Inappropriate Content – Marijuana*: https://support.google.com/googleplay/android-developer/answer/9878810
- Google Play, *Illegal Activities*: https://support.google.com/googleplay/android-developer/answer/9878877
- Google Play, *User Generated Content*: https://support.google.com/googleplay/android-developer/answer/9876937
- Google Play, *App account deletion requirements*: https://support.google.com/googleplay/android-developer/answer/13327111
- Google Play, *App testing requirements for new personal developer accounts*: https://support.google.com/googleplay/android-developer/answer/14151465
- Android Developers, *Target API level requirements*: https://developer.android.com/google/play/requirements/target-sdk
- Gummicube, *Google Play restricts apps for marijuana, alcohol and tobacco* (locator apps remain allowed): https://www.gummicube.com/blog/google-play-restricts-apps-for-marijuana-alcohol-and-tobacco/
- BusinessTech, *These stores are illegal in South Africa…* (24 June 2026): https://businesstech.co.za/news/business-opinion/864490/these-stores-are-illegal-in-south-africa-but-theres-one-in-almost-every-shopping-mall/
- EWN, *New draft rules aim to end South Africa's cannabis confusion* (4 February 2026): https://www.ewn.co.za/new-draft-rules-aim-to-end-south-africa-s-cannabis-confusion/
