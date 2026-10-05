import { useEffect, useRef, useState, type ComponentProps } from 'react';
import {
  KeyboardAvoidingView,
  Modal,
  Platform,
  Pressable,
  ScrollView,
  Text,
  useWindowDimensions,
  View,
} from 'react-native';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { useAudioPlayer, type AudioPlayer } from 'expo-audio';
import { designToText, shouldShowWatermark, toLocaleDigits, type TranslationKey } from '@barakah/core';
import { useEntitlementStore } from '../src/monetization/store';
import { WatermarkRow } from '../src/features/editor/WatermarkRow';
import { useT } from '../src/i18n';
import { ui } from '../src/theme';
import { useEditorStore, useLibraryStore, useToastStore } from '../src/store';
import { useHijriToday } from '../src/hooks/useHijriToday';
import { StoryCard } from '../src/components/StoryCard';
import { TextPanel } from '../src/features/editor/TextPanel';
import { StylePanel } from '../src/features/editor/StylePanel';
import { LengthPanel, SoundPanel, VideoPanel } from '../src/features/editor/MediaPanel';
import { copyText, shareCard, shareVideoStory } from '../src/lib/share';
import { findSound, findVideo, useMediaStore } from '../src/media/catalog';
import { videoExportSupported } from '../modules/video-composer';

/** Loops and plays a player. A plain function, so the React Compiler sees no mutation of hook state. */
function playLooping(p: AudioPlayer): void {
  p.loop = true;
  p.play();
}


type Tool = 'text' | 'style' | 'video' | 'sound' | 'length';
type IconName = ComponentProps<typeof Ionicons>['name'];

const TOOLS: ReadonlyArray<{ id: Tool; icon: IconName; label: TranslationKey; videoOnly?: boolean }> = [
  { id: 'text', icon: 'text', label: 'text' },
  { id: 'style', icon: 'color-palette', label: 'style' },
  { id: 'video', icon: 'videocam', label: 'video' },
  { id: 'sound', icon: 'musical-notes', label: 'sound' },
  { id: 'length', icon: 'timer', label: 'length', videoOnly: true },
];
const BOTTOM_BAR = 76;

/**
 * The story editor, laid out like a story app: the story fills the screen,
 * tools float on a rail at the side, and each tool opens in a sheet over the
 * story so the result stays visible while it is being edited.
 */
