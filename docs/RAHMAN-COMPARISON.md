# Rahman (Islam Super App) — what to learn from it

Reviewed 2026-10-13 from the App Store listing and its 10 screenshots
(`apps.apple.com/us/app/rahman-islam-super-app/id6787215396`, v19.0, Reference category,
4.7★ from 18 ratings, 117 MB). Pricing: Pro $1.99/month, $9.99/year, $29.99 lifetime.
Positioning line worth noting: *"a single, calm home for your whole deen, without the clutter of ads."*

This is inspiration, not a copy list. Their look is navy + gold; ours stays deep green + gold.
Nothing here should reuse their artwork, copy or illustrations.

---

## 1. Features they have that we don't

Ordered by value to our users ÷ effort. Effort: S = days, M = 1–2 weeks, L = more.

- [ ] **Quran recitation audio** (M) — play per ayah or whole surah, reciter picker, speed
      (0.75–1.5×), repeat, offline download. Already planned in `PRO-PLAN.md` §1.1/§4.2; must stay
      free. Source: everyayah.com / quran.com audio with each reciter's licence checked.
- [ ] **Last-read card + ayah favourites** (S) — "Continue: Al-Fatiha, ayah 3" at the top of the
      Quran tab; heart on each ayah; a Favourites filter.
- [ ] **Dhikr counter / tasbih** (S) — big tap target with haptic tick, preset dhikr (SubhanAllah,
      Alhamdulillah, Allahu Akbar, Astaghfirullah, salawat) and custom ones, target (33/99/100),
      undo, reset, today / yesterday / all-time counts. Fully offline.
- [ ] **Daily deeds tracker with streak** (S–M) — 5 prayers, Quran reading, morning/evening
      adhkar, salawat; a week strip; a streak ring. Local only (optionally synced to Supabase for
      signed-in users). Tie-in: marking "Quran reading" can be automatic from the reader.
- [ ] **Islamic calendar + event countdowns** (S) — Ramadan, Eid al-Fitr, Eid al-Adha, Day of
      Arafah, Ashura, Mawlid, Isra' and Mi'raj, Laylat al-Qadr (last 10 nights) with "35 days" chips.
      We already compute Hijri dates. Doubles as a story-card prompt ("Make a Ramadan card").
- [ ] **99 Names of Allah** (S) — name a day with Arabic, transliteration, meaning in our 7
      languages; each one opens straight into the story editor. Great content for cards.
