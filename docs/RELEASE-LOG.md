# Release log — first Android release

Running record of everything done on the way to publishing Barakah Stories v1 on Google Play.
Kept up to date as work happens; newest entries at the bottom of the log.

**Goal:** a signed AAB accepted on the Play Store, image-only stories. Audio/video export is
explicitly deferred to v1.1 (see [Deferred](#deferred-to-v11)).

---

## Status at a glance

| Area                  | State                                                                                             |
| --------------------- | ------------------------------------------------------------------------------------------------- |
| Local `npm run check` | ✅ Passing — typecheck, lint, format, 385 tests                                                   |
| Release signing       | ✅ Keystore secrets set and proven                                                                |
| Android build (CI)    | ✅ Run 36157724666 — signed AAB + APK from `30354cd`, `versionCode 6`                             |
| Target API level      | ✅ React Native 0.86 targets API 36, which meets Play's 31 Aug 2026 requirement                   |
| Play Console          | ✅ Organization account — production access granted, closed testing not required                  |
| Privacy policy        | ✅ Live, and covers the daily reminder                                                            |
| Accounts + deletion   | ✅ Verified end to end on device and in the database; web page live                               |
| Store graphics        | 🟡 Icon and feature graphic generated in `docs/store/`; **screenshots still needed from a phone** |
| Store listing copy    | 🟡 Drafted EN + AR — **the Arabic needs your read-through**                                       |
| Device testing        | ✅ Photo backgrounds and theme switching confirmed fixed on device                                |
| Play Console forms    | ❌ Data Safety, content rating and the privacy-policy URL not yet entered                         |
| App version           | ✅ `1.0.0` / `versionCode 6`                                                                      |

--------------------- | ------------------------------------------------------------------------------------------------------ |
| Repo layout | ✅ Collapsed to one clone, up to date with `origin` at `d5a11fc` |
| Local `npm run check` | ✅ Passing — typecheck, lint, format, 350 tests |
| Android build (CI) | ✅ Run 35419403039 succeeded — APK + AAB produced (debug-signed, version 0.1.0) |
| Release signing | ✅ Keystore secrets set; run 35421731036 produced a signed 1.0.0 AAB |
| Device testing | ✅ Share to WhatsApp, location + prayer times, Qibla compass and export all verified on a phone |
| Play Console | ✅ Organization account, one app already live — production access granted, closed testing not required |
| Store listing copy | ✅ Drafted in `docs/STORE-LISTING.md` (EN + AR) — needs your read-through |
| Accounts + deletion | ✅ Verified end to end on device and in the database; web page live |
| Store graphics | ❌ Icon, feature graphic and screenshots still to produce |
| Privacy policy | ✅ Live at yassinerzk.github.io/barakah-stories/privacy.html |
| App version | ✅ `1.0.0` / `versionCode 1` |

---

## Log

### 2026-09-19 — Repo cleanup

The working copy had drifted into three nested clones of the same repo, each newer than the last,
with the actual latest code two levels deep inside `apps/mobile/` and nothing locally holding the
remote head.

Audited all three for anything unique before touching them:

- No unpushed commits in any clone.
- No uncommitted work except a cosmetic re-format of `apps/mobile/tsconfig.json` (whitespace only).
- No secrets, `.env` files or keystores — only the tracked `.env.example` template.

Actions:

- Fast-forwarded the root repo from `eb0e3c8` to `d5a11fc` (8 commits), which brought in the
  monorepo layout, the Android build workflow, `docs/OVERVIEW.md` and the release-signing script.
- Deleted the nested `react/` clone.
- Reinstalled workspace dependencies (the root `node_modules` was the stale web-only install).

Result: one clone at `C:\Users\user\SAAS Projects\react`, clean tree, matching `origin`.

### 2026-09-19 — Android build pre-flight

Read `.github/workflows/android-build.yml` and `scripts/android-release-signing.mjs` before
re-running, to avoid burning runs on avoidable failures. Findings in the next two sections.

### 2026-09-19 — Local toolchain repair

`npm run check` could not run on this Windows machine. Two separate problems, neither of which
affects CI:

**1. Platform binaries missing from the lockfile.** `package-lock.json` contains only the Linux
builds of `rollup` and `esbuild` — it was generated in a Linux cloud session. On Windows,
`npm ci`/`npm install` therefore can never install `@rollup/rollup-win32-x64-msvc` or
`@esbuild/win32-x64`, and every Vite/vitest run dies at startup. Worked around locally with:

```bash
npm i @rollup/rollup-win32-x64-msvc@<rollup version> @esbuild/win32-x64@<esbuild version> --no-save
```

Install both in **one** command — a second `npm i --no-save` prunes the package the first one
added. The lockfile is deliberately left untouched so CI (`ubuntu-latest`) keeps working; the
trade-off is that this has to be redone after any `npm ci`. A durable fix would be to regenerate
the lockfile on a machine that resolves optional dependencies for every platform, but that risks
dropping the Linux entries CI depends on, so it is not worth doing before the release.

**2. Line endings.** `core.autocrlf` was `true` and the repo has no `.gitattributes`, so every file
was checked out CRLF while Prettier expects LF — `format:check` failed on 266 files with no real
drift. Fixed locally with `git config core.autocrlf false` plus a Prettier rewrite. Verified this
changed **no content**: blob hashes are identical to the index and `git diff --numstat` is empty.
Recommend committing a `.gitattributes` containing `* text=auto eol=lf` so this does not recur on
any Windows checkout.

**Result:** the full check passes — typecheck, lint, format, and 350 tests (348 in core across 9
files, 2 in web). The tree is clean, so the code that CI will build is verified good before the
first Android run.

### 2026-09-19 — Play compliance review

> **Partly superseded the same day.** The "ship v1 with accounts off" decision below was reversed —
> accounts ship in v1 and deletion was built. See "Accounts moved into v1". The account-type and
> location findings still stand; the Supabase line in the egress list no longer does.

**Account type resolved.** The Play developer account is an **organization** account, registered
earlier in 2026, with one app already live. The 12-testers-for-14-days closed-test requirement
applies to _individual_ accounts registered since late 2023, so it does **not** apply here, and
production access is already granted. The longest wall-clock item in the plan is removed.

**Account deletion — avoided rather than solved.** Play requires any app that allows account
creation to offer account deletion both in-app and through a web URL. The app has `signOut` but no
delete path (`apps/mobile/src/auth/store.ts`; the only `delete` on the Me tab removes a single
saved post). This is **not a blocker for v1**, because accounts are inert in the shipped build:
`apps/mobile/src/auth/supabase.ts` returns a null client unless `EXPO_PUBLIC_SUPABASE_URL` and
`EXPO_PUBLIC_SUPABASE_ANON_KEY` are set, `authEnabled` is then false, and the Me tab hides sign-up.
CI builds without a `.env`, so v1 ships with no account creation at all.

Decision: **ship v1 with accounts off.** It keeps the Data Safety declaration to location only, and
removes the deletion requirement entirely. Before accounts are ever enabled, account deletion must
be built first — in-app _and_ as a public web URL.

**Location claim is inaccurate.** `apps/mobile/app.json` tells the user location "never leaves your
device", but `apps/mobile/app/(tabs)/prayer.tsx:39` calls `Location.reverseGeocodeAsync`, which
passes the coordinates to the platform geocoder (Google Play Services on Android, Apple on iOS) to
get a place name. Prayer times and Qibla themselves are computed locally by `adhan`, so only the
place-name lookup leaves the device — but the copy as written is wrong and the Data Safety form
must not repeat it. Fix the permission string before submitting.

**Network egress, full list** (needed for the Data Safety form):

- `cdn.jsdelivr.net` — hadith collections on first use (`packages/core/src/hadith.ts:47`); the CDN
  sees the device IP like any web request.
- Platform geocoder — coordinates, for the place name only.
- Supabase — **not reached in v1**, accounts disabled.
- No analytics, no ads, no advertising ID, no tracking SDK in v1.

### 2026-09-19 — Submission materials drafted

- `apps/mobile/app.json`: version `0.1.0` → `1.0.0`, and both location permission strings (iOS
  `infoPlist` and the `expo-location` plugin) rewritten to drop the false "never leaves your
  device" claim.
- `docs/PRIVACY.md` — full policy written for v1 as it actually behaves: no accounts, no analytics,
  no ads, location used on-device with the place-name lookup disclosed, jsDelivr disclosed.
  **Two placeholders must be filled before publishing: `[COMPANY]` and `[CONTACT EMAIL]`.**
- `docs/STORE-LISTING.md` — app name, short and full descriptions in English and Arabic, within
  Play's character limits, plus the graphics specs still outstanding.

### 2026-09-19 — First successful Android build

Run **35419403039** (`workflow_dispatch`, ~14 min) completed green. Every step passed, including
Gradle — so the **Java 17 concern is cleared**; the pinned JDK builds RN 0.86 / Expo 57 fine and
the workflow needs no change. `Configure release signing` skipped as designed (no keystore
secrets), so both artifacts are debug-signed.

The runner built commit `d5a11fc`, so this APK is version **0.1.0** with the old location strings
— the `1.0.0` bump is still uncommitted. Fine for device testing, not for Play.

Artifacts downloaded to `~/Downloads/barakah-android/`.

**Size analysis.** The APK is 104 MB and the AAB 71 MB, which looks alarming and mostly is not:

| Component              | Size    | Note                                          |
| ---------------------- | ------- | --------------------------------------------- |
| `lib/`                 | 73.7 MB | Native libs for **all four ABIs**             |
| dex (5 files)          | 42.3 MB | R8/ProGuard is off by default in React Native |
| `res/`                 | 12.2 MB | Photo backgrounds and icons                   |
| `index.android.bundle` | 5.8 MB  | JS + bundled Quran text                       |

The APK is a _universal_ build carrying arm64-v8a, armeabi-v7a, x86 and x86_64 at once. No real
user ever downloads that: Play splits the AAB per device, shipping one ABI and one density, so the
actual download will be far smaller — confirm the real figure in Play Console after the first
upload, which reports it directly.

Two optimisations for later, neither a v1 blocker:

- **Enable R8** (`enableProguardInReleaseBuilds`). 42 MB of dex is large because React Native
  leaves minification off by default. Real savings, but it can break reflection-based code, so it
  needs a full device pass afterwards — not something to do days before a first release.
- **Drop x86/x86_64.** Only emulators and ChromeOS need them. This shrinks the universal APK a lot
  but changes nothing for Play users, since the AAB already ships one ABI per device. Low value.

Hermes is enabled (`libhermesvm.so` present), which is correct.

### 2026-09-19 — Accounts moved into v1

Reversing the earlier "accounts off in v1" decision at the owner's request: sign-up ships in v1, so
Play's account-deletion requirement now applies and had to be built.

**Deletion, without a server.** The anon key cannot touch `auth.users` and the service-role key must
never reach a client, so `supabase/schema.sql` gains a `delete_account()` security-definer function
that deletes only `auth.uid()`. The existing `on delete cascade` foreign keys remove the user's
`saved_designs` and `quran_progress` rows with them, so one function is the whole backend.

- `apps/mobile/src/auth/store.ts` — `deleteAccount()` calls the RPC, then signs out locally so the
  device stops retrying with a token whose user no longer exists.
- Me tab — danger-styled button, native confirm dialog, busy state, success/error toast.
- `packages/core/src/i18n/{en,ar}.ts` — seven new strings in both languages.

**Web deletion route.** Play requires deletion to be reachable without reinstalling the app, so
`apps/web/public/delete-account.html` signs the user in and calls the same RPC. It is standalone
(supabase-js from a CDN) and degrades to a contact fallback when the keys are absent, so it is
never a broken form.

**Documents corrected.** Both privacy copies said "we do not operate a server that stores your
data" and the listing promised "no sign-up" — both would have been false claims on a shipping
listing. Rewritten with "If you create an account" and "Deleting your account" sections, in English
and Arabic.

**Build.** `android-build.yml` now passes `EXPO_PUBLIC_SUPABASE_URL` and
`EXPO_PUBLIC_SUPABASE_ANON_KEY` at job level so Metro bakes them in during `bundleRelease`.
Without the secrets the app still builds and hides sign-up.

Outstanding for this feature:

- [ ] Create the Supabase project and run the updated `supabase/schema.sql`
- [ ] **Verify `delete_account()` against a throwaway account before submitting.** If Supabase has
      restricted DML on the `auth` schema, the fallback is an Edge Function holding the
      service-role key.
- [ ] Set the two `EXPO_PUBLIC_SUPABASE_*` repository secrets
- [ ] Paste the same URL and anon key into `delete-account.html` (currently empty placeholders)
- [ ] Data Safety now needs email + user content declared, with the deletion URL
- [ ] Re-test sign-up, sync and delete on a real device

### 2026-09-19 — Device testing passed

The debug-signed APK from run 35419403039 was installed on a real Android phone and the four paths
that had never run on hardware all worked:

- Share → WhatsApp → My status, at the full 1080x1920 size
- Location permission, real city, prayer times
- Live Qibla compass
- Exported image quality — Arabic shaping, fonts, decorations, backgrounds

This retires the largest unknown in the project. Every remaining item is process rather than
engineering: signing, listing assets, and the Play submission itself.

Still untested on hardware: iOS (needs an Apple developer account and an EAS build), the hadith
download over mobile data, and behaviour in airplane mode.

### 2026-09-19 — Privacy policy finalised

Legal entity is **Klay Creative Lab LLC**, contact **info@klaycreate.com**. The entity named in
the policy matches the verified organisation on the Play account, which is what a reviewer checks.

Published in two places, kept identical:

- `docs/PRIVACY.md` — the source of truth for editing.
- `apps/web/public/privacy.html` — a standalone, theme-aware page that Vite copies verbatim into
  the build, so once Pages is enabled it is served at `<pages-url>/privacy.html`. That is the URL
  for the Play listing. It has no dependency on the React app, so it renders even if the app
  bundle fails.

Whenever one changes, change the other.

---

## Android build — what we know

The workflow (`.github/workflows/android-build.yml`) runs on `workflow_dispatch` or a tag matching
`android-v*`. It builds natively on the runner rather than through EAS, so no Expo account is
needed. Steps: checkout → Node 22 → Java 17 → Gradle → `npm ci` → `expo prebuild --platform
android` → optional release signing → `./gradlew :app:assembleRelease :app:bundleRelease` → upload
`barakah-stories.apk` and `barakah-stories.aab` as a run artifact (30-day retention).

**The previous run failed** in the runner setup step, before the app was built: the `setup-android`
action asked the SDK manager for a package named `tools` that no longer exists. That step was
unnecessary — the runner already ships the Android SDK — and was removed in `d5a11fc`. The
workflow has not been re-run since.

App identity (`apps/mobile/app.json`):

- Package / bundle id: `com.barakah.stories`
- Version `0.1.0`, `versionCode 1`
- Permissions: `ACCESS_COARSE_LOCATION`, `ACCESS_FINE_LOCATION` (foreground only)
- New architecture enabled, portrait only, adaptive + monochrome icons present

### Release signing

Without keystore secrets the workflow signs with the **debug key**. That APK installs on your own
phone for testing, but Play will reject a debug-signed AAB. To produce an uploadable build, four
repository secrets must exist:

| Secret                      | What it is                          |
| --------------------------- | ----------------------------------- |
| `ANDROID_KEYSTORE_BASE64`   | The upload keystore, base64-encoded |
| `ANDROID_KEYSTORE_PASSWORD` | Store password                      |
| `ANDROID_KEY_ALIAS`         | Key alias inside the keystore       |
| `ANDROID_KEY_PASSWORD`      | Key password                        |

`scripts/android-release-signing.mjs` patches the generated `build.gradle` to use them. Guard this
keystore carefully — losing it means losing the ability to update the app, unless Play App Signing
is enabled (recommended, and it is the default for new apps).

### Risks to watch in the first run

- **Java version.** The workflow pins Java 17. React Native 0.86 / Expo 57 are recent enough that
  the toolchain may want a newer JDK. If Gradle fails on a Java version or AGP compatibility
  message, bump `java-version` to 21 and re-run. _(Unverified — check the run log.)_
- **`npm ci`** needs `package-lock.json` in sync with all workspaces. It is committed and was
  generated from this layout, so it should be fine.
- **Output paths** in the "Rename outputs" step are hard-coded; the step lists the output tree
  first, so a path mismatch will be visible in the log.

---

## Checklist to publish

### Build

- [ ] Re-run "Android build" from the Actions tab; download `barakah-stories.apk`
- [ ] Install the APK on a real Android phone
- [ ] Bump `version` to `1.0.0` in `apps/mobile/app.json` before the production build
- [ ] Create the upload keystore, add the four secrets, re-run for a release-signed AAB

### Device testing (never done on hardware)

- [ ] Share a story → WhatsApp → My status, at full 1080x1920
- [ ] Location permission prompt and prayer times for the real location
- [ ] Live Qibla compass against a known bearing
- [ ] PNG capture quality (fonts, Arabic shaping, decorations, photo backgrounds)
- [ ] Hadith download on mobile data, and behaviour offline
- [ ] Arabic RTL interface end to end

### Play Console

- [x] Developer account — organization, already live with one app, production access granted
- [x] Closed testing — **not required** (organization account)
- [ ] Fix the location permission string in `app.json` (it wrongly claims location never leaves
      the device) before submitting
- [ ] Data safety form — **location only**: approximate + precise location, used for app
      functionality (prayer times, Qibla), not collected off-device, not shared, not linked to an
      identity. No email or user content, since accounts are off in v1.
- [ ] Content rating questionnaire
- [ ] Privacy policy URL — required; must be publicly reachable before submitting
- [ ] Ads declaration: **no ads in v1** (AdMob is not integrated). Ads are now planned — see the
      "Before the first ad build ships" checklist in `docs/MONETIZATION.md`, which lists every
      artefact below that has to be corrected first, this line included
- [ ] Confirm Play's target API level requirement is met by the Expo template
- [ ] Build v1 **without** `EXPO_PUBLIC_SUPABASE_*` set, so sign-up stays hidden

### Store listing assets

- [ ] App icon 512×512
- [ ] Feature graphic 1024×500
- [ ] 2–8 phone screenshots (gallery, editor, prayer + Qibla, Quran reader, hadith search)
- [ ] Short description (80 chars) and full description, English + Arabic
- [ ] Category and contact details

---

## Decisions

**Ship v1 without audio.** Audio on a WhatsApp status requires a video, which means replacing the
PNG export with an on-device MP4 encoder — plausibly more work than every other open item combined.
Getting v1 live unblocks device feedback, the Play listing and the closed-test clock, all of which
run in parallel with the audio work.

**Audio policy, set before any recording happens:**

- Voice only — a cappella nasheed and natural ambience, no instruments, since a large part of the
  audience holds instrumental music to be impermissible.
- Recitation must be properly licensed. Commercial recordings by well-known qaris are **not** free
  to redistribute, and this app is monetized. Preferred path: commission a qari for a curated set
  of short passages with a written buyout.
- Clips cut at **ayah boundaries**, never at an arbitrary 30-second mark.
- Attribution (reciter, surah:ayah) shown in-app and on the exported card.
- Loudness-normalise everything to ≈ −16 LUFS.

**Monetization boundary.** `docs/MONETIZATION.md` commits to keeping religious content free in
every tier. Audio must respect that: gate the **video export** and premium ambience/nasheed packs,
keep a free recitation set. Do not paywall the Quran itself.

**Encoder choice for v1.1:** a small native Expo module (Android `MediaCodec`/`MediaMuxer`, iOS
`AVAssetWriter`) rather than `ffmpeg-kit-react-native` (retired upstream in 2025, and the H.264
builds are GPL — both need confirming, but neither risk is worth taking) or a render server (per-
export cost on a free-heavy product, and every story would leave the device). On web,
`canvas.captureStream()` + `MediaRecorder` needs no dependency at all.

---

### 2026-09-25 — Release candidate verified on a device

Run **36110485873** built the signed AAB and APK from `176edfd`. The binary was checked rather than
assumed: the JS bundle inside the APK carries the new "Use this story" label and the "Coming soon"
pill and no longer contains "Share to WhatsApp" or the old WhatsApp-only download instruction; the
manifest declares `POST_NOTIFICATIONS` and both location permissions and **no `AD_ID`**, which is
what the Data Safety answers claim; and the signing block is `BARAKAH-.RSA`, the release key rather
than the debug one.

**The owner then installed the APK and confirmed the app works.** That retires the risk this log has
been carrying since the daily rotation, the reminder, the brand change and the animated splash
landed — a native module and a new launch path that had never run on hardware.

Worth a second look if they were not exercised during that pass, since each can only fail on a real
device: a reminder notification actually arriving at the chosen time (the offer appears on the
**second** launch, not the first), the exported PNG with the wordmark near the bottom, and the
Arabic RTL layout of the reminder sheet.

Remaining before the listing can go live is process, not engineering: screenshots from the real app,
the Data Safety form, the content rating questionnaire, the privacy-policy URL, and the listing text
with the Arabic read through.

### 2026-09-25 — Second release candidate

Everything below was added after the signed 19 September AAB, so that build is superseded.

**Shipped since:** the date-seeded daily rotation for "Today's posts" (which also fixed a section
that was empty twelve hours a day), a back-to-top button on the story grid, the daily reminder
notification, the new brand mark and wordmark across every icon, an animated opening, and the
wordmark as the watermark on exported stories.

**Release prep done today:**

- `versionCode` 1 → 2, so the upload is accepted whether or not the September AAB reached the console.
- Store icon (512×512) and feature graphic (1024×500) generated into `docs/store/` from the brand
  artwork. Text is kept well clear of the feature graphic's edges, which Play crops.
- Privacy policy gained a "Daily reminder" section, in both `docs/PRIVACY.md` and the live
  `apps/web/public/privacy.html`. The reminder is scheduled on-device and collects nothing, so the
  **Data Safety answers below are unchanged** — still no ads, no analytics, no advertising ID.
- Target API level checked rather than assumed: React Native 0.86's version catalog sets
  `targetSdk = 36`, meeting the requirement that took effect on 31 August 2026.
- `gh` **is** installed now (2.101.0, authenticated), contrary to the note under "Blocked on you"
  below, so builds can be triggered from here.

**The one thing that must not be skipped.** Nine commits, including `expo-notifications` — a native
module that has never executed on hardware — plus an animated splash that has never rendered and a
watermark that has never been captured into a real PNG. Upload to **Internal testing first** and
install from Play before promoting to production. Internal testing is live within minutes and a
promotion is one click; a bad launch in production costs a fresh build and a review cycle.

On a phone, check: the splash plays and dismisses; the reminder offer appears on the **second**
launch, and a notification actually arrives; a shared story has the wordmark sitting correctly in
the exported image; the home grid's back-to-top button; and the Arabic layout of the reminder sheet.

### 2026-09-25 — Photo backgrounds had never worked on Android

Reported from the device: choosing a photo background produced a black card, and
the theme picker appeared dead.

**Cause.** The scrim — the gentle darkening that keeps text readable over a
photograph — is written as `rgba(8,10,14,0.30)`. SVG carries transparency in
`stop-opacity`, not in the colour, and react-native-svg does not read the alpha
out of an `rgba()` string. `GradientFill` passed the colour straight to a
`<Stop>` with a hard-coded `stopOpacity={1}`, so the `0.30` was discarded and a
30% wash became an opaque sheet over the photo.

The theme half followed from it: when a photo is set the card does not draw the
theme gradient at all, so tapping through themes correctly changed nothing
visible.

`splitColorAlpha()` in `packages/core/src/themes.ts` now moves the alpha where
SVG expects it. Theme gradients were never affected — they are hex throughout,
with no alpha to lose, which is exactly why only photo backgrounds showed this.

**How it was found, after two wrong attempts.** Both earlier diagnoses reasoned
about the _update_ path — whether a changed gradient re-renders — and this bug
is in the initial render. What found it was reading the data rather than the
code: themes use hex only, the scrims use `rgba` exclusively. That asymmetry was
the whole bug. Look at the data before theorising about the mechanism.

Two changes from those attempts were kept, since both fix real latent problems:
every SVG definition id now follows its contents, and the card's SVG layers
remount on a style change. react-native-svg caches a definition by id, so an id
that outlives its contents renders the old gradient.

Tests cover the parser and the invariant behind it: every scrim stop is
translucent, every theme stop is opaque.

Confirmed working on device.

---

## Decision: the daily reminder is local-only, and ships clean

A daily reminder notification was added. **Local notifications only** — no push token is requested,
no server is involved, nothing leaves the device. Consequences that matter for submission:

- **Data Safety is unaffected.** Nothing is collected, so the table above stands unchanged. This is
  the opposite of the ads situation.
- **No APNs or FCM setup**, no `google-services.json`, no Expo push credentials.
- **Apple 4.5.4 is satisfied**: the app is fully usable without notifications, consent is asked for
  in the app before the system prompt, the content is the app's own daily selection rather than
  advertising, and there is a Settings row to change the time or turn it off.
- **Android 13+** `POST_NOTIFICATIONS` is requested at runtime; the config plugin adds the manifest
  entry during `expo prebuild`, so the existing CI workflow needs no change.
- **Local notifications work in Expo Go**, so this is testable on a phone without a development
  build — unlike ads.

Two deviations from the original request, both deliberate:

1. The offer appears from the **second** session, not the first. The OS permission prompt is
   one-shot, and asking four seconds into someone's first visit — before they have seen a single
   card — is the pattern people refuse. `MIN_SESSIONS_BEFORE_OFFER` is the one constant to change.
2. The install time is used as the default reminder time but **clamped to 07:00–21:00**. Taken
   literally, a 03:00 installer would have been signed up for a 03:00 notification every day.

Closing the sheet cannot switch notifications on — that needs an OS grant — so a dismissal keeps the
remembered time, schedules nothing, and the offer returns at most twice more, a day apart.

### Windows note

Adding any dependency with `npm install` **prunes the `--no-save` Windows binaries** described under
"Local toolchain repair", so `npm run test` then dies with a missing
`@rollup/rollup-win32-x64-msvc`. Fix, in one command:

```bash
npm i @rollup/rollup-win32-x64-msvc@$(node -p "require('rollup/package.json').version")       @esbuild/win32-x64@$(node -p "require('esbuild/package.json').version") --no-save
```

The lockfile keeps its Linux-only entries through both steps, which was verified — CI is unaffected.

---

## Decision: publish first, then AdMob

**Sequence: ship v1 with no ads, get published, then integrate AdMob for v1.1.** Not a preference —
AdMob's app-readiness review requires the app to be **live and publicly available** in the store
before it can be approved. Drafts and apps in review are not eligible, and until approval the app
gets limited ad serving. So integrating AdMob before the first submission earns almost nothing and
pays for it three times over:

- Every disclosure obligation lands on the first submission — Data Safety declaring the advertising
  ID as collected **and shared**, the `com.google.android.gms.permission.AD_ID` manifest permission
  (which Play cross-checks against Data Safety), the "Contains ads" declaration, and the ads answer
  on the content rating questionnaire.
- The privacy policy at the URL given to Play would have to describe ad data collection that is not
  happening yet.
- A native SDK goes into a build whose device testing has only just been completed. If the AdMob App
  ID is missing from the manifest, the Mobile Ads SDK **crashes the app on launch** — an automatic
  rejection, and the most common way this integration fails.

So v1 declares: no ads, no analytics, no advertising ID. The Data Safety table above is correct as
written, and stays that way for this submission.

**One thing that could not wait**, and has been done: the store description promised "No analytics
and no advertising" in both English and Arabic. That claim was removed from
`docs/STORE-LISTING.md` before submission — true today, but a promise the v1.1 ad build would break,
and users who installed on it would be right to call it a bait-and-switch. `docs/PRIVACY.md` and
`apps/web/public/privacy.html` keep their no-advertising statement, because a privacy policy must
describe the version that actually ships; they change when the ad build does.

**v1.1 order of work:** publish v1 → link the app in AdMob → pass readiness review → then integrate,
working through the "Before the first ad build ships" checklist in `docs/MONETIZATION.md`.

---

## Deferred to v1.1

### Audio/video story export

Work that can start now, in parallel with v1, because it is procurement rather than code:

- [ ] Fix the passage list: 40–60 short recitations mapped to the existing 14 card categories
- [ ] Get a quote from a qari for a buyout of that set
- [ ] Shortlist CC0 ambience (rain, birds before fajr, wind, water, room tone) and normalise it
- [ ] Decide Pro price and model (still open from `docs/MONETIZATION.md`)

### Accounts and account deletion

Decided 2026-09-19: accounts stay **off in v1** and ship in v1.1, so the first Play submission
declares location only and carries no deletion obligation. The sign-up code already exists and is
inert without keys; this section is what it takes to switch it on legitimately.

**Why deletion needs a server.** The anon key shipped in the app cannot delete an auth user — that
requires the `service_role` key, which must never be in an APK. The cheapest correct answer is a
`security definer` SQL function, so there is no server code to deploy. Both tables already declare
`on delete cascade` against `auth.users`, so removing the user removes their rows:

```sql
create or replace function public.delete_account()
returns void language sql security definer set search_path = '' as $$
  delete from auth.users where id = auth.uid();
$$;
revoke execute on function public.delete_account() from anon;
grant execute on function public.delete_account() to authenticated;
```

Test this against a throwaway project first — Supabase periodically tightens DML on the `auth`
schema, and if it is blocked the fallback is an Edge Function holding the service-role key.

**Play requires a web deletion route too**, reachable without reinstalling the app; an in-app
button alone does not satisfy the policy. Plan: a self-contained `apps/web/public/delete-account.html`
that loads supabase-js from a CDN, signs the user in and calls the same RPC. It deploys free with
the existing Pages site. The anon key in that page is fine — anon keys are public by design.

Checklist:

- [ ] Create the Supabase project and run `supabase/schema.sql`
- [ ] Add `delete_account()` and verify it against a throwaway account
- [ ] In-app delete on the Me tab: confirm dialog, sign-out on success, English + Arabic strings
- [ ] `delete-account.html` in `apps/web/public`, linked from the store listing and privacy policy
- [ ] Wire `EXPO_PUBLIC_SUPABASE_URL` / `EXPO_PUBLIC_SUPABASE_ANON_KEY` into the build as secrets
- [ ] Update `docs/PRIVACY.md` — it currently states there is no account system
- [ ] Update the Data Safety form: email address and user content, with the deletion URL

**Cost.** Supabase's free tier covers roughly 50k monthly active users and 500 MB of database.
Storage binds before user count here — saved designs are JSON blobs, so on the order of 10,000
users before 500 MB bites, then about $25/month. Free projects pause after ~a week of inactivity,
which stops applying once there are real users. Free-tier terms can change; "free forever" is not
something to promise in the listing.

**Cheaper alternative if the real goal is just "don't lose my posts":** Android Auto Backup and the
iCloud key-value store restore app data onto a new device with no account, no server and no
deletion obligation. It does not sync two phones used at once, but it costs nothing to run and
carries no compliance surface. Worth considering before committing to accounts at all.

---

## Blocked on you

1. ~~**Trigger the Android build**~~ — `gh` is installed and authenticated; builds are triggered from
   here now (`gh workflow run android-build.yml --ref <branch>`).
   Everything else waits on a working build.
2. **Enable GitHub Pages** (Settings → Pages → source "GitHub Actions") and run the deploy
   workflow, so the privacy policy has a public URL to paste into the Play listing.
3. **Keystore** — generated locally with `keytool`; the passwords are yours to choose and must not
   pass through this log, the repo, or the chat.
4. **Read the Arabic** in `docs/STORE-LISTING.md` before it goes live.
5. **Store graphics** — icon, feature graphic, and screenshots taken from the real app once the
   APK is installed.

---

## Submission details (ready to paste)

**Privacy policy URL:** https://yassinerzk.github.io/barakah-stories/privacy.html
**Account deletion URL:** https://yassinerzk.github.io/barakah-stories/delete-account.html

Both verified live (HTTP 200) on 2026-09-19 after the first successful Pages deploy.

**Data Safety — what to declare**

| Data type                      | Collected | Shared | Purpose            | Linked to identity | Deletable |
| ------------------------------ | --------- | ------ | ------------------ | ------------------ | --------- |
| Approximate + precise location | No*       | No     | App functionality  | No                 | n/a       |
| Email address                  | Yes       | No     | Account management | Yes                | Yes       |
| User content (saved posts)     | Yes       | No     | App functionality  | Yes                | Yes       |

\* Location never reaches our servers. It is read on-device for prayer times and Qibla; only the
place-name lookup goes to the platform geocoder, which is the OS, not us. Email and saved posts are
collected only if the user chooses to sign up.

Also: **no ads**, **no analytics**, **no advertising ID**, data encrypted in transit, and users can
request deletion (give the URL above).

> **Accurate for v1 only.** The monetization plan now adds AdMob interstitials, which collect the
> advertising ID and app-activity signals. This table, the privacy policy in both its copies, and
> the store description in both languages must all be redone before an ad-bearing build reaches
> production. Checklist in `docs/MONETIZATION.md`.

## versionCode 6 — the submission pass (run 36233685694, `5e3084c`)

Built and verified the artifact that goes to Play, and corrected the listing copy, which had drifted
behind the code.

**The listings were describing a two-language app.** Every one of the seven descriptions still said
the Quran and hadith translations were English only, and the six non-English ones each listed six
interface languages instead of seven. That copy was written before the Quran reader gained the five
published editions. Pasting it would have understated the app in exactly the markets it was
localised for. Corrected in all seven, along with two claims that had quietly become false: the
offline paragraph (non-English Quran translations download per surah, so "the Quran is inside the
app" needed narrowing to the Arabic text and its English translation) and a note in "Claims to
avoid" asserting the app has no notifications, which stopped being true when the daily reminder
shipped.

The hadith library really is still Arabic and English — no Malay or Thai edition of either
collection exists in the dataset — so that limit stayed in every description rather than being
smoothed over.

**Two verification checks were wrong, not the build.** Worth writing down because both would fool
the next person:

- *Looking for `META-INF/*.RSA` in the APK.* There isn't one, and that is correct: the APK is signed
  with APK Signature Scheme v2, whose block sits outside the zip central directory. `apksigner
  verify --print-certs` is the check — it reports signer `O=Klay Creative Lab LLC`, which is not the
  debug key. The AAB, which is what Play receives, does carry `META-INF/BARAKAH-.RSA`.
- *Hand-typing non-Latin probe strings.* Three "missing" locales were my transcription errors — the
  Thai string uses ำ (U+0E33), not ํ + า, and the English one uses a straight apostrophe. Reading the
  probes out of `packages/core/src/i18n/*.ts` instead of typing them made all seven pass. Same
  lesson as the scrim bug: read the data.

Quran chapter JSON is `require()`d, so Metro inlines it into the bundle rather than emitting asset
files — searching the APK's file list for "quran" finds nothing. The text is there; it is in the
bundle.

Pricing is **Free**. Play's "cannot be changed" warning only blocks free → paid; a free app can
still sell in-app purchases, which is the entire planned Pro model.

## GitHub repo renamed `react` → `barakah-stories` — Pages URLs broke and were fixed

Renaming the repo moved the GitHub Pages site from `yassinerzk.github.io/react/` to
`yassinerzk.github.io/barakah-stories/`, which took down the Privacy Policy and Account Deletion
URLs — both required fields already sitting in the Play Console submission at the time.

Fixing the URL alone was not enough. `gh api repos/.../pages` showed `"build_type": "legacy"` with a
branch source, meaning Pages was configured as classic "deploy from a branch" rather than through
the `deploy-pages.yml` Actions workflow, despite that workflow's own runs reporting success. Legacy
mode Jekyll-renders the branch root, so the site was serving GitHub's default README-based page, not
the built `apps/web/dist` output — the `configure-pages@v5` step with `enablement: true` turns Pages
on but does not itself switch an existing branch-based site over to Actions-based builds. Fixed with
one API call:

```
gh api -X PUT repos/yassinerzk/barakah-stories/pages -f build_type=workflow
```

then re-ran the workflow. Both pages now return 200 with the correct titles. Updated the URLs in
`docs/PLAY-SUBMISSION.md` and here, and pointed the local git remote at the new repo name (GitHub
redirects the old one for now, but that is not a reason to leave it stale).

**If the repo is ever renamed again**, re-check the Pages `build_type` before assuming a redeploy
will fix it — the URL and the build source are two separate settings, and only one of them updates
automatically.

## versionCode 7 — run 36245496752, `d1ffff7`

Play refused to take versionCode 6 a second time. Any version code the Console has received is
spent, even from a release that was never rolled out, so the only way forward is a higher number.
This build changes nothing but that number: `apps/mobile/app.json` 6 → 7, version name still
`1.0.0`, since this is still the first public release.

Verified the same way as 6: `versionCode='7'`, targetSdk 36, `AD_ID` absent, all seven UI
languages, the bundled Quran text, all five translator credits and the scrim fix present. The
upload certificate's SHA-256 is `56b26d99…9011c0`, identical to the build already uploaded, which
is what lets Play accept it as the same app.

The upload folder is `barakah-release-code7`, named by version code: the earlier `barakah-release-v7`
folder holds versionCode **6** despite its name, so don't upload from that one.

## 1.1.0, versionCode 13 — run 37323242609

First update after launch: video stories (Media3 encoder on Android, WebCodecs page for Expo Go /
iOS), the Instagram-style editor with the floating + button, per-prayer alerts, the country/city
picker and the next-prayer notification panel. Release notes in seven languages:
`docs/release-notes-1.1.0.txt` (all under Play's 500-character limit).

Verified: `versionCode='13'`, `versionName='1.1.0'`, targetSdk 36, upload certificate SHA-256
`56b26d99…9011c0` (same as every earlier upload). New permissions need no Play declaration:
`SCHEDULE_EXACT_ALARM` is user-granted (only `USE_EXACT_ALARM` is restricted) and the
`FOREGROUND_SERVICE` added by WorkManager declares no typed service. Upload folder:
`Downloads/barakah-release-code13`.

The adhan is still the CC0 test recording; replacing it later means bumping the `prayer_adhan_v1`
channel id.
