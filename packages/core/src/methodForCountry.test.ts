import { suggestedMethod } from './methodForCountry';

describe('suggestedMethod', () => {
  it('uses the authority each country follows', () => {
    expect(suggestedMethod('SA')).toBe('UmmAlQura');
    expect(suggestedMethod('EG')).toBe('Egyptian');
    expect(suggestedMethod('PK')).toBe('Karachi');
    expect(suggestedMethod('US')).toBe('NorthAmerica');
    expect(suggestedMethod('TR')).toBe('Turkey');
    expect(suggestedMethod('MY')).toBe('Singapore');
    expect(suggestedMethod('AE')).toBe('Dubai');
  });

  it('accepts lower-case codes', () => {
    expect(suggestedMethod('sa')).toBe('UmmAlQura');
  });

  it('falls back to the Muslim World League for anywhere else or nothing', () => {
    expect(suggestedMethod('FR')).toBe('MuslimWorldLeague');
    expect(suggestedMethod(undefined)).toBe('MuslimWorldLeague');
    expect(suggestedMethod('')).toBe('MuslimWorldLeague');
  });
});