- [ ] **Home-screen widgets** (M–L). Android first (native Kotlin `AppWidgetProvider`s in a local
      Expo module, like `prayer-panel`); iOS needs a WidgetKit target (`expo-apple-targets`) and an EAS
      build, so it comes after the iOS build exists. The set, in priority order:
  - [ ] **Prayer timer** — next prayer name, its time, and a **live countdown** ("Maghrib in
        2:43:12"). Android: a `Chronometer` in `RemoteViews` with `setChronometerCountDown(true)` ticks
        on its own with zero app wake-ups — the same trick our notification panel already uses. iOS:
        `Text(nextPrayerDate, style: .timer)` does the same. The widget only needs re-rendering at
        each prayer change: schedule those instants with the existing `AlarmManager` receiver
        (`PanelReceiver`) and from the 12-hour background re-plan. Sizes: small (next prayer) and
        medium (next prayer + all six times, current one highlighted).
  - [ ] **Dhikr counter** — the current dhikr in Arabic, the count and target ("17 / 33"), and a
        big tap area that **counts on the home screen without opening the app**. Android: a click
        `PendingIntent` to a `BroadcastReceiver` that increments the count in `SharedPreferences`
        and redraws the widget (with a vibrate tick); the app's tasbih screen reads the same store,
        so the counts always agree. iOS 17+: an interactive `Button(intent:)` with an `AppIntent`
        writing to an App Group store. A second small button resets / switches dhikr; reaching the
        target gives a stronger haptic and a ✓.
  - [ ] **Today's prayer times** — all six times, the current one highlighted (lock screen too on iOS).
  - [ ] **Name of Allah / verse of the day** — rotates daily; tapping opens the story editor with it.
  - Shared rules: follow the system light/dark and dynamic colours where possible, text readable at
    the smallest size, `contentDescription` on every element for TalkBack, and no network access from
    the widget — everything comes from data the app already saved on the phone.
- [ ] **Qibla: degrees-off and distance to the Kaaba** (S) — "152° off Qibla · 2,414 km to Kaaba",
      plus a Map mode (straight line from you to Makkah). AR mode is not worth it yet.
- [ ] **More hadith collections** (M) — Abu Dawud, Tirmidhi (and Nasa'i, Ibn Majah) with chapter and
      hadith counts on each book card; download on demand instead of bundling.
- [ ] **Nearby mosques** (M) — needs a places API (cost + privacy review). Low priority.
- [ ] **Narrated stories** (L) — see section 3.
- [ ] **Learn Quran (letters, tajweed)** (L) — big content project. Not now.
- [ ] **Hajj & Umrah counter** (M) — tawaf/sa'i lap counter with the dua for each stage. Seasonal.
- [ ] **AI "imam" (Al Hodja)** — **do not copy as-is.** An AI answering fiqh questions and
      interpreting dreams is a real religious-accuracy risk and a Play policy risk. If ever built:
      cite sources only (Quran/hadith search that links to our own texts), never issue rulings.
- [ ] Apple Watch / CarPlay — skip until there is an iOS app.

---

## 2. Design ideas for sections we already have

### 2.1 Prayer screen — the sun arc (top priority, the user asked for this)

What they do (screenshot 3):

- A **semicircular arc** across the top of the screen. The six times (Fajr, Sunrise, Dhuhr,
  Asr, Maghrib, Isha) sit on the arc as small dots with an icon, name and time above each.
- The arc is drawn in two states: the part already travelled is **solid gold**, the rest is a thin
  muted line.
- A glowing **sun dot moves along the arc** to the current time. At night it becomes a **moon**.
  A dashed line drops from it to a small marker on the horizon.
- A **mosque skyline silhouette** sits under the arc like a horizon, so the arc reads as the sky.
- Under it: a **date card** with ‹ › arrows (city · Gregorian date · Hijri date) to look at other
  days, then a **countdown card** ("Time until Maghrib 3:01:45 · Adhan time 20:41").
- Then the **list of six rows**, each with an icon, a bell (alert on/off) and the time. The
  **current prayer row is highlighted** and slightly larger.
- A greeting at the top ("Good Evening") plus calendar and settings buttons.

How we build it — checklist:

- [ ] `packages/core`: `sunArcPosition(times, now)` → `{ t: 0..1, isNight }`. Day = Sunrise→Maghrib
      maps to 0..1 along the arc; night shows the moon resting on the Isha/Fajr end. Pure function,
      unit-tested (edge cases: polar days, missing Isha, crossing midnight).
- [ ] `PrayerSunArc.tsx` with `react-native-svg`: a half ellipse path, `strokeDasharray` for the
      travelled part, six markers placed by each prayer's own `t`, the sun as a `Circle` with a
      radial-gradient glow.
- [ ] Motion: the sun's position updates once a minute and eases there (Reanimated
      `withTiming`, 600 ms, shared easing token). On open, the travelled arc draws in once
      (`strokeDashoffset`, ~900 ms). This is the screen's one "wow" moment; everything else stays still.
- [ ] Reduced motion (`AccessibilityInfo.isReduceMotionEnabled`): no draw-in, the sun jumps into place.
- [ ] Skyline: our own SVG silhouette (minarets + dome), not theirs. One path, gold at 25% opacity.
- [ ] Accessibility: the arc is decorative (`accessibilityElementsHidden`); the countdown card and
      list carry the information; the current row gets `accessibilityState={{ selected: true }}`.
- [ ] Date pager: ‹ › to see tomorrow/yesterday; the arc only animates for today.
- [ ] Bell on each row opens our existing `PrayerAlertSheet` for that prayer.
- [ ] Greeting by time of day, in all 7 languages (new i18n keys).
- [ ] Performance: SVG only re-renders when the minute changes; no per-frame JS work.

### 2.2 Home dashboard

- [ ] Bento grid of small cards: next-prayer countdown, event countdown ("Mawlid · 35 days"),
      Name of the day, today's deeds progress, tasbih shortcut. Each one opens its feature.
- [ ] The countdown card styling (big tabular digits, thin ornament divider, "Window 03:29–05:29")
      is worth reusing on Home and in the notification panel.

### 2.3 Quran

- [ ] Each ayah as a card: number in an ornament badge, Arabic right-aligned and large, translation
      below, and a row of play / heart / share. "Share" opens the story editor with that ayah.
- [ ] Surah header as an ornamental cartouche with the Arabic name.
- [ ] A sticky audio bar at the bottom: reciter, previous / play / next, speed, repeat, progress.
- [ ] Text size button (`aA`) in the header.

### 2.4 Hadith

- [ ] Book cards in a two-column grid: icon, book name, "98 chapters · 7,590 hadiths", languages
      available, a downloaded tick or cloud icon, and an Open button.
- [ ] All / Favourites tabs at the top, search across hadiths and chapters.

### 2.5 Qibla

- [ ] Compass inside an arch-shaped frame, Kaaba icon on the bezel at the Qibla bearing, the
      "° off Qibla" readout updating live, a gentle haptic when you are within ±3°.

### 2.6 General visual language

- [ ] Ornament dividers (thin line + small eight-point star in the middle) under every screen
      title — one shared `<Ornament />` component.
- [ ] Gold outline on cards (1 px, 30% opacity) instead of heavy shadows.
- [ ] A starry night background on the prayer screen at night only; plain surface by day.
- [ ] Tab bar as a floating rounded pill with an active "chip" behind the selected tab.

### 2.7 Onboarding (first launch)

Rahman opens with a short onboarding: an overview of what the app does, then it sets up location,
notifications and the other settings its features need. We have none today — location is asked the
first time the Prayer tab opens, notifications when alerts are switched on.

Flow — about 6 short screens, one idea each, a progress dots row, **Skip** always visible:

- [ ] **1. Language** — the 7 languages with their own names (العربية, Français…), preselected from
      the phone; switches RTL immediately so the rest of onboarding is already in that language.
- [ ] **2. Overview** — 2–3 swipeable cards: "Make Islamic story cards and videos", "Prayer times,
      adhan and Qibla", "Quran and hadith, offline". Real app visuals, not stock art. This is where the
      one motion moment lives (cards slide in; reduced motion = fade).
- [ ] **3. Location** — explain first, then ask: "Your location is used only on this phone to work out
      prayer times and the Qibla. It is never sent to us." Buttons: **Use my location** (system prompt,
      approximate is enough — accept `ACCESS_COARSE_LOCATION` if the user picks it) and **Choose my city**
      (opens the existing `LocationSheet`). Denied → falls back to the city picker, never a dead end.
