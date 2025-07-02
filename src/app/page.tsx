'use client';

import { Crown, School } from 'lucide-react';
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';
import { TeacherLoginForm } from '@/components/teacher-login-form';
import { useI18n } from '@/lib/i18n/provider';

export default function Home() {
  const { t } = useI18n();
  return (
    <main className="flex min-h-screen w-full flex-col items-center justify-center p-4">
      <div className="flex flex-col items-center gap-2 mb-8 text-center">
        <div className="p-3 rounded-full bg-primary/10 border border-primary/20">
          <School className="h-10 w-10 text-primary" />
        </div>
        <h1 className="text-4xl font-bold font-headline text-foreground">
          {t('landingPage.title')}
        </h1>
        <p className="max-w-md text-muted-foreground">
          {t('landingPage.description')}
        </p>
      </div>
      <Card className="w-full max-w-md shadow-lg">
        <CardHeader className="text-center">
            <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-full bg-primary/10">
                <Crown className="h-6 w-6 text-primary" />
            </div>
          <CardTitle>{t('landingPage.teacher_signin_title')}</CardTitle>
          <CardDescription>
            {t('landingPage.teacher_signin_description')}
          </CardDescription>
        </CardHeader>
        <CardContent>
          <TeacherLoginForm />
        </CardContent>
      </Card>
    </main>
  );
}
