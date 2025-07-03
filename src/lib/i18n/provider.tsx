'use client';

import React, { createContext, useState, useContext, useEffect, useCallback, useMemo } from 'react';
import { dictionaries, formatString, type Locale } from './dictionaries';

interface I18nContextType {
  locale: Locale;
  setLocale: (locale: Locale) => void;
  t: (key: string, values?: Record<string, string | number>) => string;
}

const I18nContext = createContext<I18nContextType | undefined>(undefined);

export function I18nProvider({ children }: { children: React.ReactNode }) {
  const [locale, setLocale] = useState<Locale>('zh'); // Default to Chinese

  useEffect(() => {
    const savedLocale = localStorage.getItem('locale') as Locale | null;
    if (savedLocale && dictionaries[savedLocale]) {
      setLocale(savedLocale);
    }
  }, []);

  const handleSetLocale = useCallback((newLocale: Locale) => {
    setLocale(newLocale);
    localStorage.setItem('locale', newLocale);
  }, []);

  const t = useCallback((key: string, values?: Record<string, string | number>): string => {
    const keys = key.split('.');
    let result: any = dictionaries[locale];
    
    // Navigate through the nested object
    for (const k of keys) {
      result = result?.[k];
      if (result === undefined) {
        // Fallback to English if key not found in current locale
        let fallbackResult: any = dictionaries.en;
        for (const k_fb of keys) {
            fallbackResult = fallbackResult?.[k_fb];
        }
        const str = fallbackResult || key;
        return values ? formatString(str, values) : str;
      }
    }
    
    const finalString = result || key;
    return values ? formatString(finalString, values) : finalString;
  }, [locale]);


  const value = useMemo(() => ({ locale, setLocale: handleSetLocale, t }), [locale, handleSetLocale, t]);

  return <I18nContext.Provider value={value}>{children}</I18nContext.Provider>;
}

export function useI18n() {
  const context = useContext(I18nContext);
  if (context === undefined) {
    throw new Error('useI18n must be used within an I18nProvider');
  }
  return context;
}
