import type { Localized } from './types';

export interface DivineName {
  /** 1–99, in the order of the list narrated by at-Tirmidhi (3507). */
  n: number;
  arabic: string;
  transliteration: string;
  meaning: Localized;
}

/** [arabic, transliteration, English meaning] in Tirmidhi's order. */
const LIST: ReadonlyArray<readonly [string, string, string]> = [
  ['ٱلرَّحْمَٰنُ', 'Ar-Raḥmān', 'The Most Merciful'],
  ['ٱلرَّحِيمُ', 'Ar-Raḥīm', 'The Most Compassionate'],
  ['ٱلْمَلِكُ', 'Al-Malik', 'The King'],
  ['ٱلْقُدُّوسُ', 'Al-Quddūs', 'The Most Holy'],
  ['ٱلسَّلَامُ', 'As-Salām', 'The Source of Peace'],
  ['ٱلْمُؤْمِنُ', "Al-Mu'min", 'The Granter of Security'],
  ['ٱلْمُهَيْمِنُ', 'Al-Muhaymin', 'The Guardian'],
  ['ٱلْعَزِيزُ', "Al-'Azīz", 'The Almighty'],
  ['ٱلْجَبَّارُ', 'Al-Jabbār', 'The Compeller'],
  ['ٱلْمُتَكَبِّرُ', 'Al-Mutakabbir', 'The Supreme in Greatness'],
  ['ٱلْخَالِقُ', 'Al-Khāliq', 'The Creator'],
  ['ٱلْبَارِئُ', "Al-Bāri'", 'The Originator'],
  ['ٱلْمُصَوِّرُ', 'Al-Muṣawwir', 'The Fashioner'],
  ['ٱلْغَفَّارُ', 'Al-Ghaffār', 'The Ever-Forgiving'],
  ['ٱلْقَهَّارُ', 'Al-Qahhār', 'The Subduer'],
  ['ٱلْوَهَّابُ', 'Al-Wahhāb', 'The Bestower'],
  ['ٱلرَّزَّاقُ', 'Ar-Razzāq', 'The Provider'],
  ['ٱلْفَتَّاحُ', 'Al-Fattāḥ', 'The Opener'],
  ['ٱلْعَلِيمُ', "Al-'Alīm", 'The All-Knowing'],
  ['ٱلْقَابِضُ', 'Al-Qābiḍ', 'The Withholder'],
  ['ٱلْبَاسِطُ', 'Al-Bāsiṭ', 'The Extender'],
  ['ٱلْخَافِضُ', 'Al-Khāfiḍ', 'The Abaser'],
  ['ٱلرَّافِعُ', "Ar-Rāfi'", 'The Exalter'],
  ['ٱلْمُعِزُّ', "Al-Mu'izz", 'The Giver of Honour'],
  ['ٱلْمُذِلُّ', 'Al-Mudhill', 'The Giver of Dishonour'],
  ['ٱلسَّمِيعُ', "As-Samī'", 'The All-Hearing'],
  ['ٱلْبَصِيرُ', 'Al-Baṣīr', 'The All-Seeing'],
  ['ٱلْحَكَمُ', 'Al-Ḥakam', 'The Judge'],
  ['ٱلْعَدْلُ', "Al-'Adl", 'The Utterly Just'],
  ['ٱللَّطِيفُ', 'Al-Laṭīf', 'The Subtle, the Kind'],
  ['ٱلْخَبِيرُ', 'Al-Khabīr', 'The All-Aware'],
  ['ٱلْحَلِيمُ', 'Al-Ḥalīm', 'The Forbearing'],
  ['ٱلْعَظِيمُ', "Al-'Aẓīm", 'The Magnificent'],
  ['ٱلْغَفُورُ', 'Al-Ghafūr', 'The All-Forgiving'],
  ['ٱلشَّكُورُ', 'Ash-Shakūr', 'The Most Appreciative'],
  ['ٱلْعَلِيُّ', "Al-'Aliyy", 'The Most High'],
  ['ٱلْكَبِيرُ', 'Al-Kabīr', 'The Most Great'],
  ['ٱلْحَفِيظُ', 'Al-Ḥafīẓ', 'The Preserver'],
  ['ٱلْمُقِيتُ', 'Al-Muqīt', 'The Sustainer'],
  ['ٱلْحَسِيبُ', 'Al-Ḥasīb', 'The Reckoner'],
  ['ٱلْجَلِيلُ', 'Al-Jalīl', 'The Majestic'],
  ['ٱلْكَرِيمُ', 'Al-Karīm', 'The Most Generous'],
  ['ٱلرَّقِيبُ', 'Ar-Raqīb', 'The Watchful'],
  ['ٱلْمُجِيبُ', 'Al-Mujīb', 'The Responsive'],
  ['ٱلْوَاسِعُ', "Al-Wāsi'", 'The All-Encompassing'],
  ['ٱلْحَكِيمُ', 'Al-Ḥakīm', 'The All-Wise'],
  ['ٱلْوَدُودُ', 'Al-Wadūd', 'The Most Loving'],
  ['ٱلْمَجِيدُ', 'Al-Majīd', 'The Most Glorious'],
  ['ٱلْبَاعِثُ', "Al-Bā'ith", 'The Resurrector'],
  ['ٱلشَّهِيدُ', 'Ash-Shahīd', 'The Witness'],
  ['ٱلْحَقُّ', 'Al-Ḥaqq', 'The Truth'],
  ['ٱلْوَكِيلُ', 'Al-Wakīl', 'The Trustee'],
  ['ٱلْقَوِيُّ', 'Al-Qawiyy', 'The All-Strong'],
  ['ٱلْمَتِينُ', 'Al-Matīn', 'The Firm'],
  ['ٱلْوَلِيُّ', 'Al-Waliyy', 'The Protecting Friend'],
  ['ٱلْحَمِيدُ', 'Al-Ḥamīd', 'The Praiseworthy'],
  ['ٱلْمُحْصِي', 'Al-Muḥṣī', 'The All-Enumerating'],
  ['ٱلْمُبْدِئُ', "Al-Mubdi'", 'The Originator of creation'],
  ['ٱلْمُعِيدُ', "Al-Mu'īd", 'The Restorer'],
  ['ٱلْمُحْيِي', 'Al-Muḥyī', 'The Giver of Life'],
  ['ٱلْمُمِيتُ', 'Al-Mumīt', 'The Bringer of Death'],
  ['ٱلْحَيُّ', 'Al-Ḥayy', 'The Ever-Living'],
  ['ٱلْقَيُّومُ', 'Al-Qayyūm', 'The Self-Subsisting'],
  ['ٱلْوَاجِدُ', 'Al-Wājid', 'The Finder'],
  ['ٱلْمَاجِدُ', 'Al-Mājid', 'The Noble'],
  ['ٱلْوَاحِدُ', 'Al-Wāḥid', 'The One'],
  ['ٱلْأَحَدُ', 'Al-Aḥad', 'The Unique'],
  ['ٱلصَّمَدُ', 'Aṣ-Ṣamad', 'The Eternal Refuge'],
  ['ٱلْقَادِرُ', 'Al-Qādir', 'The All-Capable'],
  ['ٱلْمُقْتَدِرُ', 'Al-Muqtadir', 'The All-Powerful'],
  ['ٱلْمُقَدِّمُ', 'Al-Muqaddim', 'The Expediter'],
  ['ٱلْمُؤَخِّرُ', "Al-Mu'akhkhir", 'The Delayer'],
  ['ٱلْأَوَّلُ', 'Al-Awwal', 'The First'],
  ['ٱلْآخِرُ', 'Al-Ākhir', 'The Last'],
  ['ٱلظَّاهِرُ', 'Aẓ-Ẓāhir', 'The Manifest'],
  ['ٱلْبَاطِنُ', 'Al-Bāṭin', 'The Hidden'],
  ['ٱلْوَالِي', 'Al-Wālī', 'The Governor'],
  ['ٱلْمُتَعَالِي', "Al-Muta'ālī", 'The Most Exalted'],
  ['ٱلْبَرُّ', 'Al-Barr', 'The Source of Goodness'],
  ['ٱلتَّوَّابُ', 'At-Tawwāb', 'The Ever-Accepting of Repentance'],
  ['ٱلْمُنْتَقِمُ', 'Al-Muntaqim', 'The Avenger'],
  ['ٱلْعَفُوُّ', "Al-'Afuww", 'The Pardoner'],
  ['ٱلرَّءُوفُ', "Ar-Ra'ūf", 'The Most Kind'],
  ['مَالِكُ ٱلْمُلْكِ', 'Mālik al-Mulk', 'Owner of All Sovereignty'],
  ['ذُو ٱلْجَلَالِ وَٱلْإِكْرَامِ', 'Dhul-Jalāli wal-Ikrām', 'Lord of Majesty and Generosity'],
  ['ٱلْمُقْسِطُ', 'Al-Muqsiṭ', 'The Equitable'],
  ['ٱلْجَامِعُ', "Al-Jāmi'", 'The Gatherer'],
  ['ٱلْغَنِيُّ', 'Al-Ghaniyy', 'The Self-Sufficient'],
  ['ٱلْمُغْنِي', 'Al-Mughnī', 'The Enricher'],
  ['ٱلْمَانِعُ', "Al-Māni'", 'The Preventer of Harm'],
  ['ٱلضَّارُّ', 'Aḍ-Ḍārr', 'The Bringer of Adversity'],
  ['ٱلنَّافِعُ', "An-Nāfi'", 'The Bringer of Benefit'],
  ['ٱلنُّورُ', 'An-Nūr', 'The Light'],
  ['ٱلْهَادِي', 'Al-Hādī', 'The Guide'],
  ['ٱلْبَدِيعُ', "Al-Badī'", 'The Incomparable Originator'],
  ['ٱلْبَاقِي', 'Al-Bāqī', 'The Everlasting'],
  ['ٱلْوَارِثُ', 'Al-Wārith', 'The Inheritor'],
  ['ٱلرَّشِيدُ', 'Ar-Rashīd', 'The Guide to the Right Path'],
  ['ٱلصَّبُورُ', 'Aṣ-Ṣabūr', 'The Most Patient'],
];

/**
 * The 99 Names of Allah. Meanings are in English for now; other languages
 * fall back to it until reviewed translations are added.
 */
export const DIVINE_NAMES: readonly DivineName[] = LIST.map(([arabic, transliteration, en], i) => ({
  n: i + 1,
  arabic,
  transliteration,
  meaning: { en },
}));

/** One Name per day, the same for everyone on a given date. */
export function nameOfTheDay(date: Date): DivineName {
  const start = Date.UTC(date.getFullYear(), 0, 0);
  const day = Math.floor((Date.UTC(date.getFullYear(), date.getMonth(), date.getDate()) - start) / 86_400_000);
  return DIVINE_NAMES[(day - 1 + DIVINE_NAMES.length) % DIVINE_NAMES.length];
}
