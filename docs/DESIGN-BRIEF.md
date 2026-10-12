# Design brief — Barakah Stories: prayer screen, onboarding, and the new feature screens

## The product

Barakah Stories is a free Islamic app for Android and iOS (phones and tablets). Its core is a story
editor: people make beautiful Islamic cards and short videos (Quran verses, hadith, duas, Jumu'ah
and Eid greetings) and share them to WhatsApp status and Instagram stories. Around that it has prayer
times with adhan alerts, a Qibla compass, the full Quran offline with translations, and Sahih
al-Bukhari and Muslim. No ads.

Audience: Muslims of all ages, mostly on mid-range Android phones, in Arabic, English, French,
Indonesian, Malay, Thai and Urdu. Arabic and Urdu are right-to-left: every screen must mirror cleanly.

Feeling: calm, reverent, premium, quiet. A night-sky mood, never loud. Think a well-lit mosque
courtyard at dusk, not a dashboard.

## Brand system (use these exact values)

Colours (dark theme only):

| Token | Hex | Use |
|---|---|---|
| bg | #0B1F1C | screen background (deep green-black) |
| bgElev | #12302B | cards |
| bgElev2 | #183A34 | raised cards, highlighted rows |
| line | rgba(255,255,255,0.10) | decorative dividers |
| lineStrong | rgba(255,255,255,0.36) | outlines of interactive things (3:1 contrast) |
| text | #F3EFE4 | primary text (warm ivory) |
| textMuted | #A9B8B1 | secondary text |
| accent | #D9B65C | gold: highlights, active states, key numbers |
| accentInk | #1B1400 | text on gold buttons |
| danger | #EA8080 | errors |
| success | #1F5A44 | confirmations |

Corner radius 14. Spacing on a 4-pt grid. Gold hairline outlines (1 px, ~30% opacity) rather than
heavy shadows. A small eight-point-star ornament divider (thin line · star · thin line) under titles.

Type: Inter (Latin UI), Cairo (Arabic UI), Noto Naskh Arabic (Urdu UI); Amiri for Quran / Arabic
scripture. Numbers use tabular figures. Arabic locales use Arabic-Indic digits (٠١٢٣).

Do not: copy any other app's artwork; use navy-and-gold (that is a competitor's look — ours is
green-black and gold); add music or instruments imagery; show faces or bodies of prophets,
companions or angels anywhere (silhouettes from far behind, or scenes only).

## Hard requirements for every screen

- Phone first (360–430 pt wide), plus a tablet layout (768–1024 pt) for each screen — on tablets use
  two columns or a wider centred column, never a stretched phone layout. Portrait and landscape.
- RTL mirrored versions for Arabic of the key screens.
- Touch targets at least 48 × 48. Body text ≥ 15 pt; must survive the largest system font size
  (content scrolls, nothing clips). WCAG AA contrast.
- Never colour alone to show state: pair with an icon, weight or label.
- Motion: one signature moment per screen at most; everything else still. Show what the screen looks
  like with reduced motion.
- Bottom tab bar: Home, Quran, Hadith, Prayer, Me. A floating round gold "+" button sits bottom-left
  (creates a new story); keep it clear of content.

## Screens to design

### 1. Prayer screen (priority)

Top to bottom:

1. Header: greeting by time of day ("Good evening"), location chip (city, country; tap to change),
   a settings icon.
2. **The sun arc** — the signature element. A half-ellipse arc spanning the width, sitting over a
   mosque-skyline silhouette (dome + two minarets, gold at ~18% opacity) on a horizon line. The six
   times sit on the arc in time order — Fajr at the start, then Sunrise, Dhuhr, Asr, Maghrib, Isha at
   the end — each as a small dot with its name and time beside it, fanned outwards so labels never
   overlap. The part of the day already passed is a solid gold line; the rest is a faint dashed line.
   A glowing sun sits at "now" (a crescent moon before sunrise and after Maghrib). The current
   prayer's label is gold. Show day, evening and night states.
3. Date row: ‹ Gregorian date · Hijri date › to look at other days.
4. Next-prayer card: "Next prayer · Maghrib", a big countdown 3:01:45 in gold tabular digits, the
   adhan time under it between two hairlines.
5. The six rows: icon, name, time, and a bell button showing that prayer's alert mode (adhan /
   sound / vibrate / off). The next prayer's row is highlighted (raised card, gold text).
