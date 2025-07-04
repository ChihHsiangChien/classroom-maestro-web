
'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { School, LogIn, Terminal, AlertTriangle } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { useAuth } from '@/contexts/auth-context';
import { useI18n } from '@/lib/i18n/provider';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';

export default function Home() {
  const { t } = useI18n();
  const { user, loading, signInWithGoogle, isFirebaseConfigured, authError } = useAuth();
  const router = useRouter();
  const [hostname, setHostname] = useState('');

  useEffect(() => {
    if (typeof window !== 'undefined') {
      setHostname(window.location.hostname);
    }
  }, []);

  useEffect(() => {
    // Only redirect if there's no error, not loading, and user state is definitive
    if (!loading && !authError && user) {
      router.push('/dashboard');
    }
  }, [user, loading, authError, router]);

  const handleLogin = async () => {
    await signInWithGoogle();
  };

  if (loading) {
    return (
      <div className="flex min-h-screen w-full flex-col items-center justify-center">
        <School className="h-12 w-12 animate-pulse text-primary" />
        <p className="mt-4 text-muted-foreground">{t('common.loading')}</p>
      </div>
    );
  }

  const isAuthDomainError = authError === 'unauthorized-domain';

  if (authError) {
     return (
      <main className="flex min-h-screen w-full flex-col items-center justify-center bg-muted/40 p-4">
        <Alert variant="destructive" className="max-w-xl bg-background">
          <AlertTriangle className="h-4 w-4" />
          {isAuthDomainError ? (
            <>
              <AlertTitle>Action Required: Authorize Your App's Domain</AlertTitle>
              <AlertDescription>
                 <div className="mt-2 space-y-3">
                  <p>To use Google Sign-In, Firebase requires you to explicitly authorize the domain your app is running on.</p>
                  <p className="font-semibold">Your app's domain is:</p>
                  {hostname ? (
                    <code className="block rounded bg-muted px-2 py-1 font-mono text-sm">{hostname}</code>
                  ) : (
                    <div className="h-7 w-full animate-pulse rounded bg-muted" />
                  )}
                  <p>Please add this exact domain to the "Authorized domains" list in your Firebase project's authentication settings.</p>
                  <Button asChild variant="link" className="p-0 h-auto text-destructive font-semibold">
                    <a href={`https://console.firebase.google.com/project/${process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID}/authentication/settings`} target="_blank" rel="noopener noreferrer">
                        Open Firebase Auth Settings
                      </a>
                  </Button>
                 </div>
              </AlertDescription>
            </>
          ) : (
             <>
              <AlertTitle>Firebase Authentication Error</AlertTitle>
              <AlertDescription>
                <p>{authError}</p>
              </AlertDescription>
            </>
          )}
        </Alert>
      </main>
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
