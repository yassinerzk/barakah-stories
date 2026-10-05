# Prayer alerts, location picker and accessibility: plan

Status: **built and in device testing** (versionCode 8, commits `4681aa5`, `90d6494`, `dbe7a89`). The adhan is a CC0 test recording until the final audio is chosen (section 9). Three research reports from October 2026
fed into it: a codebase map, a WCAG 2.2 audit and a platform-policy/licensing review. Where they
shaped a decision, that is summarised here.

## 1. What we are building

1. **Location.** Pick a country, then a city (searchable, works offline), or use the current position.
2. **Prayer alerts.** Each of the five prayers gets its own setting: *adhan*, *system sound*,
   *vibrate only* or *off*. The settings apply to whichever location is selected.
3. **Next-prayer panel.** A notification showing the current prayer, the next prayer and a live
   countdown. Once the current prayer is 30 minutes old, it shows only the next one. Users can
   swipe it away, and a setting turns it off entirely.
4. **Accessibility.** Fix what the audit found, and add an in-app Accessibility section.

## 2. Platform rules that shape the design

| Rule | Consequence |
| --- | --- |
| Without exact-alarm permission, Android may deliver an alarm up to an hour late, and later still on an idle phone. `expo-notifications` silently falls back to inexact alarms (`ExpoSchedulingDelegate.kt:106`). | Declare **`SCHEDULE_EXACT_ALARM`** and ask the user to allow it when they turn alerts on. Android 14+ denies it by default. If the user says no, alerts still work, with a note that times may arrive late. |
| Play reserves `USE_EXACT_ALARM` for alarm-clock and calendar apps. | Never declare it. |
| Play restricts `REQUEST_IGNORE_BATTERY_OPTIMIZATIONS`. | Never declare it. Linking to the battery settings screen is allowed. |
| `USE_FULL_SCREEN_INTENT` is reserved for alarm and calling apps. | Never use it. |
| Background location needs a declaration, a video and a justification. | Never request it. Alerts use the *selected* location; GPS is read once, in the foreground. |
| An Android notification channel's sound is fixed when the channel is created. | One channel per sound option, with versioned IDs. |
| Android stops a notification's sound when the user opens the shade or dismisses the notification. | A 3–4 minute adhan played through a notification gets cut off. See section 4. |
| A full adhan in the background needs a `mediaPlayback` foreground service, a Play declaration and a video. | Left out of this release; decision in section 9. |
| iOS keeps only the 64 soonest pending notifications, and custom sounds must be under 30 seconds. | Schedule at most 60 ahead. Adhan notification clips stay under 30 seconds. |
| Android 14 lets users swipe away even "ongoing" notifications. | The panel is a normal, dismissible notification. No foreground service is needed. |
| Notifications may only carry the app's own features, never ads. | Alerts and the panel contain prayer information only. |
| Data safety counts only data sent off the device. | A city stored on the device adds nothing new. The form already declares the reverse-geocode lookup. |

## 3. Architecture

Pure logic goes in `packages/core`, tested with Vitest and written test-first. Calls into the
operating system go in `apps/mobile`. This is the same split the daily reminder already uses.

### Core (new)

- `prayerAlerts.ts`:
  - `PrayerAlertPrefs`: for each prayer, `adhan | sound | vibrate | off` plus the chosen adhan;
    one panel on/off switch.
  - `planAlerts(location, settings, prefs, now, days)`: returns triggers as exact moments in time.
  - **Never derive hour/minute daily triggers.** Those fire by the phone's clock, which is wrong
    for a city in another time zone (codebase map, risk 1). The prayer calculation already returns
    exact moments.
- `panel.ts`: `panelState(now, times)` returns the current and next prayer, applies the 30-minute
  rule, and lists the moments when the panel must change.
- `geo.ts`: country and city types, search that ignores accents, and nearest-city lookup.

### Data

- `scripts/gen-cities.mjs` turns GeoNames `cities15000` into a trimmed asset of about 650 KB
  gzipped. The source has 34,000 cities, every one with an IANA time zone.
- The app loads the asset when needed instead of baking it into the JS bundle.
- The data is CC BY 4.0, so the About/Licenses screen credits GeoNames.
- City names come in English/Latin script. Arabic names for major cities can follow later from
  GeoNames' alternate names.

### Mobile

- `notifications/prayerChannels.ts` defines the channels:
  - `prayer_adhan_<id>_v1`, one per adhan
  - `prayer_sound_v1`
  - `prayer_vibrate_v1`
  - `prayer_panel_v1`, silent and low importance
- `notifications/prayerScheduler.ts` cancels and re-plans every `prayer.*` notification. It keeps
  12 days scheduled, which is 60 notifications.
- The scheduler re-plans:
  - when the app launches
  - when any setting changes
  - when the location changes
  - when the time zone changes
  - once a day through `expo-background-task`, so alerts continue even if the app is not opened
