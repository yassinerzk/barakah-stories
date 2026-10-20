import { useEffect, useState } from 'react';
import { BackHandler, Platform, View } from 'react-native';
import { useRouter } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { ALERT_PRAYERS, DEFAULT_DESIGN, LOCALES, suggestedMethod, type AlertMode } from '@barakah/core';
import { useT } from '../src/i18n';
import { ui } from '../src/theme';
import { useEditorStore, useOnboardingStore, usePrayerStore, useSettingsStore, useToastStore, type PrayerLocation } from '../src/store';
import { usePrayerAlertStore } from '../src/notifications/prayerAlertStore';
import { LocationSheet } from '../src/features/prayer/LocationSheet';
import { locateMe } from '../src/features/prayer/locateMe';
import { TopBar } from '../src/features/onboarding/OnbChrome';
import { LanguageStep, ReadyStep, WelcomeStep } from '../src/features/onboarding/IntroSteps';
import { AlertsStep, LocationStep, SettingsStep } from '../src/features/onboarding/SetupSteps';
import { WidgetsStep } from '../src/features/onboarding/WidgetsStep';
import { requestWidget, WidgetHowToSheet, type WidgetKind } from '../src/widgets/WidgetHowToSheet';
import { widgetsSupported } from '../modules/widgets';
import { usePro } from '../src/monetization/usePro';

type Step = 'language' | 'welcome' | 'location' | 'settings' | 'alerts' | 'widgets' | 'ready';
const MODE_KEY = { adhan: 'modeAdhan', sound: 'modeSound', vibrate: 'modeVibrate', off: 'modeOff' } as const;
/** The steps keep a readable width on tablets. */
const MAX_W = 560;

/**
 * First launch: language, what the app does, then location, calculation and
 * alerts — each permission asked only after the screen that explains it, and
 * only when the person taps the button. Every step can be declined or skipped;
 * the app works with nothing granted.
 */
