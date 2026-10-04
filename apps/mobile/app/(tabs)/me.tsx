import { useEffect, useState } from 'react';
import { Alert, FlatList, Pressable, Switch, Text, TextInput, View } from 'react-native';
import { useRouter } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import type { TranslationKey } from '@barakah/core';
import { useT } from '../../src/i18n';
import { ui } from '../../src/theme';
import { useEditorStore, useLibraryStore, useToastStore } from '../../src/store';
import { useHijriToday } from '../../src/hooks/useHijriToday';
import { useLayoutWidth } from '../../src/hooks/useLayoutWidth';
import { StoryCard } from '../../src/components/StoryCard';
import { Button, SectionTitle } from '../../src/components/ui';
import { authEnabled } from '../../src/auth/supabase';
import { useAuthStore } from '../../src/auth/store';
import { syncAll } from '../../src/auth/sync';
import { ProPanel } from '../../src/monetization/ProPanel';
import { ReminderRow } from '../../src/notifications/ReminderRow';
import { useA11yStore } from '../../src/a11y';

type A11yKey = 'reduceMotion' | 'largeText' | 'boldArabic' | 'haptics' | 'qiblaVoice';
const A11Y_ROWS: ReadonlyArray<{ key: A11yKey; title: TranslationKey; desc?: TranslationKey }> = [
  { key: 'reduceMotion', title: 'a11yReduceMotion', desc: 'a11yReduceMotionDesc' },
  { key: 'largeText', title: 'a11yLargeText', desc: 'a11yLargeTextDesc' },
  { key: 'boldArabic', title: 'a11yBoldArabic', desc: 'a11yBoldArabicDesc' },
  { key: 'haptics', title: 'a11yHaptics' },
  { key: 'qiblaVoice', title: 'a11yQiblaVoice', desc: 'a11yQiblaVoiceDesc' },
];

/** In-app accessibility choices, each adding to the phone's own settings. */
function AccessibilityPanel() {
  const { t, font, row, textAlign } = useT();
  const prefs = useA11yStore();
  return (
    <View style={{ gap: 14 }}>
      {A11Y_ROWS.map(({ key, title, desc }) => (
        <View key={key} style={{ flexDirection: row, alignItems: 'center', gap: 12 }}>
          <View style={{ flex: 1 }}>
            <Text style={{ color: ui.text, fontFamily: font.semibold, fontSize: 15, textAlign }}>{t(title)}</Text>
            {desc && (
              <Text style={{ color: ui.textMuted, fontFamily: font.regular, fontSize: 13, textAlign }}>{t(desc)}</Text>
            )}
          </View>
          <Switch
            value={prefs[key]}
            onValueChange={(v) => prefs.set({ [key]: v })}
            accessibilityLabel={t(title)}
            trackColor={{ true: ui.accent, false: ui.bg }}
            thumbColor={prefs[key] ? ui.accentInk : ui.textMuted}
          />
        </View>
      ))}
    </View>
  );
}