- The library's boot receiver already restores alerts after a reboot.
- A native module, `modules/prayer-panel`, written in Kotlin with the Expo Modules API:
  - Posts the panel with `setUsesChronometer` and `setChronometerCountDown`. The system draws the
    countdown, so the app doesn't need to be running.
  - Registers its own AlarmManager receiver to refresh the panel at each prayer time and again
    30 minutes later.
  - Checks and requests exact-alarm permission, using `canScheduleExactAlarms` and
    `ACTION_REQUEST_SCHEDULE_EXACT_ALARM`. Expo provides neither.
- Stores:
  - `usePrayerStore` moves from version 1 to version 2, with a `migrate` step that keeps the saved
    location.
  - A new `usePrayerAlertStore` holds the per-prayer settings.

### UI

- **Prayer tab:**
  - The location row opens a country-then-city sheet with search, built like `LanguageSheet`.
  - "Use my location" stays.
  - A bell on each prayer row opens that prayer's alert sheet: the four options, an adhan preview
    and a test alert.
- **Me tab:** two new sections.
  - **Prayer alerts:** the panel switch, whether exact alarms are allowed, and a link to battery
    settings.
  - **Accessibility.**

## 4. Sounds

- Notification sounds are short clips, under 30 seconds. That is required on iOS and safe on
  Android. Two clips:
  - the regular adhan
  - a Fajr version, which includes "as-salatu khayrun min an-nawm"
- Tapping an alert opens the app and plays the full adhan with `expo-audio`, a new dependency.
  Playback started by tapping a notification needs no foreground service.
- Licensing: every file needs a written licence or a verified CC0 or CC BY licence, credited on the
  About/Licenses screen.
- **The app has no audio today.** See section 9.

## 5. Accessibility (from the audit)

### Critical

- The splash animation ignores the phone's reduce-motion setting.
- The Qibla compass is invisible to screen readers. Alignment is shown by colour only.
- Screen readers can't operate the editor's Text/Style tabs.

### High

- Icon buttons have no spoken label.
- Toasts are never announced, including the delete-account confirmation.
- In list rows, completed and last-read state is shown by colour only.
- Editor text fields have no labels.
- Reading order in right-to-left languages hasn't been checked.

### Medium

- Contrast falls short in two places:
  - "danger" text is 4.40:1 where 4.5:1 is needed
  - borders are 1.33:1 where 3:1 is needed
- Pickers don't announce which option is selected.
- Switches have no labels.
- Decorative images are exposed to screen readers.
- Story card text scales with the system setting inside a fixed-size canvas, so it can be clipped.
- Some touch targets are too small.
- Sheet backdrops have no label.
- The "A−" and "A+" buttons have no spoken meaning.

### Shared helpers to add

- `AccessiblePressable`: requires a label, exposes selected state, guarantees a minimum tap area.
- `Field`: labels its text input automatically.
- `useAnnounce`: reads messages aloud; toasts will use it.
- `useReducedMotion`: true when the system setting or the in-app override asks for less motion.
- `Decorative`: hides purely visual elements from screen readers.
- A table of contrast-checked colour pairs in `theme.ts`.

### Accessibility settings

- Text size, applied on top of the system setting and never smaller than it.
- High contrast. iOS doesn't let apps read the system's own setting.
- Reduce motion.
- Bold Arabic text.
- Haptics.
- Larger tap targets.
- Spoken Qibla guidance.

The new alert and panel screens are built accessible from the start. The panel speaks only when the
next prayer changes, never on every tick.

## 6. Phases

Each phase follows the ECC workflow:

1. **tdd-guide**: tests first for core logic.
2. Implement.
3. **code-reviewer**, plus **typescript-reviewer** or **react-reviewer**. Add
   **security-reviewer** for permissions and native code.
4. Fix Critical and High findings.
5. Commit.

| Phase | Scope | Depends on |
| --- | --- | --- |
| 0 | Core: `planAlerts`, `panelState`, `geo` search, store v2 migration. Full branch coverage on the planner, including daylight-saving and cross-time-zone cases. | none |
| 1 | Location: GeoNames pipeline, country-then-city sheet, one-time GPS read, GeoNames credit | 0 |
| 2 | Alerts: channels, scheduler, exact-alarm module, permission flow, per-prayer sheet, daily background top-up | 0 |
| 3 | Sounds: bundling, tap-to-play full adhan, preview | 2, plus the audio files (section 9) |
| 4 | Panel: Kotlin module, countdown, refresh receiver, settings switch | 2 |
| 5 | Accessibility: helpers, all audit fixes, settings section, then a fresh audit by **a11y-architect** | none; runs alongside the others |
| 6 | Release: privacy policy (notifications, sounds, GeoNames), store copy, Data safety re-check, versionCode 8, device testing | all |

### Device testing

Test on:

- a Pixel running Android 14 to 16
- a Samsung phone (One UI)
- a Xiaomi phone, which manages battery aggressively