export default function Onboarding() {
  const { t } = useT();
  const insets = useSafeAreaInsets();
  const router = useRouter();
  const toast = useToastStore((s) => s.show);
  const locale = useSettingsStore((s) => s.locale);
  const setLocale = useSettingsStore((s) => s.setLocale);
  const location = usePrayerStore((s) => s.location);
  const setLocation = usePrayerStore((s) => s.setLocation);
  const method = usePrayerStore((s) => s.method);
  const setMethod = usePrayerStore((s) => s.setMethod);
  const madhab = usePrayerStore((s) => s.madhab);
  const setMadhab = usePrayerStore((s) => s.setMadhab);
  const enableAlerts = usePrayerAlertStore((s) => s.enable);
  const setAlertMode = usePrayerAlertStore((s) => s.setMode);
  const alertsOn = usePrayerAlertStore((s) => s.prefs.enabled);
  const complete = useOnboardingStore((s) => s.complete);
  const loadDesign = useEditorStore((s) => s.load);

  const [step, setStep] = useState<Step>('language');
  const [sheetOpen, setSheetOpen] = useState(false);
  const [locating, setLocating] = useState(false);
  const [mode, setMode] = useState<AlertMode>('adhan');
  const [busy, setBusy] = useState(false);
  const [suggested, setSuggested] = useState(false);
  const [widgetHowTo, setWidgetHowTo] = useState(false);
  // Widgets are Pro: free users don't get the widget step.
  const { locked } = usePro();

  // Calculation settings need a place to preview; without one that step is left out.
  // The widgets step needs the native widgets, which Expo Go and the web don't have.
  const steps: Step[] = [
    'language',
    'welcome',
    'location',
    ...(location ? (['settings'] as const) : []),
    'alerts',
    ...(widgetsSupported && !locked ? (['widgets'] as const) : []),
    'ready',
  ];
  const index = Math.max(0, steps.indexOf(step));
  const prevStep = index > 0 ? steps[index - 1] : null;
  const next = () => setStep(steps[Math.min(index + 1, steps.length - 1)]);
  const back = () => prevStep && setStep(prevStep);

  // Android's back button walks back through the steps instead of leaving the app.
  useEffect(() => {
    if (Platform.OS !== 'android') return;
    const sub = BackHandler.addEventListener('hardwareBackPress', () => {
      if (!prevStep || step === 'ready') return false;
      setStep(prevStep);
      return true;
    });
    return () => sub.remove();
  }, [prevStep, step]);

  const finish = (then: 'prayer' | 'card' | 'home') => {
    complete();
    if (then === 'card') {
      loadDesign({ ...DEFAULT_DESIGN });
      router.replace('/(tabs)');
      router.push({ pathname: '/editor', params: { start: 'image' } });
    } else {
      router.replace(then === 'prayer' ? '/(tabs)/prayer' : '/(tabs)');
    }
  };

  const applyLocation = (loc: PrayerLocation) => {
    setLocation(loc);
    setMethod(suggestedMethod(loc.country));
    setSuggested(!!loc.country);
    setStep('settings');
  };

  const locate = async () => {
    setLocating(true);
    const result = await locateMe();
    setLocating(false);
    if (result.ok) applyLocation(result.location);
    else toast(t('locationDenied'), 'error');
  };

  const turnOnAlerts = async () => {
    if (mode === 'off') {
      next();
      return;
    }
    setBusy(true);
    for (const p of ALERT_PRAYERS) setAlertMode(p, mode);
    const outcome = await enableAlerts();
    setBusy(false);
    if (outcome !== 'granted') toast(t('alertsBlocked'), 'error');
    next();
  };

  // The launcher's own dialog takes over when it can place the widget; otherwise the steps.
  const addWidget = (kind: WidgetKind) => {
    if (requestWidget(kind) === 'manual') setWidgetHowTo(true);
    else next();
  };

  const chips = [
    LOCALES.find((l) => l.id === locale)?.label,
    location?.label.split(',')[0].trim(),
    alertsOn ? t(MODE_KEY[mode]) : null,
  ].filter((c): c is string => !!c);

  return (
    <View style={{ flex: 1, backgroundColor: ui.bg, paddingTop: insets.top, paddingBottom: insets.bottom }}>
      <View style={{ flex: 1, width: '100%', maxWidth: MAX_W, alignSelf: 'center' }}>
        <TopBar
          step={index + 1}
          total={steps.length}
          onBack={prevStep && step !== 'ready' ? back : undefined}
          onSkip={step !== 'ready' ? () => finish('home') : undefined}
        />
        {step === 'language' && <LanguageStep locale={locale} onPick={setLocale} onNext={next} />}
        {step === 'welcome' && <WelcomeStep onNext={next} />}
        {step === 'location' && (
          <LocationStep locating={locating} onLocate={locate} onChooseCity={() => setSheetOpen(true)} onNotNow={next} />
        )}
        {step === 'settings' && location && (
          <SettingsStep
            location={location}
            suggested={suggested}
            method={method}
            madhab={madhab}
            onMethod={setMethod}
            onMadhab={setMadhab}
            onNext={next}
          />
        )}
        {step === 'alerts' && <AlertsStep mode={mode} busy={busy} onMode={setMode} onTurnOn={turnOnAlerts} onNotNow={next} />}
        {step === 'widgets' && <WidgetsStep onAdd={addWidget} onLater={next} />}
        {step === 'ready' && <ReadyStep chips={chips} onFirstCard={() => finish('card')} onPrayer={() => finish('prayer')} />}
      </View>
      <LocationSheet
        visible={sheetOpen}
        onClose={() => setSheetOpen(false)}
        onPick={(loc) => {
          setSheetOpen(false);
          applyLocation(loc);
        }}
        onUseMyLocation={locate}
        locating={locating}
      />
      <WidgetHowToSheet
        visible={widgetHowTo}
        onClose={() => {
          setWidgetHowTo(false);
          next();
        }}
      />
    </View>
  );
}
