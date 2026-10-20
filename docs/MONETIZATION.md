# Monetization plan

## Pro plans and payment setup (October 2026 — supersedes the model table below)

**Free:** prayer times, prayer alerts and adhan, the Qibla compass, reading the Quran, reading Sahih
al-Bukhari and Sahih Muslim, and 5 image stories per 24 hours (the window starts with the first
story; counted on the phone). Language, accessibility settings and onboarding are always free.
**Pro:** everything else — unlimited and video stories, every style, no app name, saved stories and
sync, calculation settings, the next-prayer panel, the daily reminder, custom adhan, Tasbih, Daily
deeds, Duas, Calendar, 99 Names, widgets, wallpapers, Quran bookmarks / continue reading / reading
settings, hadith search / dua filter / continue reading. Every Pro item carries a PRO label for free
users; tapping it opens the Pro screen, which can only be closed (back to where they were) or used
to upgrade.

| Plan     | Product id             | Type                        |
| -------- | ---------------------- | --------------------------- |
| Monthly  | `barakah_pro_monthly`  | auto-renewing subscription  |
| Yearly   | `barakah_pro_yearly`   | auto-renewing subscription  |
| Lifetime | `barakah_pro_lifetime` | one-time (non-consumable)   |

The lifetime plan is offered for **3 days from the person's first open** (`lifetimeOffer` in
`packages/core/src/pro.ts`); after that the Pro screen shows it as "Expired". The window is real,
not a fake timer, which keeps the scarcity honest for store review. It is measured on the phone, so
a reinstall starts it again; make it server-side (Supabase `first_open_at`) if that matters.

The locks only switch on where Pro can actually be bought (`proLocksActive` in
`apps/mobile/src/monetization/adapter.ts`). Today's store build has no billing, so nothing is
locked there; development builds use a simulated store so the flow can be tested in Expo Go.

### Steps to take payments

1. **Google Play Console**
   - Setup → Payments profile: create the merchant account (bank account, tax info).
   - Monetize → Products → Subscriptions: create `barakah_pro_monthly` (one auto-renewing base plan,
     1 month) and `barakah_pro_yearly` (base plan, 1 year). Set prices; Play converts per country.
   - Monetize → Products → In-app products: create `barakah_pro_lifetime` (one-time).
   - Also as in-app products: the "Support the app" tips `barakah_tip_1`, `barakah_tip_2`,
     `barakah_tip_5` (about $1, $2 and $5). They unlock nothing. Call them support for the app, not a
     donation to a cause: charity donations go through Google's separate nonprofit process.
   - Products can only be activated once a build with the billing permission is uploaded to a
     testing track (the RevenueCat SDK adds it).
   - Setup → License testing: add your Gmail so test purchases are free.
2. **App Store Connect** (needs the paid Apple Developer account)
   - Agreements, Tax and Banking: sign the Paid Apps agreement, add bank and tax details.
   - Subscriptions: a group "Barakah Pro" with `barakah_pro_monthly` and `barakah_pro_yearly`.
   - In-App Purchases: `barakah_pro_lifetime`, type Non-Consumable.
   - Users and Access → Sandbox: add a sandbox tester.
3. **RevenueCat** (free until $2.5k/month revenue)
   - New project → add the Android app (`com.barakah.stories`, plus a Google service-account JSON
     with Play financial access) and the iOS app (bundle id, App Store Connect API key).
   - Products: import the three ids. Entitlement: `pro`, attached to all three.
   - Offering `default` with packages Monthly, Annual and Lifetime.
   - Copy the two **public** SDK keys (safe in the app) into `.env` as
     `EXPO_PUBLIC_REVENUECAT_ANDROID_KEY` and `EXPO_PUBLIC_REVENUECAT_IOS_KEY`, and into the
     GitHub Actions secrets for CI builds.
4. **App code — done** (`apps/mobile/src/monetization/revenuecat.ts`). It switches on by itself in
   any store build that has the key: add GitHub secret `EXPO_PUBLIC_REVENUECAT_ANDROID_KEY`
   (and the line in `apps/mobile/.env` for local builds), rebuild, and the locks, real prices and
   purchases go live. Pro is re-checked at launch and on every return to the app, so an ended
   subscription locks again; lifetime stays.
5. **Store declarations**: Play Data safety → add "Financial info → Purchase history" (collected by
   RevenueCat for purchases, not shared). Mention RevenueCat in `docs/PRIVACY.md` and
   `apps/web/public/privacy.html`. Add the subscription terms link to the store listing.
