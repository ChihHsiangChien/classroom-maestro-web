'use client';

import { Button } from '@/components/ui/button';
import { useI18n } from '@/lib/i18n/provider';

export function LanguageSwitcher() {
  const { locale, setLocale } = useI18n();

  const toggleLocale = () => {
    setLocale(locale === 'en' ? 'zh' : 'en');
  };

  return (
    <Button variant="outline" size="sm" onClick={toggleLocale}>
      {locale === 'en' ? '中' : 'EN'}
    </Button>
  );
}