function AccountPanel() {
  const { t, font, row, textAlign } = useT();
  const toast = useToastStore((s) => s.show);
  const user = useAuthStore((s) => s.user);
  const status = useAuthStore((s) => s.status);
  const error = useAuthStore((s) => s.error);
  const notice = useAuthStore((s) => s.notice);
  const signUp = useAuthStore((s) => s.signUp);
  const signIn = useAuthStore((s) => s.signIn);
  const signOut = useAuthStore((s) => s.signOut);
  const deleteAccount = useAuthStore((s) => s.deleteAccount);
  const [mode, setMode] = useState<'signup' | 'signin'>('signup');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [syncing, setSyncing] = useState(false);
  const [deleting, setDeleting] = useState(false);

  const confirmDelete = () => {
    Alert.alert(t('deleteAccountTitle'), t('deleteAccountBody'), [
      { text: t('cancel'), style: 'cancel' },
      {
        text: t('deleteAccountConfirm'),
        style: 'destructive',
        onPress: async () => {
          setDeleting(true);
          const ok = await deleteAccount();
          setDeleting(false);
          toast(ok ? t('deleteAccountDone') : t('authError'), ok ? 'success' : 'error');
        },
      },
    ]);
  };

  const sync = async () => {
    if (!user) return;
    setSyncing(true);
    try {
      await syncAll(user.id);
      toast(t('synced'), 'success');
    } catch {
      toast(t('authError'), 'error');
    } finally {
      setSyncing(false);
    }
  };

  useEffect(() => {
    if (!user) return;
    const handle = setTimeout(() => void sync(), 0);
    return () => clearTimeout(handle);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [user?.id]);

  const input = {
    backgroundColor: ui.bg,
    borderWidth: 1,
    borderColor: ui.lineStrong,
    borderRadius: 10,
    paddingHorizontal: 12,
    paddingVertical: 10,
    color: ui.text,
    fontFamily: font.regular,
    fontSize: 15,
  } as const;

  if (!authEnabled) {
    return (
      <Text style={{ color: ui.textMuted, fontFamily: font.regular, fontSize: 13, textAlign }}>
        {t('authNotConfigured')}
      </Text>
    );
  }
  if (user) {
    return (
      <View style={{ gap: 10 }}>
        <Text style={{ color: ui.textMuted, fontFamily: font.regular, fontSize: 13, textAlign }}>
          {t('signedInAs')} <Text style={{ color: ui.text, fontFamily: font.medium }}>{user.email}</Text>
        </Text>
        <View style={{ flexDirection: row, gap: 8 }}>
          <Button
            label={syncing ? t('preparing') : `↻ ${t('syncNow')}`}
            size="sm"
            onPress={sync}
            disabled={syncing}
          />
          <Button label={t('signOut')} size="sm" variant="ghost" onPress={signOut} />
        </View>
        <Button
          label={deleting ? t('deleting') : t('deleteAccount')}
          size="sm"
          variant="danger"
          disabled={deleting}
          onPress={confirmDelete}
          style={{ alignSelf: row === 'row' ? 'flex-start' : 'flex-end' }}
        />
      </View>
    );
  }
  return (
    <View style={{ gap: 10 }}>
      <Text style={{ color: ui.textMuted, fontFamily: font.regular, fontSize: 13, textAlign }}>
        {t('syncHint')}
      </Text>
      <TextInput
        value={email}
        onChangeText={setEmail}
        placeholder={t('email')}
        accessibilityLabel={t('email')}
        placeholderTextColor={ui.textMuted}
        autoCapitalize="none"
        keyboardType="email-address"
        autoComplete="email"
        style={input}
      />
      <TextInput
        value={password}
        onChangeText={setPassword}
        placeholder={t('password')}
        accessibilityLabel={t('password')}
        placeholderTextColor={ui.textMuted}
        secureTextEntry
        autoComplete={mode === 'signup' ? 'new-password' : 'password'}
        style={input}
      />
      {error && <Text style={{ color: ui.danger, fontFamily: font.regular, fontSize: 13 }}>{error}</Text>}
      {notice === 'check-email' && (
        <Text style={{ color: ui.accent, fontFamily: font.medium, fontSize: 13 }}>{t('checkEmail')}</Text>
      )}
      <Button
        label={status === 'busy' ? t('preparing') : mode === 'signup' ? t('createAccount') : t('signIn')}
        variant="primary"
        disabled={status === 'busy' || !email || password.length < 6}
        onPress={() =>
          void (mode === 'signup' ? signUp(email.trim(), password) : signIn(email.trim(), password))
        }
      />
      <Pressable onPress={() => setMode(mode === 'signup' ? 'signin' : 'signup')}>
        <Text style={{ color: ui.accent, fontFamily: font.medium, fontSize: 13, textAlign: 'center' }}>
          {mode === 'signup' ? t('haveAccount') : t('noAccount')}
        </Text>
      </Pressable>
    </View>
  );
}

export default function MeScreen() {
  const { t, font, row, textAlign } = useT();
  const insets = useSafeAreaInsets();
  const router = useRouter();
  const width = useLayoutWidth();
  const { label: hijriLabel } = useHijriToday();
  const items = useLibraryStore((s) => s.items);
  const remove = useLibraryStore((s) => s.remove);
  const upsert = useLibraryStore((s) => s.upsert);
  const load = useEditorStore((s) => s.load);
  const colWidth = Math.floor((width - 32 - 12) / 2);

  return (
    <FlatList
      data={items}
      numColumns={2}
      extraData={colWidth}
      keyExtractor={(i) => i.id}
      columnWrapperStyle={{ gap: 12, flexDirection: row }}
      contentContainerStyle={{ padding: 16, paddingTop: insets.top + 12, gap: 16 }}
      ListHeaderComponent={
        <View style={{ gap: 6 }}>
          <Text style={{ color: ui.text, fontFamily: font.semibold, fontSize: 24, textAlign }}>
            {t('account')}
          </Text>
          <View
            style={{
              backgroundColor: ui.bgElev,
              borderRadius: ui.radius,
              borderWidth: 1,
              borderColor: ui.line,
              padding: 16,
            }}
          >
            <AccountPanel />
          </View>
          <SectionTitle>{t('reminderLabel')}</SectionTitle>
          <View
            style={{
              backgroundColor: ui.bgElev,
              borderRadius: ui.radius,
              borderWidth: 1,
              borderColor: ui.line,
              padding: 16,
            }}
          >
            <ReminderRow />
          </View>
          <SectionTitle>{t('proTitle')}</SectionTitle>
          <View
            style={{
              backgroundColor: ui.bgElev,
              borderRadius: ui.radius,
              borderWidth: 1,
              borderColor: ui.line,
              padding: 16,
            }}
          >
            <ProPanel />
          </View>
          <SectionTitle>{t('accessibility')}</SectionTitle>
          <View
            style={{
              backgroundColor: ui.bgElev,
              borderRadius: ui.radius,
              borderWidth: 1,
              borderColor: ui.line,
              padding: 16,
            }}
          >
            <AccessibilityPanel />
          </View>
          <SectionTitle>{t('credits')}</SectionTitle>
          <View style={{ gap: 4 }}>
            <Text style={{ color: ui.textMuted, fontFamily: font.regular, fontSize: 13, textAlign }}>
              {t('geonamesCredit')}
            </Text>
            <Text style={{ color: ui.textMuted, fontFamily: font.regular, fontSize: 13, textAlign }}>
              {t('adhanCredit')}
            </Text>
          </View>
          <SectionTitle>{t('myPosts')}</SectionTitle>
        </View>
      }
      ListEmptyComponent={
        <Text
          style={{ color: ui.textMuted, fontFamily: font.regular, textAlign: 'center', paddingVertical: 30 }}
        >
          {t('myPostsEmpty')}
        </Text>
      }
      renderItem={({ item }) => (
        <View style={{ width: colWidth, gap: 8 }}>
          <Pressable
            onPress={() => {
              load(item.design, item.id);
              router.push('/editor');
            }}
            accessibilityRole="button"
            accessibilityLabel={`${t('savedStoryLabel')}: ${item.design.headline || item.design.arabic.slice(0, 40) || t('untitled')}`}
            style={{ borderRadius: 14, overflow: 'hidden' }}
          >
            <StoryCard design={item.design} width={colWidth} hijriLabel={hijriLabel} />
          </Pressable>
          <View style={{ flexDirection: row, gap: 6, justifyContent: 'flex-end' }}>
            <Button label={t('duplicate')} size="sm" variant="ghost" onPress={() => upsert(item.design)} />
            <Button label={t('delete')} size="sm" variant="danger" onPress={() => remove(item.id)} />
          </View>
        </View>
      )}
    />
  );
}
