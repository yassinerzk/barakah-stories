import { cloneElement, isValidElement, type ReactElement } from 'react';
import { Switch, Text, TextInput, View } from 'react-native';
import type { TranslationKey } from '@barakah/core';
import { useEditorStore } from '../../store';
import { useT } from '../../i18n';
import { ui } from '../../theme';

/**
 * A visible label above an input. The label is also handed to the input itself,
 * so a screen reader announces "Headline, edit box" rather than just "edit box".
 */
function Field({ label, children }: { label: string; children: React.ReactNode }) {
  const { font, textAlign } = useT();
  const labelled = isValidElement(children)
    ? cloneElement(children as ReactElement<{ accessibilityLabel?: string }>, { accessibilityLabel: label })
    : children;
  return (
    <View style={{ gap: 6 }}>
      <Text
        style={{ color: ui.textMuted, fontFamily: font.regular, fontSize: 13, textAlign }}
        importantForAccessibility="no"
        accessibilityElementsHidden
      >
        {label}
      </Text>
      {labelled}
    </View>
  );
}

const inputStyle = {
  backgroundColor: ui.bg,
  borderWidth: 1,
  borderColor: ui.lineStrong,
  borderRadius: 10,
  paddingHorizontal: 12,
  paddingVertical: 10,
  color: ui.text,
  fontSize: 16,
} as const;

export function TextPanel() {
  const { t, font, row } = useT();
  const design = useEditorStore((s) => s.design);
  const patch = useEditorStore((s) => s.patch);
  const toggles: Array<[TranslationKey, keyof typeof design]> = [
    ['showTranslation', 'showTranslation'],
    ['showSource', 'showSource'],
    ['showHijriDate', 'showHijriDate'],
    ['showFrame', 'showFrame'],
  ];
  return (
    <View style={{ gap: 14 }}>
      <Field label={t('headline')}>
        <TextInput
          value={design.headline}
          placeholder={t('headlinePlaceholder')}
          placeholderTextColor={ui.textMuted}
          onChangeText={(v) => patch({ headline: v })}
          style={[inputStyle, { fontFamily: 'Cairo_400Regular', textAlign: 'right' }]}
        />
      </Field>
      <Field label={t('arabicText')}>
        <TextInput
          value={design.arabic}
          multiline
          onChangeText={(v) => patch({ arabic: v })}
          style={[
            inputStyle,
            {
              fontFamily: 'Amiri_400Regular',
              fontSize: 20,
              lineHeight: 34,
              minHeight: 110,
              textAlign: 'right',
              textAlignVertical: 'top',
            },
          ]}
        />
      </Field>
      <Field label={t('translation')}>
        <TextInput
          value={design.translation}
          multiline
          onChangeText={(v) => patch({ translation: v })}
          style={[inputStyle, { fontFamily: font.regular, minHeight: 80, textAlignVertical: 'top' }]}
        />
      </Field>
      <Field label={t('source')}>
        <TextInput
          value={design.source}
          onChangeText={(v) => patch({ source: v })}
          style={[inputStyle, { fontFamily: font.regular }]}
        />
      </Field>
      <Field label={t('footer')}>
        <TextInput
          value={design.footer}
          placeholder={t('footerPlaceholder')}
          placeholderTextColor={ui.textMuted}
          onChangeText={(v) => patch({ footer: v })}
          style={[inputStyle, { fontFamily: font.regular }]}
        />
      </Field>
      <View style={{ gap: 4 }}>
        {toggles.map(([key, field]) => (
          <View
            key={key}
            style={{
              flexDirection: row,
              justifyContent: 'space-between',
              alignItems: 'center',
              paddingVertical: 6,
            }}
          >
            <Text style={{ color: ui.text, fontFamily: font.regular, fontSize: 15 }}>{t(key)}</Text>
            <Switch
              value={design[field] as boolean}
              onValueChange={(v) => patch({ [field]: v })}
              accessibilityLabel={t(key)}
              trackColor={{ true: ui.accent, false: ui.bg }}
              thumbColor={design[field] ? ui.accentInk : ui.textMuted}
            />
          </View>
        ))}
      </View>
    </View>
  );
}
