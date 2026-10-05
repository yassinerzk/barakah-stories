import { useDeferredValue, useMemo, useState } from 'react';
import { FlatList, Modal, Pressable, Text, TextInput, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import {
  decodeCities,
  searchCities,
  searchCountries,
  tagOf,
  type CountryEntry,
  type GeoCity,
  type Locale,
} from '@barakah/core';
import { useT } from '../../i18n';
import { ui } from '../../theme';
import { CITY_LOADERS } from '../../geo/cityLoaders.generated';
import type { PrayerLocation } from '../../store';

// eslint-disable-next-line @typescript-eslint/no-require-imports
const COUNTRIES: CountryEntry[] = require('../../../../../packages/assets/geo/countries.json');

/**
 * Country names in the reader's language where the platform can supply them
 * (Intl.DisplayNames), else GeoNames' English name. Never blank.
 */
function countryNamer(locale: Locale): (cc: string) => string {
  const english = new Map(COUNTRIES.map((c) => [c.cc, c.name]));
  let display: Intl.DisplayNames | null = null;
  try {
    display = new Intl.DisplayNames([tagOf(locale)], { type: 'region' });
  } catch {
    display = null;
  }
  return (cc) => {
    try {
      const local = display?.of(cc);
      if (local && local !== cc) return local;
    } catch {
      // Unknown region code for this platform: fall through.
    }
    return english.get(cc) ?? cc;
  };
}

interface Props {
  visible: boolean;
  onClose: () => void;
  onPick: (location: PrayerLocation) => void;
  onUseMyLocation: () => void;
  locating: boolean;
}

export function LocationSheet({ visible, onClose, onPick, onUseMyLocation, locating }: Props) {
  const { t, locale, font, row, textAlign } = useT();
  const insets = useSafeAreaInsets();
  const [country, setCountry] = useState<CountryEntry | null>(null);
  const [query, setQuery] = useState('');
  const nameOf = useMemo(() => countryNamer(locale), [locale]);
  // Typing stays responsive; filtering a large country catches up a frame later.
  const deferredQuery = useDeferredValue(query);

  const cities = useMemo<GeoCity[]>(() => {
    if (!country) return [];
    const load = CITY_LOADERS[country.cc];
    return load ? decodeCities(country.cc, load()) : [];
  }, [country]);

  const countryRows = useMemo(() => {
    const list = searchCountries(COUNTRIES, deferredQuery, nameOf);
    return [...list].sort((a, b) => nameOf(a.cc).localeCompare(nameOf(b.cc), tagOf(locale)));
  }, [deferredQuery, nameOf, locale]);
  const cityRows = useMemo(() => searchCities(cities, deferredQuery), [cities, deferredQuery]);

  const close = () => {
    setCountry(null);
    setQuery('');
    onClose();
  };
  const back = () => {
    setCountry(null);
    setQuery('');
  };
  const pickCity = (c: GeoCity) => {
    onPick({ lat: c.lat, lng: c.lng, label: `${c.name}, ${nameOf(c.cc)}`, timeZone: c.timeZone });
    close();
  };

  const rowStyle = {
    flexDirection: row,
    alignItems: 'center' as const,
    justifyContent: 'space-between' as const,
    minHeight: 52,
    paddingVertical: 12,
    paddingHorizontal: 16,
    borderBottomWidth: 1,
    borderBottomColor: ui.line,
  };

  return (
    <Modal visible={visible} animationType="slide" onRequestClose={country ? back : close} statusBarTranslucent>
      <View style={{ flex: 1, backgroundColor: ui.bg, paddingTop: insets.top }}>
        {/* header */}
        <View style={{ flexDirection: row, alignItems: 'center', padding: 8, gap: 4 }}>
          <Pressable
            onPress={country ? back : close}
            accessibilityRole="button"
            accessibilityLabel={country ? t('back') : t('close')}
            style={{ width: 48, height: 48, alignItems: 'center', justifyContent: 'center' }}
          >
            <Ionicons name={country ? 'arrow-back' : 'close'} size={24} color={ui.text} />
          </Pressable>
          <Text
            accessibilityRole="header"
            style={{ flex: 1, color: ui.text, fontFamily: font.semibold, fontSize: 18, textAlign }}
            numberOfLines={1}
          >
            {country ? nameOf(country.cc) : t('chooseCountry')}
          </Text>
        </View>

        {/* search */}
        <View
          style={{
            flexDirection: row,
            alignItems: 'center',
            marginHorizontal: 16,
            marginBottom: 8,
            paddingHorizontal: 12,
            backgroundColor: ui.bgElev,
            borderRadius: ui.radius,
            borderWidth: 1,
            borderColor: ui.line,
          }}
        >
          <Ionicons name="search" size={18} color={ui.textMuted} importantForAccessibility="no" />
          <TextInput
            value={query}
            onChangeText={setQuery}
            placeholder={country ? t('searchCity') : t('searchCountry')}
            placeholderTextColor={ui.textMuted}
            accessibilityLabel={country ? t('searchCity') : t('searchCountry')}
            autoCorrect={false}
            style={{ flex: 1, color: ui.text, fontFamily: font.regular, fontSize: 16, minHeight: 48, paddingHorizontal: 8, textAlign }}
          />
          {query.length > 0 && (
            <Pressable
              onPress={() => setQuery('')}
              accessibilityRole="button"
              accessibilityLabel={t('clearSearch')}
              style={{ width: 44, height: 44, alignItems: 'center', justifyContent: 'center' }}
            >
              <Ionicons name="close-circle" size={20} color={ui.textMuted} />
            </Pressable>
          )}
        </View>

        {!country && (
          <Pressable
            onPress={() => {
              onUseMyLocation();
              close();
            }}
            disabled={locating}
            accessibilityRole="button"
            style={{ ...rowStyle, justifyContent: 'flex-start', gap: 12, borderTopWidth: 1, borderTopColor: ui.line }}
          >
            <Ionicons name="locate" size={22} color={ui.accent} importantForAccessibility="no" />
            <Text style={{ color: ui.accent, fontFamily: font.semibold, fontSize: 16 }}>
              {locating ? t('locating') : t('useMyLocation')}
            </Text>
          </Pressable>
        )}

        {country ? (
          <FlatList
            data={cityRows}
            keyExtractor={(c) => c.id}
            keyboardShouldPersistTaps="handled"
            initialNumToRender={20}
            ListEmptyComponent={<Empty label={t('noMatches')} />}
            renderItem={({ item }) => (
              <Pressable
                onPress={() => pickCity(item)}
                accessibilityRole="button"
                accessibilityLabel={item.region ? `${item.name}, ${item.region}` : item.name}
                style={({ pressed }) => [rowStyle, pressed && { backgroundColor: ui.bgElev }]}
              >
                <View style={{ flex: 1 }}>
                  <Text style={{ color: ui.text, fontFamily: font.medium, fontSize: 16, textAlign }}>{item.name}</Text>
                  {!!item.region && (
                    <Text style={{ color: ui.textMuted, fontFamily: font.regular, fontSize: 13, textAlign }}>{item.region}</Text>
                  )}
                </View>
              </Pressable>
            )}
          />
        ) : (
          <FlatList
            data={countryRows}
            keyExtractor={(c) => c.cc}
            keyboardShouldPersistTaps="handled"
            initialNumToRender={20}
            ListEmptyComponent={<Empty label={t('noMatches')} />}
            ListFooterComponent={
              <Text style={{ color: ui.textMuted, fontFamily: font.regular, fontSize: 12, padding: 16, textAlign: 'center' }}>
                {t('geonamesCredit')}
              </Text>
            }
            renderItem={({ item }) => (
              <Pressable
                onPress={() => {
                  setCountry(item);
                  setQuery('');
                }}
                accessibilityRole="button"
                accessibilityLabel={nameOf(item.cc)}
                style={({ pressed }) => [rowStyle, pressed && { backgroundColor: ui.bgElev }]}
              >
                <Text style={{ flex: 1, color: ui.text, fontFamily: font.medium, fontSize: 16, textAlign }}>
                  {nameOf(item.cc)}
                </Text>
                <Ionicons
                  name={row === 'row' ? 'chevron-forward' : 'chevron-back'}
                  size={18}
                  color={ui.textMuted}
                  importantForAccessibility="no"
                />
              </Pressable>
            )}
          />
        )}
      </View>
    </Modal>
  );
}

function Empty({ label }: { label: string }) {
  const { font } = useT();
  return (
    <Text style={{ color: ui.textMuted, fontFamily: font.regular, textAlign: 'center', padding: 32 }}>{label}</Text>
  );
}