6. **Test** on the internal testing track (Android) and TestFlight sandbox (iOS): buy each plan,
   restore on a second device, cancel a subscription and confirm Pro ends at period end.
7. **Release**: bump `versionCode`, upload the AAB, roll out.

## Model

| Tier      | Price                          | What it changes                                                                                                                            |
| --------- | ------------------------------ | ------------------------------------------------------------------------------------------------------------------------------------------ |
| Free      | –                              | Everything works, completely. Stories carry a small "Barakah Stories" line, and interstitial ads appear around making and sharing a story. |
| Ad reward | Watch one rewarded ad          | Removes the app name from stories for 24 hours (stackable). Does **not** remove interstitials.                                             |
| Pro       | One-time or yearly (to decide) | Removes the app name permanently **and removes all ads**. That is the whole offer.                                                         |

Pro is deliberately one promise — _no badge, no ads_ — rather than a bundle of features. It is easy
to explain on a paywall, it needs no new content to be produced before it can go on sale, and it
does not put anything religious behind a payment.

Religious content itself (Quran, hadith, duaa) stays free and complete in every tier. Video
backgrounds and recitation are **not** part of Pro; they are v1.1 feature work, planned separately
in `docs/PRO-PLAN.md`.

## Where ads appear

Two interstitial placements, both around the story-making flow:

| Placement       | Moment                                                      |
| --------------- | ----------------------------------------------------------- |
| `before-create` | Opening the editor — a screen transition the user expects.  |
| `after-export`  | Once the share sheet has closed and the story has gone out. |

**Note the second one is after the export, not before it.** An interstitial shown between the user
tapping Share and the share sheet appearing is precisely the pattern Google Play's disruptive-ads
policy names — a full-screen ad interrupting an action the user has already committed to — and it is
also the placement users uninstall over. Placing it on the return trip earns the same impression at
a fraction of the risk. Moving it to strictly before the share is a one-line change in
`packages/core/src/ads.ts` if that is what you want, but it should be a deliberate choice.

Ads **never** appear in the Quran reader, the hadith library, or the prayer screens. Nothing
full-screen interrupts someone who is reading Quran or checking a prayer time.

## Frequency

Two interstitials per story with no limits would mean six full-screen ads inside the first few
minutes of use. The caps live in `packages/core/src/ads.ts` as data, so they can be tuned without
touching a call site:

| Rule            | Default | Why                                                          |
| --------------- | ------- | ------------------------------------------------------------ |
| `graceStories`  | 3       | A new install gets a clean first run before any ad appears.  |
| `minIntervalMs` | 90 s    | Two interstitials can never land back to back.               |
| `maxPerSession` | 4       | A ceiling for the heavy user, however long the session runs. |

## Foundation already in the code

- `packages/core/src/monetization.ts`
  - `Entitlements` = `{ tier, adRewardUntil, updatedAt }`, plus pure helpers:
    `canRemoveWatermark`, `shouldShowWatermark`, `grantAdReward`, `grantPro`.
  - `MonetizationAdapter` interface: `purchasePro()`, `restorePurchases()`, `showRewardedAd()`.
    The UI only talks to this interface.
  - `NOOP_ADAPTER` is used until an SDK is integrated; it reports "unavailable".
- `packages/core/src/ads.ts`
  - `shouldShowAd(placement, entitlements, state, now, policy)` — the single question the UI asks.
  - `AdState` counters and the `recordAdShown` / `recordStoryStarted` / `resetSession` transitions.
  - `showsAds(e)` — false for Pro, true for everyone else including a rewarded-ad holder.
  - Covered by `ads.test.ts`: Pro exemption, grace window, interval, session cap, cold start.
- `apps/mobile/src/monetization/`
  - `store.ts` persists entitlements locally and exposes `removeWatermark()` orchestration.
  - `adapter.ts` selects the adapter. In development builds a `DevAdapter` simulates a purchase
    and a rewarded ad so the whole flow can be exercised in Expo Go.
- The story card takes `showWatermark`; the editor has an "App name on story" switch that opens
  the Go Pro / Watch an ad choice for free users; the Me tab shows the Pro section.
- `StoryDesign.hideWatermark` records the user's wish; it is only honoured when entitled.

Still to build: an `AdState` store on the mobile side (persisted, session-reset on cold start), an
`InterstitialAdapter` alongside the existing `MonetizationAdapter`, and the two call sites.

## Implementation steps (when ready)

