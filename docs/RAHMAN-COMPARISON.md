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
- [ ] **Home-screen widgets** (M–L) — next prayer + countdown, today's times, name/verse of the
      day. Android: `react-native-android-widget` (works with prebuild). iOS: needs a native
      WidgetKit target (`expo-apple-targets`) and an EAS build, so it comes after the iOS build exists.
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
2. Tasbih + daily deeds + streak (section 1) — small, offline, and they bring people back every day.
3. Islamic calendar countdowns + 99 Names — small, and both feed new story-card content.
4. Quran audio + last-read + ayah cards (2.3) — bigger, licence work first.
5. Android widgets.
6. Narrated stories — a content project with a budget (scripts, review, art, voice).
7. New store screenshots (3.2) once 1–3 have shipped.