Check on each:

- exact alarms allowed, and refused
- a night in Doze
- a reboot
- a time-zone change
- a city in another time zone
- Arabic with TalkBack

### Testing setup

The native module and bundled sounds **don't run in Expo Go**. Testing moves to a development build
(`expo-dev-client`) or to the APK that CI builds.

## 7. Play Console changes at release

- **Data safety:** no new data types, provided the city stays on the device.
- **Exact alarms:** Play has no declaration form for `SCHEDULE_EXACT_ALARM` today. The policy is
  silent rather than explicit, so re-check at submission.
- **No new restricted permissions:** no foreground service, no full-screen intent, no background
  location.
- **Store listing:** can now mention prayer alerts.

## 8. Not doing, and why

- **Full-length adhan in the background:** needs a foreground service, a Play declaration and a
  video. Decision in section 9.
- **Android 16 Live Updates:** Google lists countdowns to scheduled events as an inappropriate use.
- **Notifee:** the library was archived in April 2026.
- **iOS Live Activity:** possibly later.
- **iOS critical alerts:** Apple reserves them for health and safety apps.

## 9. Decisions needed from the owner

1. **Where the adhan audio comes from.**
   - (a) Commission a muezzin under a written licence covering the regular adhan, the Fajr version
     and short cuts. This is the cleanest option.
   - (b) Use openly licensed files from Wikimedia Commons or Freesound. Someone has to listen to
     each one first, their origins are poorly documented, and none is confirmed as a Fajr version.
   - (c) Supply recordings you already hold the rights to.
2. **How the full adhan plays.**
   - (a) Tap-to-play only. Recommended for this release.
   - (b) Also full playback in the background, which needs a foreground-service declaration and a
     video.
3. **How you'll test.**
   - (a) A development build.
   - (b) CI-built APKs only.

## 10. What was built, and decisions taken during the build

- Audio: the owner chose to test with the CC0 Wikimedia recording "Beautiful adhan". Both files are
  in `apps/mobile/assets/sounds/`: `adhan.wav` (28-second notification clip) and `adhan_full.mp3`
  (tap-to-play). Replacing them is a file swap. If the clip changes, bump the Android channel id
  `prayer_adhan_v1` → `_v2`, because a channel's sound cannot change after it is created.
- `expo-audio` is configured with `microphonePermission: false`, `recordAudioAndroid: false` and
  `enableBackgroundPlayback: false`. Its defaults would have added microphone recording and a
  media-playback foreground service, both of which carry Play declarations.
- High latitudes: above 48° the recommended night-fraction rule applies. Inside the polar circles,
  each day uses the times of the nearest day that has a sunrise and sunset (Aqrab Yaum). Before
  this, Isha could be an invalid date, which failed the whole schedule.
- The ECC review pass (react, security and logic) found three real races, fixed in `dbe7a89`:
  - overlapping re-plans
  - the splash running after unmount
  - the adhan starting after Stop was pressed

## 11. Check at Play submission

- **Exact alarms.** Confirm in Play Console whether a declaration is now requested for
  `SCHEDULE_EXACT_ALARM`. Research found the form only for `USE_EXACT_ALARM`, but the security
  review believed `SCHEDULE_EXACT_ALARM` also needs one. If asked: the app's core feature is
  user-scheduled prayer-time alerts that must fire on the minute.
- **`FOREGROUND_SERVICE` in the manifest.** It comes from WorkManager, which `expo-background-task`
  uses. No typed foreground-service permission is declared, and the app never starts a foreground
  service. The `location`-typed service listed in the manifest belongs to `expo-location` and was
  already there in versionCode 7.
- **Data safety.** Unchanged. Alerts, the panel and the city choice stay on the device.

## 12. Device test checklist

1. **Prayer → Change location:** pick a country, search for a city, pick it. Times and the
   location label update.
2. **Use my location:** grant the permission. The label shows your city.
3. **Turn on prayer alerts:** the notification permission prompt appears, then the toast.
4. Under **Exact timing**, tap **Allow**, grant the permission in Android settings, and come back.
   The status now reads "on time".
5. **Bell on a prayer:** switch between adhan, notification sound, vibrate and off. Try
   **Play adhan**, then **Send a test alert** and wait 5 seconds.
6. **Tap an adhan alert:** the app opens and plays the full adhan. **Stop** ends it.
7. **Next-prayer panel:** it shows in the shade with a live countdown. Swipe it away and it comes
   back at the next change. Turn it off with the switch.
8. **Reboot the phone:** the alerts and the panel come back.
9. **City in another time zone** than the phone (e.g. Jakarta from Europe): alerts fire at that
   city's prayer times.
10. **Accessibility:**
    - Me → Accessibility: try each switch.
    - With TalkBack on, the Qibla compass speaks its directions.
    - Reduce motion skips the opening animation.