1. **Billing: RevenueCat** (`react-native-purchases`). Create products
   `barakah_pro_lifetime` / `barakah_pro_yearly` in App Store Connect and Play Console, an
   entitlement `pro` in RevenueCat, then implement `RevenueCatAdapter`:
   `purchasePro` → `Purchases.purchasePackage`, `restorePurchases` → `Purchases.restorePurchases`,
   map `customerInfo.entitlements.active.pro` → `tier: 'pro'`.
2. **Ads: Google AdMob** (`react-native-google-mobile-ads`). Two ad units per platform — one
   interstitial, one rewarded. The interstitial must be **preloaded** before the moment it is
   shown, or `before-create` will stall the editor; load the next one immediately after each
   dismissal. Resolve the rewarded flow only on the `EARNED_REWARD` event.
3. **Consent, before the first ad request.** The UMP consent flow for EU/UK users (bundled with
   `react-native-google-mobile-ads`) and App Tracking Transparency on iOS
   (`expo-tracking-transparency`, plus `NSUserTrackingUsageDescription` in `app.json`). Requesting
   an ad before consent is resolved is itself a policy violation.
4. **Native build.** Both SDKs need native code, so switch from Expo Go to a development build
   (`npx expo run:ios` / `run:android` or EAS dev client). Expo Go keeps working with the
   `NoopAdapter` and `shouldShowAd` simply returning false.
5. **Server truth (optional but recommended).** Add an `entitlements` table in Supabase
   (`user_id`, `tier`, `source`, `expires_at`) fed by the RevenueCat webhook, and read it in
   `syncAll` so Pro follows the account across devices. Keep the local copy as cache. Schema and
   RLS shape in `docs/PRO-PLAN.md` section 6.
6. **Abuse limits.** Cap rewarded ads per day (e.g. 3) in the store, and never trust the client
   for Pro when the account is signed in: prefer the server record.
7. **Analytics.** Log `ad_shown`, `ad_failed`, `watermark_prompt_shown`, `ad_rewarded`,
   `pro_purchased` so the paths can be compared. Note that adding analytics has the same
   disclosure consequences as adding ads — see below.

## Before the first ad build ships

The app has already been prepared for submission on the explicit promise that it carries no ads.
Four artefacts say so today and every one of them becomes a false claim the moment an ad loads.
This is a release checklist, not a nice-to-have: a listing that misdescribes ads is a policy
violation in its own right.

- [ ] **`docs/STORE-LISTING.md`** — the full description has a `NO TRACKING` section reading "No
      analytics and no advertising", in **both English and Arabic**. Rewrite both.
- [ ] **`docs/PRIVACY.md`** — "We do not use analytics, we do not use advertising" is no longer
      true. Add what AdMob collects, why, and how to opt out.
- [ ] **`apps/web/public/privacy.html`** — the live policy at the URL already given to Play. It
      duplicates the same sentence and the same claim in its `<meta name="description">`. It must
      change in step with `PRIVACY.md`; they are kept identical by hand.
- [ ] **Play Data Safety form** — `docs/RELEASE-LOG.md` records the submitted answers, which end
      with "no ads, no analytics, no advertising ID". AdMob collects the advertising ID and device
      / app-activity signals for ad delivery, so the declaration has to be redone.
- [ ] **Play "Contains ads" declaration** — currently set to no ads.
- [ ] **iOS**: `NSUserTrackingUsageDescription`, and the SKAdNetwork identifiers the AdMob plugin
      adds to `app.json`.

Do all six before the ad-bearing build reaches production, not after.

## Things to decide

- Pro price, and whether it is lifetime or subscription. With ads as the free-tier revenue and no
  per-user server cost, a lifetime price is viable; a subscription earns more from the small share
  of users who would pay either way.
- Whether to keep the rewarded-ad path at all now that Pro is defined as "no badge, no ads". It
  already exists and is tested, it monetizes people who will never pay, and it gives the badge
  switch an answer other than a paywall — so the recommendation is to keep it.
- Whether the `after-export` interstitial should instead run before the share sheet. See the note
  above; the safer placement is the default.
- Whether ads are the right fit for this audience at all. The app's positioning so far has been
  explicitly ad-free and privacy-first, and that is in the listing copy in both languages. This is
  a brand decision as much as a revenue one, and it is worth making on purpose.
- Whether Pro should include premium photo packs (the photo registry already supports adding
  packs; gating would be a `premium: true` flag on backgrounds). `docs/PRO-PLAN.md` section 3
  carries that flag through to video backgrounds.