6. Below: Qibla card (compass + "152° · 2,414 km to the Kaaba"), calculation method, Asr method.

States: no location yet (friendly empty state with "Use my location" / "Choose my city"); alerts off.

### 2. Onboarding (first launch, short steps, progress dots, Skip always visible)

1. **Language** — the 7 languages in their own names; picking one switches the layout immediately.
2. **Welcome / overview** — 2–3 swipeable cards: "Make Islamic story cards and videos",
   "Prayer times, adhan and Qibla", "Quran and hadith, offline". Use real app visuals.
3. **Location** — short explanation ("Used only on this phone to work out prayer times and the
   Qibla. Never sent to us."), buttons **Use my location** and **Choose my city**, and **Not now**.
4. **Prayer settings** — calculation method (preselected from the country) and Asr (Shafi'i /
   Hanafi), with today's resulting times shown live.
5. **Alerts** — one choice for all prayers (adhan / sound / vibrate / off) with an adhan preview
   play button, then **Turn on alerts**, and **Not now**. On Android an extra line "Allow on-time
   alerts" for exact alarms.
6. **Widgets** — a swipeable gallery of the home-screen widgets (below) with **Add to home screen**
   (Android) or a short "how to add" illustration (iPhone).
7. **Ready** — "Create your first card" (primary) and "Go to prayer times".

Our buttons must not say "Allow" / "Don't allow" (that wording belongs to the system permission
dialog). Every step works if the user says no.

### 3. Home-screen widgets (Android and iOS sizes)

- **Prayer timer** — small: next prayer name, time, live countdown. Medium: plus all six times with
  the current one highlighted.
- **Dhikr counter** — the dhikr in Arabic, "17 / 33", a large tap area to count, a small reset /
  switch button, a ✓ at the target.
- **Today's times** (also a lock-screen version).
- **Name of Allah / verse of the day**.

### 4. New feature screens

- **Tasbih** — the dhikr in large Arabic with transliteration and meaning, a big tactile counter
  (a single large round button, not a skeuomorphic clicker), target 33 / 99 / 100, undo and reset,
  today / yesterday / all-time counts, a picker of preset and custom dhikr.
- **Daily deeds** — a streak ring with the number of days, a week strip of the last 7 days, and a
  checklist: the five prayers, Quran reading, morning and evening adhkar, salawat.
- **Islamic calendar** — month view in Hijri with Gregorian underneath, upcoming events as cards
  with "35 days" chips (Ramadan, Eid al-Fitr, Day of Arafah, Eid al-Adha, Ashura, Mawlid…).
- **99 Names of Allah** — grid of names (Arabic calligraphy-style large, transliteration small),
  detail view with meaning and a "Make a card" button.
- **Duas & adhkar** — categories (morning, evening, after salah, sleep, travel, distress…), each dua
  as a card with Arabic, transliteration, translation, source, a small counter and "Make a card".
- **Quran reader upgrade** — each ayah as a card (number in an ornament badge, Arabic large and
  right-aligned, translation below, play / favourite / share), surah header as an ornamental
  cartouche, a "Continue reading" card on the Quran tab, and a bottom audio bar (reciter, previous /
  play / next, speed, repeat, progress).
- **Hadith library** — two-column book cards (icon, name, "98 chapters · 7,590 hadiths", languages,
  downloaded tick or cloud icon, Open), All / Favourites tabs, search.
- **Stories** (children's and sleep stories) — a grid of illustrated covers with a duration chip and
  a play button; a full-screen player with slowly panning illustration, subtitles, pause, ±10 s and a
  sleep timer. Illustrations: warm night palette, lanterns, painterly — no faces of prophets.

### 5. Tablet layouts

For Prayer, Quran reader and Home: show how the extra width is used (e.g. Prayer: arc and countdown
on the left, times list and Qibla on the right; Quran: surah list on the left, reader on the right).

### 6. Watch (Wear OS round and Apple Watch rectangular)

- Next prayer with countdown, and today's times as a list.
- Tasbih: the count large, tap anywhere to count, a strong haptic at the target.
- A complication / tile: next prayer + countdown.

## Deliverables

High-fidelity mockups of the screens above in the dark theme, phone first, with tablet and RTL
versions of the Prayer screen, onboarding and Quran reader; the widget set in small and medium sizes;
the watch screens; and a short component sheet (buttons, chips, cards, rows, ornament divider,
countdown, bell / alert-mode icons) using the tokens above so it can be built directly in React
Native.
