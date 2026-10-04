import type { GeoPoint } from './prayer';

/**
 * Countries and cities for the location picker, from GeoNames (CC BY 4.0) via
 * scripts/gen-cities.mjs. Each country's cities live in their own file and are
 * loaded only when that country is opened.
 */

/** One row of countries.json. `n` is how many cities the country file holds. */
export interface CountryEntry {
  cc: string;
  name: string;
  n: number;
}

/** A country file as written by the generator: shared time zones, then rows. */
export interface CountryCityFile {
  z: string[];
  /** [name, lat, lng, index into z, region ('' when it would repeat the name)] */
  c: Array<[string, number, number, number, string]>;
}

export interface GeoCity extends GeoPoint {
  id: string;
  cc: string;
  name: string;
  region: string;
  /** IANA zone, so times read in the city's own clock. */
  timeZone: string;
}

export function decodeCities(cc: string, file: CountryCityFile): GeoCity[] {
  return file.c.map(([name, lat, lng, zone, region], i) => ({
    id: `${cc}:${i}:${name}`,
    cc,
    name,
    region,
    lat,
    lng,
    timeZone: file.z[zone],
  }));
}

/** Lower-case and strip accents, so "etienne" finds "Saint-Étienne". */
export function foldText(text: string): string {
  return text
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '')
    .toLowerCase()
    .trim();
}

/** 0: name starts with it, 1: a word in the name does, 2: name contains it, 3: region does. */
function rank(name: string, region: string, query: string): number {
  const n = foldText(name);
  if (n.startsWith(query)) return 0;
  if (n.split(/[^a-z0-9]+/).some((w) => w.startsWith(query))) return 1;
  if (n.includes(query)) return 2;
  if (region && foldText(region).includes(query)) return 3;
  return -1;
}

/**
 * Cities matching the query, best match first. Within a rank the file's order
 * holds, and the file is sorted by population — so "san" in Spain puts the
 * large San Sebastián ahead of a small town.
 */
export function searchCities(cities: readonly GeoCity[], query: string, limit = 200): GeoCity[] {
  const q = foldText(query);
  if (!q) return cities.slice(0, limit);
  const scored: Array<{ city: GeoCity; score: number; order: number }> = [];
  cities.forEach((city, order) => {
    const score = rank(city.name, city.region, q);
    if (score >= 0) scored.push({ city, score, order });
  });
  scored.sort((a, b) => a.score - b.score || a.order - b.order);
  return scored.slice(0, limit).map((s) => s.city);
}

/** Countries matching the query in either the reader's language or English. */
export function searchCountries(
  countries: readonly CountryEntry[],
  query: string,
  localName: (cc: string) => string,
): CountryEntry[] {
  const q = foldText(query);
  if (!q) return [...countries];
  return countries.filter((c) => foldText(localName(c.cc)).includes(q) || foldText(c.name).includes(q));
}

/** Great-circle distance is overkill at city scale; an equirectangular estimate ranks correctly. */
function distanceSq(a: GeoPoint, b: GeoPoint): number {
  const x = (b.lng - a.lng) * Math.cos(((a.lat + b.lat) / 2) * (Math.PI / 180));
  const y = b.lat - a.lat;
  return x * x + y * y;
}

export function nearestCity(cities: readonly GeoCity[], point: GeoPoint): GeoCity | null {
  let best: GeoCity | null = null;
  let bestD = Infinity;
  for (const c of cities) {
    const d = distanceSq(point, c);
    if (d < bestD) {
      bestD = d;
      best = c;
    }
  }
  return best;
}
