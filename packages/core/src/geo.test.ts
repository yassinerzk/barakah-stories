import { decodeCities, foldText, nearestCity, searchCities, searchCountries, type CountryCityFile } from './geo';

const sample: CountryCityFile = {
  z: ['Europe/Paris', 'Indian/Reunion'],
  c: [
    ['Paris', 48.8534, 2.3488, 0, 'Ile-de-France'],
    ['Saint-Étienne', 45.4339, 4.39, 0, 'Auvergne-Rhone-Alpes'],
    ['Saint-Denis', -20.8823, 55.4504, 1, 'Reunion'],
    ['Lyon', 45.7485, 4.8467, 0, ''],
  ],
};

describe('geo', () => {
  it('decodes cities with their own time zone and keeps population order', () => {
    const cities = decodeCities('FR', sample);
    expect(cities.map((c) => c.name)).toEqual(['Paris', 'Saint-Étienne', 'Saint-Denis', 'Lyon']);
    expect(cities[2].timeZone).toBe('Indian/Reunion');
    expect(cities[0]).toMatchObject({ cc: 'FR', lat: 48.8534, lng: 2.3488, region: 'Ile-de-France' });
    expect(new Set(cities.map((c) => c.id)).size).toBe(4);
  });

  it('folds accents and case for searching', () => {
    expect(foldText('Saint-Étienne')).toBe('saint-etienne');
    expect(foldText('  İSTANBUL ')).toBe('istanbul');
  });

  it('finds cities by any part of the name, ignoring accents, best matches first', () => {
    const cities = decodeCities('FR', sample);
    expect(searchCities(cities, 'etienne').map((c) => c.name)).toEqual(['Saint-Étienne']);
    expect(searchCities(cities, 'saint').map((c) => c.name)).toEqual(['Saint-Étienne', 'Saint-Denis']);
    // A name that starts with the query beats one that only contains it.
    expect(searchCities(cities, 'ly')[0].name).toBe('Lyon');
  });

  it('returns the full list for an empty query, and nothing for no match', () => {
    const cities = decodeCities('FR', sample);
    expect(searchCities(cities, '  ')).toHaveLength(4);
    expect(searchCities(cities, 'zzz')).toEqual([]);
  });

  it('caps how many results it returns', () => {
    const cities = decodeCities('FR', sample);
    expect(searchCities(cities, '', 2)).toHaveLength(2);
  });

  it('searches countries by their name in the reader’s language or in English', () => {
    const countries = [
      { cc: 'ID', name: 'Indonesia', n: 1 },
      { cc: 'IN', name: 'India', n: 1 },
      { cc: 'MY', name: 'Malaysia', n: 1 },
    ];
    const local = (cc: string) => ({ ID: 'Indonésie', IN: 'Inde', MY: 'Malaisie' })[cc] ?? cc;
    expect(searchCountries(countries, 'indo', local).map((c) => c.cc)).toEqual(['ID']);
    expect(searchCountries(countries, 'malaisie', local).map((c) => c.cc)).toEqual(['MY']);
    expect(searchCountries(countries, '', local)).toHaveLength(3);
  });

  it('finds the nearest city to a position', () => {
    const cities = decodeCities('FR', sample);
    expect(nearestCity(cities, { lat: 45.76, lng: 4.84 })?.name).toBe('Lyon');
    expect(nearestCity([], { lat: 0, lng: 0 })).toBeNull();
  });
});
