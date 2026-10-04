import { Pressable, ScrollView, Text, View } from 'react-native';
import Svg, { Circle } from 'react-native-svg';
import { Image } from 'expo-image';
import {
  ARABIC_FONTS,
  BACKGROUNDS,
  FONT_SCALE_MAX,
  FONT_SCALE_MIN,
  LATIN_FONTS,
  THEMES,
} from '@barakah/core';
import { useEditorStore } from '../../store';
import { useT } from '../../i18n';
import { ui } from '../../theme';
import { GradientFill } from '../../components/Gradient';
import { DECORATIONS } from '../../components/Decorations';
import { BACKGROUND_THUMBS } from '../../backgrounds';
import { ARABIC_FACES, LATIN_FACES } from '../../fonts';
import { Button, Chip, SectionTitle } from '../../components/ui';

const pickRandom = <T,>(items: readonly T[]): T => items[Math.floor(Math.random() * items.length)];
const clamp = (n: number) => Math.min(FONT_SCALE_MAX, Math.max(FONT_SCALE_MIN, Math.round(n * 20) / 20));

export function StylePanel() {
  const { t, l, row, font } = useT();
  const design = useEditorStore((s) => s.design);
  const patch = useEditorStore((s) => s.patch);
  const reset = useEditorStore((s) => s.reset);
  const surprise = () =>
    patch({
      theme: pickRandom(THEMES).id,
      decoration: pickRandom(DECORATIONS.filter((d) => d.id !== 'none')).id,
      arabicFont: pickRandom(ARABIC_FONTS).id,
    });

  return (
    <View style={{ gap: 6 }}>
      <View style={{ flexDirection: row, gap: 8 }}>
        <Button label={`🎲 ${t('surprise')}`} size="sm" onPress={surprise} />
        <Button label={t('reset')} size="sm" variant="ghost" onPress={reset} />
      </View>

      <SectionTitle>{t('theme')}</SectionTitle>
      <View style={{ flexDirection: row, flexWrap: 'wrap', gap: 10 }}>
        {THEMES.map((th) => {
          const active = design.theme === th.id;
          return (
            <Pressable
              key={th.id}
              accessibilityRole="button"
              accessibilityLabel={l(th.name)}
              accessibilityState={{ selected: active }}
              onPress={() => patch({ theme: th.id })}
              style={{
                width: 48,
                height: 48,
                borderRadius: 12,
                overflow: 'hidden',
                borderWidth: 2,
                borderColor: active ? ui.accent : 'transparent',
              }}
            >
              <Svg width={42} height={42} viewBox="0 0 42 42">
                <GradientFill id={`sw-${th.id}`} gradient={th.gradient} width={42} height={42} />
                <Circle cx={21} cy={21} r={6} fill={th.accent} />
              </Svg>
            </Pressable>
          );
        })}
      </View>

      <SectionTitle>{t('photo')}</SectionTitle>
      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        contentContainerStyle={{ gap: 8, flexDirection: row }}
      >
        <Pressable
          onPress={() => patch({ background: 'none' })}
          accessibilityRole="button"
          accessibilityLabel={t('photoNone')}
          accessibilityState={{ selected: design.background === 'none' }}
          style={{
            width: 64,
            height: 114,
            borderRadius: 10,
            borderWidth: 2,
            borderColor: design.background === 'none' ? ui.accent : 'transparent',
            backgroundColor: ui.bg,
            alignItems: 'center',
            justifyContent: 'center',
          }}
        >
          <Text style={{ color: ui.textMuted, fontFamily: font.regular, fontSize: 12 }}>
            {t('photoNone')}
          </Text>
        </Pressable>
        {BACKGROUNDS.map((b) => (
          <Pressable
            key={b.id}
            accessibilityRole="button"
            accessibilityLabel={l(b.name)}
            accessibilityState={{ selected: design.background === b.id }}
            onPress={() => patch({ background: b.id })}
            style={{
              width: 64,
              height: 114,
              borderRadius: 10,
              overflow: 'hidden',
              borderWidth: 2,
              borderColor: design.background === b.id ? ui.accent : 'transparent',
            }}
          >
            <Image
              source={BACKGROUND_THUMBS[b.id]}
              accessible={false}
              style={{ width: '100%', height: '100%' }}
              contentFit="cover"
            />
          </Pressable>
        ))}
      </ScrollView>

      <SectionTitle>{t('decoration')}</SectionTitle>
      <View style={{ flexDirection: row, flexWrap: 'wrap', gap: 8 }}>
        {DECORATIONS.map((d) => (
          <Chip
            key={d.id}
            label={l(d.name)}
            active={design.decoration === d.id}
            onPress={() => patch({ decoration: d.id })}
          />
        ))}
      </View>

      <SectionTitle>{t('arabicFont')}</SectionTitle>
      <View style={{ flexDirection: row, flexWrap: 'wrap', gap: 8 }}>
        {ARABIC_FONTS.map((f) => (
          <Chip
            key={f.id}
            label={f.name.ar ?? f.name.en}
            fontFamily={ARABIC_FACES[f.id].regular}
            active={design.arabicFont === f.id}
            onPress={() => patch({ arabicFont: f.id })}
          />
        ))}
      </View>

      <SectionTitle>{t('latinFont')}</SectionTitle>
      <View style={{ flexDirection: row, gap: 8 }}>
        {LATIN_FONTS.map((f) => (
          <Chip
            key={f.id}
            label={f.name.en}
            fontFamily={f.italic ? LATIN_FACES[f.id].italic : LATIN_FACES[f.id].regular}
            active={design.latinFont === f.id}
            onPress={() => patch({ latinFont: f.id })}
          />
        ))}
      </View>

      <SectionTitle>{t('fontSize')}</SectionTitle>
      <View style={{ flexDirection: row, alignItems: 'center', gap: 12 }}>
        <Button
          label={`A−  ${t('fontSmaller')}`}
          size="sm"
          onPress={() => patch({ fontScale: clamp(design.fontScale - 0.1) })}
        />
        <Text style={{ color: ui.text, fontFamily: font.semibold, minWidth: 48, textAlign: 'center' }}>
          {Math.round(design.fontScale * 100)}%
        </Text>
        <Button
          label={`A+  ${t('fontLarger')}`}
          size="sm"
          onPress={() => patch({ fontScale: clamp(design.fontScale + 0.1) })}
        />
      </View>

      <SectionTitle>{t('align')}</SectionTitle>
      <View style={{ flexDirection: row, gap: 8 }}>
        <Chip
          label={t('alignCenter')}
          active={design.align === 'center'}
          onPress={() => patch({ align: 'center' })}
        />
        <Chip
          label={t('alignStart')}
          active={design.align === 'start'}
          onPress={() => patch({ align: 'start' })}
        />
      </View>
    </View>
  );
}
