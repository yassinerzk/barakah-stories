import { AppState } from 'react-native';
import { addDays, computePrayerTimes, DHIKR_PRESETS, formatClock, pick, PRAYER_NAMES, translate } from '@barakah/core';
import { usePrayerStore, useSettingsStore } from '../store';
import { useTasbihStore } from '../practice/store';
import { setWidgetDhikr, setWidgetPrayers, takeWidgetTaps, widgetsSupported } from '../../modules/widgets';

/** Today's and tomorrow's times, so the widget always knows the next prayer even past Isha. */
function pushPrayers(): void {
  const { location, method, madhab } = usePrayerStore.getState();
  const { locale } = useSettingsStore.getState();
  if (!location) {
    setWidgetPrayers('', translate(locale, 'nextPrayer'), []);
    return;
  }
  const now = new Date();
  const items = [now, addDays(now, 1)].flatMap((day) =>
    computePrayerTimes(location, day, { method, madhab })
      .filter((p) => Number.isFinite(p.time.getTime()))
      .map((p) => ({
        id: p.id,
        name: pick(locale, PRAYER_NAMES.find((n) => n.id === p.id)!.label),
        time: formatClock(p.time, locale, location.timeZone),
        at: p.time.getTime(),
      })),
  );
  setWidgetPrayers(location.label.split(',')[0].trim(), translate(locale, 'nextPrayer'), items);
}

function pushDhikr(): void {
  const { dhikrId, count, target } = useTasbihStore.getState();
  const preset = DHIKR_PRESETS.find((p) => p.id === dhikrId) ?? DHIKR_PRESETS[0];
  setWidgetDhikr({ arabic: preset.arabic, label: preset.transliteration, count, target });
}

/** Taps made on the dhikr widget while the app was closed join the in-app tasbih. */
function collectTaps(): void {
  const taps = takeWidgetTaps();
  for (let i = 0; i < taps; i++) useTasbihStore.getState().tap();
}

/**
 * Keeps the home-screen widgets in step with the app: prayer times when the
 * place, method or language changes and whenever the app comes to the front,
 * and the dhikr counter whenever the tasbih changes. Android only for now.
 */
export function startWidgetSync(): () => void {
  if (!widgetsSupported) return () => undefined;
  collectTaps();
  pushPrayers();
  pushDhikr();
  const unsubPrayer = usePrayerStore.subscribe((s, prev) => {
    if (s.location !== prev.location || s.method !== prev.method || s.madhab !== prev.madhab) pushPrayers();
  });
  const unsubLocale = useSettingsStore.subscribe((s, prev) => {
    if (s.locale !== prev.locale) pushPrayers();
  });
  const unsubTasbih = useTasbihStore.subscribe((s, prev) => {
    if (s.count !== prev.count || s.dhikrId !== prev.dhikrId || s.target !== prev.target) pushDhikr();
  });
  const appState = AppState.addEventListener('change', (state) => {
    if (state !== 'active') return;
    collectTaps();
    pushPrayers();
  });
  return () => {
    unsubPrayer();
    unsubLocale();
    unsubTasbih();
    appState.remove();
  };
}
