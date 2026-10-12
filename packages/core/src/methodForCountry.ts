import type { CalcMethodId } from './prayer';

/**
 * The calculation method most people in a country already follow, so the
 * default times match the local mosque. Anything not listed gets the Muslim
 * World League, the most widely used method. Always shown as a suggestion the
 * user can change.
 */
const BY_COUNTRY: Readonly<Record<string, CalcMethodId>> = {
  SA: 'UmmAlQura',
  YE: 'UmmAlQura',
  BH: 'UmmAlQura',
  OM: 'UmmAlQura',
  AE: 'Dubai',
  KW: 'Kuwait',
  QA: 'Qatar',
  EG: 'Egyptian',
  SD: 'Egyptian',
  LY: 'Egyptian',
  SY: 'Egyptian',
  LB: 'Egyptian',
  JO: 'Egyptian',
  PS: 'Egyptian',
  IQ: 'Egyptian',
  PK: 'Karachi',
  IN: 'Karachi',
  BD: 'Karachi',
  AF: 'Karachi',
  US: 'NorthAmerica',
  CA: 'NorthAmerica',
  SG: 'Singapore',
  MY: 'Singapore',
  ID: 'Singapore',
  BN: 'Singapore',
  TR: 'Turkey',
  IR: 'Tehran',
  GB: 'MoonsightingCommittee',
  IE: 'MoonsightingCommittee',
};

export function suggestedMethod(countryCode: string | undefined): CalcMethodId {
  if (!countryCode) return 'MuslimWorldLeague';
  return BY_COUNTRY[countryCode.toUpperCase()] ?? 'MuslimWorldLeague';
}