- [ ] **4. Prayer settings** — calculation method preselected from the country (MWL, Umm al-Qura,
      ISNA, Egyptian, Karachi…), Asr: Shafi'i / Hanafi. Shown with the resulting times for today so the
      choice is concrete. Editable later in settings.
- [ ] **5. Alerts** — choose adhan / sound / vibrate / off for all prayers at once (per-prayer stays in
      `PrayerAlertSheet`), preview the adhan, then **Turn on alerts** → notification permission
      (Android 13+ `POST_NOTIFICATIONS`, iOS). On Android 12+, if exact alarms are off, one extra line
      with **Allow on-time alerts** → opens the system exact-alarm page (`SCHEDULE_EXACT_ALARM`).
- [ ] **5b. Widgets** (only once widgets exist — see section 1) — a swipeable gallery of our widgets
      rendered live with the user's real data (next prayer + countdown, today's times, Name / verse of
      the day), each with **Add to home screen**:
      - Android 8+: calls `AppWidgetManager.requestPinAppWidget()` (guarded by
        `isRequestPinAppWidgetSupported()`), which shows the system "Add widget?" dialog; a callback
        tells us it was added so the button turns into "Added ✓". A small function in our local
        `prayer-panel` module, or the pin API of `react-native-android-widget`.
      - Launchers without pin support, and **iOS** (apps cannot add widgets there): a short looping
        how-to (long-press the home screen → + → search "Barakah") instead of the button.
      - Optional and skippable like every other step; the same gallery lives in Settings → Widgets.
- [ ] **6. Ready** — "Create your first card" (opens the editor with a starter design) or "Go to
      prayer times". Optional, non-blocking "Sign in to sync" link — never required.

Store rules this must follow:

- [ ] Ask each permission **only right after the screen that explains it**, and only when the user
      taps the button — never several system prompts in a row on launch.
- [ ] Every permission step has a **Not now** that continues; no feature screen blocks the app
      (Apple guideline 5.1.1; Play user-data policy). The app must be fully usable with nothing granted.
- [ ] Our buttons must not look like or pre-empt the system dialog ("Allow" / "Don't Allow" wording is
      reserved for the system prompt on iOS). Use "Use my location", "Turn on alerts".
- [ ] Explanation text matches the Data safety form and privacy policy (location: on-device only,
      not collected) and the `NSLocationWhenInUseUsageDescription` string.
- [ ] No background location, no full-screen intent, no `USE_EXACT_ALARM` — same as today.
- [ ] If permission was permanently denied, the step shows **Open settings** instead of asking again.

How we build it:

