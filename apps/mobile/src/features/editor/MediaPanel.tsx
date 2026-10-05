import { useEffect, useState } from 'react';
import { ActivityIndicator, Pressable, ScrollView, Text, View } from 'react-native';
import { Image } from 'expo-image';
import { Ionicons } from '@expo/vector-icons';
import { useAudioPlayer, type AudioPlayer } from 'expo-audio';
import { SOUND_GROUPS, STORY_LENGTHS, toLocaleDigits, type MediaSound, type MediaVideo } from '@barakah/core';
import { useEditorStore } from '../../store';
import { useT } from '../../i18n';
import { ui } from '../../theme';
import { remoteUrl, useMediaStore } from '../../media/catalog';
import { Chip } from '../../components/ui';

/** Loops and plays a player. A plain function, so the React Compiler sees no mutation of hook state. */
function playLooping(p: AudioPlayer): void {
  p.loop = true;
  p.play();
}


function useCatalog() {
  const manifest = useMediaStore((s) => s.manifest);
  const status = useMediaStore((s) => s.status);
  const load = useMediaStore((s) => s.load);
  useEffect(() => {
    if (status === 'idle') void load();
  }, [status, load]);
  return { manifest, status };
}

function Notice({ status }: { status: string }) {
  const { t, font, textAlign } = useT();
  if (status === 'loading') return <ActivityIndicator color={ui.accent} style={{ padding: 24 }} />;
  return (
    <Text style={{ color: ui.textMuted, fontFamily: font.regular, padding: 16, textAlign }}>{t('mediaOffline')}</Text>
  );
}

/** Grid of looping backgrounds. Picking one downloads it (once) and switches the story to video. */
export function VideoPanel() {
  const { t, l } = useT();
  const { manifest, status } = useCatalog();
  const design = useEditorStore((s) => s.design);
  const patch = useEditorStore((s) => s.patch);
  const ensure = useMediaStore((s) => s.ensure);
  const downloading = useMediaStore((s) => s.downloading);
  if (!manifest) return <Notice status={status} />;

  const pick = (v: MediaVideo) => {
    patch({ video: v.id });
    void ensure(v);
  };
  return (
    <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 8 }}>
      {manifest.videos.map((v) => {
        const active = design.video === v.id;
        return (
          <Pressable
            key={v.id}
            onPress={() => pick(v)}
            accessibilityRole="button"
            accessibilityLabel={l(v.name)}
            accessibilityState={{ selected: active }}
            style={{
              width: 96,
              height: 170,
              borderRadius: 12,
              overflow: 'hidden',
              borderWidth: 2,
              borderColor: active ? ui.accent : 'transparent',
            }}
          >
            <Image source={{ uri: remoteUrl(v.poster) }} accessible={false} style={{ flex: 1 }} contentFit="cover" />
            {downloading[v.file] && (
              <View style={{ position: 'absolute', inset: 0, alignItems: 'center', justifyContent: 'center', backgroundColor: 'rgba(0,0,0,0.4)' }}>
                <ActivityIndicator color="#fff" />
              </View>
            )}
          </Pressable>
        );
      })}
      <Chip label={t('imageBg')} onPress={() => patch({ video: null })} active={!design.video} />
    </View>
  );
}

