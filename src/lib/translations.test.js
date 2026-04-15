import { describe, it, expect } from 'vitest';
import { translations } from './translations';

describe('Translations Dictionary Parity', () => {
  const languages = Object.keys(translations);

  it('contains exactly Thai (th) and English (en)', () => {
    expect(languages).toContain('th');
    expect(languages).toContain('en');
    expect(languages.length).toBe(2);
  });

  it('has identical keys in Thai and English', () => {
    const thKeys = Object.keys(translations.th).sort();
    const enKeys = Object.keys(translations.en).sort();

    // Check for missing keys in English
    const missingInEn = thKeys.filter(key => !enKeys.includes(key));
    // Check for missing keys in Thai
    const missingInTh = enKeys.filter(key => !thKeys.includes(key));

    expect(missingInEn, `Keys present in Thai but missing in English: ${missingInEn.join(', ')}`).toEqual([]);
    expect(missingInTh, `Keys present in English but missing in Thai: ${missingInTh.join(', ')}`).toEqual([]);
    
    expect(thKeys.length, 'Total key count should match').toBe(enKeys.length);
  });

  it('contains no empty translation values', () => {
    for (const lang of languages) {
      const langKeys = Object.keys(translations[lang]);
      for (const key of langKeys) {
        const value = translations[lang][key];
        expect(value, `Missing value for [${lang}].${key}`).toBeDefined();
        expect(value.length, `Empty string for [${lang}].${key}`).toBeGreaterThan(0);
      }
    }
  });
});
