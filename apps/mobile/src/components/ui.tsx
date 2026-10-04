import type { ReactNode } from 'react';
import { Pressable, StyleSheet, Text, View, type StyleProp, type ViewStyle } from 'react-native';
import { ui } from '../theme';
import { useT } from '../i18n';
import { useToastStore } from '../store';

interface ChipProps {
  label: string;
  active?: boolean;
  onPress: () => void;
  accent?: boolean;
  style?: StyleProp<ViewStyle>;
  fontFamily?: string;
  /** When the visible label is a symbol ("A+"), the words a screen reader should say. */
  accessibilityLabel?: string;
}

export function Chip({ label, active, onPress, accent, style, fontFamily, accessibilityLabel }: ChipProps) {
  const { font } = useT();
  return (
    <Pressable
      onPress={onPress}
      accessibilityRole="button"
      accessibilityState={{ selected: !!active }}
      accessibilityLabel={accessibilityLabel}
      hitSlop={6}
      style={({ pressed }) => [
        s.chip,
        active && s.chipActive,
        accent && !active && s.chipAccent,
        pressed && { opacity: 0.8 },
        style,
      ]}
    >
      <Text
        style={[
          s.chipText,
          { fontFamily: fontFamily ?? font.medium },
          active && { color: ui.accentInk },
          accent && !active && { color: ui.accent },
        ]}
      >
        {label}
      </Text>
    </Pressable>
  );
}

interface ButtonProps {
  label: string;
  onPress: () => void;
  variant?: 'primary' | 'secondary' | 'ghost' | 'danger';
  disabled?: boolean;
  style?: StyleProp<ViewStyle>;
  size?: 'sm' | 'md' | 'lg';
}

export function Button({ label, onPress, variant = 'secondary', disabled, style, size = 'md' }: ButtonProps) {
  const { font } = useT();
  const pad = size === 'lg' ? 16 : size === 'sm' ? 8 : 12;
  return (
    <Pressable
      onPress={onPress}
      disabled={disabled}
      accessibilityRole="button"
      accessibilityState={{ disabled: !!disabled }}
      hitSlop={size === 'sm' ? 6 : 0}
      style={({ pressed }) => [
        s.btn,
        { paddingVertical: pad },
        variant === 'primary' && s.btnPrimary,
        variant === 'ghost' && s.btnGhost,
        (pressed || disabled) && { opacity: 0.7 },
        style,
      ]}
    >
      <Text
        style={[
          s.btnText,
          { fontFamily: font.semibold, fontSize: size === 'lg' ? 17 : size === 'sm' ? 14 : 15 },
          variant === 'primary' && { color: ui.accentInk },
          variant === 'danger' && { color: ui.danger },
        ]}
      >
        {label}
      </Text>
    </Pressable>
  );
}

export function SectionTitle({ children, right }: { children: ReactNode; right?: ReactNode }) {
  const { font, row } = useT();
  return (
    <View style={[s.sectionTitle, { flexDirection: row }]}>
      <Text style={{ color: ui.text, fontFamily: font.semibold, fontSize: 17 }}>{children}</Text>
      {right}
    </View>
  );
}

export function Toaster() {
  const toasts = useToastStore((st) => st.toasts);
  const dismiss = useToastStore((st) => st.dismiss);
  const { font } = useT();
  if (toasts.length === 0) return null;
  return (
    <View pointerEvents="box-none" style={s.toaster}>
      {toasts.map((t) => (
        <Pressable
          key={t.id}
          onPress={() => dismiss(t.id)}
          style={[
            s.toast,
            t.tone === 'success' && { backgroundColor: ui.success },
            t.tone === 'error' && { backgroundColor: '#6b2626' },
          ]}
        >
          <Text style={{ color: ui.text, fontFamily: font.medium }}>{t.message}</Text>
        </Pressable>
      ))}
    </View>
  );
}

const s = StyleSheet.create({
  chip: {
    borderWidth: 1,
    borderColor: ui.lineStrong,
    backgroundColor: ui.bgElev,
    borderRadius: 999,
    paddingVertical: 10,
    paddingHorizontal: 14,
  },
  chipActive: { backgroundColor: ui.accent, borderColor: 'transparent' },
  chipAccent: { borderColor: ui.accent },
  chipText: { color: ui.text, fontSize: 14 },
  btn: {
    borderWidth: 1,
    borderColor: ui.line,
    backgroundColor: ui.bgElev,
    borderRadius: 12,
    paddingHorizontal: 16,
    alignItems: 'center',
    justifyContent: 'center',
  },
  btnPrimary: { backgroundColor: ui.accent, borderColor: 'transparent' },
  btnGhost: { backgroundColor: 'transparent' },
  btnText: { color: ui.text },
  sectionTitle: { justifyContent: 'space-between', alignItems: 'center', marginTop: 20, marginBottom: 10 },
  toaster: { position: 'absolute', left: 16, right: 16, bottom: 90, gap: 8 },
  toast: { backgroundColor: ui.bgElev2, borderRadius: 12, padding: 14 },
});
