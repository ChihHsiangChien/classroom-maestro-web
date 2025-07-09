'use client';
import { School } from 'lucide-react';
import { Card, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { useI18n } from '@/lib/i18n/provider';

export default function ClassDismissedPage() {
  const { t } = useI18n();
  return (
    <main className="flex min-h-screen flex-col items-center justify-center bg-background p-4">
      <Card className="w-full max-w-lg text-center">
        <CardHeader>
          <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-full bg-primary/10 mb-4">
            <School className="h-8 w-8 text-primary" />
          </div>
          <CardTitle className="text-2xl">{t('classDismissed.title')}</CardTitle>
          <CardDescription>{t('classDismissed.description')}</CardDescription>
        </CardHeader>
      </Card>
    </main>
  );
}
