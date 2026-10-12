import type { ReactNode } from 'react';
import { ActivityIndicator, Pressable, Text, View } from 'react-native';
import Svg, { Defs, LinearGradient, Rect, Stop } from 'react-native-svg';
import { Ionicons } from '@expo/vector-icons';
import { toLocaleDigits } from '@barakah/core';
import { useT } from '../../i18n';
import { ui } from '../../theme';

const fill = (s: string, v: Record<string, string>) => s.replace(/\{(\w+)\}/g, (_, k: string) => v[k] ?? '');

interface TopBarProps {
  step: number;
  total: number;
  onBack?: () => void;
  onSkip?: () => void;
}

/** Back, progress dots and Skip — Skip is on every step but the last. */
export function TopBar({ step, total, onBack, onSkip }: TopBarProps) {
  const { t, locale, font, row } = useT();
  const rtl = row === 'row-reverse';
  return (
    <View style={{ flexDirection: row, alignItems: 'center', justifyContent: 'space-between', height: 56, paddingHorizontal: 8 }}>
      <View style={{ width: 72, alignItems: 'flex-start' }}>
        {onBack && (
          <Pressable onPress={onBack} accessibilityRole="button" accessibilityLabel={t('back')} style={{ width: 48, height: 48, alignItems: 'center', justifyContent: 'center' }}>
            <Ionicons name={rtl ? 'chevron-forward' : 'chevron-back'} size={22} color={ui.text} />
          </Pressable>
        )}
      </View>
      <View
        accessible
        accessibilityRole="progressbar"
        accessibilityLabel={fill(t('onbStep'), { n: toLocaleDigits(step, locale), total: toLocaleDigits(total, locale) })}
        style={{ flexDirection: row, gap: 6 }}
      >
        {Array.from({ length: total }, (_, i) => (
          <View
            key={i}
            style={{
              width: i + 1 === step ? 22 : 6,
              height: 6,
              borderRadius: 3,
              backgroundColor: i + 1 === step ? ui.accent : i + 1 < step ? '#9C7F38' : 'rgba(255,255,255,0.25)',
            }}
          />
        ))}
      </View>
      <View style={{ width: 72, alignItems: 'flex-end' }}>
        {onSkip && (
          <Pressable onPress={onSkip} accessibilityRole="button" style={{ minHeight: 48, minWidth: 48, paddingHorizontal: 8, justifyContent: 'center' }}>
            <Text style={{ color: ui.textMuted, fontFamily: font.semibold, fontSize: 15 }}>{t('onbSkip')}</Text>
          </Pressable>
        )}
      </View>
    </View>
  );
}

interface ButtonProps {
  label: string;
  onPress: () => void;
  icon?: keyof typeof Ionicons.glyphMap;
  busy?: boolean;
}

/** The step's main action: a gold gradient pill. */
export function GoldButton({ label, onPress, icon, busy }: ButtonProps) {
  const { font, row } = useT();
  return (
    <Pressable
      onPress={busy ? undefined : onPress}
      accessibilityRole="button"
      accessibilityState={{ busy: !!busy }}
      style={({ pressed }) => ({ minHeight: 56, borderRadius: 16, overflow: 'hidden', opacity: pressed ? 0.85 : 1 })}
    >
      <Svg style={{ position: 'absolute', left: 0, top: 0, right: 0, bottom: 0 }} width="100%" height="100%" preserveAspectRatio="none">
        <Defs>
          <LinearGradient id="gold" x1="0" y1="0" x2="1" y2="1">
            <Stop offset="0" stopColor="#F0D488" />
            <Stop offset="1" stopColor="#C9A24A" />
          </LinearGradient>
        </Defs>
        <Rect width="100%" height="100%" fill="url(#gold)" />
      </Svg>
      <View style={{ flex: 1, minHeight: 56, flexDirection: row, alignItems: 'center', justifyContent: 'center', gap: 8, paddingHorizontal: 16 }}>
        {busy ? <ActivityIndicator color={ui.accentInk} /> : icon && <Ionicons name={icon} size={18} color={ui.accentInk} />}
        <Text style={{ color: ui.accentInk, fontFamily: font.semibold, fontSize: 17 }}>{label}</Text>
      </View>
    </Pressable>
  );
}

/** A second choice of equal weight, outlined. */
export function OutlineButton({ label, onPress, icon }: ButtonProps) {
  const { font, row } = useT();
  return (
    <Pressable
      onPress={onPress}
      accessibilityRole="button"
      style={({ pressed }) => ({
        minHeight: 56,
        borderRadius: 16,
        borderWidth: 1,
        borderColor: ui.lineStrong,
        backgroundColor: pressed ? ui.bgElev2 : ui.bgElev,
        flexDirection: row,
        alignItems: 'center',
        justifyContent: 'center',
        gap: 8,
        paddingHorizontal: 16,
      })}
    >
      {icon && <Ionicons name={icon} size={18} color={ui.text} />}
      <Text style={{ color: ui.text, fontFamily: font.semibold, fontSize: 17 }}>{label}</Text>
    </Pressable>
  );
}

/** "Not now" / "Maybe later": quiet, but always there. */
export function QuietButton({ label, onPress }: { label: string; onPress: () => void }) {
  const { font } = useT();
  return (
    <Pressable onPress={onPress} accessibilityRole="button" style={{ minHeight: 48, alignItems: 'center', justifyContent: 'center' }}>
      <Text style={{ color: ui.textMuted, fontFamily: font.semibold, fontSize: 15 }}>{label}</Text>
    </Pressable>
  );
}

/** Title and optional lead paragraph at the top of a step. */
export function StepTitle({ title, body, center }: { title: string; body?: string; center?: boolean }) {
  const { font, textAlign } = useT();
  const align = center ? 'center' : textAlign;
  return (
    <View style={{ gap: 8 }}>
      <Text accessibilityRole="header" style={{ color: ui.text, fontFamily: font.semibold, fontSize: 25, lineHeight: 32, textAlign: align }}>
        {title}
      </Text>
      {body && <Text style={{ color: ui.textMuted, fontFamily: font.regular, fontSize: 15, lineHeight: 22, textAlign: align }}>{body}</Text>}
    </View>
  );
}

/** The bottom block: actions pinned under the content. */
export function Actions({ children }: { children: ReactNode }) {
  return <View style={{ gap: 8, paddingHorizontal: 16, paddingBottom: 20, paddingTop: 12 }}>{children}</View>;
}
