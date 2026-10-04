import { useCallback, useEffect, useState } from 'react';
import { View } from 'react-native';
import { Stack } from 'expo-router';
import * as SplashScreen from 'expo-splash-screen';
import { StatusBar } from 'expo-status-bar';
import { useAppFonts } from '../src/fonts';
import { Toaster } from '../src/components/ui';
import { ui } from '../src/theme';
import { useAuthStore } from '../src/auth/store';
import { useReminderStore } from '../src/notifications/store';
import { ReminderSheet } from '../src/notifications/ReminderSheet';
import { startPrayerAlerts } from '../src/notifications/prayerAlertStore';
import { AdhanPlayer, useAdhanFromNotifications } from '../src/notifications/AdhanPlayer';
import { AnimatedSplash } from '../src/brand/AnimatedSplash';

SplashScreen.preventAutoHideAsync().catch(() => undefined);

export default function RootLayout() {
  const [fontsLoaded] = useAppFonts();
  const [splashDone, setSplashDone] = useState(false);
  const finishSplash = useCallback(() => setSplashDone(true), []);
  const initAuth = useAuthStore((s) => s.init);
  const startSession = useReminderStore((s) => s.startSession);
  useEffect(() => {
    initAuth();
  }, [initAuth]);
  // Counts the launch and re-applies the daily reminder, so its wording follows
  // the current language and a schedule the OS dropped is restored.
  useEffect(() => {
    startSession();
  }, [startSession]);
  // Tops up the prayer-alert schedule and the panel, and keeps them in step with
  // the location, method and language for as long as the app is running.
  useEffect(() => startPrayerAlerts(), []);
  useAdhanFromNotifications();
  useEffect(() => {
    if (fontsLoaded) SplashScreen.hideAsync().catch(() => undefined);
  }, [fontsLoaded]);
  if (!fontsLoaded) return null;
  return (
    <View style={{ flex: 1, backgroundColor: ui.bg }}>
      <StatusBar style="light" />
      <Stack screenOptions={{ headerShown: false, contentStyle: { backgroundColor: ui.bg } }}>
        <Stack.Screen name="(tabs)" />
        <Stack.Screen
          name="editor"
          options={{ presentation: 'fullScreenModal', animation: 'slide_from_bottom' }}
        />
      </Stack>
      <ReminderSheet />
      <AdhanPlayer />
      <Toaster />
      {/* Drawn over the app, which mounts underneath while it plays. */}
      {!splashDone && <AnimatedSplash onDone={finishSplash} />}
    </View>
  );
}