export default function EditorScreen() {
  const { t, font, locale } = useT();
  const insets = useSafeAreaInsets();
  const router = useRouter();
  const { width: winW, height: winH } = useWindowDimensions();
  const { start } = useLocalSearchParams<{ start?: string }>();
  const { label: hijriLabel } = useHijriToday();
  const design = useEditorStore((s) => s.design);
  const savedId = useEditorStore((s) => s.savedId);
  const setSavedId = useEditorStore((s) => s.setSavedId);
  const upsert = useLibraryStore((s) => s.upsert);
  const toast = useToastStore((s) => s.show);
  const entitlements = useEntitlementStore((s) => s.entitlements);
  const showWatermark = shouldShowWatermark(design.hideWatermark, entitlements);

  const manifest = useMediaStore((s) => s.manifest);
  const local = useMediaStore((s) => s.local);
  const loadMedia = useMediaStore((s) => s.load);
  const ensure = useMediaStore((s) => s.ensure);
  const video = findVideo(manifest, design.video);
  const sound = findSound(manifest, design.sound);
  const videoUri = video ? (local[video.file] ?? null) : null;
  const soundUri = sound ? (local[sound.file] ?? null) : null;

  const cardRef = useRef<View>(null);
  const overlayRef = useRef<View>(null);
  const [tool, setTool] = useState<Tool | null>(start === 'video' ? 'video' : start === 'image' ? 'style' : null);
  const [busy, setBusy] = useState(false);
  const [progress, setProgress] = useState<number | null>(null);
  const [muted, setMuted] = useState(false);

  // The library is fetched once; the chosen clip and sound download in the background.
  useEffect(() => {
    void loadMedia();
  }, [loadMedia]);
  useEffect(() => {
    if (video && !videoUri) void ensure(video);
    if (sound && !soundUri) void ensure(sound);
  }, [video, sound, videoUri, soundUri, ensure]);

  // The chosen sound plays while editing, like a story app; the speaker button mutes it.
  const player = useAudioPlayer(design.video && soundUri ? soundUri : null);
  useEffect(() => {
    if (!design.video || !soundUri || muted || busy) {
      player.pause();
      return;
    }
    playLooping(player);
  }, [player, design.video, soundUri, muted, busy]);

  // The story at the largest 9:16 size that fits between the top inset and the share bar.
  const availH = winH - insets.top - insets.bottom - BOTTOM_BAR - 12;
  const cardH = Math.min(availH, ((winW - 16) * 16) / 9);
  const cardW = (cardH * 9) / 16;

  const isVideo = design.video !== null;
  const tools = TOOLS.filter((x) => !x.videoOnly || isVideo);

  const save = () => {
    const saved = upsert(design, savedId);
    setSavedId(saved.id);
    toast(t('saved'), 'success');
  };
  const copy = async () => toast((await copyText(designToText(design))) ? t('copied') : t('shareFailed'));

  const share = async () => {
    if (busy) return;
    setBusy(true);
    try {
      if (!isVideo) {
        const outcome = await shareCard(cardRef, design.headline || 'Story');
        if (outcome === 'unavailable') toast(t('shareFailedMobile'), 'error');
        return;
      }
      if (!videoExportSupported) {
        toast(t('videoAndroidOnly'), 'error');
        return;
      }
      const bg = video ? await ensure(video) : null;
      const snd = sound ? await ensure(sound) : null;
      if (!bg || !video || (sound && !snd)) {
        toast(t('mediaOffline'), 'error');
        return;
      }
      setProgress(0);
      const outcome = await shareVideoStory(
        overlayRef,
        { backgroundUri: bg, soundUri: snd, lengthSec: design.lengthSec, clipDurationMs: video.durationMs, title: design.headline || 'Story' },
        setProgress,
      );
      if (outcome === 'unavailable') toast(t('shareFailedMobile'), 'error');
    } catch {
      toast(isVideo ? t('videoFailed') : t('shareFailed'), 'error');
    } finally {
      setProgress(null);
      setBusy(false);
    }
  };

  const shareLabel = busy ? t('preparing') : isVideo ? t('shareVideo') : t('useThisStory');

  return (
    <View style={{ flex: 1, backgroundColor: '#000', paddingTop: insets.top + 6, paddingBottom: insets.bottom }}>
      {/* the story, full height */}
      <View style={{ alignSelf: 'center', width: cardW, height: cardH, borderRadius: 18, overflow: 'hidden' }}>
        <StoryCard
          ref={cardRef}
          design={design}
          width={cardW}
          hijriLabel={hijriLabel}
          showWatermark={showWatermark}
          videoUri={videoUri}
        />

        {/* top bar over the story */}
        <View style={{ position: 'absolute', top: 10, left: 10, right: 10, flexDirection: 'row', justifyContent: 'space-between' }}>
          <RoundButton icon="close" label={t('close')} onPress={() => router.back()} />
          <View style={{ flexDirection: 'row', gap: 8 }}>
            {isVideo && sound && (
              <RoundButton
                icon={muted ? 'volume-mute' : 'volume-high'}
                label={t('sound')}
                onPress={() => setMuted((m) => !m)}
              />
            )}
            <RoundButton icon="copy-outline" label={t('copyText')} onPress={copy} />
            <RoundButton icon="bookmark-outline" label={t('save')} onPress={save} />
          </View>
        </View>

        {/* tool rail */}
        <View accessibilityRole="toolbar" style={{ position: 'absolute', right: 10, top: 70, gap: 14, alignItems: 'center' }}>
          {tools.map((x) => (
            <Pressable
              key={x.id}
              onPress={() => setTool(x.id)}
              accessibilityRole="button"
              accessibilityLabel={t(x.label)}
              style={{ alignItems: 'center', gap: 3 }}
            >
              <View
                style={{
                  width: 44,
                  height: 44,
                  borderRadius: 22,
                  backgroundColor: 'rgba(0,0,0,0.45)',
                  alignItems: 'center',
                  justifyContent: 'center',
                }}
              >
                <Ionicons name={x.icon} size={22} color="#fff" />
              </View>
              <Text style={{ color: '#fff', fontFamily: font.medium, fontSize: 11, textShadowColor: '#000', textShadowRadius: 4 }}>
                {x.id === 'length' ? `${toLocaleDigits(design.lengthSec, locale)}${t('secondsShort')}` : t(x.label)}
              </Text>
            </Pressable>
          ))}
        </View>
      </View>

      {/* share bar */}
      <View style={{ height: BOTTOM_BAR, flexDirection: 'row', alignItems: 'center', justifyContent: 'flex-end', paddingHorizontal: 16 }}>
        <Pressable
          onPress={share}
          disabled={busy}
          accessibilityRole="button"
          accessibilityState={{ disabled: busy, busy }}
          style={({ pressed }) => ({
            flexDirection: 'row',
            alignItems: 'center',
            gap: 8,
            backgroundColor: ui.accent,
            paddingHorizontal: 22,
            minHeight: 50,
            borderRadius: 999,
            opacity: pressed || busy ? 0.75 : 1,
          })}
        >
          <Text style={{ color: ui.accentInk, fontFamily: font.semibold, fontSize: 16 }}>
            {progress !== null ? `${t('rendering')} ${toLocaleDigits(Math.round(progress * 100), locale)}%` : shareLabel}
          </Text>
          <Ionicons name="arrow-forward" size={18} color={ui.accentInk} />
        </Pressable>
      </View>

      {/* Off-screen: the text layer alone, captured as the video overlay. */}
      {isVideo && (
        <View pointerEvents="none" importantForAccessibility="no-hide-descendants" style={{ position: 'absolute', left: -10000, top: 0 }}>
          <StoryCard ref={overlayRef} design={design} width={360} hijriLabel={hijriLabel} showWatermark={showWatermark} transparent />
        </View>
      )}

      <ToolSheet tool={tool} onClose={() => setTool(null)} />
    </View>
  );
}