- [ ] `useOnboardingStore` (persisted, versioned): `completedVersion`. Show onboarding when it is
      below the current version, so a future big release can show a short "What's new" page instead
      of the whole flow. Existing users updating to this version skip straight to "What's new".
- [ ] Route `app/onboarding.tsx` (Expo Router), redirected to from `_layout.tsx` before the tabs
      render; no flash of the home screen.
- [ ] Pager with `react-native-pager-view` or a horizontal `FlatList` with `pagingEnabled`; works in
      RTL; back button / gesture goes to the previous step.
- [ ] Reuse, don't duplicate: `LocationSheet`, the alert prefs store, `service.ts` permission request,
      `canScheduleExactAlarms()`.
- [ ] Accessibility: every step's title is announced on change; buttons ≥48 dp; works at the largest
      font size (scrolls instead of clipping); progress read as "Step 3 of 6".
- [ ] i18n: all copy in 7 languages.
- [ ] Settings → "Replay introduction" so it can be seen again.
- [ ] Tests: store logic (version gating), and an E2E path for grant / deny / skip on each step.

---

## 3. Storytelling

### 3.1 Their in-app stories (screenshot 10)

"Islamic bedtime stories for children": a grid of illustrated covers, each with a duration chip
(3:10–3:50) and a play button — Prophet Idris, Nuh and gratitude, Nuh's advice to his son, Hud,
Salih and the she-camel, Ibrahim's journey, Hajar and Zamzam, Ismail, Ayyub… Narrated audio of
about three and a half minutes each, over illustrations.

How we would build ours — checklist:

- [ ] **Scripts first.** 3–4 minutes (~450–550 words) each, from the Quran and authentic sources
      only, with ayah references, a single moral per story ("gratitude", "patience"), written for
      ages 5–10, then reviewed by a qualified person before recording. Translated into our 7 languages.
- [ ] **Illustration rule: never depict a prophet's face or body.** Show him from far behind, as a
      silhouette, or show only the scene (the ark, the camel, the well). Same for the Sahaba and
      angels. Rahman follows this too; it is non-negotiable for our audience.
- [ ] One consistent illustration style for the whole series (warm night palette, lanterns,
      painterly). 6–10 frames per story. Commissioned, or AI-generated with a single fixed style
      prompt and a human pass. Licence and provenance recorded like `media-sources.json`.
- [ ] **Narration:** a hired voice with a written rights transfer, per language. TTS only as a
      placeholder. No music (consistent with the rest of the app); soft ambience from our sound
      library is fine.
- [ ] **Player:** full-screen image with a slow Ken Burns pan per frame, timed to the narration;
      subtitles on by default; pause, ±10 s, sleep timer (bedtime use); works offline after download.
- [ ] **Library screen:** a cover grid with a duration chip, a "listened" tick, a filter by Prophet.
- [ ] **Hosting:** like the video library — files on our site with a manifest, downloaded on first
      play, so new stories ship without an app update.
- [ ] **Tie-in with our core feature:** at the end of each story, "Make a card from this story"
      opens the editor with the story's key ayah and its illustration as the background.

### 3.2 Their App Store screenshot story

The ten screenshots tell one story in order: brand hero → widgets → prayer times → Qibla → Quran
→ AI imam → dhikr → deeds → hadith → kids' stories. Every frame uses the same recipe, which is
worth copying for our own store listing:

- [ ] One background for the whole set (theirs: starry night over a lit mosque; ours: our green
      night palette).
- [ ] Two-line headline in a gold serif ("Prayer Times" / "Always at Your Fingertips"): the
      feature name, then the benefit.
- [ ] A real screen in a phone frame, sometimes with one UI element pulled out of the frame and
      enlarged (their highlighted Maghrib row) to point at the key detail.
- [ ] First screenshot = brand + a collage of the best widgets, so the value shows even in search
      results where only the first 2–3 frames are visible.
- [ ] Localised headlines for each of our 7 store languages.

---

## 4. Suggested order

1. Prayer screen redesign with the sun arc (2.1) — the biggest visible upgrade, all local, no new data.
   Build onboarding (2.7) right alongside it: both touch location and alerts, and onboarding is what
   makes alerts actually get turned on.
2. Tasbih + daily deeds + streak (section 1) — small, offline, and they bring people back every day.
3. Islamic calendar countdowns + 99 Names — small, and both feed new story-card content.
4. Quran audio + last-read + ayah cards (2.3) — bigger, licence work first.
5. Android widgets, plus the widget gallery (onboarding step 5b and Settings → Widgets).
6. Narrated stories — a content project with a budget (scripts, review, art, voice).
7. New store screenshots (3.2) once 1–3 have shipped.
