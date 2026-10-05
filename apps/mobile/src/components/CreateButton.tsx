import { useState, type ComponentProps } from 'react';
import { Modal, Pressable, Text, View } from 'react-native';
import { useRouter } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { DEFAULT_DESIGN, type TranslationKey } from '@barakah/core';
import { useT } from '../i18n';
import { ui } from '../theme';
import { useEditorStore } from '../store';

type Choice = 'image' | 'video';
const CHOICES: ReadonlyArray<{ id: Choice; icon: ComponentProps<typeof Ionicons>['name']; title: TranslationKey; desc: TranslationKey }> = [
  { id: 'image', icon: 'image', title: 'imageBg', desc: 'imageBgDesc' },
  { id: 'video', icon: 'videocam', title: 'videoBg', desc: 'videoBgDesc' },
];

/**
 * The floating "+" at the bottom-left of the main screens: a new story from scratch. It asks
 * one question — still or moving background — then opens the editor on the
 * tool for that choice.
 */
export function CreateButton() {
  const { t } = useT();
  const [open, setOpen] = useState(false);
  return (
    <>
      <Pressable
          onPress={() => setOpen(true)}
          accessibilityRole="button"
          accessibilityLabel={t('createTitle')}
          style={({ pressed }) => ({
            width: 60,
            height: 60,
            borderRadius: 30,
            backgroundColor: ui.accent,
            alignItems: 'center',
            justifyContent: 'center',
            transform: [{ scale: pressed ? 0.94 : 1 }],
            elevation: 6,
            shadowColor: '#000',
            shadowOpacity: 0.35,
            shadowRadius: 8,
            shadowOffset: { width: 0, height: 3 },
          })}
        >
          <Ionicons name="add" size={32} color={ui.accentInk} />
        </Pressable>
      <CreateSheet visible={open} onClose={() => setOpen(false)} />
    </>
  );
}

function CreateSheet({ visible, onClose }: { visible: boolean; onClose: () => void }) {
  const { t, font, row, textAlign } = useT();
  const insets = useSafeAreaInsets();
  const router = useRouter();
  const load = useEditorStore((s) => s.load);

  const pick = (choice: Choice) => {
    onClose();
    load({ ...DEFAULT_DESIGN });
    router.push({ pathname: '/editor', params: { start: choice } });
  };

  return (
    <Modal visible={visible} transparent animationType="slide" onRequestClose={onClose} statusBarTranslucent>
      <Pressable onPress={onClose} accessible={false} style={{ flex: 1, backgroundColor: 'rgba(0,0,0,0.55)' }} />
      <View
        accessibilityViewIsModal
        style={{ backgroundColor: ui.bgElev, borderTopLeftRadius: 22, borderTopRightRadius: 22, padding: 20, paddingBottom: insets.bottom + 20, gap: 12 }}
      >
        <Text accessibilityRole="header" style={{ color: ui.text, fontFamily: font.semibold, fontSize: 20, textAlign }}>
          {t('createTitle')}
        </Text>
        {CHOICES.map((c) => (
          <Pressable
            key={c.id}
            onPress={() => pick(c.id)}
            accessibilityRole="button"
            accessibilityLabel={`${t(c.title)}. ${t(c.desc)}`}
            style={({ pressed }) => ({
              flexDirection: row,
              alignItems: 'center',
              gap: 14,
              padding: 16,
              borderRadius: ui.radius,
              borderWidth: 1,
              borderColor: ui.lineStrong,
              backgroundColor: pressed ? ui.bgElev2 : ui.bg,
            })}
          >
            <View style={{ width: 48, height: 48, borderRadius: 24, backgroundColor: 'rgba(217,182,92,0.15)', alignItems: 'center', justifyContent: 'center' }}>
              <Ionicons name={c.icon} size={24} color={ui.accent} />
            </View>
            <View style={{ flex: 1 }}>
              <Text style={{ color: ui.text, fontFamily: font.semibold, fontSize: 16, textAlign }}>{t(c.title)}</Text>
              <Text style={{ color: ui.textMuted, fontFamily: font.regular, fontSize: 13, textAlign }}>{t(c.desc)}</Text>
            </View>
            <Ionicons name={row === 'row' ? 'chevron-forward' : 'chevron-back'} size={18} color={ui.textMuted} />
          </Pressable>
        ))}
      </View>
    </Modal>
  );
}