/** Nature and Islamic sounds, each with a play button to listen before choosing. */
export function SoundPanel() {
  const { t, l, font, row, textAlign } = useT();
  const { manifest, status } = useCatalog();
  const design = useEditorStore((s) => s.design);
  const patch = useEditorStore((s) => s.patch);
  const ensure = useMediaStore((s) => s.ensure);
  const local = useMediaStore((s) => s.local);
  const downloading = useMediaStore((s) => s.downloading);
  const [previewing, setPreviewing] = useState<string | null>(null);
  const previewSound = manifest?.sounds.find((s) => s.id === previewing);
  const previewUri = previewSound ? (local[previewSound.file] ?? remoteUrl(previewSound.file)) : null;
  const player = useAudioPlayer(previewUri);

  useEffect(() => {
    if (previewUri) playLooping(player);
  }, [player, previewUri]);
  // No pause-on-unmount: useAudioPlayer releases (and silences) the player itself,
  // and calling it after release throws.

  if (!manifest) return <Notice status={status} />;

  const choose = (s: MediaSound | null) => {
    patch({ sound: s?.id ?? null });
    if (s) void ensure(s);
  };
  const toggle = (s: MediaSound) => {
    if (previewing === s.id) {
      player.pause();
      setPreviewing(null);
    } else {
      setPreviewing(s.id);
    }
  };

  const rowStyle = (active: boolean) => ({
    flexDirection: row,
    alignItems: 'center' as const,
    gap: 10,
    minHeight: 52,
    paddingStart: 14,
    paddingEnd: 4,
    borderRadius: ui.radius,
    borderWidth: 1,
    borderColor: active ? ui.accent : ui.line,
    backgroundColor: active ? 'rgba(217,182,92,0.12)' : 'transparent',
  });

  return (
    <View style={{ gap: 8 }}>
      <Pressable onPress={() => choose(null)} accessibilityRole="radio" accessibilityState={{ checked: !design.sound }} style={rowStyle(!design.sound)}>
        <Ionicons name="volume-mute" size={18} color={ui.textMuted} importantForAccessibility="no" />
        <Text style={{ flex: 1, color: ui.text, fontFamily: font.medium, textAlign }}>{t('noSound')}</Text>
      </Pressable>
      {SOUND_GROUPS.map((group) => (
        <View key={group} style={{ gap: 6 }}>
          <Text accessibilityRole="header" style={{ color: ui.textMuted, fontFamily: font.semibold, fontSize: 13, marginTop: 8, textAlign }}>
            {t(group === 'nature' ? 'natureSounds' : 'islamicSounds')}
          </Text>
          {manifest.sounds
            .filter((s) => s.group === group)
            .map((s) => {
              const active = design.sound === s.id;
              return (
                <View key={s.id} style={rowStyle(active)}>
                  <Pressable
                    onPress={() => choose(s)}
                    accessibilityRole="radio"
                    accessibilityState={{ checked: active }}
                    accessibilityLabel={l(s.name)}
                    style={{ flex: 1, minHeight: 48, justifyContent: 'center' }}
                  >
                    <Text style={{ color: ui.text, fontFamily: active ? font.semibold : font.regular, fontSize: 15, textAlign }}>
                      {l(s.name)}
                    </Text>
                  </Pressable>
                  {downloading[s.file] ? (
                    <ActivityIndicator color={ui.accent} style={{ width: 48 }} />
                  ) : (
                    <Pressable
                      onPress={() => toggle(s)}
                      accessibilityRole="button"
                      accessibilityLabel={`${previewing === s.id ? t('stopAdhan') : t('playAdhan').split(' ')[0]} ${l(s.name)}`}
                      style={{ width: 48, height: 48, alignItems: 'center', justifyContent: 'center' }}
                    >
                      <Ionicons name={previewing === s.id ? 'stop-circle' : 'play-circle'} size={28} color={ui.accent} />
                    </Pressable>
                  )}
                </View>
              );
            })}
        </View>
      ))}
    </View>
  );
}

/** 10, 15 or 30 seconds. */
export function LengthPanel() {
  const { t, locale, row } = useT();
  const lengthSec = useEditorStore((s) => s.design.lengthSec);
  const patch = useEditorStore((s) => s.patch);
  return (
    <ScrollView horizontal contentContainerStyle={{ flexDirection: row, gap: 8 }}>
      {STORY_LENGTHS.map((n) => (
        <Chip
          key={n}
          label={`${toLocaleDigits(n, locale)} ${t('secondsShort')}`}
          active={lengthSec === n}
          onPress={() => patch({ lengthSec: n })}
        />
      ))}
    </ScrollView>
  );
}