function RoundButton({ icon, label, onPress }: { icon: IconName; label: string; onPress: () => void }) {
  return (
    <Pressable
      onPress={onPress}
      accessibilityRole="button"
      accessibilityLabel={label}
      hitSlop={6}
      style={{ width: 40, height: 40, borderRadius: 20, backgroundColor: 'rgba(0,0,0,0.45)', alignItems: 'center', justifyContent: 'center' }}
    >
      <Ionicons name={icon} size={20} color="#fff" />
    </Pressable>
  );
}

const SHEET_TITLE: Record<Tool, TranslationKey> = { text: 'text', style: 'style', video: 'video', sound: 'sound', length: 'length' };

/** One tool's panel in a sheet over the lower half of the screen. */
function ToolSheet({ tool, onClose }: { tool: Tool | null; onClose: () => void }) {
  const { t, font, textAlign } = useT();
  const insets = useSafeAreaInsets();
  const { height } = useWindowDimensions();
  return (
    <Modal visible={tool !== null} transparent animationType="slide" onRequestClose={onClose} statusBarTranslucent>
      <Pressable onPress={onClose} accessible={false} style={{ flex: 1 }} />
      <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
        <View
          accessibilityViewIsModal
          style={{
            maxHeight: height * (tool === 'text' ? 0.7 : 0.55),
            backgroundColor: ui.bgElev,
            borderTopLeftRadius: 20,
            borderTopRightRadius: 20,
            paddingTop: 10,
            paddingBottom: insets.bottom + 12,
          }}
        >
          <View style={{ alignSelf: 'center', width: 40, height: 4, borderRadius: 2, backgroundColor: ui.lineStrong, marginBottom: 8 }} />
          <View style={{ flexDirection: 'row', alignItems: 'center', paddingHorizontal: 16, marginBottom: 6 }}>
            <Text accessibilityRole="header" style={{ flex: 1, color: ui.text, fontFamily: font.semibold, fontSize: 17, textAlign }}>
              {tool ? t(SHEET_TITLE[tool]) : ''}
            </Text>
            <Pressable onPress={onClose} accessibilityRole="button" accessibilityLabel={t('close')} style={{ width: 44, height: 44, alignItems: 'center', justifyContent: 'center' }}>
              <Ionicons name="checkmark" size={24} color={ui.accent} />
            </Pressable>
          </View>
          <ScrollView contentContainerStyle={{ paddingHorizontal: 16, paddingBottom: 12, gap: 12 }} keyboardShouldPersistTaps="handled">
            {tool === 'text' && <TextPanel />}
            {tool === 'style' && (
              <>
                <StylePanel />
                <WatermarkRow />
              </>
            )}
            {tool === 'video' && <VideoPanel />}
            {tool === 'sound' && <SoundPanel />}
            {tool === 'length' && <LengthPanel />}
          </ScrollView>
        </View>
      </KeyboardAvoidingView>
    </Modal>
  );
}
