import { Pressable, ScrollView, Text, View } from 'react-native';
import Svg, { Circle } from 'react-native-svg';
import { Image } from 'expo-image';
import {
  ARABIC_FONTS,
  BACKGROUNDS,
  FONT_SCALE_MAX,
  FONT_SCALE_MIN,
  FREE_ARABIC_FONTS,
  FREE_DECORATIONS,
  FREE_PHOTOS,
  FREE_THEMES,
  isFreeItem,
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
import { usePro, type ProReason } from '../../monetization/usePro';
import { ProLock } from '../../monetization/ProLock';

const pickRandom = <T,>(items: readonly T[]): T => items[Math.floor(Math.random() * items.length)];
const clamp = (n: number) => Math.min(FONT_SCALE_MAX, Math.max(FONT_SCALE_MIN, Math.round(n * 20) / 20));

/**
 * Theme, photo, decoration and fonts. Free users get the first few of each;
 * the rest carry a lock and open Pro instead of applying.
 */
export function StylePanel({ onLocked }: { onLocked: (reason: ProReason) => void }) {
  const { t, l, row, font } = useT();
  const { locked } = usePro();
  const design = useEditorStore((s) => s.design);
  const patch = useEditorStore((s) => s.patch);
  const reset = useEditorStore((s) => s.reset);
  /** Whether item `index` of a list with `free` free items is out of reach. */
  const isLocked = (index: number, free: number) => locked && !isFreeItem(index, free);
  const choose = (index: number, free: number, apply: () => void) => (isLocked(index, free) ? onLocked('style') : apply());
  const reachable = <T,>(items: readonly T[], free: number) => (locked ? items.slice(0, free) : items);
  const surprise = () =>
    patch({
      theme: pickRandom(reachable(THEMES, FREE_THEMES)).id,
      decoration: pickRandom(reachable(DECORATIONS, FREE_DECORATIONS).filter((d) => d.id !== 'none')).id,
      arabicFont: pickRandom(reachable(ARABIC_FONTS, FREE_ARABIC_FONTS)).id,
    });
  const lockMark = (index: number, free: number, label: string) => (isLocked(index, free) ? `🔒 ${label}` : label);

  return (
    <View style={{ gap: 6 }}>
      <View style={{ flexDirection: row, gap: 8 }}>
        <Button label={`🎲 ${t('surprise')}`} size="sm" onPress={surprise} />
        <Button label={t('reset')} size="sm" variant="ghost" onPress={reset} />
      </View>

      <SectionTitle>{t('theme')}</SectionTitle>
      <View style={{ flexDirection: row, flexWrap: 'wrap', gap: 10 }}>
        {THEMES.map((th, i) => {
          const active = design.theme === th.id;
          return (
            <Pressable
              key={th.id}
              accessibilityRole="button"
              accessibilityLabel={isLocked(i, FREE_THEMES) ? `${l(th.name)}, ${t('proOnly')}` : l(th.name)}
              accessibilityState={{ selected: active }}
              onPress={() => choose(i, FREE_THEMES, () => patch({ theme: th.id }))}
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
              {isLocked(i, FREE_THEMES) && <ProLock size={10} />}
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
        {BACKGROUNDS.map((b, i) => (
          <Pressable
            key={b.id}
            accessibilityRole="button"
            accessibilityLabel={isLocked(i, FREE_PHOTOS) ? `${l(b.name)}, ${t('proOnly')}` : l(b.name)}
            accessibilityState={{ selected: design.background === b.id }}
            onPress={() => choose(i, FREE_PHOTOS, () => patch({ background: b.id }))}
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
            {isLocked(i, FREE_PHOTOS) && <ProLock size={12} />}
          </Pressable>
        ))}
      </ScrollView>

      <SectionTitle>{t('decoration')}</SectionTitle>
      <View style={{ flexDirection: row, flexWrap: 'wrap', gap: 8 }}>
        {DECORATIONS.map((d, i) => (
          <Chip
            key={d.id}
            label={lockMark(i, FREE_DECORATIONS, l(d.name))}
            active={design.decoration === d.id}
            onPress={() => choose(i, FREE_DECORATIONS, () => patch({ decoration: d.id }))}
          />
        ))}
      </View>

      <SectionTitle>{t('arabicFont')}</SectionTitle>
      <View style={{ flexDirection: row, flexWrap: 'wrap', gap: 8 }}>
        {ARABIC_FONTS.map((f, i) => (
          <Chip
            key={f.id}
            label={lockMark(i, FREE_ARABIC_FONTS, f.name.ar ?? f.name.en)}
            fontFamily={ARABIC_FACES[f.id].regular}
            active={design.arabicFont === f.id}
            onPress={() => choose(i, FREE_ARABIC_FONTS, () => patch({ arabicFont: f.id }))}
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
