
'use client';

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { School, LogIn, Terminal } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { useAuth } from '@/contexts/auth-context';
import { useI18n } from '@/lib/i18n/provider';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';

export default function Home() {
  const { t } = useI18n();
  const { user, loading, signInWithGoogle, isFirebaseConfigured } = useAuth();
  const router = useRouter();

  useEffect(() => {
    if (user) {
      router.push('/dashboard');
    }
  }, [user, router]);

  const handleLogin = async () => {
    try {
      await signInWithGoogle();
      router.push('/dashboard');
    } catch (error) {
      console.error("Google Sign-In failed:", error);
      // You can add a toast notification here to inform the user
    }
  };

  if (loading) {
    return (
      <div className="flex min-h-screen w-full flex-col items-center justify-center">
        <School className="h-12 w-12 animate-pulse text-primary" />
        <p className="mt-4 text-muted-foreground">{t('common.loading')}</p>
      </div>
    );
  }

  if (!isFirebaseConfigured) {
    return (
      <main className="flex min-h-screen w-full flex-col items-center justify-center bg-muted/40 p-4">
        <Alert variant="destructive" className="max-w-lg bg-background">
          <Terminal className="h-4 w-4" />
          <AlertTitle>Firebase Configuration Error</AlertTitle>
          <AlertDescription>
            <p>Your Firebase environment variables are not set correctly.</p>
            <p className="mt-2">
              Please copy your Firebase project credentials into the{' '}
              <code className="relative rounded bg-muted px-[0.3rem] py-[0.2rem] font-mono text-sm font-semibold">
                .env
              </code>{' '}
              file at the root of this project and restart the development server.
            </p>
          </AlertDescription>
        </Alert>
      </main>
    );
  }

  if (user) {
    return (
      <div className="flex min-h-screen w-full flex-col items-center justify-center">
        <School className="h-12 w-12 animate-pulse text-primary" />
        <p className="mt-4 text-muted-foreground">{t('common.loading')}</p>
      </div>
    );
  }

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
      <Card className="w-full max-w-sm shadow-lg">
        <CardHeader className="text-center">
          <CardTitle>{t('landingPage.teacher_signin_title')}</CardTitle>
          <CardDescription>
            {t('landingPage.teacher_signin_description_google')}
          </CardDescription>
        </CardHeader>
        <CardContent>
          <Button onClick={handleLogin} className="w-full">
            <LogIn className="mr-2 h-4 w-4" />
            {t('landingPage.signin_with_google_button')}
          </Button>
        </CardContent>
      </Card>
    </main>
  );
}
