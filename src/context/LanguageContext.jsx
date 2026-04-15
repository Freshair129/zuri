'use client';

import { createContext, useContext, useState, useEffect, useCallback } from 'react';
import { translations } from '@/lib/translations';

const LanguageContext = createContext({
  language: 'th',
  setLanguage: () => {},
  t: (key) => key,
  toggleLanguage: () => {},
});

export function LanguageProvider({ children }) {
  const [language, setLanguage] = useState('th');
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
    const stored = localStorage.getItem('zuri-language');
    if (stored === 'th' || stored === 'en') {
      setLanguage(stored);
    }
  }, []);

  useEffect(() => {
    if (!mounted) return;
    localStorage.setItem('zuri-language', language);
    document.documentElement.lang = language;
  }, [language, mounted]);

  const toggleLanguage = useCallback(() => {
    setLanguage((prev) => (prev === 'th' ? 'en' : 'th'));
  }, []);

  const t = useCallback(
    (key) => {
      return translations[language]?.[key] || key;
    },
    [language]
  );

  return (
    <LanguageContext.Provider value={{ language, setLanguage, t, toggleLanguage }}>
      {children}
    </LanguageContext.Provider>
  );
}

export const useLanguage = () => useContext(LanguageContext);
