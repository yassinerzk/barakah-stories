import { useEffect, useState } from 'react';
import { Text, View } from 'react-native';
import { toLocaleDigits, type Locale } from '@barakah/core';
import { useT } from '../../i18n';
import { ui } from '../../theme';

interface Props {
  name: string;
  /** The adhan time, already formatted. */
  time: string;
  at: Date;
  /** Spoken summary with minute precision; the ticking seconds stay visual only. */
  accessibilityLabel: string;
}

/**
 * The next prayer with a live H:MM:SS countdown. It owns its one-second timer,
 * so only this card redraws every second, not the whole prayer screen.
 */
export function NextPrayerCountdown({ name, time, at, accessibilityLabel }: Props) {
  const { t, locale, font, row, textAlign } = useT();
  const [now, setNow] = useState(() => Date.now());
  useEffect(() => {
    const id = setInterval(() => setNow(Date.now()), 1000);
    return () => clearInterval(id);
  }, []);

  return (
    <View
      accessible
      accessibilityLabel={accessibilityLabel}
      style={{
        backgroundColor: ui.bgElev2,
        borderRadius: ui.radius,
        paddingVertical: 18,
        paddingHorizontal: 16,
        marginTop: 12,
        borderWidth: 1,
        borderColor: 'rgba(217,182,92,0.30)',
        alignItems: 'center',
        gap: 4,
      }}
    >
      <Text style={{ color: ui.textMuted, fontFamily: font.medium, fontSize: 14 }}>
        {t('nextPrayer')} · {name}
      </Text>
      <Text style={{ color: ui.accent, fontFamily: font.semibold, fontSize: 40, fontVariant: ['tabular-nums'] }}>
        {clock(at.getTime() - now, locale)}
      </Text>
      <View style={{ flexDirection: row, alignItems: 'center', gap: 6 }}>
        <View style={{ width: 28, height: 1, backgroundColor: ui.line }} />
        <Text style={{ color: ui.text, fontFamily: font.regular, fontSize: 14, textAlign, fontVariant: ['tabular-nums'] }}>{time}</Text>
        <View style={{ width: 28, height: 1, backgroundColor: ui.line }} />
      </View>
    </View>
  );
}

function clock(ms: number, locale: Locale): string {
  const total = Math.max(0, Math.floor(ms / 1000));
  const h = Math.floor(total / 3600);
  const m = Math.floor((total % 3600) / 60);
  const s = total % 60;
  const pad = (n: number) => String(n).padStart(2, '0');
  return `${h}:${pad(m)}:${pad(s)}`.replace(/\d/g, (d) => toLocaleDigits(Number(d), locale));
}
