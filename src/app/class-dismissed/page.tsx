'use client';
import { School, LogOut } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardHeader, CardTitle, CardDescription, CardFooter } from '@/components/ui/card';
import Link from 'next/link';
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
        <CardFooter>
          <Button asChild className="w-full">
            <Link href="/">
              <LogOut className="mr-2 h-4 w-4" />
              {t('classDismissed.return_home_button')}
            </Link>
          </Button>
        </CardFooter>
      </Card>
    </main>
  );
}
